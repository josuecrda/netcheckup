import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { speedTestRepo } from '../db/repositories/speedtest.repo.js';
import { getConfig } from '../config.js';
import { broadcastEvent } from '../api/websocket.js';
import type { SpeedTestResult } from '@netcheckup/shared';

const execAsync = promisify(exec);

interface SpeedTestRaw {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitter: number | null;
  isp: string | null;
  serverName: string | null;
  serverLocation: string | null;
}

type Phase = 'ping' | 'download' | 'upload' | 'done';

/** Broadcast live progress to the dashboard */
function sendProgress(phase: Phase, value: number, percent: number) {
  broadcastEvent('speedtest:progress' as any, { phase, value, percent });
}

/**
 * Ejecuta un speed test usando el CLI de Ookla Speedtest.
 * Si no está instalado, usa una medición básica con fetch streaming.
 */
async function executeSpeedTest(): Promise<SpeedTestRaw> {
  // Intentar con speedtest CLI de Ookla (formato JSON)
  try {
    const { stdout } = await execAsync('speedtest --format=json --accept-license', {
      timeout: 90000,
    });
    const data = JSON.parse(stdout);
    return {
      downloadMbps: Math.round((data.download.bandwidth * 8) / 1_000_000 * 100) / 100,
      uploadMbps: Math.round((data.upload.bandwidth * 8) / 1_000_000 * 100) / 100,
      pingMs: Math.round(data.ping.latency * 100) / 100,
      jitter: data.ping.jitter ? Math.round(data.ping.jitter * 100) / 100 : null,
      isp: data.isp || null,
      serverName: data.server?.name || null,
      serverLocation: data.server?.location
        ? `${data.server.location}, ${data.server.country}`
        : null,
    };
  } catch {
    logger.debug('speedtest CLI no disponible, intentando alternativa...');
  }

  // Intentar con speedtest-cli (Python)
  try {
    const { stdout } = await execAsync('speedtest-cli --json', { timeout: 90000 });
    const data = JSON.parse(stdout);
    return {
      downloadMbps: Math.round((data.download / 1_000_000) * 100) / 100,
      uploadMbps: Math.round((data.upload / 1_000_000) * 100) / 100,
      pingMs: Math.round(data.ping * 100) / 100,
      jitter: null,
      isp: data.client?.isp || null,
      serverName: data.server?.sponsor || null,
      serverLocation: data.server?.name || null,
    };
  } catch {
    logger.debug('speedtest-cli no disponible');
  }

  logger.warn(
    'No se encontró speedtest CLI. Instala "speedtest" de Ookla para mediciones precisas. ' +
    'Usando medición básica de velocidad.'
  );
  return runBasicSpeedTest();
}

/**
 * Medición básica de velocidad con streaming progress via WebSocket.
 * Descarga en chunks para reportar velocidad en tiempo real.
 */
async function runBasicSpeedTest(): Promise<SpeedTestRaw> {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // Minimum time per phase (ms). If chunks finish faster, we pad with delays.
  const MIN_PHASE_MS = 5000;

  // ─── Phase 1: Ping (5 samples, ~2-3s) ─────────────────
  sendProgress('ping', 0, 0);
  let pingMs = 0;
  const pings: number[] = [];
  for (let i = 0; i < 5; i++) {
    try {
      const start = Date.now();
      await fetch('https://speed.cloudflare.com/__down?bytes=0');
      const ms = Date.now() - start;
      pings.push(ms);
      sendProgress('ping', ms, ((i + 1) / 5) * 100);
      await delay(300);
    } catch { /* ignore */ }
  }
  if (pings.length > 0) {
    pingMs = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
  }
  logger.info(`Ping: ${pingMs}ms (${pings.length} muestras)`);

  // ─── Phase 2: Download (10 chunks, min 5s) ─────────────
  sendProgress('download', 0, 0);
  const downloadChunks = 10;
  const chunkSize = 2_000_000; // 2MB per chunk = 20MB total
  let totalBytesDown = 0;
  const downloadStart = Date.now();
  const downloadSpeeds: number[] = [];

  for (let i = 0; i < downloadChunks; i++) {
    try {
      const chunkStart = Date.now();
      const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${chunkSize}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const chunkElapsed = (Date.now() - chunkStart) / 1000;
      totalBytesDown += buffer.byteLength;

      const chunkSpeed = Math.round(((buffer.byteLength * 8) / (chunkElapsed * 1_000_000)) * 100) / 100;
      downloadSpeeds.push(chunkSpeed);

      const recentSpeeds = downloadSpeeds.slice(-3);
      const liveSpeed = Math.round((recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length) * 100) / 100;
      const pct = ((i + 1) / downloadChunks) * 100;
      sendProgress('download', liveSpeed, pct);

      // Ensure minimum phase duration: pad delay so total is ~5s
      const elapsed = Date.now() - downloadStart;
      const targetElapsed = ((i + 1) / downloadChunks) * MIN_PHASE_MS;
      if (elapsed < targetElapsed) {
        await delay(targetElapsed - elapsed);
      }
    } catch (err) {
      logger.debug(`Download chunk ${i + 1} failed: ${err}`);
      await delay(400);
    }
  }

  // Use the average of per-chunk speeds (not total bytes / total elapsed)
  // because total elapsed includes artificial padding delays for animation.
  const downloadMbps = downloadSpeeds.length > 0
    ? Math.round((downloadSpeeds.reduce((a, b) => a + b, 0) / downloadSpeeds.length) * 100) / 100
    : 0;
  const downloadElapsed = (Date.now() - downloadStart) / 1000;
  logger.info(`Descarga: ${totalBytesDown} bytes en ${downloadElapsed.toFixed(1)}s = ${downloadMbps} Mbps (avg de ${downloadSpeeds.length} chunks)`);

  // ─── Phase 3: Upload (8 chunks, min 5s) ────────────────
  sendProgress('upload', 0, 0);
  const uploadChunks = 8;
  const uploadChunkSize = 1_000_000; // 1MB per chunk = 8MB total
  let totalBytesUp = 0;
  const uploadStart = Date.now();
  const uploadSpeeds: number[] = [];

  for (let i = 0; i < uploadChunks; i++) {
    try {
      const data = new Uint8Array(uploadChunkSize);
      const chunkStart = Date.now();
      await fetch('https://speed.cloudflare.com/__up', { method: 'POST', body: data });
      const chunkElapsed = (Date.now() - chunkStart) / 1000;
      totalBytesUp += uploadChunkSize;

      const chunkSpeed = Math.round(((uploadChunkSize * 8) / (chunkElapsed * 1_000_000)) * 100) / 100;
      uploadSpeeds.push(chunkSpeed);

      const recentSpeeds = uploadSpeeds.slice(-3);
      const liveSpeed = Math.round((recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length) * 100) / 100;
      const pct = ((i + 1) / uploadChunks) * 100;
      sendProgress('upload', liveSpeed, pct);

      const elapsed = Date.now() - uploadStart;
      const targetElapsed = ((i + 1) / uploadChunks) * MIN_PHASE_MS;
      if (elapsed < targetElapsed) {
        await delay(targetElapsed - elapsed);
      }
    } catch (err) {
      logger.debug(`Upload chunk ${i + 1} failed: ${err}`);
      await delay(400);
    }
  }

  // Use the average of per-chunk speeds (not total bytes / total elapsed)
  // because total elapsed includes artificial padding delays for animation.
  const uploadMbps = uploadSpeeds.length > 0
    ? Math.round((uploadSpeeds.reduce((a, b) => a + b, 0) / uploadSpeeds.length) * 100) / 100
    : 0;
  const uploadElapsed = (Date.now() - uploadStart) / 1000;
  logger.info(`Subida: ${totalBytesUp} bytes en ${uploadElapsed.toFixed(1)}s = ${uploadMbps} Mbps (avg de ${uploadSpeeds.length} chunks)`);

  sendProgress('done', 0, 100);

  return {
    downloadMbps,
    uploadMbps,
    pingMs,
    jitter: null,
    isp: null,
    serverName: 'Cloudflare Speed Test',
    serverLocation: null,
  };
}

/**
 * Ejecuta un speed test y guarda el resultado en la DB.
 */
export async function runSpeedTest(
  triggeredBy: 'manual' | 'scheduled' = 'scheduled'
): Promise<SpeedTestResult> {
  logger.info(`Iniciando speed test (${triggeredBy})...`);

  const raw = await executeSpeedTest();

  const config = getConfig();
  const result = speedTestRepo.create({
    downloadMbps: raw.downloadMbps,
    uploadMbps: raw.uploadMbps,
    pingMs: raw.pingMs,
    jitter: raw.jitter,
    isp: raw.isp,
    serverName: raw.serverName,
    serverLocation: raw.serverLocation,
    contractedDownloadMbps: config.isp.contractedDownloadMbps || null,
    contractedUploadMbps: config.isp.contractedUploadMbps || null,
    triggeredBy,
  });

  logger.info(
    `Speed test completado: ↓${raw.downloadMbps} Mbps ↑${raw.uploadMbps} Mbps, ping: ${raw.pingMs}ms`
  );

  return result;
}
