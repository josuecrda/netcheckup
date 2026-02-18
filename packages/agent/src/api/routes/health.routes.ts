import { Router } from 'express';
import { healthRepo } from '../../db/repositories/health.repo.js';
import { problemRepo } from '../../db/repositories/problem.repo.js';
import { calculateHealthScore } from '../../analyzers/health-score.js';

export const healthRouter = Router();

// GET /api/health — Health Score actual
healthRouter.get('/', (_req, res) => {
  try {
    const existing = healthRepo.getLatest();
    const healthScore = existing || calculateHealthScore();

    res.json({
      success: true,
      data: healthScore,
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

// GET /api/health/history — Historial de scores
healthRouter.get('/history', (req, res) => {
  try {
    const period = (req.query.period as string) || '7d';
    const history = healthRepo.getHistory(period);
    res.json({
      success: true,
      data: history,
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

// GET /api/health/problems — Problemas activos con recomendaciones
healthRouter.get('/problems', (_req, res) => {
  try {
    const problems = problemRepo.findActive();
    res.json({
      success: true,
      data: problems,
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

// GET /api/health/problems/all — Todos los problemas (activos y resueltos)
healthRouter.get('/problems/all', (_req, res) => {
  try {
    const problems = problemRepo.findAll();
    res.json({
      success: true,
      data: problems,
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

// GET /api/health/problems/:id — Detalle de un problema
healthRouter.get('/problems/:id', (req, res): void => {
  try {
    const problem = problemRepo.findById(req.params.id);
    if (!problem) {
      res.status(404).json({
        success: false,
        error: 'Problema no encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.json({
      success: true,
      data: problem,
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

// PUT /api/health/problems/:id/resolve — Marcar problema como resuelto manualmente
healthRouter.put('/problems/:id/resolve', (req, res): void => {
  try {
    const problem = problemRepo.resolve(req.params.id);
    if (!problem) {
      res.status(404).json({
        success: false,
        error: 'Problema no encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.json({
      success: true,
      data: problem,
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
