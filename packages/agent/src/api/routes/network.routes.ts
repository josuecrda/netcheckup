import { Router } from 'express';
import { getNetworkStatus, acceptCurrentNetwork } from '../../utils/network-guard.js';

export const networkRouter = Router();

// GET /api/network/status
networkRouter.get('/status', (_req, res) => {
  const status = getNetworkStatus();
  res.json({ success: true, data: status, timestamp: new Date().toISOString() });
});

// POST /api/network/accept — acepta la red actual como esperada
networkRouter.post('/accept', (_req, res) => {
  acceptCurrentNetwork();
  const status = getNetworkStatus();
  res.json({ success: true, data: status, timestamp: new Date().toISOString() });
});
