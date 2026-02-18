import { v4 as uuidv4 } from 'uuid';
import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import type { Alert, AlertType, ProblemSeverity } from '@netcheckup/shared';

export interface CreateAlertInput {
  type: AlertType;
  severity: ProblemSeverity;
  title: string;
  message: string;
  deviceId?: string | null;
  problemId?: string | null;
  sentVia?: ('inapp' | 'email' | 'telegram')[];
}

function rowToAlert(row: Record<string, SqlValue>): Alert {
  return {
    id: row.id as string,
    type: row.type as AlertType,
    severity: row.severity as ProblemSeverity,
    title: row.title as string,
    message: row.message as string,
    deviceId: row.device_id as string | null,
    problemId: row.problem_id as string | null,
    createdAt: row.created_at as string,
    readAt: row.read_at as string | null,
    sentVia: JSON.parse(row.sent_via as string),
  };
}

export const alertRepo = {
  findAll(page: number = 1, pageSize: number = 20, unreadOnly: boolean = false): { alerts: Alert[]; total: number } {
    const offset = (page - 1) * pageSize;
    const where = unreadOnly ? 'WHERE read_at IS NULL' : '';

    const countRows = queryRows(`SELECT COUNT(*) as count FROM alerts ${where}`);
    const total = (countRows[0].count as number) || 0;

    const alerts = queryRows(
      `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    ).map(rowToAlert);

    return { alerts, total };
  },

  findByDevice(deviceId: string): Alert[] {
    return queryRows(
      'SELECT * FROM alerts WHERE device_id = ? ORDER BY created_at DESC',
      [deviceId]
    ).map(rowToAlert);
  },

  getUnreadCount(): number {
    const rows = queryRows('SELECT COUNT(*) as count FROM alerts WHERE read_at IS NULL');
    return (rows[0].count as number) || 0;
  },

  create(input: CreateAlertInput): Alert {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const sentVia = JSON.stringify(input.sentVia || ['inapp']);

    db.run(
      `INSERT INTO alerts (id, type, severity, title, message, device_id, problem_id, created_at, sent_via)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.type, input.severity, input.title, input.message, input.deviceId ?? null, input.problemId ?? null, now, sentVia]
    );
    saveDatabase();

    const rows = queryRows('SELECT * FROM alerts WHERE id = ?', [id]);
    return rowToAlert(rows[0]);
  },

  markAsRead(id: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.run('UPDATE alerts SET read_at = ? WHERE id = ?', [now, id]);
    saveDatabase();
  },

  markAllAsRead(): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.run('UPDATE alerts SET read_at = ? WHERE read_at IS NULL', [now]);
    saveDatabase();
  },

  delete(id: string): boolean {
    const db = getDb();
    db.run('DELETE FROM alerts WHERE id = ?', [id]);
    saveDatabase();
    return true;
  },
};
