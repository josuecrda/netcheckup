import { Router } from 'express';
import { scanRepo } from '../../db/repositories/scan.repo.js';
import { runDiscovery } from '../../scanners/network-discovery.js';
import { pingAllDevices } from '../../scanners/ping-monitor.js';
import { broadcastEvent } from '../websocket.js';
import { canRunDiscoveryScan } from '../../license.js';

export const scansRouter = Router();

// GET /api/scans — Historial de escaneos
scansRouter.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const scans = scanRepo.findAll(limit);
  res.json({ success: true, data: scans, timestamp: new Date().toISOString() });
});

// GET /api/scans/latest — Último escaneo de cada tipo
scansRouter.get('/latest', (_req, res) => {
  const scans = scanRepo.getLatestByType();
  res.json({ success: true, data: scans, timestamp: new Date().toISOString() });
});

// GET /api/scans/:id — Detalle de un escaneo
scansRouter.get('/:id', (req, res) => {
  const scan = scanRepo.findById(req.params.id);
  if (!scan) {
    res.status(404).json({ success: false, error: 'Escaneo no encontrado', timestamp: new Date().toISOString() });
    return;
  }
  res.json({ success: true, data: scan, timestamp: new Date().toISOString() });
});

// POST /api/scans/discovery — Trigger escaneo de descubrimiento
scansRouter.post('/discovery', async (_req, res) => {
  const check = canRunDiscoveryScan();
  if (!check.allowed) {
    res.status(429).json({ success: false, error: check.reason, timestamp: new Date().toISOString() });
    return;
  }

  res.json({ success: true, data: { message: 'Escaneo iniciado' }, timestamp: new Date().toISOString() });

  // Ejecutar en background
  broadcastEvent('scan:started', { type: 'discovery' });
  try {
    const result = await runDiscovery('manual');
    broadcastEvent('scan:completed', {
      type: 'discovery',
      devicesFound: result.devicesFound,
      newDevices: result.newDevices,
    });
  } catch {
    broadcastEvent('scan:completed', { type: 'discovery', error: true });
  }
});

// POST /api/scans/ping — Trigger ping a todos los dispositivos
scansRouter.post('/ping', async (_req, res) => {
  res.json({ success: true, data: { message: 'Ping iniciado' }, timestamp: new Date().toISOString() });

  broadcastEvent('scan:started', { type: 'ping' });
  try {
    const metrics = await pingAllDevices();
    broadcastEvent('scan:completed', {
      type: 'ping',
      devicesChecked: metrics.length,
      online: metrics.filter((m) => m.isReachable).length,
    });
  } catch {
    broadcastEvent('scan:completed', { type: 'ping', error: true });
  }
});
