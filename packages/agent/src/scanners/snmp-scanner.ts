import snmp from 'net-snmp';
import { logger } from '../utils/logger.js';

// Standard OIDs
const OID = {
  sysDescr:   '1.3.6.1.2.1.1.1.0',
  sysName:    '1.3.6.1.2.1.1.5.0',
  sysUpTime:  '1.3.6.1.2.1.1.3.0',
  sysContact: '1.3.6.1.2.1.1.4.0',
  sysLocation:'1.3.6.1.2.1.1.6.0',
  ifNumber:   '1.3.6.1.2.1.2.1.0',
  // ifTable columns
  ifDescr:    '1.3.6.1.2.1.2.2.1.2',
  ifType:     '1.3.6.1.2.1.2.2.1.3',
  ifSpeed:    '1.3.6.1.2.1.2.2.1.5',
  ifOperStatus:'1.3.6.1.2.1.2.2.1.8',
  ifInOctets: '1.3.6.1.2.1.2.2.1.10',
  ifOutOctets:'1.3.6.1.2.1.2.2.1.16',
};

export interface SnmpSystemInfo {
  sysDescr: string;
  sysName: string;
  sysUpTime: string;
  sysContact: string;
  sysLocation: string;
  ifNumber: number;
}

export interface SnmpInterface {
  index: number;
  name: string;
  type: number;
  typeName: string;
  speed: number;
  speedFormatted: string;
  operStatus: string;
  inOctets: number;
  outOctets: number;
}

export interface SnmpQueryResult {
  host: string;
  community: string;
  system: SnmpSystemInfo;
  interfaces: SnmpInterface[];
  queryTimeMs: number;
}

// Map ifType numbers to names
const IF_TYPE_NAMES: Record<number, string> = {
  1: 'other', 6: 'ethernetCsmacd', 24: 'softwareLoopback',
  53: 'propVirtual', 62: 'fastEther', 117: 'gigabitEthernet',
  131: 'tunnel', 135: 'l2vlan', 136: 'l3ipvlan', 161: 'ieee8023adLag',
};

function formatSpeed(bps: number): string {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(0)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(0)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
  return `${bps} bps`;
}

function formatUptime(ticks: number): string {
  const totalSeconds = Math.floor(ticks / 100);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function operStatusName(code: number): string {
  if (code === 1) return 'up';
  if (code === 2) return 'down';
  if (code === 3) return 'testing';
  return 'unknown';
}

function varbindValue(vb: snmp.Varbind): string | number {
  if (Buffer.isBuffer(vb.value)) return vb.value.toString('utf8');
  return vb.value;
}

// ─── SNMP GET for system info ────────────────────────────────
function getSystemInfo(session: snmp.Session): Promise<SnmpSystemInfo> {
  return new Promise((resolve, reject) => {
    const oids = [
      OID.sysDescr, OID.sysName, OID.sysUpTime,
      OID.sysContact, OID.sysLocation, OID.ifNumber,
    ];

    session.get(oids, (error: Error | null, varbinds: snmp.Varbind[]) => {
      if (error) return reject(error);

      const info: SnmpSystemInfo = {
        sysDescr: '', sysName: '', sysUpTime: '',
        sysContact: '', sysLocation: '', ifNumber: 0,
      };

      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) continue;
        const oid = vb.oid.toString();
        const val = varbindValue(vb);

        if (oid === OID.sysDescr) info.sysDescr = String(val);
        else if (oid === OID.sysName) info.sysName = String(val);
        else if (oid === OID.sysUpTime) info.sysUpTime = formatUptime(Number(val));
        else if (oid === OID.sysContact) info.sysContact = String(val);
        else if (oid === OID.sysLocation) info.sysLocation = String(val);
        else if (oid === OID.ifNumber) info.ifNumber = Number(val);
      }

      resolve(info);
    });
  });
}

// ─── SNMP subtree walk for interfaces ────────────────────────
function getInterfaces(session: snmp.Session): Promise<SnmpInterface[]> {
  return new Promise((resolve) => {
    const ifMap = new Map<number, Partial<SnmpInterface>>();

    const columns = [
      OID.ifDescr, OID.ifType, OID.ifSpeed,
      OID.ifOperStatus, OID.ifInOctets, OID.ifOutOctets,
    ];

    let completed = 0;
    let hasError = false;

    for (const colOid of columns) {
      session.subtree(
        colOid,
        (varbinds: snmp.Varbind[]) => {
          for (const vb of varbinds) {
            if (snmp.isVarbindError(vb)) continue;
            const oidStr = vb.oid.toString();
            // Last number in OID is the interface index
            const parts = oidStr.split('.');
            const idx = parseInt(parts[parts.length - 1], 10);
            if (!ifMap.has(idx)) ifMap.set(idx, { index: idx });
            const iface = ifMap.get(idx)!;
            const val = varbindValue(vb);

            if (oidStr.startsWith(OID.ifDescr)) iface.name = String(val);
            else if (oidStr.startsWith(OID.ifType)) {
              iface.type = Number(val);
              iface.typeName = IF_TYPE_NAMES[Number(val)] || `type-${val}`;
            }
            else if (oidStr.startsWith(OID.ifSpeed)) {
              iface.speed = Number(val);
              iface.speedFormatted = formatSpeed(Number(val));
            }
            else if (oidStr.startsWith(OID.ifOperStatus)) {
              iface.operStatus = operStatusName(Number(val));
            }
            else if (oidStr.startsWith(OID.ifInOctets)) iface.inOctets = Number(val);
            else if (oidStr.startsWith(OID.ifOutOctets)) iface.outOctets = Number(val);
          }
        },
        (error: Error | null) => {
          if (error && !hasError) {
            // subtree returns error at end-of-MIB which is normal
            if (!error.message?.includes('OID not increasing')) {
              // Ignore end-of-subtree errors
            }
          }
          completed++;
          if (completed === columns.length) {
            const interfaces: SnmpInterface[] = Array.from(ifMap.values())
              .filter(i => i.name !== undefined)
              .map(i => ({
                index: i.index ?? 0,
                name: i.name ?? '',
                type: i.type ?? 0,
                typeName: i.typeName ?? 'unknown',
                speed: i.speed ?? 0,
                speedFormatted: i.speedFormatted ?? '0 bps',
                operStatus: i.operStatus ?? 'unknown',
                inOctets: i.inOctets ?? 0,
                outOctets: i.outOctets ?? 0,
              }))
              .sort((a, b) => a.index - b.index);
            resolve(interfaces);
          }
        }
      );
    }
  });
}

// ─── Main query function ─────────────────────────────────────
export async function snmpQuery(
  host: string,
  community: string = 'public',
  timeout: number = 5000
): Promise<SnmpQueryResult> {
  const start = Date.now();

  const session = snmp.createSession(host, community, {
    timeout,
    retries: 1,
    version: snmp.Version2c,
  });

  try {
    const system = await getSystemInfo(session);

    let interfaces: SnmpInterface[] = [];
    try {
      interfaces = await getInterfaces(session);
    } catch (err) {
      logger.debug(`SNMP: no se pudieron obtener interfaces de ${host}: ${(err as Error).message}`);
    }

    return {
      host,
      community,
      system,
      interfaces,
      queryTimeMs: Date.now() - start,
    };
  } finally {
    session.close();
  }
}
