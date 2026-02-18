import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import type { AppSettings } from '@netcheckup/shared';

export const settingRepo = {
  get(key: string): string | null {
    const rows = queryRows('SELECT value FROM settings WHERE key = ?', [key]);
    return rows.length > 0 ? (rows[0].value as string) : null;
  },

  set(key: string, value: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.run(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, now]
    );
    saveDatabase();
  },

  getAll(): Record<string, string> {
    const rows = queryRows('SELECT key, value FROM settings');
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key as string] = row.value as string;
    }
    return result;
  },

  /** Carga todos los settings y los devuelve como un AppSettings parcial */
  getAppSettings(): Partial<AppSettings> {
    const raw = this.getAll();
    const settings: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw)) {
      // Intentar parsear JSON, booleans, y números
      if (value === 'true') settings[key] = true;
      else if (value === 'false') settings[key] = false;
      else if (value === 'null') settings[key] = null;
      else if (/^-?\d+(\.\d+)?$/.test(value)) settings[key] = Number(value);
      else settings[key] = value;
    }

    return settings as Partial<AppSettings>;
  },

  /** Guarda un AppSettings parcial en la DB */
  saveAppSettings(settings: Partial<AppSettings>): void {
    const db = getDb();
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(settings)) {
      const strValue = value === null ? 'null' : String(value);
      db.run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, strValue, now]
      );
    }
    saveDatabase();
  },
};
