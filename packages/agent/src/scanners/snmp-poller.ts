import snmp from 'net-snmp';
import { logger } from '../utils/logger.js';
import { deviceRepo } from '../db/repositories/device.repo.js';
import { snmpCounterRepo, type SaveSnapshotInput } from '../db/repositories/snmp-counter.repo.js';

/**
 * OIDs para polling expandido de contadores de switches.
 *
 * - ifTable (MIB-II obligatorio): errores, descards, octets
 * - EtherLike-MIB (RFC 3635): duplex, FCS errors, late collisions
 * - ifXTable (RFC 2863): highSpeed, alias
 */
const POLL_OID = {
  // ifTable — MIB-II (universalmente soportado)
  ifDescr:         '1.3.6.1.2.1.2.2.1.2',
  ifSpeed:         '1.3.6.1.2.1.2.2.1.5',
  ifOperStatus:    '1.3.6.1.2.1.2.2.1.8',
  ifInOctets:      '1.3.6.1.2.1.2.2.1.10',
  ifInErrors:      '1.3.6.1.2.1.2.2.1.14',
  ifInDiscards:    '1.3.6.1.2.1.2.2.1.13',
  ifOutOctets:     '1.3.6.1.2.1.2.2.1.16',
  ifOutDiscards:   '1.3.6.1.2.1.2.2.1.19',
  ifOutErrors:     '1.3.6.1.2.1.2.2.1.20',

  // EtherLike-MIB (ampliamente soportado)
  dot3DuplexStatus:    '1.3.6.1.2.1.10.7.2.1.19',
  dot3FCSErrors:       '1.3.6.1.2.1.10.7.2.1.5',
  dot3LateCollisions:  '1.3.6.1.2.1.10.7.2.1.11',

  // ifXTable (RFC 2863)
  ifHighSpeed:     '1.3.6.1.2.1.31.1.1.1.15',
  ifAlias:         '1.3.6.1.2.1.31.1.1.1.18',
};

function varbindValue(vb: snmp.Varbind): string | number {
  if (Buffer.isBuffer(vb.value)) return vb.value.toString('utf8');
  return vb.value;
}

function operStatusName(code: number): string {
  if (code === 1) return 'up';
  if (code === 2) return 'down';
  if (code === 3) return 'testing';
  return 'unknown';
}

function duplexName(code: number): 'half' | 'full' | 'unknown' {
  if (code === 2) return 'half';
  if (code === 3) return 'full';
  return 'unknown';
}

interface InterfaceData {
  ifIndex: number;
  ifName: string;
  ifAlias: string | null;
  ifSpeed: number;         // bps from ifSpeed
  ifHighSpeed: number;     // Mbps from ifXTable
  operStatus: string;
  inOctets: number;
  outOctets: number;
  inErrors: number;
  outErrors: number;
  inDiscards: number;
  outDiscards: number;
  fcsErrors: number;
  lateCollisions: number;
  duplexStatus: 'half' | 'full' | 'unknown';
}

/**
 * Hace un subtree walk de un OID. Retorna pares (ifIndex, valor).
 * Si el switch no soporta el OID, retorna array vacío gracefully.
 */
function walkColumn(
  session: snmp.Session,
  oid: string,
  timeout: number = 8000
): Promise<Array<{ ifIndex: number; value: string | number }>> {
  return new Promise((resolve) => {
    const results: Array<{ ifIndex: number; value: string | number }> = [];
    let done = false;

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(results);
      }
    }, timeout);

    session.subtree(
      oid,
      (varbinds: snmp.Varbind[]) => {
        for (const vb of varbinds) {
          if (snmp.isVarbindError(vb)) continue;
          const parts = vb.oid.toString().split('.');
          const ifIndex = parseInt(parts[parts.length - 1], 10);
          results.push({ ifIndex, value: varbindValue(vb) });
        }
      },
      (_error: Error | null) => {
        clearTimeout(timer);
        if (!done) {
          done = true;
          resolve(results);
        }
      }
    );
  });
}

/**
 * Consulta todos los contadores de un dispositivo SNMP.
 */
async function pollDevice(
  host: string,
  community: string,
  deviceId: string
): Promise<number> {
  const session = snmp.createSession(host, community, {
    timeout: 5000,
    retries: 1,
    version: snmp.Version2c,
  });

  try {
    // Walk todas las columnas en paralelo (MIB-II obligatorio)
    const [
      descrs,
      speeds,
      operStatuses,
      inOctets,
      outOctets,
      inErrors,
      outErrors,
      inDiscards,
      outDiscards,
    ] = await Promise.all([
      walkColumn(session, POLL_OID.ifDescr),
      walkColumn(session, POLL_OID.ifSpeed),
      walkColumn(session, POLL_OID.ifOperStatus),
      walkColumn(session, POLL_OID.ifInOctets),
      walkColumn(session, POLL_OID.ifOutOctets),
      walkColumn(session, POLL_OID.ifInErrors),
      walkColumn(session, POLL_OID.ifOutErrors),
      walkColumn(session, POLL_OID.ifInDiscards),
      walkColumn(session, POLL_OID.ifOutDiscards),
    ]);

    // Walk columnas opcionales (EtherLike + ifXTable)
    const [
      duplexStatuses,
      fcsErrors,
      lateCollisions,
      highSpeeds,
      aliases,
    ] = await Promise.all([
      walkColumn(session, POLL_OID.dot3DuplexStatus),
      walkColumn(session, POLL_OID.dot3FCSErrors),
      walkColumn(session, POLL_OID.dot3LateCollisions),
      walkColumn(session, POLL_OID.ifHighSpeed),
      walkColumn(session, POLL_OID.ifAlias),
    ]);

    // Construir mapa por ifIndex
    const ifMap = new Map<number, InterfaceData>();

    for (const item of descrs) {
      ifMap.set(item.ifIndex, {
        ifIndex: item.ifIndex,
        ifName: String(item.value),
        ifAlias: null,
        ifSpeed: 0,
        ifHighSpeed: 0,
        operStatus: 'unknown',
        inOctets: 0,
        outOctets: 0,
        inErrors: 0,
        outErrors: 0,
        inDiscards: 0,
        outDiscards: 0,
        fcsErrors: 0,
        lateCollisions: 0,
        duplexStatus: 'unknown',
      });
    }

    // Llenar datos MIB-II
    for (const item of speeds) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.ifSpeed = Number(item.value);
    }
    for (const item of operStatuses) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.operStatus = operStatusName(Number(item.value));
    }
    for (const item of inOctets) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.inOctets = Number(item.value);
    }
    for (const item of outOctets) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.outOctets = Number(item.value);
    }
    for (const item of inErrors) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.inErrors = Number(item.value);
    }
    for (const item of outErrors) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.outErrors = Number(item.value);
    }
    for (const item of inDiscards) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.inDiscards = Number(item.value);
    }
    for (const item of outDiscards) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.outDiscards = Number(item.value);
    }

    // Llenar datos opcionales (EtherLike + ifXTable)
    for (const item of duplexStatuses) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.duplexStatus = duplexName(Number(item.value));
    }
    for (const item of fcsErrors) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.fcsErrors = Number(item.value);
    }
    for (const item of lateCollisions) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.lateCollisions = Number(item.value);
    }
    for (const item of highSpeeds) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) iface.ifHighSpeed = Number(item.value);
    }
    for (const item of aliases) {
      const iface = ifMap.get(item.ifIndex);
      if (iface) {
        const alias = String(item.value).trim();
        if (alias) iface.ifAlias = alias;
      }
    }

    // Guardar snapshots (solo puertos físicos que están up)
    let saved = 0;
    for (const iface of ifMap.values()) {
      // Calcular speed en Mbps: preferir ifHighSpeed, fallback a ifSpeed/1e6
      const speedMbps = iface.ifHighSpeed > 0
        ? iface.ifHighSpeed
        : Math.round(iface.ifSpeed / 1_000_000);

      // Saltar interfaces loopback, tunnel, etc. (solo Ethernet)
      if (speedMbps <= 0) continue;

      const input: SaveSnapshotInput = {
        deviceId,
        ifIndex: iface.ifIndex,
        ifName: iface.ifName,
        ifAlias: iface.ifAlias,
        inOctets: iface.inOctets,
        outOctets: iface.outOctets,
        inErrors: iface.inErrors,
        outErrors: iface.outErrors,
        inDiscards: iface.inDiscards,
        outDiscards: iface.outDiscards,
        fcsErrors: iface.fcsErrors,
        lateCollisions: iface.lateCollisions,
        speedMbps,
        duplexStatus: iface.duplexStatus,
        operStatus: iface.operStatus,
      };

      snmpCounterRepo.saveSnapshot(input);
      saved++;
    }

    return saved;
  } finally {
    session.close();
  }
}

/**
 * Ejecuta el polling SNMP de contadores para todos los dispositivos
 * tipo switch/router/access-point que estén online.
 */
export async function pollSnmpCounters(): Promise<void> {
  const community = 'public'; // SNMP community por defecto

  // Obtener dispositivos SNMP-capable
  const allDevices = deviceRepo.findAll();
  const snmpDevices = allDevices.filter(
    (d) =>
      d.status === 'online' &&
      ['switch', 'router', 'access-point'].includes(d.deviceType)
  );

  if (snmpDevices.length === 0) {
    logger.debug('SNMP polling: no hay switches/routers online');
    return;
  }

  logger.info(`SNMP polling iniciado: ${snmpDevices.length} dispositivo(s)`);
  let totalPorts = 0;
  let successCount = 0;

  for (const device of snmpDevices) {
    try {
      const savedPorts = await pollDevice(device.ipAddress, community, device.id);
      totalPorts += savedPorts;
      successCount++;
      logger.debug(`SNMP poll ${device.ipAddress}: ${savedPorts} puertos guardados`);
    } catch (err) {
      logger.debug(
        `SNMP poll falló para ${device.ipAddress}: ${(err as Error).message}`
      );
    }
  }

  logger.info(
    `SNMP polling completado: ${successCount}/${snmpDevices.length} dispositivos, ${totalPorts} puertos total`
  );

  // Limpiar snapshots viejos (mantener 24h de datos)
  snmpCounterRepo.deleteOlderThan(24);
}
