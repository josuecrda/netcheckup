import type { DiagnosticRule, DiagnosticContext } from '../problem-detector.js';

/**
 * Reglas de diagnóstico para problemas de infraestructura.
 */
export const infrastructureRules: DiagnosticRule[] = [
  // ─── RULE: possible-broadcast-storm ─────────────────
  {
    id: 'possible-broadcast-storm',
    name: 'Posible broadcast storm',
    category: 'infrastructure',
    evaluate(ctx: DiagnosticContext) {
      const allDevices = ctx.devices.filter((d) => d.isMonitored);
      if (allDevices.length < 3) return null;

      let devicesWithHighJitter = 0;

      for (const device of allDevices) {
        const metrics = ctx.metricsByDevice[device.id];
        if (!metrics || metrics.length < 3) continue;

        // Calculate jitter
        const reachable = metrics.filter((m) => m.isReachable && m.latencyMs !== null);
        if (reachable.length < 3) continue;

        let jitterSum = 0;
        for (let i = 1; i < reachable.length; i++) {
          jitterSum += Math.abs((reachable[i].latencyMs ?? 0) - (reachable[i - 1].latencyMs ?? 0));
        }
        const avgJitter = jitterSum / (reachable.length - 1);

        const avgPacketLoss = metrics.reduce((sum, m) => sum + m.packetLoss, 0) / metrics.length;
        const anyReachable = metrics.some((m) => m.isReachable);

        if (avgJitter > 150 && avgPacketLoss > 20 && anyReachable) {
          devicesWithHighJitter++;
        }
      }

      // Need 40%+ of devices affected
      if (devicesWithHighJitter < allDevices.length * 0.4) return null;

      return {
        severity: 'critical',
        category: 'infrastructure',
        title: 'Posible broadcast storm detectada',
        description:
          `${devicesWithHighJitter} de ${allDevices.length} dispositivos están experimentando latencia ` +
          'extrema y pérdida de paquetes al mismo tiempo, pero siguen respondiendo intermitentemente. ' +
          'Esto es un patrón típico de un broadcast storm — un problema donde los datos se multiplican ' +
          'infinitamente dentro de tu red hasta saturarla.',
        affectedDevices: allDevices.map((d) => d.id),
        impact:
          'SEVERO: Tu red está prácticamente inutilizable. Los usuarios no ' +
          'pueden trabajar normalmente.',
        recommendation:
          'Un broadcast storm generalmente se causa por:\n' +
          '1. Un cable de red que conecta dos puertos del mismo switch (loop)\n' +
          '2. Dos switches conectados entre sí por más de un cable sin configuración adecuada\n\n' +
          'PASOS INMEDIATOS:\n' +
          '1. Busca cables de red redundantes entre tus switches y desconecta uno\n' +
          '2. Revisa si alguien conectó un cable de más recientemente\n' +
          '3. Si tienes switches managed, verifica que STP esté habilitado\n' +
          '4. Como último recurso, desconecta los switches uno por uno hasta encontrar el que causa el loop',
        ruleId: 'possible-broadcast-storm',
      };
    },
  },

  // ─── RULE: gateway-is-bottleneck ────────────────────
  {
    id: 'gateway-is-bottleneck',
    name: 'Gateway es cuello de botella',
    category: 'infrastructure',
    evaluate(ctx: DiagnosticContext) {
      const gateway = ctx.devices.find((d) => d.isGateway);
      if (!gateway) return null;

      const gatewayMetrics = ctx.metricsByDevice[gateway.id];
      if (!gatewayMetrics || gatewayMetrics.length === 0) return null;

      const reachableGw = gatewayMetrics.filter((m) => m.isReachable && m.latencyMs !== null);
      if (reachableGw.length === 0) return null;

      const gwAvgLatency = reachableGw.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / reachableGw.length;

      // Gateway needs to have high latency
      if (gwAvgLatency <= 50) return null;

      // Check external ping (speed test ping as proxy for external latency)
      const speedTest = ctx.latestSpeedTest;
      if (!speedTest) return null;

      // If external ping is similar or lower than gateway latency, gateway is the bottleneck
      if (speedTest.pingMs >= gwAvgLatency * 1.5) return null;

      return {
        severity: 'warning',
        category: 'infrastructure',
        title: 'Tu router/gateway parece ser el cuello de botella',
        description:
          `La latencia dentro de tu red local es alta (${Math.round(gwAvgLatency)}ms al gateway), ` +
          `pero una vez que el tráfico sale hacia internet, la velocidad es normal ` +
          `(ping externo: ${Math.round(speedTest.pingMs)}ms). Esto indica que tu router o ` +
          'switch principal no está procesando el tráfico eficientemente.',
        affectedDevices: [gateway.id],
        impact: 'Toda la red se ve afectada porque todo el tráfico pasa por este equipo.',
        recommendation:
          '1. Reinicia el router/switch principal\n' +
          '2. Verifica cuántos dispositivos están conectados — puede estar sobrecargado\n' +
          '3. Revisa si hay actualizaciones de firmware disponibles\n' +
          '4. Si el equipo es viejo (5+ años), considera reemplazarlo',
        ruleId: 'gateway-is-bottleneck',
      };
    },
  },

  // ─── RULE: no-gateway-detected ──────────────────────
  {
    id: 'no-gateway-detected',
    name: 'No se detectó gateway',
    category: 'configuration',
    evaluate(ctx: DiagnosticContext) {
      const gateway = ctx.devices.find((d) => d.isGateway);
      if (gateway) return null;

      // Only trigger if we have some devices
      if (ctx.devices.length < 2) return null;

      return {
        severity: 'info',
        category: 'configuration',
        title: 'No se detectó un gateway/router en tu red',
        description:
          'NetCheckup no pudo identificar automáticamente cuál es tu router o gateway. ' +
          'Sin esta información, algunos diagnósticos de red no estarán disponibles.',
        affectedDevices: [],
        impact:
          'Los diagnósticos de latencia al gateway y cuello de botella no estarán disponibles.',
        recommendation:
          'Ve a la sección de Dispositivos y marca manualmente tu router como "gateway". ' +
          'Generalmente es el dispositivo con IP que termina en .1 (por ejemplo 192.168.1.1).',
        ruleId: 'no-gateway-detected',
      };
    },
  },
];
