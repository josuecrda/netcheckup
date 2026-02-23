import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config.js';
import { runDiscovery } from '../scanners/network-discovery.js';
import { pingAllDevices } from '../scanners/ping-monitor.js';
import { runSpeedTest } from '../scanners/speed-tester.js';
import { runDiagnostics } from '../analyzers/problem-detector.js';
import { calculateHealthScore } from '../analyzers/health-score.js';
import { broadcastEvent } from '../api/websocket.js';
import { generateHealthReport } from '../reports/pdf-generator.js';
import { settingRepo } from '../db/repositories/setting.repo.js';
import { canUsePdfReports, canUseSnmp, getCurrentLimits } from '../license.js';
import { metricRepo } from '../db/repositories/metric.repo.js';
import { speedTestRepo } from '../db/repositories/speedtest.repo.js';
import { alertRepo } from '../db/repositories/alert.repo.js';
import { pollSnmpCounters } from '../scanners/snmp-poller.js';
import { snmpCounterRepo } from '../db/repositories/snmp-counter.repo.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tasks: cron.ScheduledTask[] = [];
let schedulerPaused = false;

/**
 * Inicia todos los cron jobs según la configuración.
 */
export function startScheduler(): void {
  const config = getConfig();

  // Escaneo de descubrimiento (cada N minutos)
  const scanInterval = config.network.scanInterval;
  if (scanInterval > 0) {
    const scanCron = `*/${scanInterval} * * * *`;
    const scanTask = cron.schedule(scanCron, async () => {
      try {
        logger.info('Escaneo de descubrimiento programado iniciado');
        broadcastEvent('scan:started', { type: 'discovery' });
        const result = await runDiscovery('scheduled');
        broadcastEvent('scan:completed', {
          type: 'discovery',
          devicesFound: result.devicesFound,
          newDevices: result.newDevices,
        });
      } catch (err) {
        logger.error('Error en escaneo programado', { error: (err as Error).message });
      }
    });
    tasks.push(scanTask);
    logger.info(`Escaneo de descubrimiento programado cada ${scanInterval} minutos`);
  }

  // Ping periódico (cada N segundos)
  const pingInterval = config.network.pingInterval;
  if (pingInterval > 0) {
    const pingCron = `*/${Math.max(1, Math.floor(pingInterval / 60))} * * * *`;
    const pingTask = cron.schedule(pingCron, async () => {
      try {
        const metrics = await pingAllDevices();
        const online = metrics.filter((m) => m.isReachable).length;
        logger.debug(`Ping completado: ${online}/${metrics.length} online`);
      } catch (err) {
        logger.error('Error en ping programado', { error: (err as Error).message });
      }
    });
    tasks.push(pingTask);
    logger.info(`Ping programado cada ${Math.max(1, Math.floor(pingInterval / 60))} minutos`);
  }

  // Speed test periódico (cada N minutos, 0 = desactivado)
  const speedInterval = config.network.speedTestInterval;
  if (speedInterval > 0) {
    const speedCron = `0 */${Math.floor(speedInterval / 60)} * * *`;
    const speedTask = cron.schedule(speedCron, async () => {
      try {
        logger.info('Speed test programado iniciado');
        broadcastEvent('speedtest:started', {});
        const result = await runSpeedTest('scheduled');
        broadcastEvent('speedtest:completed', { result });
      } catch (err) {
        logger.error('Error en speed test programado', { error: (err as Error).message });
      }
    });
    tasks.push(speedTask);
    logger.info(`Speed test programado cada ${speedInterval} minutos`);
  }

  // ─── Motor de diagnóstico + Health Score (cada 5 minutos) ───
  const diagTask = cron.schedule('*/5 * * * *', async () => {
    try {
      await runDiagnostics();
      calculateHealthScore();
    } catch (err) {
      logger.error('Error en diagnóstico programado', { error: (err as Error).message });
    }
  });
  tasks.push(diagTask);
  logger.info('Motor de diagnóstico programado cada 5 minutos');

  // ─── SNMP polling de contadores de switches (cada 5 minutos, solo Consultoría) ───
  const snmpPollTask = cron.schedule('*/5 * * * *', async () => {
    if (!canUseSnmp()) return;
    try {
      await pollSnmpCounters();
    } catch (err) {
      logger.error('Error en SNMP polling', { error: (err as Error).message });
    }
  });
  tasks.push(snmpPollTask);
  if (canUseSnmp()) {
    logger.info('SNMP polling de puertos programado cada 5 minutos');
  }

  // ─── Reportes programados (weekly: lunes 6am, monthly: día 1 a las 6am) ───
  const weeklyReportTask = cron.schedule('0 6 * * *', async () => {
    try {
      if (!canUsePdfReports()) return;
      const settings = settingRepo.getAppSettings();
      if (!settings.weeklyReportEnabled) return;
      const targetDay = settings.weeklyReportDay ?? 1; // 0=dom, 1=lun...
      if (new Date().getDay() !== targetDay) return;

      logger.info('Generando reporte semanal programado');
      const pdfBuffer = await generateHealthReport('7d');
      const reportsDir = path.resolve(__dirname, '..', '..', 'data', 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const filename = `reporte_semanal_${new Date().toISOString().split('T')[0]}.pdf`;
      fs.writeFileSync(path.join(reportsDir, filename), pdfBuffer);
      logger.info(`Reporte semanal guardado: ${filename}`);
    } catch (err) {
      logger.error('Error generando reporte semanal', { error: (err as Error).message });
    }
  });
  tasks.push(weeklyReportTask);

  const monthlyReportTask = cron.schedule('0 6 1 * *', async () => {
    try {
      if (!canUsePdfReports()) return;
      const settings = settingRepo.getAppSettings();
      if (!settings.monthlyReportEnabled) return;

      logger.info('Generando reporte mensual programado');
      const pdfBuffer = await generateHealthReport('30d');
      const reportsDir = path.resolve(__dirname, '..', '..', 'data', 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const filename = `reporte_mensual_${new Date().toISOString().split('T')[0]}.pdf`;
      fs.writeFileSync(path.join(reportsDir, filename), pdfBuffer);
      logger.info(`Reporte mensual guardado: ${filename}`);
    } catch (err) {
      logger.error('Error generando reporte mensual', { error: (err as Error).message });
    }
  });
  tasks.push(monthlyReportTask);
  logger.info('Reportes programados configurados (weekly + monthly)');

  // ─── Data retention cleanup (diario a las 3am) ───
  const cleanupTask = cron.schedule('0 3 * * *', () => {
    try {
      const limits = getCurrentLimits();
      if (limits.dataRetentionHours === -1) return; // ilimitado

      const hours = limits.dataRetentionHours;
      const deletedMetrics = metricRepo.deleteOlderThan(hours);
      const deletedSpeed = speedTestRepo.deleteOlderThan(hours);
      const deletedAlerts = alertRepo.deleteOlderThan(hours);
      // SNMP counters siempre se limpian a 24h (son datos de alta frecuencia)
      let deletedSnmp = 0;
      try {
        deletedSnmp = snmpCounterRepo.deleteOlderThan(Math.min(hours, 24));
      } catch { /* tabla puede no existir aún */ }
      const total = deletedMetrics + deletedSpeed + deletedAlerts + deletedSnmp;
      if (total > 0) {
        logger.info(`Data retention cleanup: ${total} registros eliminados (>${hours}h) — metrics: ${deletedMetrics}, speed: ${deletedSpeed}, alerts: ${deletedAlerts}, snmp: ${deletedSnmp}`);
      }
    } catch (err) {
      logger.error('Error en data retention cleanup', { error: (err as Error).message });
    }
  });
  tasks.push(cleanupTask);
  logger.info('Data retention cleanup programado (diario 3am)');
}

/**
 * Pausa todos los cron jobs sin eliminarlos (para poder reanudarlos).
 */
export function pauseScheduler(): void {
  if (schedulerPaused) return;
  for (const task of tasks) {
    task.stop();
  }
  schedulerPaused = true;
  logger.info('Scheduler pausado (red incorrecta)');
}

/**
 * Reanuda los cron jobs previamente pausados.
 */
export function resumeScheduler(): void {
  if (!schedulerPaused) return;
  for (const task of tasks) {
    task.start();
  }
  schedulerPaused = false;
  logger.info('Scheduler reanudado');
}

/**
 * Indica si el scheduler está pausado.
 */
export function isSchedulerPaused(): boolean {
  return schedulerPaused;
}

/**
 * Detiene todos los cron jobs.
 */
export function stopScheduler(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  schedulerPaused = false;
  logger.info('Scheduler detenido');
}
