import { Router } from 'express';
import { deviceRepo } from '../../db/repositories/device.repo.js';
import { metricRepo } from '../../db/repositories/metric.repo.js';
import { alertRepo } from '../../db/repositories/alert.repo.js';

export const devicesRouter = Router();

// GET /api/devices — Lista todos los dispositivos
devicesRouter.get('/', (_req, res) => {
  const devices = deviceRepo.findAll();
  res.json({
    success: true,
    data: devices,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/devices/summary — Resumen de dispositivos
devicesRouter.get('/summary', (_req, res) => {
  const summary = deviceRepo.getSummary();
  res.json({
    success: true,
    data: summary,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/devices/:id — Detalle de un dispositivo
devicesRouter.get('/:id', (req, res) => {
  const device = deviceRepo.findById(req.params.id);
  if (!device) {
    res.status(404).json({ success: false, error: 'Dispositivo no encontrado', timestamp: new Date().toISOString() });
    return;
  }
  res.json({ success: true, data: device, timestamp: new Date().toISOString() });
});

// PUT /api/devices/:id — Actualizar dispositivo
devicesRouter.put('/:id', (req, res) => {
  const device = deviceRepo.update(req.params.id, req.body);
  if (!device) {
    res.status(404).json({ success: false, error: 'Dispositivo no encontrado', timestamp: new Date().toISOString() });
    return;
  }
  res.json({ success: true, data: device, timestamp: new Date().toISOString() });
});

// DELETE /api/devices/:id — Eliminar dispositivo
devicesRouter.delete('/:id', (req, res) => {
  deviceRepo.delete(req.params.id);
  res.json({ success: true, data: null, timestamp: new Date().toISOString() });
});

// GET /api/devices/:id/metrics — Métricas históricas
devicesRouter.get('/:id/metrics', (req, res) => {
  const period = (req.query.period as string) || '24h';
  const summary = metricRepo.getSummary(req.params.id, period);
  res.json({ success: true, data: summary, timestamp: new Date().toISOString() });
});

// GET /api/devices/:id/alerts — Alertas del dispositivo
devicesRouter.get('/:id/alerts', (req, res) => {
  const alerts = alertRepo.findByDevice(req.params.id);
  res.json({ success: true, data: alerts, timestamp: new Date().toISOString() });
});
