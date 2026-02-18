import { v4 as uuidv4 } from 'uuid';
import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import type { Metric, MetricSummary } from '@netcheckup/shared';

export interface CreateMetricInput {
  deviceId: string;
  latencyMs: number | null;
  packetLoss: number;
  jitter: number | null;
  isReachable: boolean;
}

function rowToMetric(row: Record<string, SqlValue>): Metric {
  return {
    id: row.id as string,
    deviceId: row.device_id as string,
    timestamp: row.timestamp as string,
    latencyMs: row.latency_ms as number | null,
    packetLoss: row.packet_loss as number,
    jitter: row.jitter as number | null,
    isReachable: Boolean(row.is_reachable),
  };
}

function periodToHours(period: string): number {
  const map: Record<string, number> = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 168,
    '30d': 720,
  };
  return map[period] || 24;
}

export const metricRepo = {
  create(input: CreateMetricInput): Metric {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO metrics (id, device_id, timestamp, latency_ms, packet_loss, jitter, is_reachable)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.deviceId, now, input.latencyMs, input.packetLoss, input.jitter, input.isReachable ? 1 : 0]
    );
    saveDatabase();
    return {
      id,
      deviceId: input.deviceId,
      timestamp: now,
      latencyMs: input.latencyMs,
      packetLoss: input.packetLoss,
      jitter: input.jitter,
      isReachable: input.isReachable,
    };
  },

  findByDevice(deviceId: string, period: string = '24h'): Metric[] {
    const hours = periodToHours(period);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return queryRows(
      'SELECT * FROM metrics WHERE device_id = ? AND timestamp >= ? ORDER BY timestamp ASC',
      [deviceId, since]
    ).map(rowToMetric);
  },

  getLatestByDevice(deviceId: string): Metric | null {
    const rows = queryRows(
      'SELECT * FROM metrics WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1',
      [deviceId]
    );
    return rows.length > 0 ? rowToMetric(rows[0]) : null;
  },

  getLatestAll(): Metric[] {
    return queryRows(
      `SELECT m.* FROM metrics m
       INNER JOIN (SELECT device_id, MAX(timestamp) as max_ts FROM metrics GROUP BY device_id) latest
       ON m.device_id = latest.device_id AND m.timestamp = latest.max_ts`
    ).map(rowToMetric);
  },

  getSummary(deviceId: string, period: string = '24h'): MetricSummary {
    const hours = periodToHours(period);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const statsRows = queryRows(
      `SELECT
         AVG(latency_ms) as avg_latency,
         MIN(latency_ms) as min_latency,
         MAX(latency_ms) as max_latency,
         AVG(packet_loss) as avg_packet_loss,
         COUNT(*) as total,
         SUM(CASE WHEN is_reachable = 1 THEN 1 ELSE 0 END) as reachable_count
       FROM metrics WHERE device_id = ? AND timestamp >= ?`,
      [deviceId, since]
    );

    const stats = statsRows[0] || {};
    const total = (stats.total as number) || 1;
    const reachableCount = (stats.reachable_count as number) || 0;

    const dataPointRows = queryRows(
      'SELECT timestamp, latency_ms, packet_loss FROM metrics WHERE device_id = ? AND timestamp >= ? ORDER BY timestamp ASC',
      [deviceId, since]
    );

    return {
      deviceId,
      period,
      avgLatency: (stats.avg_latency as number) || 0,
      minLatency: (stats.min_latency as number) || 0,
      maxLatency: (stats.max_latency as number) || 0,
      avgPacketLoss: (stats.avg_packet_loss as number) || 0,
      uptimePercent: (reachableCount / total) * 100,
      dataPoints: dataPointRows.map((r) => ({
        timestamp: r.timestamp as string,
        latencyMs: (r.latency_ms as number) || 0,
        packetLoss: (r.packet_loss as number) || 0,
      })),
    };
  },

  // Limpieza de métricas antiguas (más de 30 días)
  cleanup(daysToKeep: number = 30): number {
    const db = getDb();
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    db.run('DELETE FROM metrics WHERE timestamp < ?', [cutoff]);
    const changes = db.getRowsModified();
    saveDatabase();
    return changes;
  },
};
