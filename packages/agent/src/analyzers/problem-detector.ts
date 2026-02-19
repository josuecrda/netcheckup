import { logger } from '../utils/logger.js';
import { deviceRepo } from '../db/repositories/device.repo.js';
import { metricRepo } from '../db/repositories/metric.repo.js';
import { speedTestRepo } from '../db/repositories/speedtest.repo.js';
import { problemRepo } from '../db/repositories/problem.repo.js';
import { alertRepo } from '../db/repositories/alert.repo.js';
import { getConfig } from '../config.js';
import { broadcastEvent } from '../api/websocket.js';
import type { Device, Metric, SpeedTestResult, Problem, ProblemSeverity, ProblemCategory } from '@netcheckup/shared';

// Import all rule sets
import { latencyRules } from './rules/latency-rules.js';
import { availabilityRules } from './rules/availability-rules.js';
import { speedRules } from './rules/speed-rules.js';
import { infrastructureRules } from './rules/infrastructure-rules.js';
import { securityRules } from './rules/security-rules.js';
import { dnsRules, measureDnsResolution } from './rules/dns-rules.js';

// ─── Types ────────────────────────────────────────────

/** Context passed to every diagnostic rule */
export interface DiagnosticContext {
  devices: Device[];
  metricsByDevice: Record<string, Metric[]>;
  latestSpeedTest: SpeedTestResult | null;
  recentSpeedTests: SpeedTestResult[];
  contractedDownloadMbps: number;
  contractedUploadMbps: number;
  thresholds: {
    highLatencyMs: number;
    packetLossPercent: number;
    speedDegradedPercent: number;
  };
  dnsResolutionMs: number | null;
}

/** Result from a single rule evaluation */
export interface RuleResult {
  severity: ProblemSeverity;
  category: ProblemCategory;
  title: string;
  description: string;
  affectedDevices: string[];
  impact: string;
  recommendation: string;
  ruleId: string;
}

/** A diagnostic rule definition */
export interface DiagnosticRule {
  id: string;
  name: string;
  category: string;
  /** Returns null if no problem, a single result, or an array of results */
  evaluate(ctx: DiagnosticContext): RuleResult | RuleResult[] | null;
}

// ─── All rules combined ───────────────────────────────

const allRules: DiagnosticRule[] = [
  ...latencyRules,
  ...availabilityRules,
  ...speedRules,
  ...infrastructureRules,
  ...securityRules,
  ...dnsRules,
];

// ─── Build diagnostic context ─────────────────────────

async function buildContext(): Promise<DiagnosticContext> {
  const config = getConfig();
  const devices = deviceRepo.findAll();

  // Get recent metrics for each device (last 1 hour for fast analysis)
  const metricsByDevice: Record<string, Metric[]> = {};
  for (const device of devices) {
    metricsByDevice[device.id] = metricRepo.findByDevice(device.id, '1h');
  }

  // Speed test data
  const latestSpeedTest = speedTestRepo.getLatest();
  const recentSpeedTests = speedTestRepo.findAll(10); // Last 10 tests

  // DNS resolution timing
  const dnsResolutionMs = await measureDnsResolution();

  return {
    devices,
    metricsByDevice,
    latestSpeedTest,
    recentSpeedTests: recentSpeedTests.reverse(), // Oldest first
    contractedDownloadMbps: config.isp.contractedDownloadMbps || 0,
    contractedUploadMbps: config.isp.contractedUploadMbps || 0,
    thresholds: {
      highLatencyMs: config.thresholds.highLatencyMs,
      packetLossPercent: config.thresholds.packetLossPercent,
      speedDegradedPercent: config.thresholds.speedDegradedPercent,
    },
    dnsResolutionMs,
  };
}

// ─── Detect problems ──────────────────────────────────

/**
 * Ejecuta todas las reglas de diagnóstico contra los datos actuales.
 * Crea nuevos problemas, actualiza existentes, y resuelve los que ya no aplican.
 */
export async function runDiagnostics(): Promise<Problem[]> {
  logger.info('Ejecutando motor de diagnóstico...');
  const config = getConfig();
  const ctx = await buildContext();
  const detectedRuleIds = new Set<string>();
  const newProblems: Problem[] = [];

  const cooldownMinutes = config.alerts.cooldownMinutes;

  for (const rule of allRules) {
    try {
      const result = rule.evaluate(ctx);
      if (!result) continue;

      // Handle single or array results
      const results = Array.isArray(result) ? result : [result];

      for (const r of results) {
        detectedRuleIds.add(r.ruleId);

        // Check if this problem already exists
        const existing = problemRepo.findActiveByRuleId(r.ruleId);

        if (existing) {
          // Update existing problem (description may have changed with new data)
          problemRepo.updateActive(existing.id, {
            title: r.title,
            description: r.description,
            impact: r.impact,
            recommendation: r.recommendation,
            severity: r.severity,
            affectedDevices: r.affectedDevices,
          });
          logger.debug(`Problema actualizado: ${r.ruleId}`);
        } else {
          // Create new problem
          const problem = problemRepo.create({
            severity: r.severity,
            category: r.category,
            title: r.title,
            description: r.description,
            affectedDevices: r.affectedDevices,
            impact: r.impact,
            recommendation: r.recommendation,
            ruleId: r.ruleId,
          });
          newProblems.push(problem);

          // Check cooldown: skip alert if this problem was recently resolved
          const recentlyResolved = problemRepo.findRecentlyResolvedByRuleId(r.ruleId, cooldownMinutes);

          if (!recentlyResolved) {
            // Create alert for new problem
            alertRepo.create({
              type: 'problem-detected',
              severity: r.severity,
              title: r.title,
              message: r.description,
              deviceId: r.affectedDevices.length === 1 ? r.affectedDevices[0] : null,
              problemId: problem.id,
            });

            // Broadcast via WebSocket
            broadcastEvent('alert:new', {
              type: 'problem-detected',
              severity: r.severity,
              title: r.title,
            });

            logger.info(`Nuevo problema detectado: [${r.severity}] ${r.title}`);
          } else {
            logger.debug(`Alerta suprimida por cooldown (${cooldownMinutes}min): ${r.ruleId}`);
          }
        }
      }
    } catch (err) {
      logger.error(`Error evaluando regla ${rule.id}: ${(err as Error).message}`);
    }
  }

  // Auto-resolve problems that no longer trigger
  const activeProblems = problemRepo.findActive();
  for (const problem of activeProblems) {
    if (!detectedRuleIds.has(problem.ruleId)) {
      problemRepo.resolve(problem.id);

      // Create "problem resolved" alert
      alertRepo.create({
        type: 'problem-resolved',
        severity: 'info',
        title: `Resuelto: ${problem.title}`,
        message: `El problema "${problem.title}" se resolvió automáticamente.`,
        deviceId: problem.affectedDevices.length === 1 ? problem.affectedDevices[0] : null,
        problemId: problem.id,
      });

      broadcastEvent('alert:new', {
        type: 'problem-resolved',
        severity: 'info',
        title: `Resuelto: ${problem.title}`,
      });

      logger.info(`Problema resuelto: ${problem.title}`);
    }
  }

  const totalActive = problemRepo.findActive().length;
  logger.info(
    `Diagnóstico completado: ${newProblems.length} nuevos problemas, ${totalActive} activos en total`
  );

  return newProblems;
}
