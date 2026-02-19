import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { deviceRepo } from '../db/repositories/device.repo.js';
import { metricRepo } from '../db/repositories/metric.repo.js';
import type { Device, Metric } from '@netcheckup/shared';

const execAsync = promisify(exec);

/**
 * Hace ping a un host usando el comando nativo del sistema.
 * Parsea la salida para extraer latencia, packet loss y jitter.
 */
async function pingHost(host: string, count: number = 3): Promise<{
  alive: boolean;
  latencyMs: number | null;
  packetLoss: number;
  jitter: number | null;
}> {
  try {
    const cmd =
      process.platform === 'win32'
        ? `ping -n ${count} -w 3000 ${host}`
        : `ping -c ${count} -W 3 ${host}`;

    const { stdout } = await execAsync(cmd, { timeout: count * 5000 });

    // Parse individual round-trip times
    const times: number[] = [];
    // Matches "time=2.45 ms" or "time=2.45ms" or "time<1ms"
    const timeRegex = /time[=<]([\d.]+)\s*ms/gi;
    let match: RegExpExecArray | null;
    while ((match = timeRegex.exec(stdout)) !== null) {
      times.push(parseFloat(match[1]));
    }

    // Parse packet loss from summary line
    let packetLoss = 0;
    const lossMatch = stdout.match(/([\d.]+)%\s*packet\s*loss/i);
    if (lossMatch) {
      packetLoss = parseFloat(lossMatch[1]);
    } else if (times.length === 0) {
      packetLoss = 100;
    } else {
      packetLoss = ((count - times.length) / count) * 100;
    }

    if (times.length === 0) {
      return { alive: false, latencyMs: null, packetLoss: 100, jitter: null };
    }

    const avgLatency = times.reduce((a, b) => a + b, 0) / times.length;

    // Calculate jitter (average variation between consecutive measurements)
    let jitter: number | null = null;
    if (times.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < times.length; i++) {
        diffs.push(Math.abs(times[i] - times[i - 1]));
      }
      jitter = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    }

    return {
      alive: true,
      latencyMs: Math.round(avgLatency * 100) / 100,
      packetLoss: Math.round(packetLoss * 100) / 100,
      jitter: jitter !== null ? Math.round(jitter * 100) / 100 : null,
    };
  } catch (err) {
    // ping command exits with non-zero code when host is unreachable
    // Check if stdout has partial results (some packets received)
    const error = err as { stdout?: string; message: string };
    if (error.stdout) {
      const times: number[] = [];
      const timeRegex = /time[=<]([\d.]+)\s*ms/gi;
      let match: RegExpExecArray | null;
      while ((match = timeRegex.exec(error.stdout)) !== null) {
        times.push(parseFloat(match[1]));
      }

      if (times.length > 0) {
        const avgLatency = times.reduce((a, b) => a + b, 0) / times.length;
        const packetLoss = ((count - times.length) / count) * 100;

        let jitter: number | null = null;
        if (times.length >= 2) {
          const diffs: number[] = [];
          for (let i = 1; i < times.length; i++) {
            diffs.push(Math.abs(times[i] - times[i - 1]));
          }
          jitter = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        }

        return {
          alive: true,
          latencyMs: Math.round(avgLatency * 100) / 100,
          packetLoss: Math.round(packetLoss * 100) / 100,
          jitter: jitter !== null ? Math.round(jitter * 100) / 100 : null,
        };
      }
    }

    logger.debug(`Error haciendo ping a ${host}`, { error: error.message });
    return { alive: false, latencyMs: null, packetLoss: 100, jitter: null };
  }
}

/**
 * Determina el status del dispositivo según las métricas.
 */
function determineStatus(
  alive: boolean,
  latencyMs: number | null,
  packetLoss: number,
  thresholdLatencyMs: number = 100,
  thresholdPacketLoss: number = 5
): 'online' | 'offline' | 'degraded' {
  if (!alive) return 'offline';
  if (
    (latencyMs !== null && latencyMs > thresholdLatencyMs) ||
    packetLoss > thresholdPacketLoss
  ) {
    return 'degraded';
  }
  return 'online';
}

/**
 * Ejecuta un ping a un dispositivo específico y guarda la métrica.
 */
export async function pingDevice(device: Device): Promise<Metric> {
  const result = await pingHost(device.ipAddress);

  const metric = metricRepo.create({
    deviceId: device.id,
    latencyMs: result.latencyMs,
    packetLoss: result.packetLoss,
    jitter: result.jitter,
    isReachable: result.alive,
  });

  // Actualizar status y métricas del dispositivo
  const newStatus = determineStatus(result.alive, result.latencyMs, result.packetLoss);
  deviceRepo.update(device.id, {
    status: newStatus,
    latencyMs: result.latencyMs,
    packetLoss: result.packetLoss,
  });

  return metric;
}

/**
 * Ejecuta ping a todos los dispositivos monitoreados.
 */
export async function pingAllDevices(): Promise<Metric[]> {
  const devices = deviceRepo.findMonitored();
  if (devices.length === 0) {
    logger.debug('No hay dispositivos monitoreados para hacer ping');
    return [];
  }

  logger.debug(`Haciendo ping a ${devices.length} dispositivos`);
  const metrics: Metric[] = [];

  // Ping en paralelo con límite de concurrencia
  const concurrency = 10;
  for (let i = 0; i < devices.length; i += concurrency) {
    const batch = devices.slice(i, i + concurrency);
    const batchMetrics = await Promise.all(batch.map((d) => pingDevice(d)));
    metrics.push(...batchMetrics);
  }

  const online = metrics.filter((m) => m.isReachable).length;
  logger.debug(`Ping completado: ${online}/${devices.length} dispositivos online`);

  return metrics;
}
