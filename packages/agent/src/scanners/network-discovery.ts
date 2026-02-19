import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import dns from 'dns';
import { logger } from '../utils/logger.js';
import { getSubnet, getGateway, generateIpRange, getLocalIP } from '../utils/network-utils.js';
import { lookupVendor } from '../utils/oui-lookup.js';
import { classifyDevice } from '../utils/device-classifier.js';
import { deviceRepo } from '../db/repositories/device.repo.js';
import { scanRepo } from '../db/repositories/scan.repo.js';
import type { Device } from '@netcheckup/shared';

const execAsync = promisify(exec);
const reverseLookup = promisify(dns.reverse);

interface ArpEntry {
  ip: string;
  mac: string;
}

/**
 * Parsea la tabla ARP del sistema operativo.
 */
function getArpTable(): ArpEntry[] {
  const entries: ArpEntry[] = [];

  try {
    let output: string;

    if (process.platform === 'win32') {
      output = execSync('arp -a', { encoding: 'utf-8', timeout: 15000 });
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(
          /\s+([\d.]+)\s+([0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2})\s+/
        );
        if (match) {
          const mac = match[2].replace(/-/g, ':').toLowerCase();
          if (mac !== 'ff:ff:ff:ff:ff:ff' && !mac.startsWith('01:00:5e')) {
            entries.push({ ip: match[1], mac });
          }
        }
      }
    } else {
      output = execSync('arp -an 2>/dev/null || arp -a 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 15000,
      });
      const lines = output.split('\n');
      for (const line of lines) {
        // macOS puede mostrar MACs con 1 o 2 dígitos por octeto (ej: 0:26:73 en vez de 00:26:73)
        const match = line.match(
          /\(([\d.]+)\)\s+at\s+([0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2}:[0-9a-fA-F]{1,2})/
        );
        if (match) {
          // Normalizar MAC a formato 00:xx:xx (2 dígitos por octeto)
          const normalizedMac = match[2]
            .toLowerCase()
            .split(':')
            .map((o) => o.padStart(2, '0'))
            .join(':');
          entries.push({ ip: match[1], mac: normalizedMac });
        }
      }
    }
  } catch (err) {
    logger.error('Error al leer tabla ARP', { error: (err as Error).message });
  }

  return entries;
}

/**
 * Hace ping a toda la subnet para poblar la tabla ARP.
 * Usa exec asíncrono para no bloquear el event loop.
 */
async function populateArpTable(subnet: string): Promise<void> {
  const ips = generateIpRange(subnet);
  logger.debug(`Haciendo ping sweep a ${ips.length} IPs en ${subnet}.0/24`);

  try {
    if (process.platform === 'win32') {
      // Ping en lotes asíncronos de 30 IPs, timeout 1s por ping
      const batchSize = 30;
      for (let i = 0; i < ips.length; i += batchSize) {
        const batch = ips.slice(i, i + batchSize);
        const cmds = batch.map((ip) => `ping -n 1 -w 1000 ${ip}`).join(' & ');
        try {
          await execAsync(cmds, { timeout: 30000 });
        } catch {
          // Timeouts esperados para IPs sin respuesta
        }
      }
    } else {
      try {
        // fping con 2 retries y 1000ms timeout para atrapar dispositivos lentos
        await execAsync(`fping -a -q -r 2 -t 1000 -g ${subnet}.0/24 2>/dev/null`, { timeout: 45000 });
      } catch {
        // Fallback: ping TODAS las 254 IPs en lotes de 50, timeout 2s cada una
        logger.info('fping no disponible, usando ping fallback para las 254 IPs');
        const batchSize = 50;
        for (let i = 0; i < ips.length; i += batchSize) {
          const batch = ips.slice(i, i + batchSize);
          const promises = batch.map((ip) =>
            execAsync(`ping -c 1 -W 2 ${ip} 2>/dev/null`, { timeout: 5000 }).catch(() => {})
          );
          await Promise.all(promises);
        }
      }
    }

    // Segunda ronda rápida para dispositivos que despertaron con la primera
    logger.debug('Segunda ronda de ping sweep para dispositivos lentos');
    try {
      if (process.platform === 'win32') {
        const cmds = ips.map((ip) => `ping -n 1 -w 500 ${ip}`).join(' & ');
        await execAsync(cmds, { timeout: 30000 }).catch(() => {});
      } else {
        await execAsync(`fping -a -q -r 0 -t 500 -g ${subnet}.0/24 2>/dev/null`, { timeout: 20000 }).catch(() => {
          // Fallback segunda ronda — solo los que no respondieron
          const promises = ips.map((ip) =>
            execAsync(`ping -c 1 -W 1 ${ip} 2>/dev/null`, { timeout: 3000 }).catch(() => {})
          );
          return Promise.all(promises);
        });
      }
    } catch {
      // Segunda ronda es best-effort, no falla el scan
    }
  } catch (err) {
    logger.warn('Error durante ping sweep', { error: (err as Error).message });
  }
}

/**
 * Resuelve el hostname de una IP vía DNS reverse lookup.
 */
async function resolveHostname(ip: string): Promise<string | null> {
  try {
    const hostnames = await reverseLookup(ip);
    return hostnames[0] || null;
  } catch {
    return null;
  }
}

/**
 * Ejecuta un escaneo completo de descubrimiento de red.
 */
export async function runDiscovery(triggeredBy: 'manual' | 'scheduled' = 'scheduled'): Promise<{
  devicesFound: number;
  newDevices: number;
  devices: Device[];
}> {
  const scan = scanRepo.create('discovery', triggeredBy);
  logger.info(`Iniciando escaneo de descubrimiento (${triggeredBy})`, { scanId: scan.id });

  try {
    const subnet = getSubnet();
    const gateway = getGateway();
    const localIp = getLocalIP();

    logger.info(`Red detectada: ${subnet}.0/24, Gateway: ${gateway}, IP local: ${localIp}`);

    // Paso 1: Poblar tabla ARP con ping sweep (asíncrono)
    await populateArpTable(subnet);

    // Paso 2: Leer tabla ARP (dos lecturas con delay para atrapar respuestas tardías)
    const arpEntries1 = getArpTable();
    logger.info(`Primera lectura ARP: ${arpEntries1.length} entradas`);

    // Esperar 2s para que las respuestas tardías se registren en la tabla ARP
    await new Promise((r) => setTimeout(r, 2000));
    const arpEntries2 = getArpTable();

    // Merge: combinar ambas lecturas (por MAC para evitar duplicados)
    const seenMacsMap = new Map<string, ArpEntry>();
    for (const e of arpEntries1) seenMacsMap.set(e.mac, e);
    for (const e of arpEntries2) seenMacsMap.set(e.mac, e);
    const arpEntries = Array.from(seenMacsMap.values());
    logger.info(`Se encontraron ${arpEntries.length} entradas ARP (después de merge)`);

    let newDeviceCount = 0;
    const allDevices: Device[] = [];

    // Paso 3: Procesar cada dispositivo
    for (const entry of arpEntries) {
      const existing = deviceRepo.findByMac(entry.mac);

      if (existing) {
        deviceRepo.update(existing.id, { status: 'online' });
        deviceRepo.updateLastSeen(existing.id);
        allDevices.push(deviceRepo.findById(existing.id)!);
      } else {
        const hostname = await resolveHostname(entry.ip);
        const vendor = lookupVendor(entry.mac);
        const isGateway = entry.ip === gateway;
        const deviceType = classifyDevice(vendor, hostname, null, isGateway, entry.mac);

        const device = deviceRepo.create({
          ipAddress: entry.ip,
          macAddress: entry.mac,
          hostname,
          vendor,
          deviceType,
          isGateway,
        });

        allDevices.push(device);
        newDeviceCount++;
        logger.info(`Nuevo dispositivo: ${entry.ip} (${vendor || 'desconocido'}) [${deviceType}]`);
      }
    }

    // Paso 4: Marcar dispositivos no vistos como offline
    const allKnown = deviceRepo.findAll();
    const seenMacs = new Set(arpEntries.map((e) => e.mac));
    for (const device of allKnown) {
      if (!seenMacs.has(device.macAddress) && device.status !== 'offline') {
        deviceRepo.update(device.id, { status: 'offline' });
      }
    }

    scanRepo.complete(scan.id, arpEntries.length, newDeviceCount);
    logger.info(
      `Escaneo completado: ${arpEntries.length} dispositivos encontrados, ${newDeviceCount} nuevos`
    );

    return { devicesFound: arpEntries.length, newDevices: newDeviceCount, devices: allDevices };
  } catch (err) {
    const error = err as Error;
    scanRepo.fail(scan.id, error.message);
    logger.error('Error en escaneo de descubrimiento', { error: error.message });
    throw error;
  }
}
