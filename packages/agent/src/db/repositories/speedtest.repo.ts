import { v4 as uuidv4 } from 'uuid';
import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import type { SpeedTestResult } from '@netcheckup/shared';

export interface CreateSpeedTestInput {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitter?: number | null;
  isp?: string | null;
  serverName?: string | null;
  serverLocation?: string | null;
  contractedDownloadMbps?: number | null;
  contractedUploadMbps?: number | null;
  triggeredBy: 'manual' | 'scheduled';
}

function rowToSpeedTest(row: Record<string, SqlValue>): SpeedTestResult {
  return {
    id: row.id as string,
    timestamp: row.timestamp as string,
    downloadMbps: row.download_mbps as number,
    uploadMbps: row.upload_mbps as number,
    pingMs: row.ping_ms as number,
    jitter: row.jitter as number | null,
    isp: row.isp as string | null,
    serverName: row.server_name as string | null,
    serverLocation: row.server_location as string | null,
    contractedDownloadMbps: row.contracted_download_mbps as number | null,
    contractedUploadMbps: row.contracted_upload_mbps as number | null,
    downloadPercent: row.download_percent as number | null,
    uploadPercent: row.upload_percent as number | null,
    triggeredBy: row.triggered_by as 'manual' | 'scheduled',
  };
}

export const speedTestRepo = {
  findAll(limit: number = 50): SpeedTestResult[] {
    return queryRows('SELECT * FROM speed_tests ORDER BY timestamp DESC LIMIT ?', [limit]).map(
      rowToSpeedTest
    );
  },

  getLatest(): SpeedTestResult | null {
    const rows = queryRows('SELECT * FROM speed_tests ORDER BY timestamp DESC LIMIT 1');
    return rows.length > 0 ? rowToSpeedTest(rows[0]) : null;
  },

  create(input: CreateSpeedTestInput): SpeedTestResult {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    const downloadPercent =
      input.contractedDownloadMbps && input.contractedDownloadMbps > 0
        ? Math.round((input.downloadMbps / input.contractedDownloadMbps) * 100)
        : null;
    const uploadPercent =
      input.contractedUploadMbps && input.contractedUploadMbps > 0
        ? Math.round((input.uploadMbps / input.contractedUploadMbps) * 100)
        : null;

    db.run(
      `INSERT INTO speed_tests (id, timestamp, download_mbps, upload_mbps, ping_ms, jitter, isp, server_name, server_location, contracted_download_mbps, contracted_upload_mbps, download_percent, upload_percent, triggered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, now, input.downloadMbps, input.uploadMbps, input.pingMs,
        input.jitter ?? null, input.isp ?? null, input.serverName ?? null, input.serverLocation ?? null,
        input.contractedDownloadMbps ?? null, input.contractedUploadMbps ?? null,
        downloadPercent, uploadPercent, input.triggeredBy,
      ]
    );
    saveDatabase();

    const rows = queryRows('SELECT * FROM speed_tests WHERE id = ?', [id]);
    return rowToSpeedTest(rows[0]);
  },

  getAverage(period: string = '7d'): { avgDownload: number; avgUpload: number; avgPing: number; count: number } {
    const hours = period === '30d' ? 720 : 168;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const rows = queryRows(
      `SELECT AVG(download_mbps) as avg_download, AVG(upload_mbps) as avg_upload, AVG(ping_ms) as avg_ping, COUNT(*) as count
       FROM speed_tests WHERE timestamp >= ?`,
      [since]
    );

    const row = rows[0] || {};
    return {
      avgDownload: (row.avg_download as number) || 0,
      avgUpload: (row.avg_upload as number) || 0,
      avgPing: (row.avg_ping as number) || 0,
      count: (row.count as number) || 0,
    };
  },
};
