import { v4 as uuidv4 } from 'uuid';
import type { SqlValue } from 'sql.js';
import { getDb, saveDatabase } from '../connection.js';
import { queryRows } from '../query-helper.js';
import type { Device, DeviceType, DeviceStatus } from '@netcheckup/shared';

export interface CreateDeviceInput {
  ipAddress: string;
  macAddress: string;
  hostname?: string | null;
  vendor?: string | null;
  deviceType?: DeviceType;
  isGateway?: boolean;
}

export interface UpdateDeviceInput {
  customName?: string | null;
  hostname?: string | null;
  vendor?: string | null;
  deviceType?: DeviceType;
  status?: DeviceStatus;
  isMonitored?: boolean;
  isGateway?: boolean;
  notes?: string | null;
  latencyMs?: number | null;
  packetLoss?: number | null;
  openPorts?: number[] | null;
}

function rowToDevice(row: Record<string, SqlValue>): Device {
  return {
    id: row.id as string,
    ipAddress: row.ip_address as string,
    macAddress: row.mac_address as string,
    hostname: row.hostname as string | null,
    customName: row.custom_name as string | null,
    vendor: row.vendor as string | null,
    deviceType: row.device_type as DeviceType,
    status: row.status as DeviceStatus,
    lastSeen: row.last_seen as string,
    firstSeen: row.first_seen as string,
    isGateway: Boolean(row.is_gateway),
    isMonitored: Boolean(row.is_monitored),
    notes: row.notes as string | null,
    latencyMs: row.latest_latency_ms as number | null,
    packetLoss: row.latest_packet_loss as number | null,
    openPorts: row.open_ports ? JSON.parse(row.open_ports as string) : null,
  };
}

export const deviceRepo = {
  findAll(): Device[] {
    return queryRows('SELECT * FROM devices ORDER BY last_seen DESC').map(rowToDevice);
  },

  findById(id: string): Device | null {
    const rows = queryRows('SELECT * FROM devices WHERE id = ?', [id]);
    return rows.length > 0 ? rowToDevice(rows[0]) : null;
  },

  findByMac(macAddress: string): Device | null {
    const rows = queryRows('SELECT * FROM devices WHERE mac_address = ?', [macAddress]);
    return rows.length > 0 ? rowToDevice(rows[0]) : null;
  },

  findByStatus(status: DeviceStatus): Device[] {
    return queryRows('SELECT * FROM devices WHERE status = ? ORDER BY last_seen DESC', [status]).map(
      rowToDevice
    );
  },

  findMonitored(): Device[] {
    return queryRows(
      'SELECT * FROM devices WHERE is_monitored = 1 ORDER BY last_seen DESC'
    ).map(rowToDevice);
  },

  findGateway(): Device | null {
    const rows = queryRows('SELECT * FROM devices WHERE is_gateway = 1 LIMIT 1');
    return rows.length > 0 ? rowToDevice(rows[0]) : null;
  },

  create(input: CreateDeviceInput): Device {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO devices (id, ip_address, mac_address, hostname, vendor, device_type, status, last_seen, first_seen, is_gateway, is_monitored, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'online', ?, ?, ?, 1, ?)`,
      [
        id,
        input.ipAddress,
        input.macAddress,
        input.hostname ?? null,
        input.vendor ?? null,
        input.deviceType ?? 'unknown',
        now,
        now,
        input.isGateway ? 1 : 0,
        now,
      ]
    );
    saveDatabase();
    return this.findById(id)!;
  },

  update(id: string, input: UpdateDeviceInput): Device | null {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const values: SqlValue[] = [now];

    if (input.customName !== undefined) {
      sets.push('custom_name = ?');
      values.push(input.customName);
    }
    if (input.hostname !== undefined) {
      sets.push('hostname = ?');
      values.push(input.hostname);
    }
    if (input.vendor !== undefined) {
      sets.push('vendor = ?');
      values.push(input.vendor);
    }
    if (input.deviceType !== undefined) {
      sets.push('device_type = ?');
      values.push(input.deviceType);
    }
    if (input.status !== undefined) {
      sets.push('status = ?');
      values.push(input.status);
      if (input.status === 'online') {
        sets.push('last_seen = ?');
        values.push(now);
      }
    }
    if (input.isMonitored !== undefined) {
      sets.push('is_monitored = ?');
      values.push(input.isMonitored ? 1 : 0);
    }
    if (input.isGateway !== undefined) {
      sets.push('is_gateway = ?');
      values.push(input.isGateway ? 1 : 0);
    }
    if (input.notes !== undefined) {
      sets.push('notes = ?');
      values.push(input.notes);
    }
    if (input.latencyMs !== undefined) {
      sets.push('latest_latency_ms = ?');
      values.push(input.latencyMs);
    }
    if (input.packetLoss !== undefined) {
      sets.push('latest_packet_loss = ?');
      values.push(input.packetLoss);
    }
    if (input.openPorts !== undefined) {
      sets.push('open_ports = ?');
      values.push(input.openPorts ? JSON.stringify(input.openPorts) : null);
    }

    values.push(id);
    db.run(`UPDATE devices SET ${sets.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return this.findById(id);
  },

  updateLastSeen(id: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.run('UPDATE devices SET last_seen = ?, updated_at = ? WHERE id = ?', [now, now, id]);
    saveDatabase();
  },

  delete(id: string): boolean {
    const db = getDb();
    db.run('DELETE FROM devices WHERE id = ?', [id]);
    saveDatabase();
    return true;
  },

  getSummary(): { total: number; online: number; offline: number; degraded: number; byType: Record<string, number> } {
    const db = getDb();
    const total = queryRows('SELECT COUNT(*) as count FROM devices')[0].count as number;
    const online = queryRows("SELECT COUNT(*) as count FROM devices WHERE status = 'online'")[0].count as number;
    const offline = queryRows("SELECT COUNT(*) as count FROM devices WHERE status = 'offline'")[0].count as number;
    const degraded = queryRows("SELECT COUNT(*) as count FROM devices WHERE status = 'degraded'")[0].count as number;

    const typeRows = queryRows('SELECT device_type, COUNT(*) as count FROM devices GROUP BY device_type');
    const byType: Record<string, number> = {};
    for (const row of typeRows) {
      byType[row.device_type as string] = row.count as number;
    }

    return { total, online, offline, degraded, byType };
  },
};
