import { logger } from '../utils/logger.js';

export interface SubnetCalcResult {
  ip: string;
  mask: string;
  cidr: number;
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  wildcardMask: string;
  ipClass: string;
  isPrivate: boolean;
  binaryMask: string;
}

/**
 * Calcula información de una subred a partir de una IP y máscara.
 * La máscara puede ser en formato dotted (255.255.255.0) o CIDR (/24).
 */
export function subnetCalc(ip: string, mask: string): SubnetCalcResult {
  logger.debug(`Calculando subred para ${ip}/${mask}`);

  // Parsear IP
  const ipParts = ip.split('.').map(Number);
  if (ipParts.length !== 4 || ipParts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`IP inválida: ${ip}`);
  }

  // Parsear máscara — puede ser CIDR ("/24" o "24") o dotted notation
  let maskParts: number[];
  let cidr: number;

  const cleanMask = mask.replace('/', '').trim();

  if (/^\d+$/.test(cleanMask) && parseInt(cleanMask) <= 32) {
    // CIDR notation
    cidr = parseInt(cleanMask);
    maskParts = cidrToMask(cidr);
  } else if (cleanMask.includes('.')) {
    // Dotted notation
    maskParts = cleanMask.split('.').map(Number);
    if (maskParts.length !== 4 || maskParts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      throw new Error(`Máscara inválida: ${mask}`);
    }
    cidr = maskToCidr(maskParts);
  } else {
    throw new Error(`Formato de máscara inválido: ${mask}. Usa CIDR (ej: 24) o notación decimal (ej: 255.255.255.0)`);
  }

  // Calcular dirección de red
  const networkParts = ipParts.map((p, i) => p & maskParts[i]);

  // Calcular wildcard mask
  const wildcardParts = maskParts.map((p) => 255 - p);

  // Calcular dirección de broadcast
  const broadcastParts = networkParts.map((p, i) => p | wildcardParts[i]);

  // Calcular primer y último host
  const firstHostParts = [...networkParts];
  firstHostParts[3] += 1;

  const lastHostParts = [...broadcastParts];
  lastHostParts[3] -= 1;

  // Total de hosts usables
  const totalHosts = Math.max(0, Math.pow(2, 32 - cidr) - 2);

  // Clase de IP
  const ipClass = getIpClass(ipParts[0]);

  // ¿Es privada?
  const isPrivate = isPrivateIp(ipParts);

  // Máscara en binario
  const binaryMask = maskParts.map((p) => p.toString(2).padStart(8, '0')).join('.');

  return {
    ip,
    mask: maskParts.join('.'),
    cidr,
    networkAddress: networkParts.join('.'),
    broadcastAddress: broadcastParts.join('.'),
    firstHost: firstHostParts.join('.'),
    lastHost: lastHostParts.join('.'),
    totalHosts,
    wildcardMask: wildcardParts.join('.'),
    ipClass,
    isPrivate,
    binaryMask,
  };
}

function cidrToMask(cidr: number): number[] {
  const mask = new Array(4).fill(0);
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, cidr - i * 8));
    mask[i] = bits === 8 ? 255 : (256 - Math.pow(2, 8 - bits)) & 255;
  }
  return mask;
}

function maskToCidr(mask: number[]): number {
  let cidr = 0;
  for (const octet of mask) {
    let bits = octet;
    while (bits > 0) {
      cidr += bits & 1;
      bits >>= 1;
    }
  }
  return cidr;
}

function getIpClass(firstOctet: number): string {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D (Multicast)';
  return 'E (Experimental)';
}

function isPrivateIp(parts: number[]): boolean {
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}
