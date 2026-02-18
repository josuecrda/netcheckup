import { getDb, saveDatabase } from './connection.js';

const CURRENT_SCHEMA_VERSION = 1;

// Schema embebido para que funcione tanto en dev como en bundle
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  mac_address TEXT NOT NULL UNIQUE,
  hostname TEXT,
  custom_name TEXT,
  vendor TEXT,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  is_gateway INTEGER NOT NULL DEFAULT 0,
  is_monitored INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  latest_latency_ms REAL,
  latest_packet_loss REAL,
  open_ports TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac_address);

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  devices_found INTEGER DEFAULT 0,
  new_devices INTEGER DEFAULT 0,
  duration_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'scheduled',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scans_type ON scans(type);
CREATE INDEX IF NOT EXISTS idx_scans_started ON scans(started_at);

CREATE TABLE IF NOT EXISTS metrics (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  latency_ms REAL,
  packet_loss REAL NOT NULL DEFAULT 0,
  jitter REAL,
  is_reachable INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metrics_device ON metrics(device_id);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON metrics(device_id, timestamp);

CREATE TABLE IF NOT EXISTS speed_tests (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  download_mbps REAL NOT NULL,
  upload_mbps REAL NOT NULL,
  ping_ms REAL NOT NULL,
  jitter REAL,
  isp TEXT,
  server_name TEXT,
  server_location TEXT,
  contracted_download_mbps REAL,
  contracted_upload_mbps REAL,
  download_percent REAL,
  upload_percent REAL,
  triggered_by TEXT NOT NULL DEFAULT 'scheduled'
);

CREATE INDEX IF NOT EXISTS idx_speed_tests_timestamp ON speed_tests(timestamp);

CREATE TABLE IF NOT EXISTS health_scores (
  id TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  category TEXT NOT NULL,
  calculated_at TEXT NOT NULL,
  factors TEXT NOT NULL,
  trend TEXT NOT NULL DEFAULT 'stable'
);

CREATE INDEX IF NOT EXISTS idx_health_scores_time ON health_scores(calculated_at);

CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  detected_at TEXT NOT NULL,
  resolved_at TEXT,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_devices TEXT,
  impact TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  rule_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_problems_active ON problems(is_active);
CREATE INDEX IF NOT EXISTS idx_problems_severity ON problems(severity);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  device_id TEXT,
  problem_id TEXT,
  created_at TEXT NOT NULL,
  read_at TEXT,
  sent_via TEXT NOT NULL DEFAULT '["inapp"]',
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read_at);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/**
 * Ejecuta el schema SQL y aplica migraciones si es necesario.
 */
export function runMigrations(): void {
  const db = getDb();

  db.exec(SCHEMA_SQL);

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
