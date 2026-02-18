import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { devicesRouter } from './routes/devices.routes.js';
import { scansRouter } from './routes/scans.routes.js';
import { metricsRouter } from './routes/metrics.routes.js';
import { speedtestRouter } from './routes/speedtest.routes.js';
import { alertsRouter } from './routes/alerts.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { toolsRouter } from './routes/tools.routes.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Log de requests
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // API routes
  app.use('/api/devices', devicesRouter);
  app.use('/api/scans', scansRouter);
  app.use('/api/metrics', metricsRouter);
  app.use('/api/speedtest', speedtestRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/tools', toolsRouter);

  // Servir dashboard (archivos estáticos de Vite build)
  const dashboardPath = path.resolve(__dirname, '..', '..', '..', 'dashboard', 'dist');
  app.use(express.static(dashboardPath));

  // SPA fallback: cualquier ruta no-API sirve el index.html del dashboard
  app.get('*', (_req, res) => {
    const indexPath = path.join(dashboardPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(200).json({
          message: 'NetCheckup API activa. Dashboard no compilado aún.',
          api: '/api/',
        });
      }
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
