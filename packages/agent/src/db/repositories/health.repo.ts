import { v4 as uuidv4 } from 'uuid';
import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import type { HealthScore, HealthCategory } from '@netcheckup/shared';

export interface CreateHealthScoreInput {
  score: number;
  category: HealthCategory;
  factors: HealthScore['factors'];
  trend: HealthScore['trend'];
}

function rowToHealthScore(row: Record<string, SqlValue>): HealthScore & { id: string } {
  const factors = JSON.parse(row.factors as string);
  return {
    id: row.id as string,
    score: row.score as number,
    category: row.category as HealthCategory,
    calculatedAt: row.calculated_at as string,
    factors,
    trend: row.trend as HealthScore['trend'],
    previousScore: null, // Populated by the caller
  };
}

export const healthRepo = {
  getLatest(): (HealthScore & { id: string }) | null {
    const rows = queryRows('SELECT * FROM health_scores ORDER BY calculated_at DESC LIMIT 1');
    if (rows.length === 0) return null;

    const current = rowToHealthScore(rows[0]);

    // Get previous score for trend display
    const prevRows = queryRows(
      'SELECT score FROM health_scores WHERE calculated_at < ? ORDER BY calculated_at DESC LIMIT 1',
      [current.calculatedAt]
    );
    if (prevRows.length > 0) {
      current.previousScore = prevRows[0].score as number;
    }

    return current;
  },

  getHistory(period: string = '7d'): (HealthScore & { id: string })[] {
    const hours = period === '30d' ? 720 : 168;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    return queryRows(
      'SELECT * FROM health_scores WHERE calculated_at >= ? ORDER BY calculated_at ASC',
      [since]
    ).map(rowToHealthScore);
  },

  create(input: CreateHealthScoreInput): HealthScore & { id: string } {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO health_scores (id, score, category, calculated_at, factors, trend)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.score,
        input.category,
        now,
        JSON.stringify(input.factors),
        input.trend,
      ]
    );
    saveDatabase();

    return this.getLatest()!;
  },

  /** Clean up old health scores (keep last N entries) */
  cleanup(keepCount: number = 500): number {
    const db = getDb();
    const rows = queryRows(
      'SELECT id FROM health_scores ORDER BY calculated_at DESC LIMIT -1 OFFSET ?',
      [keepCount]
    );
    if (rows.length === 0) return 0;
    const ids = rows.map((r) => `'${r.id}'`).join(',');
    db.run(`DELETE FROM health_scores WHERE id IN (${ids})`);
    saveDatabase();
    return rows.length;
  },
};
