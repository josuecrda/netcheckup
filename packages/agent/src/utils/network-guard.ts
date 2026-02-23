import { getSubnet } from './network-utils.js';
import { settingRepo } from '../db/repositories/setting.repo.js';
import { pauseScheduler, resumeScheduler, isSchedulerPaused } from '../scheduler/cron-manager.js';
import { broadcastEvent } from '../api/websocket.js';
import { logger } from './logger.js';
import type { NetworkStatus } from '@netcheckup/shared';

let currentSubnet: string = '';
let expectedSubnet: string | null = null;

/**
 * Inicializa el network guard. Llamar después de que la DB esté lista.
 * Retorna true si la red es correcta (scheduler debe iniciar normalmente).
 */
export function initNetworkGuard(): boolean {
  currentSubnet = getSubnet();
  expectedSubnet = settingRepo.get('expectedSubnet');

  if (!expectedSubnet) {
    // Primera ejecución: guardar subnet actual como esperada
    settingRepo.set('expectedSubnet', currentSubnet);
    expectedSubnet = currentSubnet;
    logger.info(`Subnet esperada almacenada: ${currentSubnet}.0/24`);
    return true;
  }

  if (currentSubnet !== expectedSubnet) {
    logger.warn(
      `Red diferente detectada. Actual: ${currentSubnet}.0/24, Esperada: ${expectedSubnet}.0/24`
    );
    return false;
  }

  logger.info(`Red correcta: ${currentSubnet}.0/24`);
  return true;
}

/**
 * Chequeo periódico (cada 60s). Detecta cambios de red en runtime.
 */
export function checkNetwork(): void {
  const newSubnet = getSubnet();
  currentSubnet = newSubnet;

  const isCorrect = currentSubnet === expectedSubnet;
  const wasPaused = isSchedulerPaused();

  if (!isCorrect && !wasPaused) {
    pauseScheduler();
    broadcastEvent('network:changed', {
      expectedSubnet,
      currentSubnet,
    });
    logger.warn(`Red cambió a ${currentSubnet}.0/24 — scheduler pausado`);
  } else if (isCorrect && wasPaused) {
    resumeScheduler();
    broadcastEvent('network:restored', {
      expectedSubnet,
      currentSubnet,
    });
    logger.info(`Red restaurada a ${currentSubnet}.0/24 — scheduler reanudado`);
  }
}

/**
 * El usuario acepta la red actual como la nueva subnet esperada.
 */
export function acceptCurrentNetwork(): void {
  currentSubnet = getSubnet();
  expectedSubnet = currentSubnet;
  settingRepo.set('expectedSubnet', currentSubnet);

  if (isSchedulerPaused()) {
    resumeScheduler();
  }

  broadcastEvent('network:restored', {
    expectedSubnet,
    currentSubnet,
  });
  logger.info(`Nueva subnet aceptada: ${currentSubnet}.0/24`);
}

/**
 * Retorna el estado actual de la red.
 */
export function getNetworkStatus(): NetworkStatus {
  return {
    expectedSubnet,
    currentSubnet,
    isCorrectNetwork: currentSubnet === expectedSubnet,
    isPaused: isSchedulerPaused(),
  };
}
