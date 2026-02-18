import { Router } from 'express';
import os from 'os';
import { settingRepo } from '../../db/repositories/setting.repo.js';
import { APP_VERSION } from '@netcheckup/shared';

export const settingsRouter = Router();

// GET /api/settings — Obtener todas las configuraciones
settingsRouter.get('/', (_req, res) => {
  const settings = settingRepo.getAppSettings();
  res.json({ success: true, data: settings, timestamp: new Date().toISOString() });
});

// PUT /api/settings — Actualizar configuraciones
settingsRouter.put('/', (req, res) => {
  settingRepo.saveAppSettings(req.body);
  const settings = settingRepo.getAppSettings();
  res.json({ success: true, data: settings, timestamp: new Date().toISOString() });
});

// GET /api/settings/status — Estado del agente
settingsRouter.get('/status', (_req, res) => {
  res.json({
    success: true,
    data: {
      version: APP_VERSION,
      uptime: process.uptime(),
      platform: process.platform,
      hostname: os.hostname(),
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
    },
    timestamp: new Date().toISOString(),
  });
});
