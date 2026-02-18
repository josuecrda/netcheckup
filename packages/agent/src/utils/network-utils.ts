import os from 'os';
import { execSync } from 'child_process';
import { logger } from './logger.js';

export interface NetworkInfo {
  localIp: string;
  subnet: string;
  gateway: string | null;
  netmask: string;
  interfaceName: string;
}

/**
 * Obtiene la IP local principal (no loopback, no virtual).
 */
export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Obtiene la máscara de red de la interfaz activa.
 */
export function getNetmask(): string {
  const interfaces = os.networkInterfaces();
  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.netmask;
      }
    }
  }
  return '255.255.255.0';
}

/**
 * Calcula el rango de subnet a partir de IP y máscara.
 * Ejemplo: 192.168.1.50/255.255.255.0 → "192.168.1"
 */
export function getSubnet(ip?: string, mask?: string): string {
  const localIp = ip || getLocalIP();
  const netmask = mask || getNetmask();

  const ipParts = localIp.split('.').map(Number);
  const maskParts = netmask.split('.').map(Number);

  const networkParts = ipParts.map((part, i) => part & maskParts[i]);
  // Para una /24 retorna "192.168.1"
  return networkParts.slice(0, 3).join('.');
}

/**
 * Obtiene la IP del gateway/router por defecto.
 */
export function getGateway(): string | null {
  try {
    if (process.platform === 'win32') {
      const output = execSync('ipconfig', { encoding: 'utf-8' });
      const match = output.match(/Default Gateway[\s.]*:\s*([\d.]+)/i) ||
                    output.match(/Puerta de enlace predeterminada[\s.]*:\s*([\d.]+)/i);
      return match ? match[1] : null;
    } else if (process.platform === 'darwin') {
      const output = execSync('route -n get default 2>/dev/null', { encoding: 'utf-8' });
      const match = output.match(/gateway:\s*([\d.]+)/);
      return match ? match[1] : null;
    } else {
      // Linux
      const output = execSync('ip route show default 2>/dev/null', { encoding: 'utf-8' });
      const match = output.match(/default via ([\d.]+)/);
      return match ? match[1] : null;
    }
  } catch (err) {
    logger.warn('No se pudo detectar el gateway', { error: (err as Error).message });
    return null;
  }
}

/**
 * Obtiene la MAC address del host local.
 */
export function getLocalMac(): string | null {
  const interfaces = os.networkInterfaces();
  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal && addr.mac !== '00:00:00:00:00:00') {
        return addr.mac;
      }
    }
  }
  return null;
}

/**
 * Obtiene toda la info de red principal.
 */
export function getNetworkInfo(): NetworkInfo {
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return {
          localIp: addr.address,
          subnet: getSubnet(addr.address, addr.netmask),
          gateway: getGateway(),
          netmask: addr.netmask,
          interfaceName: name,
        };
      }
    }
  }
  return {
    localIp: '127.0.0.1',
    subnet: '127.0.0',
    gateway: null,
    netmask: '255.255.255.0',
    interfaceName: 'lo',
  };
}

/**
 * Genera un rango de IPs para escanear una subnet /24.
 */
export function generateIpRange(subnet: string): string[] {
  const ips: string[] = [];
  for (let i = 1; i <= 254; i++) {
    ips.push(`${subnet}.${i}`);
  }
  return ips;
}
