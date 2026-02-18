import net from 'net';
import { logger } from '../utils/logger.js';
import type { PortScanResult } from '@netcheckup/shared';

/**
 * Mapa de puertos comunes a nombres de servicio.
 */
const COMMON_SERVICES: Record<number, string> = {
  20: 'FTP Data',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  111: 'RPCBind',
  135: 'MSRPC',
  139: 'NetBIOS',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'MSSQL',
  1521: 'Oracle',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8080: 'HTTP Proxy',
  8443: 'HTTPS Alt',
  9090: 'Prometheus',
  27017: 'MongoDB',
};

/** Default ports to scan if none specified */
const DEFAULT_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445,
  993, 995, 1433, 3306, 3389, 5432, 5900, 8080, 8443,
];

/**
 * Escanea un puerto individual usando TCP connect.
 */
function scanPort(
  host: string,
  port: number,
  timeout: number = 3000
): Promise<'open' | 'closed'> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve('open');
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve('closed');
    });

    socket.on('error', () => {
      socket.destroy();
      resolve('closed');
    });

    socket.connect(port, host);
  });
}

/**
 * Escanea múltiples puertos de un host.
 */
export async function portScan(
  host: string,
  ports?: number[],
  range?: { start: number; end: number }
): Promise<PortScanResult> {
  const startTime = Date.now();

  // Determinar qué puertos escanear
  let portsToScan: number[];
  if (range) {
    portsToScan = [];
    for (let p = range.start; p <= range.end; p++) {
      portsToScan.push(p);
    }
  } else if (ports && ports.length > 0) {
    portsToScan = ports;
  } else {
    portsToScan = DEFAULT_PORTS;
  }

  // Limitar a 1000 puertos max para no sobrecargar
  if (portsToScan.length > 1000) {
    portsToScan = portsToScan.slice(0, 1000);
  }

  logger.info(`Escaneando ${portsToScan.length} puertos en ${host}...`);

  const results: PortScanResult['ports'] = [];

  // Escanear en batches de 20 para no abrir demasiadas conexiones
  const concurrency = 20;
  for (let i = 0; i < portsToScan.length; i += concurrency) {
    const batch = portsToScan.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (port) => {
        const state = await scanPort(host, port);
        return {
          port,
          state: state as 'open' | 'closed' | 'filtered',
          service: COMMON_SERVICES[port] || null,
        };
      })
    );
    results.push(...batchResults);
  }

  const scanDuration = Date.now() - startTime;
  const openPorts = results.filter((r) => r.state === 'open');
  logger.info(`Port scan completado: ${openPorts.length} puertos abiertos de ${portsToScan.length} escaneados en ${scanDuration}ms`);

  return {
    host,
    ports: results,
    scanDuration,
  };
}
