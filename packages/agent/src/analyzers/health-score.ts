import { logger } from '../utils/logger.js';
import { deviceRepo } from '../db/repositories/device.repo.js';
import { metricRepo } from '../db/repositories/metric.repo.js';
import { speedTestRepo } from '../db/repositories/speedtest.repo.js';
import { problemRepo } from '../db/repositories/problem.repo.js';
import { healthRepo } from '../db/repositories/health.repo.js';
import { getConfig } from '../config.js';
import { broadcastEvent } from '../api/websocket.js';
import type { HealthScore, HealthCategory, Problem } from '@netcheckup/shared';

// ─── Health Factor Definitions ────────────────────────

interface HealthFactor {
  name: string;
  weight: number;
  description: string;
  calculate: () => number; // Returns 0-100
}

function buildHealthFactors(): HealthFactor[] {
  const config = getConfig();

  return [
    // ─── Factor 1: Latencia al gateway (25%) ─────────
    {
      name: 'Latencia al gateway',
      weight: 0.25,
      description: 'Qué tan rápido responde tu router principal',
      calculate(): number {
        const gateway = deviceRepo.findGateway();
        if (!gateway) return 50; // No gateway detected, neutral score

        const metrics = metricRepo.findByDevice(gateway.id, '1h');
        const reachable = metrics.filter((m) => m.isReachable && m.latencyMs !== null);
        if (reachable.length === 0) return 20; // Can't measure

        const avgLatency = reachable.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / reachable.length;

        if (avgLatency < 5) return 100;
        if (avgLatency < 20) return 80;
        if (avgLatency < 50) return 60;
        if (avgLatency < 100) return 40;
        if (avgLatency < 200) return 20;
        return 0;
      },
    },

    // ─── Factor 2: Pérdida de paquetes (25%) ─────────
    {
      name: 'Pérdida de paquetes',
      weight: 0.25,
      description: 'Cuántos datos se pierden en tu red',
      calculate(): number {
        const devices = deviceRepo.findMonitored();
        if (devices.length === 0) return 100;

        // Calculate average packet loss across all monitored devices
        let totalPacketLoss = 0;
        let deviceCount = 0;

        for (const device of devices) {
          const metrics = metricRepo.findByDevice(device.id, '1h');
          if (metrics.length === 0) continue;

          const avgLoss = metrics.reduce((sum, m) => sum + m.packetLoss, 0) / metrics.length;
          totalPacketLoss += avgLoss;
          deviceCount++;
        }

        if (deviceCount === 0) return 100;
        const avgPacketLoss = totalPacketLoss / deviceCount;

        if (avgPacketLoss === 0) return 100;
        if (avgPacketLoss < 1) return 90;
        if (avgPacketLoss < 3) return 70;
        if (avgPacketLoss < 5) return 50;
        if (avgPacketLoss < 10) return 30;
        return 0;
      },
    },

    // ─── Factor 3: Velocidad de internet (20%) ───────
    {
      name: 'Velocidad de internet',
      weight: 0.20,
      description: 'Cuánto de tu velocidad contratada realmente recibes',
      calculate(): number {
        const latestSpeed = speedTestRepo.getLatest();
        if (!latestSpeed) return 50; // No data

        const contracted = config.isp.contractedDownloadMbps;
        if (!contracted || contracted <= 0) {
          // No contracted speed set — score based on absolute speed
          if (latestSpeed.downloadMbps > 50) return 90;
          if (latestSpeed.downloadMbps > 20) return 70;
          if (latestSpeed.downloadMbps > 5) return 50;
          return 30;
        }

        const downloadPercent = (latestSpeed.downloadMbps / contracted) * 100;

        if (downloadPercent > 90) return 100;
        if (downloadPercent > 70) return 80;
        if (downloadPercent > 50) return 60;
        if (downloadPercent > 30) return 40;
        return 10;
      },
    },

    // ─── Factor 4: Disponibilidad de dispositivos (15%)
    {
      name: 'Disponibilidad de dispositivos',
      weight: 0.15,
      description: 'Cuántos de tus dispositivos están funcionando',
      calculate(): number {
        const summary = deviceRepo.getSummary();
        const monitored = summary.total;
        if (monitored === 0) return 100;

        const online = summary.online;
        const onlinePercent = (online / monitored) * 100;
        return Math.round(onlinePercent);
      },
    },

    // ─── Factor 5: Problemas activos (15%) ───────────
    {
      name: 'Problemas activos',
      weight: 0.15,
      description: 'Cantidad y severidad de problemas detectados',
      calculate(): number {
        const counts = problemRepo.countBySeverity();
        // Deducir puntos: critical = -30, warning = -15, info = -5
        const deduction = counts.critical * 30 + counts.warning * 15 + counts.info * 5;
        return Math.max(0, 100 - deduction);
      },
    },
  ];
}

// ─── Category classification ──────────────────────────

function scoreToCategory(score: number): HealthCategory {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'critical';
}

// ─── Trend calculation ────────────────────────────────

function calculateTrend(currentScore: number): 'improving' | 'stable' | 'declining' {
  const previous = healthRepo.getLatest();
  if (!previous) return 'stable';

  const diff = currentScore - previous.score;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

// ─── Main calculation ─────────────────────────────────

/**
 * Calcula el Health Score actual de la red.
 * Almacena el resultado en la base de datos y lo devuelve.
 */
export function calculateHealthScore(): HealthScore {
  logger.info('Calculando Health Score...');

  const factors = buildHealthFactors();
  const factorResults: HealthScore['factors'] = [];
  let totalScore = 0;

  for (const factor of factors) {
    try {
      const score = Math.max(0, Math.min(100, Math.round(factor.calculate())));
      const weightedScore = score * factor.weight;
      totalScore += weightedScore;

      factorResults.push({
        name: factor.name,
        score,
        weight: factor.weight,
        description: factor.description,
      });

      logger.debug(`Factor "${factor.name}": ${score}/100 (peso: ${factor.weight})`);
    } catch (err) {
      logger.error(`Error calculando factor "${factor.name}": ${(err as Error).message}`);
      // Use neutral score if calculation fails
      factorResults.push({
        name: factor.name,
        score: 50,
        weight: factor.weight,
        description: factor.description,
      });
      totalScore += 50 * factor.weight;
    }
  }

  const finalScore = Math.round(totalScore);
  const category = scoreToCategory(finalScore);
  const trend = calculateTrend(finalScore);

  // Save to database
  const stored = healthRepo.create({
    score: finalScore,
    category,
    factors: factorResults,
    trend,
  });

  // Broadcast via WebSocket
  broadcastEvent('health:updated', {
    score: finalScore,
    category,
    trend,
    factors: factorResults,
  });

  logger.info(
    `Health Score: ${finalScore}/100 (${category}) - Tendencia: ${trend}`
  );

  return stored;
}
