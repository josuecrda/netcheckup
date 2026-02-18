import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, saveDatabase } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Ejecuta el schema SQL y aplica migraciones si es necesario.
 */
export function runMigrations(): void {
  const db = getDb();

  // Leer y ejecutar el schema base
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // sql.js exec() soporta múltiples statements
  db.exec(schemaSql);

  // Insertar metadatos iniciales
  db.run(
    `INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('schema_version', ?)`,
    [String(CURRENT_SCHEMA_VERSION)]
  );
  db.run(`INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('app_version', '0.1.0')`);

  saveDatabase();
}

/**
 * Obtiene la versión actual del schema de la DB.
 */
export function getSchemaVersion(): number {
  const db = getDb();
  try {
    const result = db.exec("SELECT value FROM app_metadata WHERE key = 'schema_version'");
    if (result.length > 0 && result[0].values.length > 0) {
      return parseInt(result[0].values[0][0] as string, 10);
    }
  } catch {
    // Tabla no existe todavía
  }
  return 0;
}
