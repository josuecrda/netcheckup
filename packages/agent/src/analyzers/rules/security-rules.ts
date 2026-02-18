import type { DiagnosticRule, DiagnosticContext, RuleResult } from '../problem-detector.js';

/**
 * Reglas de diagnóstico para problemas de seguridad.
 */
export const securityRules: DiagnosticRule[] = [
  // ─── RULE: new-unknown-device ───────────────────────
  {
    id: 'new-unknown-device',
    name: 'Nuevo dispositivo desconocido',
    category: 'security',
    evaluate(ctx: DiagnosticContext) {
      const results: RuleResult[] = [];

      // Only detect truly new devices — skip if most devices are recently added
      // (i.e., don't flood alerts on the first scan)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const olderDevices = ctx.devices.filter(
        (d) => new Date(d.firstSeen).getTime() < fiveMinutesAgo
      );
      // Need at least 3 "established" devices before alerting on new ones
      if (olderDevices.length < 3) return null;

      for (const device of ctx.devices) {
        // Check if device was first seen recently (within last 30 minutes)
        const firstSeen = new Date(device.firstSeen).getTime();
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

        if (firstSeen < thirtyMinutesAgo) continue;
        if (device.deviceType !== 'unknown') continue; // Known device types are less suspicious

        const vendor = device.vendor || 'No identificado';

        results.push({
          severity: 'info',
          category: 'security',
          title: `Nuevo dispositivo detectado en tu red: ${vendor}`,
          description:
            `Se detectó un nuevo dispositivo conectado a tu red:\n` +
            `- IP: ${device.ipAddress}\n` +
            `- MAC: ${device.macAddress}\n` +
            `- Fabricante: ${vendor}\n` +
            `- Tipo: ${device.deviceType}\n` +
            'Si no reconoces este dispositivo, podría ser alguien usando tu red sin permiso.',
          affectedDevices: [device.id],
          impact:
            'Un dispositivo no autorizado podría consumir tu ancho de banda o ' +
            'representar un riesgo de seguridad.',
          recommendation:
            `¿Reconoces este dispositivo? Si no, considera cambiar la contraseña de tu WiFi. ` +
            `Para identificarlo, puedes buscar el fabricante (${vendor}) y pensar qué dispositivo ` +
            'nuevo se conectó recientemente.',
          ruleId: `new-unknown-device:${device.id}`,
        });
      }

      return results.length > 0 ? results : null;
    },
  },

  // ─── RULE: many-unknown-devices ─────────────────────
  {
    id: 'many-unknown-devices',
    name: 'Muchos dispositivos sin identificar',
    category: 'security',
    evaluate(ctx: DiagnosticContext) {
      const unknownDevices = ctx.devices.filter((d) => d.deviceType === 'unknown');
      const total = ctx.devices.length;

      // Trigger if >50% of devices are unknown and there are at least 5
      if (unknownDevices.length < 5 || unknownDevices.length < total * 0.5) return null;

      return {
        severity: 'info',
        category: 'security',
        title: `${unknownDevices.length} dispositivos sin identificar en tu red`,
        description:
          `De los ${total} dispositivos en tu red, ${unknownDevices.length} no pudieron ser ` +
          'identificados automáticamente. Esto no es necesariamente un problema, pero es ' +
          'recomendable revisar qué dispositivos están conectados.',
        affectedDevices: unknownDevices.map((d) => d.id),
        impact:
          'Sin identificar los dispositivos, es difícil saber si hay equipos no autorizados ' +
          'en tu red que podrían consumir ancho de banda o representar riesgos.',
        recommendation:
          'Revisa la lista de dispositivos en la sección "Dispositivos" y asigna un nombre ' +
          'a los que reconozcas. Si encuentras dispositivos que no reconoces, considera cambiar ' +
          'la contraseña de tu WiFi.',
        ruleId: 'many-unknown-devices',
      };
    },
  },
];
