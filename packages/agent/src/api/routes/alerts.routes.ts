import { Router } from 'express';
import { alertRepo } from '../../db/repositories/alert.repo.js';

export const alertsRouter = Router();

// GET /api/alerts — Lista de alertas (paginada)
alertsRouter.get('/', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const unreadOnly = req.query.unreadOnly === 'true';

  const { alerts, total } = alertRepo.findAll(page, pageSize, unreadOnly);
  res.json({
    success: true,
    data: alerts,
    total,
    page,
    pageSize,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/alerts/unread-count — Cantidad de alertas no leídas
alertsRouter.get('/unread-count', (_req, res) => {
  const count = alertRepo.getUnreadCount();
  res.json({ success: true, data: { count }, timestamp: new Date().toISOString() });
});

// PUT /api/alerts/read-all — Marcar todas como leídas
alertsRouter.put('/read-all', (_req, res) => {
  alertRepo.markAllAsRead();
  res.json({ success: true, data: null, timestamp: new Date().toISOString() });
});

// PUT /api/alerts/:id/read — Marcar alerta como leída
alertsRouter.put('/:id/read', (req, res) => {
  alertRepo.markAsRead(req.params.id);
  res.json({ success: true, data: null, timestamp: new Date().toISOString() });
});

// DELETE /api/alerts/:id — Eliminar alerta
alertsRouter.delete('/:id', (req, res) => {
  alertRepo.delete(req.params.id);
  res.json({ success: true, data: null, timestamp: new Date().toISOString() });
});
