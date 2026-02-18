import type { DiagnosticRule, DiagnosticContext, RuleResult } from '../problem-detector.js';

/**
 * Reglas de diagnóstico para problemas de disponibilidad.
 */
export const availabilityRules: DiagnosticRule[] = [
  // ─── RULE: device-frequent-offline ──────────────────
  {
    id: 'device-frequent-offline',
    name: 'Dispositivo se desconecta frecuentemente',
    category: 'availability',
    evaluate(ctx: DiagnosticContext) {
      const results: RuleResult[] = [];

      for (const device of ctx.devices) {
        const metrics = ctx.metricsByDevice[device.id];
        if (!metrics || metrics.length < 5) continue;

        // Count status transitions (reachable → unreachable and vice versa)
        let transitions = 0;
        for (let i = 1; i < metrics.length; i++) {
          if (metrics[i].isReachable !== metrics[i - 1].isReachable) {
            transitions++;
          }
        }

        // More than 5 transitions in the measurement window suggests instability
        if (transitions <= 5) continue;

        const deviceName = device.customName || device.hostname || device.ipAddress;

        results.push({
          severity: 'warning',
          category: 'availability',
          title: `${deviceName} se desconecta frecuentemente`,
          description:
            `El dispositivo "${deviceName}" (${device.ipAddress}) se ha desconectado y reconectado ` +
            `${transitions} veces en las últimas mediciones.`,
          affectedDevices: [device.id],
          impact:
            'Si es una impresora, servidor, o punto de acceso WiFi, otros dispositivos ' +
            'que dependen de él también se verán afectados.',
          recommendation:
            'Las desconexiones frecuentes generalmente se deben a: ' +
            '1) Cable de red dañado o flojo — revisa la conexión física. ' +
            '2) Si es WiFi, la señal puede ser débil — acerca el dispositivo al router. ' +
            '3) El dispositivo puede estar fallando — verifica que funcione correctamente.',
          ruleId: `device-frequent-offline:${device.id}`,
        });
      }

      return results.length > 0 ? results : null;
    },
  },

  // ─── RULE: multiple-devices-offline ─────────────────
  {
    id: 'multiple-devices-offline',
    name: 'Múltiples dispositivos fuera de línea',
    category: 'availability',
    evaluate(ctx: DiagnosticContext) {
      const monitored = ctx.devices.filter((d) => d.isMonitored);
      const offline = monitored.filter((d) => d.status === 'offline');

      // Need at least 30% offline and more than 3 to trigger
      if (offline.length <= 3 || offline.length <= monitored.length * 0.3) return null;

      return {
        severity: 'critical',
        category: 'availability',
        title: 'Múltiples dispositivos fuera de línea',
        description:
          `${offline.length} de ${monitored.length} dispositivos están fuera de línea ` +
          'al mismo tiempo. Esto indica un problema mayor en la infraestructura de red.',
        affectedDevices: offline.map((d) => d.id),
        impact:
          'Gran parte de tu red no está funcionando. Los empleados no pueden ' +
          'trabajar normalmente.',
        recommendation:
          'Cuando muchos dispositivos se caen al mismo tiempo, el problema ' +
          'generalmente está en un switch, router, o punto de acceso WiFi que falló. ' +
          'Revisa: 1) ¿Tu router/switch principal está encendido y funcionando? ' +
          '2) ¿Las luces indicadoras del switch están normales? ' +
          '3) ¿Hubo un corte de luz reciente que pudo haber reiniciado equipos?',
        ruleId: 'multiple-devices-offline',
      };
    },
  },

  // ─── RULE: high-packet-loss ─────────────────────────
  {
    id: 'high-packet-loss',
    name: 'Pérdida alta de paquetes',
    category: 'packet-loss',
    evaluate(ctx: DiagnosticContext) {
      const threshold = ctx.thresholds.packetLossPercent;
      const results: RuleResult[] = [];

      for (const device of ctx.devices) {
        const metrics = ctx.metricsByDevice[device.id];
        if (!metrics || metrics.length === 0) continue;

        const avgPacketLoss =
          metrics.reduce((sum, m) => sum + m.packetLoss, 0) / metrics.length;

        if (avgPacketLoss <= threshold) continue;

        const deviceName = device.customName || device.hostname || device.ipAddress;

        results.push({
          severity: avgPacketLoss > 20 ? 'critical' : 'warning',
          category: 'packet-loss',
          title: `${deviceName} tiene pérdida de paquetes alta`,
          description:
            `El dispositivo "${deviceName}" (${device.ipAddress}) está experimentando una ` +
            `pérdida de paquetes promedio del ${Math.round(avgPacketLoss)}%. ` +
            `Lo aceptable es menos de ${threshold}%.`,
          affectedDevices: [device.id],
          impact:
            'La pérdida de paquetes causa que las páginas web carguen incompletas, ' +
            'las videollamadas se congelen, y las transferencias de archivos fallen.',
          recommendation:
            'Revisa la conexión física del dispositivo (cable o WiFi). ' +
            'Si es por cable, prueba con otro cable de red. Si es WiFi, ' +
            'acerca el dispositivo al router o verifica que no haya interferencia.',
          ruleId: `high-packet-loss:${device.id}`,
        });
      }

      return results.length > 0 ? results : null;
    },
  },
];
