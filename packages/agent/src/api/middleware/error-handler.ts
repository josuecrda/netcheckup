import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error('Error no manejado en API', { error: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString(),
  });
}
