import dns from 'dns';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import type { DnsLookupResult } from '@netcheckup/shared';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const dnsLookupAll = promisify(dns.lookup) as (hostname: string, options: dns.LookupOptions) => Promise<dns.LookupAddress[]>;

/**
 * Resuelve IPs usando dns.resolve*, con fallback a dns.lookup (OS resolver).
 * Algunos sistemas no tienen un DNS server accesible directamente pero
 * sí resuelven a nivel OS.
 */
async function resolveAddresses(domain: string, queryType: string): Promise<string[]> {
  const addresses: string[] = [];

  // Intentar con dns.resolve4 / resolve6 primero
  if (queryType === 'A' || queryType === 'ALL') {
    try {
      const addrs = await resolve4(domain);
      addresses.push(...addrs);
    } catch { /* fallback below */ }
  }

  if (queryType === 'AAAA' || queryType === 'ALL') {
    try {
      const addrs = await resolve6(domain);
      addresses.push(...addrs);
    } catch { /* fallback below */ }
  }

  // Si no se obtuvieron resultados, usar dns.lookup (OS resolver)
  if (addresses.length === 0 && (queryType === 'A' || queryType === 'AAAA' || queryType === 'ALL')) {
    try {
      const family = queryType === 'A' ? 4 : queryType === 'AAAA' ? 6 : 0;
      const results = await dnsLookupAll(domain, { all: true, family });
      for (const r of results) {
        addresses.push(r.address);
      }
    } catch { /* No results */ }
  }

  return addresses;
}

/**
 * Realiza un lookup DNS completo de un dominio.
 */
export async function dnsLookup(
  domain: string,
  type?: 'A' | 'AAAA' | 'MX' | 'NS' | 'TXT' | 'CNAME' | 'ALL'
): Promise<DnsLookupResult> {
  const startTime = Date.now();
  logger.info(`DNS lookup para ${domain} (tipo: ${type || 'ALL'})...`);

  const result: DnsLookupResult = {
    domain,
    addresses: [],
    cname: null,
    mx: [],
    ns: [],
    txt: [],
    responseTimeMs: 0,
  };

  const queryType = type || 'ALL';

  try {
    // A / AAAA records with fallback
    result.addresses = await resolveAddresses(domain, queryType);

    // CNAME
    if (queryType === 'CNAME' || queryType === 'ALL') {
      try {
        const cnames = await resolveCname(domain);
        result.cname = cnames[0] || null;
      } catch { /* No CNAME */ }
    }

    // MX records
    if (queryType === 'MX' || queryType === 'ALL') {
      try {
        const mxRecords = await resolveMx(domain);
        result.mx = mxRecords.map((r) => ({
          priority: r.priority,
          exchange: r.exchange,
        }));
      } catch { /* No MX records */ }
    }

    // NS records
    if (queryType === 'NS' || queryType === 'ALL') {
      try {
        const nsRecords = await resolveNs(domain);
        result.ns = nsRecords;
      } catch { /* No NS records */ }
    }

    // TXT records
    if (queryType === 'TXT' || queryType === 'ALL') {
      try {
        const txtRecords = await resolveTxt(domain);
        result.txt = txtRecords.map((r) => r.join(''));
      } catch { /* No TXT records */ }
    }
  } catch (err) {
    logger.warn(`Error en DNS lookup de ${domain}`, { error: (err as Error).message });
    throw new Error(`No se pudo resolver ${domain}: ${(err as Error).message}`);
  }

  result.responseTimeMs = Date.now() - startTime;
  logger.info(`DNS lookup completado para ${domain} en ${result.responseTimeMs}ms`);

  return result;
}
