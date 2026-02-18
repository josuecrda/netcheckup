import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import type { TracerouteHop } from '@netcheckup/shared';

const execAsync = promisify(exec);

/**
 * Ejecuta un traceroute al host especificado.
 * Usa tracert en Windows y traceroute en Linux/macOS.
 */
export async function traceroute(host: string): Promise<TracerouteHop[]> {
  logger.info(`Traceroute a ${host}...`);

  const isWindows = process.platform === 'win32';
  const cmd = isWindows
    ? `tracert -d -w 3000 -h 30 ${host}`
    : `traceroute -n -w 3 -m 30 ${host} 2>&1`;

  try {
    const { stdout } = await execAsync(cmd, { timeout: 60000 });
    const hops = isWindows
      ? parseWindowsTraceroute(stdout)
      : parseUnixTraceroute(stdout);

    logger.info(`Traceroute completado: ${hops.length} saltos`);
    return hops;
  } catch (err) {
    // tracert/traceroute may exit with non-zero even on partial success
    const error = err as { stdout?: string; stderr?: string; message: string };
    if (error.stdout) {
      const hops = isWindows
        ? parseWindowsTraceroute(error.stdout)
        : parseUnixTraceroute(error.stdout);
      if (hops.length > 0) {
        logger.info(`Traceroute parcial: ${hops.length} saltos`);
        return hops;
      }
    }
    logger.warn(`Error en traceroute a ${host}`, { error: error.message });
    throw new Error(`No se pudo ejecutar traceroute a ${host}: ${error.message}`);
  }
}

/**
 * Parsea la salida de tracert en Windows.
 * Formato:   1     5 ms     3 ms     4 ms  192.168.1.1
 *            2     *        *        *     Request timed out.
 */
function parseWindowsTraceroute(output: string): TracerouteHop[] {
  const hops: TracerouteHop[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match lines like:  1     5 ms     3 ms     4 ms  192.168.1.1
    const match = line.match(
      /^\s*(\d+)\s+([\d<]+\s*ms|\*)\s+([\d<]+\s*ms|\*)\s+([\d<]+\s*ms|\*)\s+([\d.]+|Request timed out|Tiempo de espera agotado)/i
    );
    if (!match) continue;

    const hopNum = parseInt(match[1], 10);
    const rtt1 = parseRtt(match[2]);
    const rtt2 = parseRtt(match[3]);
    const rtt3 = parseRtt(match[4]);
    const ipOrTimeout = match[5].trim();
    const ip = /^\d+\.\d+\.\d+\.\d+$/.test(ipOrTimeout) ? ipOrTimeout : null;

    hops.push({
      hop: hopNum,
      ip,
      hostname: null,
      rtt1,
      rtt2,
      rtt3,
    });
  }

  return hops;
}

/**
 * Parsea la salida de traceroute en Linux/macOS.
 * Formato:  1  192.168.1.1  2.345 ms  1.234 ms  1.567 ms
 *           2  * * *
 */
function parseUnixTraceroute(output: string): TracerouteHop[] {
  const hops: TracerouteHop[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match hop number at the start
    const hopMatch = line.match(/^\s*(\d+)\s+(.+)/);
    if (!hopMatch) continue;

    const hopNum = parseInt(hopMatch[1], 10);
    const rest = hopMatch[2];

    // Check if all timeouts
    if (/^\*\s+\*\s+\*/.test(rest)) {
      hops.push({ hop: hopNum, ip: null, hostname: null, rtt1: null, rtt2: null, rtt3: null });
      continue;
    }

    // Extract IP and RTTs
    const ipMatch = rest.match(/([\d.]+)/);
    const ip = ipMatch ? ipMatch[1] : null;

    const rttMatches = rest.match(/([\d.]+)\s*ms/g);
    const rtts = rttMatches
      ? rttMatches.map((r) => parseFloat(r.replace(/\s*ms/, '')))
      : [];

    hops.push({
      hop: hopNum,
      ip,
      hostname: null,
      rtt1: rtts[0] ?? null,
      rtt2: rtts[1] ?? null,
      rtt3: rtts[2] ?? null,
    });
  }

  return hops;
}

/**
 * Parsea un valor de RTT como "5 ms", "<1 ms", o "*"
 */
function parseRtt(value: string): number | null {
  if (value === '*') return null;
  const num = value.replace(/[<\s]*ms/i, '').trim();
  if (num === '<1') return 0.5;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? null : parsed;
}
