import { v4 as uuidv4 } from 'uuid';
import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import type { Problem, ProblemSeverity, ProblemCategory } from '@netcheckup/shared';

export interface CreateProblemInput {
  severity: ProblemSeverity;
  category: ProblemCategory;
  title: string;
  description: string;
  affectedDevices: string[];
  impact: string;
  recommendation: string;
  ruleId: string;
}

function rowToProblem(row: Record<string, SqlValue>): Problem {
  return {
    id: row.id as string,
    detectedAt: row.detected_at as string,
    resolvedAt: row.resolved_at as string | null,
    severity: row.severity as ProblemSeverity,
    category: row.category as ProblemCategory,
    title: row.title as string,
    description: row.description as string,
    affectedDevices: row.affected_devices ? JSON.parse(row.affected_devices as string) : [],
    impact: row.impact as string,
    recommendation: row.recommendation as string,
    isActive: Boolean(row.is_active),
    ruleId: row.rule_id as string,
  };
}

export const problemRepo = {
  findAll(): Problem[] {
    return queryRows('SELECT * FROM problems ORDER BY detected_at DESC').map(rowToProblem);
  },

  findActive(): Problem[] {
    return queryRows(
      'SELECT * FROM problems WHERE is_active = 1 ORDER BY severity ASC, detected_at DESC'
    ).map(rowToProblem);
  },

  findById(id: string): Problem | null {
    const rows = queryRows('SELECT * FROM problems WHERE id = ?', [id]);
    return rows.length > 0 ? rowToProblem(rows[0]) : null;
  },

  findActiveByRuleId(ruleId: string): Problem | null {
    const rows = queryRows(
      'SELECT * FROM problems WHERE rule_id = ? AND is_active = 1 LIMIT 1',
      [ruleId]
    );
    return rows.length > 0 ? rowToProblem(rows[0]) : null;
  },

  /** Find active problem by rule and optionally a device ID (for per-device rules) */
  findActiveByRuleAndDevice(ruleId: string, deviceId?: string): Problem | null {
    if (deviceId) {
      // Check if there's an active problem for this rule that includes this device
      const all = this.findActive().filter(
        (p) => p.ruleId === ruleId && p.affectedDevices.includes(deviceId)
      );
      return all.length > 0 ? all[0] : null;
    }
    return this.findActiveByRuleId(ruleId);
  },

  create(input: CreateProblemInput): Problem {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO problems (id, detected_at, severity, category, title, description, affected_devices, impact, recommendation, is_active, rule_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        now,
        input.severity,
        input.category,
        input.title,
        input.description,
        JSON.stringify(input.affectedDevices),
        input.impact,
        input.recommendation,
        input.ruleId,
      ]
    );
    saveDatabase();

    return this.findById(id)!;
  },

  resolve(id: string): Problem | null {
    const db = getDb();
    const now = new Date().toISOString();
    db.run('UPDATE problems SET is_active = 0, resolved_at = ? WHERE id = ?', [now, id]);
    saveDatabase();
    return this.findById(id);
  },

  /** Auto-resolve all active problems for a given ruleId */
  resolveByRule(ruleId: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.run(
      'UPDATE problems SET is_active = 0, resolved_at = ? WHERE rule_id = ? AND is_active = 1',
      [now, ruleId]
    );
    saveDatabase();
  },

  /** Update an existing active problem's description/recommendation */
  updateActive(id: string, updates: Partial<Pick<Problem, 'title' | 'description' | 'impact' | 'recommendation' | 'severity' | 'affectedDevices'>>): void {
    const db = getDb();
    const sets: string[] = [];
    const values: SqlValue[] = [];

    if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description); }
    if (updates.impact !== undefined) { sets.push('impact = ?'); values.push(updates.impact); }
    if (updates.recommendation !== undefined) { sets.push('recommendation = ?'); values.push(updates.recommendation); }
    if (updates.severity !== undefined) { sets.push('severity = ?'); values.push(updates.severity); }
    if (updates.affectedDevices !== undefined) { sets.push('affected_devices = ?'); values.push(JSON.stringify(updates.affectedDevices)); }

    if (sets.length === 0) return;
    values.push(id);
    db.run(`UPDATE problems SET ${sets.join(', ')} WHERE id = ?`, values);
    saveDatabase();
  },

  countBySeverity(): { critical: number; warning: number; info: number } {
    const rows = queryRows(
      `SELECT severity, COUNT(*) as count FROM problems WHERE is_active = 1 GROUP BY severity`
    );
    const result = { critical: 0, warning: 0, info: 0 };
    for (const row of rows) {
      const sev = row.severity as string;
      if (sev in result) {
        result[sev as keyof typeof result] = row.count as number;
      }
    }
    return result;
  },
};
