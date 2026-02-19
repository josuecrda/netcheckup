import dns from 'dns';
import { promisify } from 'util';
import type { DiagnosticRule, DiagnosticContext } from '../problem-detector.js';

const resolve4 = promisify(dns.resolve4);

/**
 * Mide el tiempo de resolución DNS para un dominio conocido.
 * Retorna el tiempo en milisegundos, o null si falla.
 */
export async function measureDnsResolution(domain: string = 'google.com'): Promise<number | null> {
  try {
    const start = Date.now();
    await resolve4(domain);
    return Date.now() - start;
  } catch {
    return null;
  }
}

/**
 * Reglas de diagnóstico para problemas de DNS.
 */
export const dnsRules: DiagnosticRule[] = [
  // ─── RULE: slow-dns ───────────────────────────────────
  {
    id: 'slow-dns',
    name: 'DNS lento',
    category: 'dns',
    evaluate(ctx: DiagnosticContext) {
      const dnsMs = ctx.dnsResolutionMs;
      if (dnsMs === null || dnsMs === undefined) return null;
      if (dnsMs <= 200) return null;

      const severity = dnsMs > 1000 ? 'warning' as const : 'info' as const;

      return {
        severity,
        category: 'dns',
        title: 'Tu DNS está respondiendo lento',
        description:
          `La resolución DNS (convertir nombres como "google.com" en direcciones IP) ` +
          `está tardando ${Math.round(dnsMs)}ms. Lo ideal es menos de 50ms.`,
        affectedDevices: [],
        impact:
          'Cada vez que abres una página web nueva, hay un retraso adicional. ' +
          'Esto hace que navegar se sienta más lento de lo necesario.',
        recommendation:
          'Puedes mejorar esto cambiando los servidores DNS en tu router. ' +
          'DNS recomendados:\n' +
          '- Google DNS: 8.8.8.8 y 8.8.4.4\n' +
          '- Cloudflare DNS: 1.1.1.1 y 1.0.0.1\n\n' +
          'Para cambiarlos, entra a la configuración de tu router (generalmente ' +
          '192.168.1.1) y busca la sección de DNS.',
        ruleId: 'slow-dns',
      };
    },
  },
];
