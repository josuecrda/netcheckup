import { Router } from 'express';
import { metricRepo } from '../../db/repositories/metric.repo.js';

export const metricsRouter = Router();

// GET /api/metrics/latest — Métricas más recientes de todos los dispositivos
metricsRouter.get('/latest', (_req, res) => {
  const metrics = metricRepo.getLatestAll();
  res.json({ success: true, data: metrics, timestamp: new Date().toISOString() });
});

// GET /api/metrics/history — Historial agregado
metricsRouter.get('/history', (req, res) => {
  const deviceId = req.query.deviceId as string;
  const period = (req.query.period as string) || '24h';

  if (!deviceId) {
    res.status(400).json({ success: false, error: 'deviceId es requerido', timestamp: new Date().toISOString() });
    return;
  }

  const summary = metricRepo.getSummary(deviceId, period);
  res.json({ success: true, data: summary, timestamp: new Date().toISOString() });
});
