import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { portScan } from '../../scanners/port-scanner.js';
import { dnsLookup } from '../../scanners/dns-checker.js';
import { traceroute } from '../../scanners/traceroute.js';
import { subnetCalc } from '../../scanners/subnet-calc.js';
import { wakeOnLan } from '../../scanners/wake-on-lan.js';
import type { PingResult } from '@netcheckup/shared';

const execAsync = promisify(exec);

export const toolsRouter = Router();

// POST /api/tools/ping — Ping a un host (usando ping nativo del sistema)
toolsRouter.post('/ping', async (req, res): Promise<void> => {
  try {
    const { host, count = 4 } = req.body;
    if (!host) {
      res.status(400).json({ success: false, error: 'Se requiere el campo "host"' });
      return;
    }

    // Sanitize host to prevent command injection
    if (!/^[a-zA-Z0-9._-]+$/.test(host)) {
      res.status(400).json({ success: false, error: 'Host contiene caracteres no válidos' });
      return;
    }

    const pingCount = Math.min(Math.max(1, count), 20); // 1-20

    const cmd =
      process.platform === 'win32'
        ? `ping -n ${pingCount} -w 3000 ${host}`
        : `ping -c ${pingCount} -W 3 ${host}`;

    let stdout = '';
    try {
      const result = await execAsync(cmd, { timeout: pingCount * 5000 });
      stdout = result.stdout;
    } catch (err) {
      // ping exits non-zero when packets are lost; stdout may still have data
      stdout = (err as { stdout?: string }).stdout || '';
    }

    // Parse individual round-trip times
    const times: number[] = [];
    const timeRegex = /time[=<]([\d.]+)\s*ms/gi;
    let match: RegExpExecArray | null;
    while ((match = timeRegex.exec(stdout)) !== null) {
      times.push(parseFloat(match[1]));
    }

    const alive = times.length > 0;
    const packetLossVal = alive ? ((pingCount - times.length) / pingCount) * 100 : 100;
    const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const min = times.length > 0 ? Math.min(...times) : 0;
    const max = times.length > 0 ? Math.max(...times) : 0;

    const result: PingResult = {
      host,
      alive,
      time: times.length > 0 ? Math.round(times[times.length - 1] * 100) / 100 : null,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      packetLoss: Math.round(packetLossVal * 100) / 100,
      output: stdout,
    };

    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/tools/traceroute — Traceroute a un host
toolsRouter.post('/traceroute', async (req, res): Promise<void> => {
  try {
    const { host } = req.body;
    if (!host) {
      res.status(400).json({ success: false, error: 'Se requiere el campo "host"' });
      return;
    }

    const hops = await traceroute(host);
    res.json({ success: true, data: hops, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/tools/dns-lookup — DNS Lookup
toolsRouter.post('/dns-lookup', async (req, res): Promise<void> => {
  try {
    const { domain, type } = req.body;
    if (!domain) {
      res.status(400).json({ success: false, error: 'Se requiere el campo "domain"' });
      return;
    }

    const result = await dnsLookup(domain, type);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/tools/port-scan — Port Scan
toolsRouter.post('/port-scan', async (req, res): Promise<void> => {
  try {
    const { host, ports, range } = req.body;
    if (!host) {
      res.status(400).json({ success: false, error: 'Se requiere el campo "host"' });
      return;
    }

    const result = await portScan(host, ports, range);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/tools/wake-on-lan — Wake-on-LAN
toolsRouter.post('/wake-on-lan', async (req, res): Promise<void> => {
  try {
    const { macAddress } = req.body;
    if (!macAddress) {
      res.status(400).json({ success: false, error: 'Se requiere el campo "macAddress"' });
      return;
    }

    const result = await wakeOnLan(macAddress);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/tools/subnet-calc — Subnet Calculator
toolsRouter.post('/subnet-calc', (req, res): void => {
  try {
    const { ip, mask } = req.body;
    if (!ip || !mask) {
      res.status(400).json({ success: false, error: 'Se requieren los campos "ip" y "mask"' });
      return;
    }

    const result = subnetCalc(ip, mask);
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});
