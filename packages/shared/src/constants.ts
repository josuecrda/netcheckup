// Puerto por defecto de la aplicación
export const DEFAULT_PORT = 7890;

// Versión de la aplicación
export const APP_VERSION = '0.1.0';

// Nombre de la aplicación
export const APP_NAME = 'NetCheckup';

// Categorías del Health Score
export const HEALTH_CATEGORIES = {
  EXCELLENT: { min: 80, max: 100, label: 'Excelente', color: '#10b981' },
  GOOD: { min: 60, max: 79, label: 'Bueno', color: '#f59e0b' },
  FAIR: { min: 40, max: 59, label: 'Regular', color: '#f97316' },
  CRITICAL: { min: 0, max: 39, label: 'Crítico', color: '#ef4444' },
} as const;

// Puertos de riesgo conocidos
export const RISKY_PORTS = [23, 3389, 5900, 8080, 8443] as const;

// Puertos comunes y sus servicios
export const COMMON_PORTS: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  993: 'IMAPS',
  995: 'POP3S',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5900: 'VNC',
  8080: 'HTTP Alt',
  8443: 'HTTPS Alt',
};

// Umbrales por defecto
export const DEFAULT_THRESHOLDS = {
  highLatencyMs: 100,
  packetLossPercent: 5,
  speedDegradedPercent: 50,
  alertCooldownMinutes: 30,
} as const;

// Intervalos por defecto (en las unidades indicadas)
export const DEFAULT_INTERVALS = {
  scanMinutes: 30,
  pingSeconds: 60,
  speedTestMinutes: 360,
} as const;
