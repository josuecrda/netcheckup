import { v4 as uuidv4 } from 'uuid';
import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import type { Scan, ScanType, ScanStatus } from '@netcheckup/shared';

function rowToScan(row: Record<string, SqlValue>): Scan {
  return {
    id: row.id as string,
    type: row.type as ScanType,
    status: row.status as ScanStatus,
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | null,
    devicesFound: row.devices_found as number,
    newDevices: row.new_devices as number,
    duration: row.duration_ms as number,
    triggeredBy: row.triggered_by as 'manual' | 'scheduled',
  };
}

export const scanRepo = {
  findAll(limit: number = 50): Scan[] {
    return queryRows('SELECT * FROM scans ORDER BY started_at DESC LIMIT ?', [limit]).map(rowToScan);
  },

  findById(id: string): Scan | null {
    const rows = queryRows('SELECT * FROM scans WHERE id = ?', [id]);
    return rows.length > 0 ? rowToScan(rows[0]) : null;
  },

  getLatestByType(): Scan[] {
    return queryRows(
      `SELECT s.* FROM scans s
       INNER JOIN (SELECT type, MAX(started_at) as max_ts FROM scans WHERE status = 'completed' GROUP BY type) latest
       ON s.type = latest.type AND s.started_at = latest.max_ts`
    ).map(rowToScan);
  },

  create(type: ScanType, triggeredBy: 'manual' | 'scheduled'): Scan {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO scans (id, type, status, started_at, triggered_by) VALUES (?, ?, ?, ?, ?)',
      [id, type, 'running', now, triggeredBy]
    );
    saveDatabase();
    return this.findById(id)!;
  },

  complete(id: string, devicesFound: number, newDevices: number): Scan | null {
    const db = getDb();
    const now = new Date().toISOString();
    const scan = this.findById(id);
    if (!scan) return null;

    const duration = new Date(now).getTime() - new Date(scan.startedAt).getTime();
    db.run(
      'UPDATE scans SET status = ?, completed_at = ?, devices_found = ?, new_devices = ?, duration_ms = ? WHERE id = ?',
      ['completed', now, devicesFound, newDevices, duration, id]
    );
    saveDatabase();
    return this.findById(id);
  },

  fail(id: string, errorMessage: string): Scan | null {
    const db = getDb();
    const now = new Date().toISOString();
    db.run(
      'UPDATE scans SET status = ?, completed_at = ?, error_message = ? WHERE id = ?',
      ['failed', now, errorMessage, id]
    );
    saveDatabase();
    return this.findById(id);
  },
};
