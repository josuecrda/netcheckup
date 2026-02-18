import { Router } from 'express';
import { speedTestRepo } from '../../db/repositories/speedtest.repo.js';
import { runSpeedTest } from '../../scanners/speed-tester.js';
import { broadcastEvent } from '../websocket.js';
import { logger } from '../../utils/logger.js';

export const speedtestRouter = Router();

// GET /api/speedtest — Historial de speed tests
speedtestRouter.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const results = speedTestRepo.findAll(limit);
  res.json({ success: true, data: results, timestamp: new Date().toISOString() });
});

// GET /api/speedtest/latest — Último resultado
speedtestRouter.get('/latest', (_req, res) => {
  const latest = speedTestRepo.getLatest();
  res.json({ success: true, data: latest, timestamp: new Date().toISOString() });
});

// GET /api/speedtest/average — Promedio por período
speedtestRouter.get('/average', (req, res) => {
  const period = (req.query.period as string) || '7d';
  const avg = speedTestRepo.getAverage(period);
  res.json({ success: true, data: avg, timestamp: new Date().toISOString() });
});

// POST /api/speedtest/run — Ejecutar speed test
speedtestRouter.post('/run', async (_req, res) => {
  res.json({ success: true, data: { message: 'Speed test iniciado' }, timestamp: new Date().toISOString() });

  broadcastEvent('speedtest:started', {});
  try {
    const result = await runSpeedTest('manual');
    broadcastEvent('speedtest:completed', { result });
  } catch (err) {
    logger.error(`Speed test falló: ${err}`);
    broadcastEvent('speedtest:completed', { error: true, message: String(err) });
  }
});
