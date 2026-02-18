import { Router } from 'express';
import {
  getLicenseInfo,
  activateLicense,
  deactivateLicense,
  generateLicenseKey,
  getCurrentLimits,
} from '../../license.js';
import { TIER_LIMITS, TIER_LABELS, TIER_PRICES } from '@netcheckup/shared';

export const licenseRouter = Router();

// GET /api/license — Info de licencia actual + límites
licenseRouter.get('/', (_req, res) => {
  const info = getLicenseInfo();
  const limits = getCurrentLimits();
  res.json({
    success: true,
    data: { ...info, limits },
    timestamp: new Date().toISOString(),
  });
});

// POST /api/license/activate — Activar una licencia
licenseRouter.post('/activate', (req, res) => {
  const { licenseKey } = req.body;
  if (!licenseKey || typeof licenseKey !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Se requiere una clave de licencia.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const info = activateLicense(licenseKey);
  if (!info.isValid) {
    res.status(400).json({
      success: false,
      error: 'Clave de licencia inválida. Verifica que la hayas ingresado correctamente.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const limits = TIER_LIMITS[info.tier];
  res.json({
    success: true,
    data: { ...info, limits },
    timestamp: new Date().toISOString(),
  });
});

// POST /api/license/deactivate — Desactivar licencia
licenseRouter.post('/deactivate', (_req, res) => {
  const info = deactivateLicense();
  const limits = TIER_LIMITS[info.tier];
  res.json({
    success: true,
    data: { ...info, limits },
    timestamp: new Date().toISOString(),
  });
});

// GET /api/license/tiers — Info de todos los planes
licenseRouter.get('/tiers', (_req, res) => {
  const tiers = (['free', 'monitoring', 'consulting'] as const).map((tier) => ({
    id: tier,
    name: TIER_LABELS[tier],
    price: TIER_PRICES[tier],
    limits: TIER_LIMITS[tier],
  }));
  res.json({
    success: true,
    data: tiers,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/license/generate — Generar llave (solo para admin/testing)
licenseRouter.post('/generate', (req, res) => {
  const { tier } = req.body;
  if (!tier || !['monitoring', 'consulting'].includes(tier)) {
    res.status(400).json({
      success: false,
      error: 'Tier debe ser "monitoring" o "consulting".',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const key = generateLicenseKey(tier);
  res.json({
    success: true,
    data: { licenseKey: key, tier },
    timestamp: new Date().toISOString(),
  });
});
