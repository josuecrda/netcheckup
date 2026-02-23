import { Router } from 'express';
import type { Request, Response } from 'express';
import { canUseSnmp } from '../../license.js';
import { snmpCounterRepo } from '../../db/repositories/snmp-counter.repo.js';

export const snmpRouter = Router();

/**
 * Middleware: verificar que el tier permita SNMP.
 */
function requireSnmp(_req: Request, res: Response, next: () => void) {
  if (!canUseSnmp()) {
    res.status(403).json({
      success: false,
      error: 'El diagnóstico de puertos SNMP requiere el plan Consultoría.',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

snmpRouter.use(requireSnmp);

/**
 * GET /api/snmp/port-health?deviceId=xxx
 * Salud de puertos de un switch específico.
 */
snmpRouter.get('/port-health', (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string;
    if (!deviceId) {
      res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro deviceId',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const portDeltas = snmpCounterRepo.getPortHealth(deviceId);

    res.json({
      success: true,
      data: portDeltas,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/snmp/top-talkers?limit=10
 * Puertos con más tráfico en toda la red.
 */
snmpRouter.get('/top-talkers', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const topTalkers = snmpCounterRepo.getTopTalkers(limit);

    res.json({
      success: true,
      data: topTalkers,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});
