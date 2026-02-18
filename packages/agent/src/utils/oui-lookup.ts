import { logger } from './logger.js';

// Base de datos reducida de fabricantes conocidos por prefijo MAC (OUI)
// Se usa como fallback si el paquete 'oui' no funciona correctamente
const KNOWN_VENDORS: Record<string, string> = {
  '00:50:56': 'VMware',
  '00:0C:29': 'VMware',
  '00:1C:42': 'Parallels',
  '08:00:27': 'VirtualBox',
  'B8:27:EB': 'Raspberry Pi',
  'DC:A6:32': 'Raspberry Pi',
  'E4:5F:01': 'Raspberry Pi',
  '00:17:88': 'Philips Hue',
  '00:1A:22': 'eQ-3 (Homematic)',
  'AC:DE:48': 'Amazon',
  'F0:F0:A4': 'Amazon',
  '68:54:FD': 'Amazon',
  'A4:08:EA': 'Murata (PlayStation)',
  '00:D9:D1': 'Sony PlayStation',
  '7C:BB:8A': 'Nintendo',
  '00:1F:32': 'Nintendo',
  '58:2D:34': 'Qingping (Xiaomi)',
  '78:11:DC': 'Xiaomi',
  '64:CE:85': 'Xiaomi',
  '50:EC:50': 'Beijing Xiaomi',
  'A4:C1:38': 'Samsung',
  '00:1A:8A': 'Samsung',
  'F4:F5:D8': 'Google',
  '3C:5A:B4': 'Google',
  'A4:77:33': 'Google',
  '00:1A:11': 'Google',
  '3C:22:FB': 'Apple',
  'F0:B4:79': 'Apple',
  'A8:5C:2C': 'Apple',
  '00:1E:C2': 'Apple',
  'F8:FF:C2': 'Apple',
  '88:E9:FE': 'Apple',
  '00:03:7F': 'Atheros',
  '00:1B:63': 'Apple',
  'B0:BE:76': 'TP-Link',
  'C0:25:E9': 'TP-Link',
  '50:C7:BF': 'TP-Link',
  '14:CC:20': 'TP-Link',
  '00:18:E7': 'Cameo (D-Link)',
  '00:1E:58': 'D-Link',
  'C8:D7:19': 'Cisco-Linksys',
  '00:25:9C': 'Cisco-Linksys',
  '20:AA:4B': 'Cisco-Linksys',
  'E8:DE:27': 'TP-Link',
  '30:B5:C2': 'TP-Link',
  '00:0F:66': 'Cisco',
  '00:1B:D4': 'Cisco',
  '00:26:0B': 'Cisco',
  '00:1D:A1': 'Cisco',
  '00:04:96': 'Extreme Networks',
  '00:40:96': 'Cisco',
  '00:22:6B': 'Cisco',
  'B4:B0:24': 'Ubiquiti',
  '24:5A:4C': 'Ubiquiti',
  '68:72:51': 'Ubiquiti',
  '00:1B:21': 'Intel',
  '00:15:17': 'Intel',
  '3C:97:0E': 'Intel',
  '00:02:B3': 'Intel',
  '18:31:BF': 'ASUSTeK',
  '00:1E:8C': 'ASUSTeK',
  'E0:3F:49': 'ASUSTeK',
  '2C:56:DC': 'ASUSTeK',
  '00:24:1D': 'Giga-Byte Technology',
  '00:1D:7D': 'Giga-Byte Technology',
  'F0:2F:74': 'HP',
  '00:1E:0B': 'HP',
  '00:17:A4': 'HP',
  '00:14:38': 'HP',
  '00:25:B3': 'HP',
  '00:60:B0': 'HP',
  'F0:DE:F1': 'Epson',
  '00:26:AB': 'Epson',
  '00:1B:A9': 'Brother',
  '00:80:77': 'Brother',
  '30:05:5C': 'Brother',
  '00:00:48': 'Epson',
  '00:1E:65': 'Intel',
  'CC:2D:E0': 'Routerboard (MikroTik)',
  '00:0C:42': 'MikroTik',
  '6C:3B:6B': 'MikroTik',
};

let ouiModule: { default?: (mac: string) => string | undefined } | null = null;

async function loadOuiModule(): Promise<void> {
  try {
    ouiModule = await import('oui');
  } catch {
    logger.warn('No se pudo cargar el módulo OUI. Usando base de datos interna reducida.');
  }
}

// Inicializar al cargar
loadOuiModule();

/**
 * Busca el fabricante a partir de una MAC address.
 * Intenta usar el módulo oui primero, luego fallback a la DB interna.
 */
export function lookupVendor(macAddress: string): string | null {
  if (!macAddress) return null;

  const normalized = macAddress.toUpperCase().replace(/-/g, ':');

  // Intentar con módulo oui
  if (ouiModule?.default) {
    try {
      const result = ouiModule.default(normalized);
      if (result) {
        // oui devuelve un string multilínea, tomar solo la primera línea (nombre del fabricante)
        return result.split('\n')[0].trim();
      }
    } catch {
      // Silenciar errores del módulo oui
    }
  }

  // Fallback: buscar en nuestra DB interna por prefijo (primeros 3 octetos)
  const prefix = normalized.substring(0, 8);
  return KNOWN_VENDORS[prefix] || null;
}
