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
        const match = line.match(
          /\(([\d.]+)\)\s+at\s+([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})/
        );
        if (match) {
          entries.push({ ip: match[1], mac: match[2].toLowerCase() });
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
      // Ping en lotes asíncronos de 30 IPs
      const batchSize = 30;
      for (let i = 0; i < ips.length; i += batchSize) {
        const batch = ips.slice(i, i + batchSize);
        const cmds = batch.map((ip) => `ping -n 1 -w 300 ${ip}`).join(' & ');
        try {
          await execAsync(cmds, { timeout: 20000 });
        } catch {
          // Timeouts esperados para IPs sin respuesta
        }
      }
    } else {
      try {
        await execAsync(`fping -a -q -r 1 -g ${subnet}.0/24 2>/dev/null`, { timeout: 30000 });
      } catch {
        // Fallback: ping en lotes
        const batch = ips.slice(0, 50);
        const promises = batch.map((ip) =>
          execAsync(`ping -c 1 -W 1 ${ip} 2>/dev/null`, { timeout: 3000 }).catch(() => {})
        );
        await Promise.all(promises);
      }
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

    // Paso 2: Leer tabla ARP
    const arpEntries = getArpTable();
    logger.info(`Se encontraron ${arpEntries.length} entradas ARP`);

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
        const deviceType = classifyDevice(vendor, hostname, null, isGateway);

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
