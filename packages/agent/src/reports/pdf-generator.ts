import PDFDocument from 'pdfkit';
import { deviceRepo } from '../db/repositories/device.repo.js';
import { healthRepo } from '../db/repositories/health.repo.js';
import { speedTestRepo } from '../db/repositories/speedtest.repo.js';
import { problemRepo } from '../db/repositories/problem.repo.js';
import { alertRepo } from '../db/repositories/alert.repo.js';
import { settingRepo } from '../db/repositories/setting.repo.js';
import { logger } from '../utils/logger.js';

// ─── Color palette (matches dashboard theme) ────────────────
const COLORS = {
  accent: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  dark: '#0f172a',
  text: '#1e293b',
  textLight: '#64748b',
  white: '#ffffff',
  bg: '#f8fafc',
  border: '#e2e8f0',
};

const PAGE_W = 612;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2; // 512
const FOOTER_Y = 740;
const MAX_Y = 710; // safe bottom before footer

function scoreColor(score: number): string {
  if (score >= 80) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  if (score >= 40) return '#f97316';
  return COLORS.danger;
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bueno';
  if (score >= 40) return 'Regular';
  return 'Critico';
}

function severityColor(severity: string): string {
  if (severity === 'critical') return COLORS.danger;
  if (severity === 'warning') return COLORS.warning;
  return COLORS.accent;
}

function severityLabel(severity: string): string {
  if (severity === 'critical') return 'Critico';
  if (severity === 'warning') return 'Advertencia';
  return 'Info';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function periodLabel(period: string): string {
  if (period === '7d') return 'Ultimos 7 dias';
  if (period === '30d') return 'Ultimos 30 dias';
  if (period === '24h') return 'Ultimas 24 horas';
  return period;
}

type Doc = InstanceType<typeof PDFDocument>;

/** Ensure there's enough vertical space; if not, add a page */
function ensureSpace(doc: Doc, needed: number): void {
  if (doc.y + needed > MAX_Y) {
    doc.addPage();
  }
}

function sectionTitle(doc: Doc, title: string): void {
  ensureSpace(doc, 30);
  doc
    .fontSize(13)
    .fillColor(COLORS.accent)
    .text(title, MARGIN, doc.y);
  const lineY = doc.y + 2;
  doc
    .strokeColor(COLORS.accent)
    .lineWidth(1)
    .moveTo(MARGIN, lineY)
    .lineTo(MARGIN + CONTENT_W, lineY)
    .stroke();
  doc.y = lineY + 8;
}

function kvLine(doc: Doc, key: string, value: string): void {
  ensureSpace(doc, 16);
  const y = doc.y;
  doc.fontSize(9).fillColor(COLORS.textLight).text(key, MARGIN, y, { width: 160 });
  doc.fontSize(10).fillColor(COLORS.text).text(value, MARGIN + 165, y, { width: CONTENT_W - 165 });
  doc.y = y + 16;
}

// ─── Main generator ─────────────────────────────────────────
export function generateHealthReport(period: string = '7d'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 80, left: 50, right: 50 },
        info: {
          Title: 'Reporte de Salud de Red - NetCheckup',
          Author: 'NetCheckup',
          Subject: `Reporte ${periodLabel(period)}`,
        },
        autoFirstPage: false,
      });

      const buffers: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ─── Gather data ────────────────────────────────────
      const settings = settingRepo.getAppSettings();
      const companyName = (settings.companyName as string) || 'Mi Empresa';
      const ispName = (settings.ispName as string) || null;
      const contractedDown = settings.contractedDownloadMbps as number | null;

      const health = healthRepo.getLatest();
      const healthHistory = healthRepo.getHistory(period);
      const deviceSummary = deviceRepo.getSummary();
      const devices = deviceRepo.findAll();
      const speedAvg = speedTestRepo.getAverage(period);
      const activeProblems = problemRepo.findActive();
      const problemCounts = problemRepo.countBySeverity();
      const recentAlerts = alertRepo.findAll(1, 15, false);

      const now = new Date();

      // ─── Footer on every page (via event) ─────────────
      // Temporarily set bottom margin to 0 to write footer without triggering addPage
      const footerText = `NetCheckup v0.1.0  |  ${companyName}`;
      let inFooter = false;
      doc.on('pageAdded', () => {
        if (inFooter) return;
        inFooter = true;
        const savedY = doc.y;
        const savedBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // disable bottom margin temporarily

        doc
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .moveTo(MARGIN, FOOTER_Y - 5)
          .lineTo(MARGIN + CONTENT_W, FOOTER_Y - 5)
          .stroke();

        doc
          .fontSize(7)
          .fillColor('#94a3b8')
          .text(footerText, MARGIN, FOOTER_Y, { width: CONTENT_W, align: 'center', lineBreak: false });

        doc.page.margins.bottom = savedBottom; // restore margin
        doc.y = savedY; // restore cursor position
        inFooter = false;
      });

      // First page
      doc.addPage();

      // ═══════════════════════════════════════════════════
      // HEADER BAR (page 1 only)
      // ═══════════════════════════════════════════════════
      doc.rect(0, 0, PAGE_W, 80).fill(COLORS.dark);
      doc.fontSize(22).fillColor(COLORS.white).text('NetCheckup', MARGIN, 20);
      doc.fontSize(10).fillColor('#94a3b8').text('Reporte de Salud de Red', MARGIN, 48);
      doc.fontSize(10).fillColor('#94a3b8').text(companyName, 350, 20, { width: 212, align: 'right' });
      doc.fontSize(9).fillColor('#64748b')
        .text(periodLabel(period), 350, 36, { width: 212, align: 'right' })
        .text(`Generado: ${formatDate(now.toISOString())}`, 350, 50, { width: 212, align: 'right' });

      doc.y = 100;

      // ═══════════════════════════════════════════════════
      // HEALTH SCORE
      // ═══════════════════════════════════════════════════
      sectionTitle(doc, 'Health Score');

      if (health) {
        const sc = health.score;
        const color = scoreColor(sc);
        const label = scoreLabel(sc);
        const boxY = doc.y;

        // Score box
        doc.rect(MARGIN, boxY, 90, 55).fillAndStroke(COLORS.bg, COLORS.border);
        doc.fontSize(26).fillColor(color).text(String(sc), MARGIN, boxY + 5, { width: 90, align: 'center' });
        doc.fontSize(9).fillColor(COLORS.textLight).text(label, MARGIN, boxY + 36, { width: 90, align: 'center' });

        // Info to the right of box
        const infoX = MARGIN + 105;
        const trendText = health.trend === 'improving' ? 'Mejorando' : health.trend === 'declining' ? 'Bajando' : 'Estable';
        const trendIcon = health.trend === 'improving' ? '+' : health.trend === 'declining' ? '-' : '=';
        doc.fontSize(10).fillColor(COLORS.text).text(`Tendencia: ${trendIcon} ${trendText}`, infoX, boxY + 5);

        if (health.previousScore !== null) {
          const diff = sc - health.previousScore;
          const diffStr = diff > 0 ? `+${diff}` : String(diff);
          doc.fontSize(9).fillColor(COLORS.textLight).text(`vs anterior: ${health.previousScore} (${diffStr})`, infoX, boxY + 22);
        }

        if (healthHistory.length > 1) {
          const scores = healthHistory.map(h => h.score);
          const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          const min = Math.min(...scores);
          const max = Math.max(...scores);
          doc.fontSize(9).fillColor(COLORS.textLight).text(`Periodo: min ${min} / avg ${avg} / max ${max}`, infoX, boxY + 38);
        }

        doc.y = boxY + 65;

        // Factors breakdown
        if (health.factors && health.factors.length > 0) {
          doc.fontSize(10).fillColor(COLORS.text).text('Desglose por factor:', MARGIN, doc.y);
          doc.y += 4;
          for (const f of health.factors) {
            const fColor = scoreColor(f.score);
            doc.fontSize(9).fillColor(fColor).text(
              `  ${f.name}: ${f.score}/100 (peso ${Math.round(f.weight * 100)}%)`,
              MARGIN + 10, doc.y
            );
          }
        }
      } else {
        doc.fontSize(10).fillColor(COLORS.textLight).text('Sin datos de health score disponibles.', MARGIN, doc.y);
      }

      doc.moveDown(1);

      // ═══════════════════════════════════════════════════
      // RESUMEN DE RED
      // ═══════════════════════════════════════════════════
      sectionTitle(doc, 'Resumen de Red');

      const statItems = [
        { label: 'Dispositivos', value: String(deviceSummary.total), color: COLORS.accent },
        { label: 'En linea', value: String(deviceSummary.online), color: COLORS.success },
        { label: 'Fuera de linea', value: String(deviceSummary.offline), color: COLORS.danger },
        { label: 'Degradados', value: String(deviceSummary.degraded), color: COLORS.warning },
      ];

      ensureSpace(doc, 60);
      const netY = doc.y;
      const boxW = 115;
      for (let i = 0; i < statItems.length; i++) {
        const bx = MARGIN + i * (boxW + 10);
        doc.rect(bx, netY, boxW, 42).fillAndStroke(COLORS.bg, COLORS.border);
        doc.fontSize(18).fillColor(statItems[i].color).text(statItems[i].value, bx, netY + 4, { width: boxW, align: 'center' });
        doc.fontSize(8).fillColor(COLORS.textLight).text(statItems[i].label, bx, netY + 27, { width: boxW, align: 'center' });
      }
      doc.y = netY + 50;

      // Device types
      const types = Object.entries(deviceSummary.byType).sort((a, b) => b[1] - a[1]);
      if (types.length > 0) {
        doc.fontSize(9).fillColor(COLORS.textLight).text(
          'Por tipo: ' + types.map(([t, c]) => `${t} (${c})`).join(', '),
          MARGIN, doc.y
        );
      }

      doc.moveDown(1);

      // ═══════════════════════════════════════════════════
      // VELOCIDAD DE INTERNET
      // ═══════════════════════════════════════════════════
      sectionTitle(doc, 'Velocidad de Internet');

      if (speedAvg.count > 0) {
        kvLine(doc, 'Descarga promedio', `${speedAvg.avgDownload.toFixed(1)} Mbps`);
        kvLine(doc, 'Subida promedio', `${speedAvg.avgUpload.toFixed(1)} Mbps`);
        kvLine(doc, 'Ping promedio', `${speedAvg.avgPing.toFixed(0)} ms`);
        kvLine(doc, 'Mediciones', `${speedAvg.count}`);

        if (contractedDown) {
          const pct = Math.round((speedAvg.avgDownload / contractedDown) * 100);
          const ispSuffix = ispName ? ` (${ispName})` : '';
          kvLine(doc, 'vs contratada', `${pct}% de ${contractedDown} Mbps${ispSuffix}`);
        }
      } else {
        doc.fontSize(10).fillColor(COLORS.textLight).text('Sin speed tests en este periodo.', MARGIN, doc.y);
        doc.moveDown(0.5);
      }

      doc.moveDown(1);

      // ═══════════════════════════════════════════════════
      // PROBLEMAS ACTIVOS
      // ═══════════════════════════════════════════════════
      sectionTitle(doc, `Problemas Activos (${activeProblems.length})`);

      if (activeProblems.length === 0) {
        doc.fontSize(10).fillColor(COLORS.success).text('No hay problemas activos. Tu red esta sana.', MARGIN, doc.y);
        doc.moveDown(0.5);
      } else {
        doc.fontSize(9).fillColor(COLORS.textLight).text(
          `Criticos: ${problemCounts.critical}  |  Advertencias: ${problemCounts.warning}  |  Info: ${problemCounts.info}`,
          MARGIN, doc.y
        );
        doc.moveDown(0.6);

        for (const problem of activeProblems.slice(0, 10)) {
          ensureSpace(doc, 70);

          const sColor = severityColor(problem.severity);
          const sLabel = severityLabel(problem.severity);

          // Title line
          doc.fontSize(10).fillColor(sColor).text(`[${sLabel}]`, MARGIN, doc.y, { continued: true });
          doc.fillColor(COLORS.text).text(` ${problem.title}`, { continued: false });

          // Description
          const desc = problem.description.length > 180 ? problem.description.slice(0, 180) + '...' : problem.description;
          doc.fontSize(8).fillColor(COLORS.textLight).text(desc, MARGIN + 10, doc.y, { width: CONTENT_W - 10 });

          // Recommendation
          const rec = problem.recommendation.length > 140 ? problem.recommendation.slice(0, 140) + '...' : problem.recommendation;
          doc.fontSize(8).fillColor(COLORS.accent).text(`Rec: ${rec}`, MARGIN + 10, doc.y, { width: CONTENT_W - 10 });

          doc.moveDown(0.6);
        }

        if (activeProblems.length > 10) {
          doc.fontSize(8).fillColor(COLORS.textLight).text(
            `... y ${activeProblems.length - 10} problemas mas.`,
            MARGIN, doc.y
          );
          doc.moveDown(0.3);
        }
      }

      doc.moveDown(0.8);

      // ═══════════════════════════════════════════════════
      // ALERTAS RECIENTES
      // ═══════════════════════════════════════════════════
      sectionTitle(doc, 'Alertas Recientes');

      if (recentAlerts.alerts.length === 0) {
        doc.fontSize(10).fillColor(COLORS.textLight).text('Sin alertas recientes.', MARGIN, doc.y);
      } else {
        const colDate = 95;
        const colSev = 70;
        const colTitle = CONTENT_W - colDate - colSev;

        // Table header
        ensureSpace(doc, 20);
        const hdrY = doc.y;
        doc.fontSize(8).fillColor(COLORS.textLight);
        doc.text('Fecha', MARGIN, hdrY, { width: colDate });
        doc.text('Severidad', MARGIN + colDate, hdrY, { width: colSev });
        doc.text('Titulo', MARGIN + colDate + colSev, hdrY, { width: colTitle });
        doc.y = hdrY + 12;
        doc.strokeColor(COLORS.border).lineWidth(0.5)
          .moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y).stroke();
        doc.y += 5;

        for (const alert of recentAlerts.alerts.slice(0, 15)) {
          ensureSpace(doc, 18);
          const rowY = doc.y;
          const aColor = severityColor(alert.severity);

          doc.fontSize(7).fillColor(COLORS.textLight).text(
            formatDate(alert.createdAt), MARGIN, rowY, { width: colDate }
          );
          doc.fontSize(7).fillColor(aColor).text(
            severityLabel(alert.severity), MARGIN + colDate, rowY, { width: colSev }
          );
          doc.fontSize(8);
          const titleH = doc.heightOfString(alert.title, { width: colTitle });
          doc.fillColor(COLORS.text).text(
            alert.title, MARGIN + colDate + colSev, rowY, { width: colTitle }
          );
          doc.y = rowY + Math.max(14, titleH + 4);
        }
      }

      doc.moveDown(1);

      // ═══════════════════════════════════════════════════
      // TOP DISPOSITIVOS POR LATENCIA
      // ═══════════════════════════════════════════════════
      sectionTitle(doc, 'Dispositivos con Mayor Latencia');

      const devicesWithLatency = devices
        .filter(d => d.latencyMs !== null && d.latencyMs > 0)
        .sort((a, b) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0))
        .slice(0, 8);

      if (devicesWithLatency.length === 0) {
        doc.fontSize(10).fillColor(COLORS.textLight).text('Sin datos de latencia disponibles.', MARGIN, doc.y);
      } else {
        for (const d of devicesWithLatency) {
          ensureSpace(doc, 16);
          const name = d.customName || d.hostname || d.ipAddress;
          const latency = d.latencyMs ?? 0;
          const latColor = latency > 100 ? COLORS.danger : latency > 50 ? COLORS.warning : COLORS.success;
          const lossStr = d.packetLoss && d.packetLoss > 0 ? `  |  loss: ${d.packetLoss.toFixed(1)}%` : '';

          const lineY = doc.y;
          doc.fontSize(9).fillColor(COLORS.text).text(
            `${name} (${d.ipAddress})`,
            MARGIN + 10, lineY, { width: 300 }
          );
          doc.fontSize(9).fillColor(latColor).text(
            `${latency.toFixed(0)} ms${lossStr}`,
            MARGIN + 320, lineY, { width: 180 }
          );
          doc.y = lineY + 14;
        }
      }

      doc.end();
    } catch (err) {
      logger.error('Error generando reporte PDF', { error: (err as Error).message });
      reject(err);
    }
  });
}
