import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config.js';
import { runDiscovery } from '../scanners/network-discovery.js';
import { pingAllDevices } from '../scanners/ping-monitor.js';
import { runSpeedTest } from '../scanners/speed-tester.js';
import { runDiagnostics } from '../analyzers/problem-detector.js';
import { calculateHealthScore } from '../analyzers/health-score.js';
import { broadcastEvent } from '../api/websocket.js';

const tasks: cron.ScheduledTask[] = [];

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
  const diagTask = cron.schedule('*/5 * * * *', () => {
    try {
      runDiagnostics();
      calculateHealthScore();
    } catch (err) {
      logger.error('Error en diagnóstico programado', { error: (err as Error).message });
    }
  });
  tasks.push(diagTask);
  logger.info('Motor de diagnóstico programado cada 5 minutos');
}

/**
 * Detiene todos los cron jobs.
 */
export function stopScheduler(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  logger.info('Scheduler detenido');
}
