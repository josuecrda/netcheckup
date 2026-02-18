import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { logger } from '../utils/logger.js';
import type { WSEventType } from '@netcheckup/shared';

let wss: WebSocketServer | null = null;

/**
 * Inicializa el servidor WebSocket.
 */
export function initWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    logger.debug('Nuevo cliente WebSocket conectado');

    // Heartbeat
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(interval);
      logger.debug('Cliente WebSocket desconectado');
    });

    ws.on('error', (err) => {
      logger.warn('Error en WebSocket', { error: err.message });
    });

    // Enviar mensaje de bienvenida
    ws.send(
      JSON.stringify({
        type: 'connected',
        payload: { message: 'Conectado a NetCheckup' },
        timestamp: new Date().toISOString(),
      })
    );
  });

  logger.info('WebSocket server iniciado en /ws');
  return wss;
}

/**
 * Envía un evento a todos los clientes conectados.
 */
export function broadcastEvent(type: WSEventType | 'connected', payload: unknown): void {
  if (!wss) return;

  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
