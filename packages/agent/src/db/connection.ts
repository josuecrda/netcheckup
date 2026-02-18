import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;
let dbPath: string;

/**
 * Inicializa y retorna la conexión singleton a SQLite.
 * Si la DB no existe, la crea. Usa sql.js (WebAssembly).
 */
export async function getDatabase(customPath?: string): Promise<Database> {
  if (db) return db;

  dbPath = customPath || path.resolve(process.cwd(), 'data', 'netcheckup.db');
  const dir = path.dirname(dbPath);

  // Crear directorio si no existe
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Si ya existe un archivo de DB, cargarlo
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Habilitar WAL mode para mejor concurrencia
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA foreign_keys=ON;');

  return db;
}

/**
 * Guarda la base de datos en disco.
 * sql.js opera en memoria, así que debemos persistir manualmente.
 */
export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Cierra la conexión y guarda en disco.
 */
export function closeDatabase(): void {
  if (!db) return;
  saveDatabase();
  db.close();
  db = null;
}

/**
 * Retorna la instancia actual de la DB (sin inicializar).
 * Lanza error si no se ha inicializado.
 */
export function getDb(): Database {
  if (!db) {
    throw new Error('Base de datos no inicializada. Llama a getDatabase() primero.');
  }
  return db;
}
