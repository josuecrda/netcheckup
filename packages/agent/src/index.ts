import http from 'http';
import { logger } from './utils/logger.js';
import { loadConfig } from './config.js';
import { getDatabase, closeDatabase } from './db/connection.js';
import { runMigrations } from './db/migrations.js';
import { createApp } from './api/server.js';
import { initWebSocket } from './api/websocket.js';
import { startScheduler, stopScheduler } from './scheduler/cron-manager.js';
import { runDiscovery } from './scanners/network-discovery.js';
import { runDiagnostics } from './analyzers/problem-detector.js';
import { calculateHealthScore } from './analyzers/health-score.js';
import { getNetworkInfo } from './utils/network-utils.js';
import { APP_NAME, APP_VERSION } from '@netcheckup/shared';

async function main() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║           ${APP_NAME} v${APP_VERSION}              ║
  ║   Diagnóstico de red para PyMEs          ║
  ╚══════════════════════════════════════════╝
  `);

  // 1. Cargar configuración
  logger.info('Cargando configuración...');
  const config = loadConfig();

  // 2. Inicializar base de datos
  logger.info('Inicializando base de datos...');
  await getDatabase(config.database.path);
  runMigrations();
  logger.info('Base de datos lista');

  // 3. Mostrar info de red
  const netInfo = getNetworkInfo();
  logger.info(`Red detectada:
    - IP local: ${netInfo.localIp}
    - Subnet: ${netInfo.subnet}.0/24
    - Gateway: ${netInfo.gateway || 'no detectado'}
    - Interfaz: ${netInfo.interfaceName}`);

  // 4. Arrancar API + WebSocket
  const app = createApp();
  const server = http.createServer(app);
  initWebSocket(server);

  const port = config.app.port;
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      logger.info(`Servidor iniciado en http://localhost:${port}`);
      logger.info(`API disponible en http://localhost:${port}/api/`);
      logger.info(`WebSocket disponible en ws://localhost:${port}/ws`);
      logger.info(`Dashboard en http://localhost:${port}`);
      resolve();
    });
  });

  // 5. Iniciar scheduler
  startScheduler();

  // 6. Escaneo inicial de descubrimiento (en background, no bloquea el servidor)
  logger.info('Ejecutando escaneo inicial de la red en background...');
  runDiscovery('scheduled')
    .then(async (result) => {
      logger.info(
        `Escaneo inicial completado: ${result.devicesFound} dispositivos, ${result.newDevices} nuevos`
      );
      // Run initial diagnostics after first scan completes
      try {
        logger.info('Ejecutando diagnóstico inicial...');
        await runDiagnostics();
        calculateHealthScore();
        logger.info('Diagnóstico inicial completado');
      } catch (err) {
        logger.warn('Error en diagnóstico inicial', { error: (err as Error).message });
      }
    })
    .catch((err) => {
      logger.warn('El escaneo inicial falló (puede necesitar permisos elevados)', {
        error: (err as Error).message,
      });
    });

  // Manejo de shutdown graceful
  const shutdown = () => {
    logger.info('Apagando NetCheckup...');
    stopScheduler();
    server.close();
    closeDatabase();
    logger.info('NetCheckup detenido correctamente');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  logger.error('Error fatal al iniciar NetCheckup', { error: err.message, stack: err.stack });
  process.exit(1);
});
