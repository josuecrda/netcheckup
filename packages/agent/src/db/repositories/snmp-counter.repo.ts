import { v4 as uuidv4 } from 'uuid';
import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import { deviceRepo } from './device.repo.js';
import type { SnmpCounterSnapshot, PortCounterDelta } from '@netcheckup/shared';

export interface SaveSnapshotInput {
  deviceId: string;
  ifIndex: number;
  ifName: string;
  ifAlias?: string | null;
  inOctets: number;
  outOctets: number;
  inErrors: number;
  outErrors: number;
  inDiscards: number;
  outDiscards: number;
  fcsErrors: number;
  lateCollisions: number;
  speedMbps: number;
  duplexStatus: 'half' | 'full' | 'unknown';
  operStatus: string;
}

function rowToSnapshot(row: Record<string, SqlValue>): SnmpCounterSnapshot {
  return {
    deviceId: row.device_id as string,
    ifIndex: row.if_index as number,
    ifName: row.if_name as string,
    ifAlias: (row.if_alias as string) || null,
    timestamp: row.timestamp as string,
    inOctets: row.in_octets as number,
    outOctets: row.out_octets as number,
    inErrors: row.in_errors as number,
    outErrors: row.out_errors as number,
    inDiscards: row.in_discards as number,
    outDiscards: row.out_discards as number,
    fcsErrors: row.fcs_errors as number,
    lateCollisions: row.late_collisions as number,
    speedMbps: row.speed_mbps as number,
    duplexStatus: (row.duplex_status as 'half' | 'full' | 'unknown') || 'unknown',
    operStatus: (row.oper_status as string) || 'unknown',
  };
}

export const snmpCounterRepo = {
  /**
   * Guarda un snapshot de contadores para una interfaz.
   */
  saveSnapshot(input: SaveSnapshotInput): void {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO snmp_interface_counters
        (id, device_id, if_index, if_name, if_alias, timestamp,
         in_octets, out_octets, in_errors, out_errors,
         in_discards, out_discards, fcs_errors, late_collisions,
         speed_mbps, duplex_status, oper_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.deviceId,
        input.ifIndex,
        input.ifName,
        input.ifAlias ?? null,
        now,
        input.inOctets,
        input.outOctets,
        input.inErrors,
        input.outErrors,
        input.inDiscards,
        input.outDiscards,
        input.fcsErrors,
        input.lateCollisions,
        input.speedMbps,
        input.duplexStatus,
        input.operStatus,
      ]
    );
    saveDatabase();
  },

  /**
   * Obtiene los últimos 2 snapshots de una interfaz para calcular delta.
   */
  getLatestTwo(deviceId: string, ifIndex: number): SnmpCounterSnapshot[] {
    const rows = queryRows(
      `SELECT * FROM snmp_interface_counters
       WHERE device_id = ? AND if_index = ?
       ORDER BY timestamp DESC LIMIT 2`,
      [deviceId, ifIndex]
    );
    return rows.map(rowToSnapshot);
  },

  /**
   * Calcula el delta (tasa por segundo) entre los últimos 2 snapshots de una interfaz.
   */
  getDelta(deviceId: string, ifIndex: number): PortCounterDelta | null {
    const snapshots = this.getLatestTwo(deviceId, ifIndex);
    if (snapshots.length < 2) return null;

    const newer = snapshots[0];
    const older = snapshots[1];

    const deltaMs =
      new Date(newer.timestamp).getTime() - new Date(older.timestamp).getTime();
    if (deltaMs <= 0) return null;
    const deltaSec = deltaMs / 1000;

    // Manejar counter wrap (32-bit counters)
    const MAX_32 = 4_294_967_296;
    const diffOctetsIn =
      newer.inOctets >= older.inOctets
        ? newer.inOctets - older.inOctets
        : MAX_32 - older.inOctets + newer.inOctets;
    const diffOctetsOut =
      newer.outOctets >= older.outOctets
        ? newer.outOctets - older.outOctets
        : MAX_32 - older.outOctets + newer.outOctets;

    const diffInErrors = Math.max(0, newer.inErrors - older.inErrors);
    const diffOutErrors = Math.max(0, newer.outErrors - older.outErrors);
    const diffInDiscards = Math.max(0, newer.inDiscards - older.inDiscards);
    const diffOutDiscards = Math.max(0, newer.outDiscards - older.outDiscards);
    const diffFcs = Math.max(0, newer.fcsErrors - older.fcsErrors);
    const diffLateCol = Math.max(0, newer.lateCollisions - older.lateCollisions);

    const inBps = (diffOctetsIn * 8) / deltaSec;
    const outBps = (diffOctetsOut * 8) / deltaSec;
    const linkSpeedBps = newer.speedMbps * 1_000_000;

    const device = deviceRepo.findById(deviceId);

    return {
      deviceId,
      deviceName: device?.customName || device?.hostname || device?.ipAddress || deviceId,
      ifIndex: newer.ifIndex,
      ifName: newer.ifName,
      ifAlias: newer.ifAlias,
      speedMbps: newer.speedMbps,
      duplexStatus: newer.duplexStatus,
      operStatus: newer.operStatus,
      deltaSeconds: deltaSec,
      inBitsPerSec: inBps,
      outBitsPerSec: outBps,
      inErrorsPerSec: diffInErrors / deltaSec,
      outErrorsPerSec: diffOutErrors / deltaSec,
      inDiscardsPerSec: diffInDiscards / deltaSec,
      outDiscardsPerSec: diffOutDiscards / deltaSec,
      fcsErrorsPerSec: diffFcs / deltaSec,
      lateCollisionsPerSec: diffLateCol / deltaSec,
      inUtilizationPercent: linkSpeedBps > 0 ? (inBps / linkSpeedBps) * 100 : 0,
      outUtilizationPercent: linkSpeedBps > 0 ? (outBps / linkSpeedBps) * 100 : 0,
    };
  },

  /**
   * Retorna deltas de TODOS los puertos activos (para reglas de diagnóstico).
   */
  getAllDeltas(): PortCounterDelta[] {
    // Obtener pares únicos de (device_id, if_index) con al menos 2 snapshots
    const pairs = queryRows(
      `SELECT device_id, if_index FROM snmp_interface_counters
       GROUP BY device_id, if_index
       HAVING COUNT(*) >= 2`
    );

    const deltas: PortCounterDelta[] = [];
    for (const pair of pairs) {
      const delta = this.getDelta(pair.device_id as string, pair.if_index as number);
      if (delta && delta.operStatus === 'up') {
        deltas.push(delta);
      }
    }
    return deltas;
  },

  /**
   * Puertos con más throughput (top talkers).
   */
  getTopTalkers(limit = 10): PortCounterDelta[] {
    const allDeltas = this.getAllDeltas();
    return allDeltas
      .sort((a, b) => {
        const aTotal = a.inBitsPerSec + a.outBitsPerSec;
        const bTotal = b.inBitsPerSec + b.outBitsPerSec;
        return bTotal - aTotal;
      })
      .slice(0, limit);
  },

  /**
   * Salud de puertos de un dispositivo específico.
   */
  getPortHealth(deviceId: string): PortCounterDelta[] {
    // Obtener ifIndexes de este dispositivo
    const indexes = queryRows(
      `SELECT DISTINCT if_index FROM snmp_interface_counters
       WHERE device_id = ?
       ORDER BY if_index`,
      [deviceId]
    );

    const deltas: PortCounterDelta[] = [];
    for (const row of indexes) {
      const delta = this.getDelta(deviceId, row.if_index as number);
      if (delta) deltas.push(delta);
    }
    return deltas;
  },

  /**
   * Elimina snapshots más antiguos que las horas indicadas.
   */
  deleteOlderThan(hours: number): number {
    const db = getDb();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    db.run('DELETE FROM snmp_interface_counters WHERE timestamp < ?', [cutoff]);
    const changes = db.getRowsModified();
    if (changes > 0) saveDatabase();
    return changes;
  },
};
