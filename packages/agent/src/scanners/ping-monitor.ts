import ping from 'ping';
import { logger } from '../utils/logger.js';
import { deviceRepo } from '../db/repositories/device.repo.js';
import { metricRepo } from '../db/repositories/metric.repo.js';
import type { Device, Metric } from '@netcheckup/shared';

interface PingResponse {
  alive: boolean;
  time: number | string;
  packetLoss: string;
}

/**
 * Hace ping a un host y retorna los resultados.
 */
async function pingHost(host: string, count: number = 3): Promise<{
  alive: boolean;
  latencyMs: number | null;
  packetLoss: number;
  jitter: number | null;
}> {
  try {
    const responses: number[] = [];

    for (let i = 0; i < count; i++) {
      const res: PingResponse = await ping.promise.probe(host, {
        timeout: 5,
        min_reply: 1,
      });

      if (res.alive && typeof res.time === 'number') {
        responses.push(res.time);
      }
    }

    if (responses.length === 0) {
      return { alive: false, latencyMs: null, packetLoss: 100, jitter: null };
    }

    const avgLatency = responses.reduce((a, b) => a + b, 0) / responses.length;
    const packetLoss = ((count - responses.length) / count) * 100;

    // Calcular jitter (variación promedio entre mediciones consecutivas)
    let jitter: number | null = null;
    if (responses.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < responses.length; i++) {
        diffs.push(Math.abs(responses[i] - responses[i - 1]));
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
    logger.debug(`Error haciendo ping a ${host}`, { error: (err as Error).message });
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
