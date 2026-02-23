import { Router } from 'express';
import { generateHealthReport } from '../../reports/pdf-generator.js';
import { settingRepo } from '../../db/repositories/setting.repo.js';
import { canUsePdfReports } from '../../license.js';

export const reportsRouter = Router();

// GET /api/reports/health-pdf?period=7d|30d — Generar y descargar PDF
reportsRouter.get('/health-pdf', async (req, res) => {
  if (!canUsePdfReports()) {
    res.status(403).json({
      success: false,
      error: 'Los reportes PDF requieren un plan de Monitoreo o superior.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const period = (req.query.period as string) || '7d';
    if (!['7d', '30d', '24h'].includes(period)) {
      res.status(400).json({ success: false, error: 'Periodo inválido. Usa 24h, 7d o 30d.' });
      return;
    }

    const pdfBuffer = await generateHealthReport(period);

    const settings = settingRepo.getAppSettings();
    const companyName = ((settings.companyName as string) || 'NetCheckup').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Reporte_${companyName}_${period}_${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Error generando reporte: ${(err as Error).message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/reports/schedule — Ver config de reportes
reportsRouter.get('/schedule', (_req, res) => {
  const settings = settingRepo.getAppSettings();
  res.json({
    success: true,
    data: {
      weeklyReportEnabled: settings.weeklyReportEnabled ?? false,
      weeklyReportDay: settings.weeklyReportDay ?? 1,
      monthlyReportEnabled: settings.monthlyReportEnabled ?? false,
    },
    timestamp: new Date().toISOString(),
  });
});

// PUT /api/reports/schedule — Actualizar config de reportes
reportsRouter.put('/schedule', (req, res) => {
  const { weeklyReportEnabled, weeklyReportDay, monthlyReportEnabled } = req.body;

  const updates: Record<string, string> = {};
  if (weeklyReportEnabled !== undefined) updates.weeklyReportEnabled = String(weeklyReportEnabled);
  if (weeklyReportDay !== undefined) updates.weeklyReportDay = String(weeklyReportDay);
  if (monthlyReportEnabled !== undefined) updates.monthlyReportEnabled = String(monthlyReportEnabled);

  settingRepo.saveAppSettings(updates as any);

  const settings = settingRepo.getAppSettings();
  res.json({
    success: true,
    data: {
      weeklyReportEnabled: settings.weeklyReportEnabled ?? false,
      weeklyReportDay: settings.weeklyReportDay ?? 1,
      monthlyReportEnabled: settings.monthlyReportEnabled ?? false,
    },
    timestamp: new Date().toISOString(),
  });
});
