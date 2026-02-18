import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppConfig {
  app: {
    port: number;
    language: 'es' | 'en';
  };
  company: {
    name: string;
  };
  network: {
    scanInterval: number;
    pingInterval: number;
    speedTestInterval: number;
    ipRange: string;
  };
  isp: {
    name: string;
    contractedDownloadMbps: number;
    contractedUploadMbps: number;
  };
  alerts: {
    enabled: boolean;
    cooldownMinutes: number;
    email: {
      enabled: boolean;
      to: string;
      smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
      };
    };
    telegram: {
      enabled: boolean;
      botToken: string;
      chatId: string;
    };
  };
  thresholds: {
    highLatencyMs: number;
    packetLossPercent: number;
    speedDegradedPercent: number;
  };
  reports: {
    weekly: { enabled: boolean; day: number };
    monthly: { enabled: boolean };
  };
  database: {
    path: string;
  };
  logging: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: number;
  };
}

let config: AppConfig | null = null;

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Carga la configuración desde config.default.yaml y merge con config.yaml del usuario.
 */
export function loadConfig(): AppConfig {
  if (config) return config;

  // Cargar defaults — buscar en el directorio del ejecutable y en ../
  let defaultPath = path.resolve(__dirname, 'config.default.yaml');
  if (!fs.existsSync(defaultPath)) {
    defaultPath = path.resolve(__dirname, '..', 'config.default.yaml');
  }
  if (!fs.existsSync(defaultPath)) {
    defaultPath = path.resolve(process.cwd(), 'config.default.yaml');
  }
  if (!fs.existsSync(defaultPath)) {
    throw new Error(`No se encontró config.default.yaml`);
  }
  const defaultConfig = yaml.load(fs.readFileSync(defaultPath, 'utf-8')) as Record<string, unknown>;

  // Cargar config del usuario (si existe)
  const userConfigPath = path.resolve(process.cwd(), 'config.yaml');
  let userConfig: Record<string, unknown> = {};
  if (fs.existsSync(userConfigPath)) {
    logger.info(`Cargando configuración de usuario: ${userConfigPath}`);
    userConfig = yaml.load(fs.readFileSync(userConfigPath, 'utf-8')) as Record<string, unknown>;
  }

  // Merge: user overrides defaults
  const merged = deepMerge(defaultConfig, userConfig);
  config = merged as unknown as AppConfig;

  logger.info('Configuración cargada', {
    port: config.app.port,
    language: config.app.language,
    scanInterval: config.network.scanInterval,
    pingInterval: config.network.pingInterval,
  });

  return config;
}

/**
 * Retorna la configuración actual (debe haberse cargado antes).
 */
export function getConfig(): AppConfig {
  if (!config) {
    throw new Error('Configuración no cargada. Llama a loadConfig() primero.');
  }
  return config;
}
