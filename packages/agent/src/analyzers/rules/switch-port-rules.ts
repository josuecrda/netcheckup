import type { DiagnosticRule, DiagnosticContext, RuleResult } from '../problem-detector.js';

/**
 * Reglas de diagnóstico para puertos de switches (SNMP).
 * Requiere que snmpPortDeltas esté disponible en el contexto.
 */
export const switchPortRules: DiagnosticRule[] = [
  // ─── RULE 1: port-error-rate-high ─────────────────────
  {
    id: 'port-error-rate-high',
    name: 'Tasa de errores alta en puerto',
    category: 'infrastructure',
    evaluate(ctx: DiagnosticContext): RuleResult | RuleResult[] | null {
      if (!ctx.snmpPortDeltas || ctx.snmpPortDeltas.length === 0) return null;

      const results: RuleResult[] = [];

      for (const delta of ctx.snmpPortDeltas) {
        if (delta.operStatus !== 'up') continue;

        const totalErrorsPerSec =
          delta.inErrorsPerSec + delta.outErrorsPerSec;

        // Calcular tasa de errores relativa al throughput
        const totalBitsPerSec = delta.inBitsPerSec + delta.outBitsPerSec;
        // Estimar frames: ~1500 bytes promedio por frame = 12000 bits
        const estimatedFramesPerSec = totalBitsPerSec / 12000;

        if (estimatedFramesPerSec < 1) continue; // No hay tráfico significativo

        const errorRatePercent =
          (totalErrorsPerSec / estimatedFramesPerSec) * 100;

        if (errorRatePercent < 0.1) continue;

        const severity = errorRatePercent > 1 ? 'critical' : 'warning';
        const portLabel = delta.ifAlias
          ? `${delta.ifName} (${delta.ifAlias})`
          : delta.ifName;

        results.push({
          severity,
          category: 'infrastructure',
          title: `Errores en puerto ${portLabel} de ${delta.deviceName}`,
          description:
            `El puerto ${portLabel} del switch ${delta.deviceName} tiene una tasa de errores ` +
            `del ${errorRatePercent.toFixed(2)}% (${totalErrorsPerSec.toFixed(1)} errores/seg). ` +
            'Esto indica problemas físicos en la conexión.',
          affectedDevices: [delta.deviceId],
          impact:
            'Los dispositivos conectados a este puerto experimentan pérdida de paquetes y retransmisiones, ' +
            'lo que causa lentitud.',
          recommendation:
            '1. Reemplaza el cable de red conectado a este puerto\n' +
            '2. Verifica que el conector RJ-45 esté bien insertado\n' +
            '3. Si el problema persiste, prueba con otro puerto del switch\n' +
            '4. Descarta interferencia electromagnética cerca del cable',
          ruleId: `port-error-rate-high:${delta.deviceId}:${delta.ifIndex}`,
        });
      }

      return results.length > 0 ? results : null;
    },
  },

  // ─── RULE 2: duplex-mismatch ──────────────────────────
  {
    id: 'duplex-mismatch',
    name: 'Duplex mismatch detectado',
    category: 'infrastructure',
    evaluate(ctx: DiagnosticContext): RuleResult | RuleResult[] | null {
      if (!ctx.snmpPortDeltas || ctx.snmpPortDeltas.length === 0) return null;

      const results: RuleResult[] = [];

      for (const delta of ctx.snmpPortDeltas) {
        if (delta.operStatus !== 'up') continue;
        if (delta.duplexStatus !== 'half') continue;
        if (delta.speedMbps < 100) continue; // No aplica a enlaces <100Mbps

        // Confirmar con late collisions
        if (delta.lateCollisionsPerSec <= 0) continue;

        const portLabel = delta.ifAlias
          ? `${delta.ifName} (${delta.ifAlias})`
          : delta.ifName;

        results.push({
          severity: 'warning',
          category: 'infrastructure',
          title: `Duplex mismatch en ${portLabel} de ${delta.deviceName}`,
          description:
            `El puerto ${portLabel} está operando en half-duplex a ${delta.speedMbps}Mbps ` +
            `con late collisions (${delta.lateCollisionsPerSec.toFixed(1)}/seg). ` +
            'Esto es un indicador clásico de duplex mismatch — un lado negocia full-duplex ' +
            'y el otro half-duplex.',
          affectedDevices: [delta.deviceId],
          impact:
            'La velocidad efectiva se reduce a la mitad y hay colisiones frecuentes. ' +
            'El dispositivo conectado experimentará lentitud severa.',
          recommendation:
            '1. Desconecta y reconecta el cable para forzar re-negociación\n' +
            '2. Verifica que ambos lados (switch y dispositivo) usen auto-negociación\n' +
            '3. Si uno tiene velocidad fija, configura ambos igual (full-duplex)\n' +
            '4. Actualiza el driver de red del dispositivo conectado',
          ruleId: `duplex-mismatch:${delta.deviceId}:${delta.ifIndex}`,
        });
      }

      return results.length > 0 ? results : null;
    },
  },

  // ─── RULE 3: port-saturated ───────────────────────────
  {
    id: 'port-saturated',
    name: 'Puerto saturado',
    category: 'infrastructure',
    evaluate(ctx: DiagnosticContext): RuleResult | RuleResult[] | null {
      if (!ctx.snmpPortDeltas || ctx.snmpPortDeltas.length === 0) return null;

      const results: RuleResult[] = [];

      for (const delta of ctx.snmpPortDeltas) {
        if (delta.operStatus !== 'up') continue;
        if (delta.speedMbps <= 0) continue;

        const maxUtil = Math.max(
          delta.inUtilizationPercent,
          delta.outUtilizationPercent
        );

        if (maxUtil < 80) continue;

        const severity = maxUtil > 95 ? 'critical' : 'warning';
        const portLabel = delta.ifAlias
          ? `${delta.ifName} (${delta.ifAlias})`
          : delta.ifName;

        const inMbps = (delta.inBitsPerSec / 1_000_000).toFixed(1);
        const outMbps = (delta.outBitsPerSec / 1_000_000).toFixed(1);

        results.push({
          severity,
          category: 'infrastructure',
          title: `Puerto ${portLabel} saturado al ${maxUtil.toFixed(0)}%`,
          description:
            `El puerto ${portLabel} del switch ${delta.deviceName} está al ` +
            `${maxUtil.toFixed(0)}% de su capacidad (${delta.speedMbps}Mbps). ` +
            `Tráfico actual: ${inMbps} Mbps entrada, ${outMbps} Mbps salida. ` +
            'Este puerto es un cuello de botella.',
          affectedDevices: [delta.deviceId],
          impact:
            'Los dispositivos que pasan por este puerto experimentan congestión, ' +
            'buffering y latencia alta.',
          recommendation:
            '1. Identifica qué dispositivo está conectado a este puerto\n' +
            '2. Verifica si hay un uplink que necesita ser más rápido (ej: 100Mbps → 1Gbps)\n' +
            '3. Distribuye la carga entre múltiples puertos/switches\n' +
            '4. Si es un puerto de uplink, considera link aggregation (LAG)',
          ruleId: `port-saturated:${delta.deviceId}:${delta.ifIndex}`,
        });
      }

      return results.length > 0 ? results : null;
    },
  },

  // ─── RULE 4: speed-mismatch ───────────────────────────
  {
    id: 'speed-mismatch',
    name: 'Velocidad de puerto negociada baja',
    category: 'infrastructure',
    evaluate(ctx: DiagnosticContext): RuleResult | RuleResult[] | null {
      if (!ctx.snmpPortDeltas || ctx.snmpPortDeltas.length === 0) return null;

      // Agrupar puertos por dispositivo
      const byDevice = new Map<string, typeof ctx.snmpPortDeltas>();
      for (const delta of ctx.snmpPortDeltas) {
        if (delta.operStatus !== 'up') continue;
        const list = byDevice.get(delta.deviceId) || [];
        list.push(delta);
        byDevice.set(delta.deviceId, list);
      }

      const results: RuleResult[] = [];

      for (const [deviceId, ports] of byDevice) {
        // Encontrar la velocidad máxima del switch
        const maxSpeed = Math.max(...ports.map((p) => p.speedMbps));
        if (maxSpeed < 1000) continue; // Solo alertar en switches Gigabit

        for (const delta of ports) {
          if (delta.speedMbps >= maxSpeed) continue;
          if (delta.speedMbps >= 1000) continue; // OK si negocia a Gbps

          const portLabel = delta.ifAlias
            ? `${delta.ifName} (${delta.ifAlias})`
            : delta.ifName;

          results.push({
            severity: 'info',
            category: 'infrastructure',
            title: `Puerto ${portLabel} negoció a ${delta.speedMbps}Mbps`,
            description:
              `El puerto ${portLabel} del switch ${delta.deviceName} está ` +
              `conectado a ${delta.speedMbps}Mbps en un switch con puertos de ${maxSpeed}Mbps. ` +
              'El dispositivo conectado no está aprovechando la velocidad completa del switch.',
            affectedDevices: [deviceId],
            impact:
              `La velocidad máxima para este dispositivo es ${delta.speedMbps}Mbps en lugar de ${maxSpeed}Mbps.`,
            recommendation:
              '1. Verifica que el cable sea Cat5e o Cat6 (necesario para Gigabit)\n' +
              '2. Revisa que el adaptador de red del dispositivo soporte Gigabit\n' +
              '3. Reemplaza cables Cat5 viejos por Cat5e o Cat6\n' +
              '4. Desconecta y reconecta para forzar re-negociación',
            ruleId: `speed-mismatch:${deviceId}:${delta.ifIndex}`,
          });
        }
      }

      return results.length > 0 ? results : null;
    },
  },

  // ─── RULE 5: crc-errors-physical ──────────────────────
  {
    id: 'crc-errors-physical',
    name: 'Errores CRC/FCS en capa física',
    category: 'infrastructure',
    evaluate(ctx: DiagnosticContext): RuleResult | RuleResult[] | null {
      if (!ctx.snmpPortDeltas || ctx.snmpPortDeltas.length === 0) return null;

      const results: RuleResult[] = [];

      for (const delta of ctx.snmpPortDeltas) {
        if (delta.operStatus !== 'up') continue;
        if (delta.fcsErrorsPerSec <= 0) continue;

        const portLabel = delta.ifAlias
          ? `${delta.ifName} (${delta.ifAlias})`
          : delta.ifName;

        results.push({
          severity: 'warning',
          category: 'infrastructure',
          title: `Errores CRC en puerto ${portLabel} de ${delta.deviceName}`,
          description:
            `El puerto ${portLabel} tiene ${delta.fcsErrorsPerSec.toFixed(1)} errores CRC/FCS por segundo. ` +
            'Esto indica un problema en la capa física: cable dañado, conector flojo, ' +
            'o interferencia electromagnética.',
          affectedDevices: [delta.deviceId],
          impact:
            'Cada paquete con error CRC se descarta y debe retransmitirse, ' +
            'causando latencia y reducción de throughput.',
          recommendation:
            '1. Reemplaza el cable de red (causa más común de errores CRC)\n' +
            '2. Verifica que los conectores RJ-45 estén bien crimpados\n' +
            '3. Aleja el cable de fuentes de interferencia (cables eléctricos, motores, fluorescentes)\n' +
            '4. Si usas cable de más de 100m, agrega un switch intermedio',
          ruleId: `crc-errors-physical:${delta.deviceId}:${delta.ifIndex}`,
        });
      }

      return results.length > 0 ? results : null;
    },
  },

  // ─── RULE 6: port-discards-buffer ─────────────────────
  {
    id: 'port-discards-buffer',
    name: 'Buffer overflow en puerto',
    category: 'infrastructure',
    evaluate(ctx: DiagnosticContext): RuleResult | RuleResult[] | null {
      if (!ctx.snmpPortDeltas || ctx.snmpPortDeltas.length === 0) return null;

      const results: RuleResult[] = [];

      for (const delta of ctx.snmpPortDeltas) {
        if (delta.operStatus !== 'up') continue;

        const totalDiscardsPerSec =
          delta.inDiscardsPerSec + delta.outDiscardsPerSec;

        if (totalDiscardsPerSec < 1) continue; // Menos de 1 descarte/seg no es significativo

        const portLabel = delta.ifAlias
          ? `${delta.ifName} (${delta.ifAlias})`
          : delta.ifName;

        results.push({
          severity: 'warning',
          category: 'infrastructure',
          title: `Paquetes descartados en ${portLabel} de ${delta.deviceName}`,
          description:
            `El switch está descartando ${totalDiscardsPerSec.toFixed(1)} paquetes/seg ` +
            `en el puerto ${portLabel}. Los buffers del switch se están llenando — ` +
            'está recibiendo más tráfico del que puede procesar.',
          affectedDevices: [delta.deviceId],
          impact:
            'Los paquetes descartados causan retransmisiones TCP y pérdida de datos en UDP, ' +
            'resultando en lentitud general y posible pérdida de conexiones.',
          recommendation:
            '1. Verifica la utilización del puerto — puede estar cerca de su capacidad\n' +
            '2. Identifica qué dispositivo genera tráfico excesivo\n' +
            '3. Si es un uplink, considera aumentar su velocidad o usar link aggregation\n' +
            '4. Configura QoS en el switch para priorizar tráfico crítico',
          ruleId: `port-discards-buffer:${delta.deviceId}:${delta.ifIndex}`,
        });
      }

      return results.length > 0 ? results : null;
    },
  },
];
