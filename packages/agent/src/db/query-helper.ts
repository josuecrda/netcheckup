import type { SqlValue } from 'sql.js';
import { getDb } from './connection.js';

/**
 * Helper para ejecutar queries SELECT y retornar filas como objetos.
 */
export function queryRows(sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: Record<string, SqlValue>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, SqlValue>);
  }
  stmt.free();
  return rows;
}
