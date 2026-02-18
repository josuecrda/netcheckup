import type { DiagnosticRule, DiagnosticContext, RuleResult } from '../problem-detector.js';

/**
 * Reglas de diagnóstico para problemas de latencia.
 */
export const latencyRules: DiagnosticRule[] = [
  // ─── RULE: high-latency-gateway ─────────────────────
  {
    id: 'high-latency-gateway',
    name: 'Latencia alta al gateway',
    category: 'latency',
    evaluate(ctx: DiagnosticContext) {
      const gateway = ctx.devices.find((d) => d.isGateway);
      if (!gateway) return null;

      const metrics = ctx.metricsByDevice[gateway.id];
      if (!metrics || metrics.length === 0) return null;

      const reachable = metrics.filter((m) => m.isReachable && m.latencyMs !== null);
      if (reachable.length === 0) return null;

      const avgLatency = reachable.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / reachable.length;

      if (avgLatency <= 50) return null;

      const severity = avgLatency > 200 ? 'critical' as const : 'warning' as const;
      const gatewayName = gateway.customName || gateway.hostname || gateway.ipAddress;

      return {
        severity,
        category: 'latency',
        title: `Tu router/gateway (${gatewayName}) tiene latencia alta`,
        description:
          `La latencia promedio a tu router (${gateway.ipAddress}) es de ${Math.round(avgLatency)}ms. ` +
          `Lo normal es menos de 5ms dentro de tu red local. ` +
          `Esto significa que la comunicación entre tus dispositivos y el router está siendo lenta.`,
        affectedDevices: [gateway.id],
        impact:
          'Todos los dispositivos de tu red experimentarán lentitud al navegar, ' +
          'hacer videollamadas, o acceder a recursos compartidos.',
        recommendation:
          avgLatency > 200
            ? 'URGENTE: Reinicia tu router. Si el problema persiste, revisa si hay ' +
              'demasiados dispositivos conectados o si el router necesita ser reemplazado.'
            : 'Revisa que el cable entre tu computadora y el router esté bien conectado. ' +
              'Si usas WiFi, intenta acercarte al router. Si tienes más de 30 dispositivos ' +
              'conectados, considera agregar un switch para distribuir la carga.',
        ruleId: 'high-latency-gateway',
      };
    },
  },

  // ─── RULE: high-latency-device ──────────────────────
  {
    id: 'high-latency-device',
    name: 'Latencia alta en dispositivo',
    category: 'latency',
    evaluate(ctx: DiagnosticContext) {
      const results: RuleResult[] = [];
      const threshold = ctx.thresholds.highLatencyMs;

      for (const device of ctx.devices) {
        if (device.isGateway) continue; // Handled by gateway rule
        const metrics = ctx.metricsByDevice[device.id];
        if (!metrics || metrics.length === 0) continue;

        const reachable = metrics.filter((m) => m.isReachable && m.latencyMs !== null);
        if (reachable.length === 0) continue;

        const avgLatency = reachable.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / reachable.length;
        if (avgLatency <= threshold) continue;

        const deviceName = device.customName || device.hostname || device.ipAddress;

        results.push({
          severity: 'warning',
          category: 'latency',
          title: `${deviceName} tiene latencia alta`,
          description:
            `El dispositivo "${deviceName}" (${device.ipAddress}) está respondiendo con una ` +
            `latencia promedio de ${Math.round(avgLatency)}ms. Lo normal sería menos de ${threshold}ms.`,
          affectedDevices: [device.id],
          impact: 'Este dispositivo puede experimentar conexión lenta o intermitente.',
          recommendation:
            'Revisa el cable de red que conecta este dispositivo. Si usa WiFi, ' +
            'verifica que la señal sea buena. También puede ser que el dispositivo esté ' +
            'sobrecargado de trabajo (CPU alta).',
          ruleId: `high-latency-device:${device.id}`,
        });
      }

      // Return first match or null (the detector handles per-device rules)
      return results.length > 0 ? results : null;
    },
  },

  // ─── RULE: latency-spikes ───────────────────────────
  {
    id: 'latency-spikes',
    name: 'Latencia inestable (jitter alto)',
    category: 'latency',
    evaluate(ctx: DiagnosticContext) {
      const affectedDevices: string[] = [];

      for (const device of ctx.devices) {
        const metrics = ctx.metricsByDevice[device.id];
        if (!metrics || metrics.length < 3) continue;

        const reachable = metrics.filter((m) => m.isReachable && m.latencyMs !== null);
        if (reachable.length < 3) continue;

        const avgLatency = reachable.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / reachable.length;

        // Calculate jitter (average of absolute differences between consecutive readings)
        let jitterSum = 0;
        for (let i = 1; i < reachable.length; i++) {
          jitterSum += Math.abs((reachable[i].latencyMs ?? 0) - (reachable[i - 1].latencyMs ?? 0));
        }
        const avgJitter = jitterSum / (reachable.length - 1);

        if (avgJitter > 100 && avgLatency > 20) {
          affectedDevices.push(device.id);
        }
      }

      if (affectedDevices.length === 0) return null;

      return {
        severity: 'warning',
        category: 'latency',
        title: 'Latencia inestable detectada (posible problema de infraestructura)',
        description:
          `La latencia de tu red fluctúa drásticamente en ${affectedDevices.length} dispositivo(s). ` +
          'Esto puede indicar un problema en la infraestructura de red como un loop (bucle) entre ' +
          'switches, un broadcast storm, o interferencia en la señal WiFi.',
        affectedDevices,
        impact:
          'Los usuarios experimentarán conexión intermitente — momentos donde ' +
          'funciona bien y otros donde se corta o va muy lento.',
        recommendation:
          'Este tipo de problema generalmente se debe a un cable de red ' +
          'dañado o mal conectado que crea un loop entre switches. Revisa que no haya ' +
          'cables redundantes entre tus switches. Si tienes switches managed, revisa ' +
          'que Spanning Tree Protocol (STP) esté habilitado.',
        ruleId: 'latency-spikes',
      };
    },
  },
];
