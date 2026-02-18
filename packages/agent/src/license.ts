import crypto from 'crypto';
import { settingRepo } from './db/repositories/setting.repo.js';
import { scanRepo } from './db/repositories/scan.repo.js';
import { TIER_LIMITS } from '@netcheckup/shared';
import type { LicenseTier, LicenseInfo, TierLimits } from '@netcheckup/shared';
import { logger } from './utils/logger.js';

// Prefijo secreto para validación offline de llaves
// Formato de licencia: NC-{tier_code}-{random_hex}-{checksum}
// tier_code: M = monitoring, C = consulting
const LICENSE_SECRET = 'netcheckup-2026';

/**
 * Genera un checksum simple para validar la estructura de la llave.
 */
function computeChecksum(payload: string): string {
  return crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 8);
}

/**
 * Valida el formato y checksum de una license key.
 * Retorna el tier si es válida, null si no.
 */
export function parseLicenseKey(key: string): LicenseTier | null {
  if (!key || typeof key !== 'string') return null;

  const parts = key.trim().toUpperCase().split('-');
  // Formato: NC-{M|C}-{8hex}-{8checksum}
  if (parts.length !== 4 || parts[0] !== 'NC') return null;

  const tierCode = parts[1];
  const random = parts[2];
  const checksum = parts[3];

  if (!['M', 'C'].includes(tierCode)) return null;
  if (!/^[A-F0-9]{8}$/.test(random)) return null;

  const expectedChecksum = computeChecksum(`NC-${tierCode}-${random}`).toUpperCase();
  if (checksum !== expectedChecksum) return null;

  return tierCode === 'M' ? 'monitoring' : 'consulting';
}

/**
 * Genera una license key para un tier dado (para testing/admin).
 */
export function generateLicenseKey(tier: 'monitoring' | 'consulting'): string {
  const tierCode = tier === 'monitoring' ? 'M' : 'C';
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const payload = `NC-${tierCode}-${random}`;
  const checksum = computeChecksum(payload).toUpperCase();
  return `${payload}-${checksum}`;
}

/**
 * Obtiene la info de licencia actual desde settings.
 */
export function getLicenseInfo(): LicenseInfo {
  const settings = settingRepo.getAppSettings();
  const key = settings.licenseKey ?? null;
  const tier = (settings.tier as LicenseTier) || 'free';

  let isValid = true;
  if (tier !== 'free') {
    // Verificar que la key sea válida para el tier guardado
    const parsedTier = key ? parseLicenseKey(key) : null;
    isValid = parsedTier === tier;
  }

  return {
    tier: isValid ? tier : 'free',
    licenseKey: key,
    activatedAt: settingRepo.get('licenseActivatedAt'),
    expiresAt: null, // MVP: sin expiración
    isValid,
  };
}

/**
 * Activa una licencia. Retorna la info actualizada.
 */
export function activateLicense(key: string): LicenseInfo {
  const tier = parseLicenseKey(key);
  if (!tier) {
    logger.warn('Intento de activación con llave inválida');
    return { tier: 'free', licenseKey: key, activatedAt: null, expiresAt: null, isValid: false };
  }

  settingRepo.saveAppSettings({
    licenseKey: key.trim().toUpperCase(),
    tier,
  });
  settingRepo.set('licenseActivatedAt', new Date().toISOString());

  logger.info(`Licencia activada: tier=${tier}`);
  return getLicenseInfo();
}

/**
 * Desactiva la licencia actual, volviendo al tier free.
 */
export function deactivateLicense(): LicenseInfo {
  settingRepo.saveAppSettings({ licenseKey: null, tier: 'free' });
  settingRepo.set('licenseActivatedAt', '');
  logger.info('Licencia desactivada, volviendo a tier free');
  return getLicenseInfo();
}

/**
 * Obtiene los límites del tier actual.
 */
export function getCurrentLimits(): TierLimits {
  const { tier } = getLicenseInfo();
  return TIER_LIMITS[tier];
}

/**
 * Verifica si se puede ejecutar un escaneo de descubrimiento
 * en base al límite del tier free (1/día).
 */
export function canRunDiscoveryScan(): { allowed: boolean; reason?: string } {
  const limits = getCurrentLimits();
  if (limits.scansPerDay === -1) return { allowed: true };

  // Contar escaneos de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scansToday = scanRepo.countSince(today.toISOString(), 'discovery');

  if (scansToday >= limits.scansPerDay) {
    return {
      allowed: false,
      reason: `El plan gratuito permite ${limits.scansPerDay} escaneo(s) por día. Actualiza tu plan para escaneos ilimitados.`,
    };
  }
  return { allowed: true };
}
