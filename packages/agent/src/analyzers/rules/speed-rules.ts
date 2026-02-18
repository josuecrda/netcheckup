import type { DiagnosticRule, DiagnosticContext } from '../problem-detector.js';

/**
 * Reglas de diagnóstico para problemas de velocidad de internet.
 */
export const speedRules: DiagnosticRule[] = [
  // ─── RULE: speed-below-contracted ───────────────────
  {
    id: 'speed-below-contracted',
    name: 'Velocidad menor a lo contratado',
    category: 'speed',
    evaluate(ctx: DiagnosticContext) {
      const latestSpeed = ctx.latestSpeedTest;
      if (!latestSpeed) return null;

      const contracted = ctx.contractedDownloadMbps;
      if (!contracted || contracted <= 0) return null;

      const percent = (latestSpeed.downloadMbps / contracted) * 100;
      const threshold = ctx.thresholds.speedDegradedPercent;

      if (percent >= threshold) return null;

      const severity = percent < 20 ? 'critical' as const : 'warning' as const;
      const isp = latestSpeed.isp || 'tu proveedor de internet';

      return {
        severity,
        category: 'speed',
        title: 'Velocidad de internet menor a lo contratado',
        description:
          `Tu velocidad de descarga es ${latestSpeed.downloadMbps.toFixed(1)} Mbps, pero pagas por ` +
          `${contracted} Mbps. Estás recibiendo solo el ${Math.round(percent)}% de lo que pagas.`,
        affectedDevices: [],
        impact:
          'Navegación lenta, videollamadas con cortes, descargas lentas. ' +
          'Estás pagando por un servicio que no estás recibiendo completo.',
        recommendation:
          percent < 20
            ? `URGENTE: Contacta a ${isp} y reporta que tu velocidad está al ${Math.round(percent)}% ` +
              'de lo contratado. Mientras tanto, reinicia tu módem/router desconectándolo 30 segundos.'
            : `Prueba reiniciar tu módem/router. Si la velocidad baja persiste después de 24 horas, ` +
              `contacta a ${isp} con estos datos: "Mi velocidad contratada es ${contracted} Mbps ` +
              `pero estoy recibiendo ${latestSpeed.downloadMbps.toFixed(1)} Mbps según mediciones automatizadas."`,
        ruleId: 'speed-below-contracted',
      };
    },
  },

  // ─── RULE: speed-degrading-trend ────────────────────
  {
    id: 'speed-degrading-trend',
    name: 'Tendencia de degradación de velocidad',
    category: 'speed',
    evaluate(ctx: DiagnosticContext) {
      const speedTests = ctx.recentSpeedTests;
      if (!speedTests || speedTests.length < 4) return null;

      // Split into recent (last 2 tests) vs previous (earlier tests)
      const recent = speedTests.slice(-2);
      const previous = speedTests.slice(0, -2);

      if (previous.length === 0) return null;

      const recentAvg = recent.reduce((sum, t) => sum + t.downloadMbps, 0) / recent.length;
      const previousAvg = previous.reduce((sum, t) => sum + t.downloadMbps, 0) / previous.length;

      // 30% degradation threshold
      if (recentAvg >= previousAvg * 0.7) return null;

      const degradation = Math.round((1 - recentAvg / previousAvg) * 100);

      return {
        severity: 'info',
        category: 'speed',
        title: 'Tu velocidad de internet está bajando gradualmente',
        description:
          `En los últimos ${speedTests.length} speed tests, tu velocidad de internet ha disminuido ` +
          `aproximadamente un ${degradation}% (de ${previousAvg.toFixed(1)} Mbps a ${recentAvg.toFixed(1)} Mbps). ` +
          'Esto puede indicar un problema con tu proveedor o congestión en tu red.',
        affectedDevices: [],
        impact: 'La experiencia de internet de todos los usuarios se irá degradando.',
        recommendation:
          'Monitorea la situación. Si continúa bajando en los próximos ' +
          'días, contacta a tu proveedor con el historial de mediciones que NetCheckup ' +
          'ha registrado (puedes exportar el reporte).',
        ruleId: 'speed-degrading-trend',
      };
    },
  },

  // ─── RULE: upload-much-slower-than-expected ─────────
  {
    id: 'upload-slow',
    name: 'Velocidad de subida muy baja',
    category: 'speed',
    evaluate(ctx: DiagnosticContext) {
      const latestSpeed = ctx.latestSpeedTest;
      if (!latestSpeed) return null;

      // If upload is less than 10% of download and download is decent (>10 Mbps)
      if (latestSpeed.downloadMbps < 10) return null;
      const ratio = latestSpeed.uploadMbps / latestSpeed.downloadMbps;
      if (ratio >= 0.1) return null;

      return {
        severity: 'info',
        category: 'speed',
        title: 'Velocidad de subida muy baja comparada con descarga',
        description:
          `Tu velocidad de subida (${latestSpeed.uploadMbps.toFixed(1)} Mbps) es muy baja comparada ` +
          `con tu velocidad de descarga (${latestSpeed.downloadMbps.toFixed(1)} Mbps).`,
        affectedDevices: [],
        impact:
          'Subir archivos, enviar emails con adjuntos grandes, y hacer videollamadas ' +
          'puede ser lento. En videollamadas, los demás te verán con mala calidad.',
        recommendation:
          'En muchos planes de internet residenciales, la velocidad de subida es mucho ' +
          'menor que la de descarga. Si necesitas subir archivos frecuentemente o hacer ' +
          'muchas videollamadas, consulta con tu proveedor si tienen planes con mayor ' +
          'velocidad de subida (fibra óptica simétrica).',
        ruleId: 'upload-slow',
      };
    },
  },
];
