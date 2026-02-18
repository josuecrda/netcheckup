import dgram from 'dgram';
import { logger } from '../utils/logger.js';

/**
 * Envía un paquete Wake-on-LAN (magic packet) para encender un dispositivo remotamente.
 *
 * El magic packet consiste en 6 bytes 0xFF seguidos de la MAC address repetida 16 veces.
 * Se envía como broadcast UDP al puerto 9.
 */
export async function wakeOnLan(macAddress: string): Promise<{ success: boolean; message: string }> {
  // Normalizar MAC: aceptar formatos AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABBCCDDEEFF
  const cleanMac = macAddress.replace(/[:\-\.]/g, '').toUpperCase();

  if (!/^[0-9A-F]{12}$/.test(cleanMac)) {
    throw new Error(`Dirección MAC inválida: ${macAddress}. Formato esperado: AA:BB:CC:DD:EE:FF`);
  }

  logger.info(`Enviando Wake-on-LAN a ${macAddress}...`);

  // Construir el magic packet
  const macBytes = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) {
    macBytes[i] = parseInt(cleanMac.substring(i * 2, i * 2 + 2), 16);
  }

  // 6 bytes 0xFF + MAC repetida 16 veces = 102 bytes total
  const magicPacket = Buffer.alloc(102);
  // Header: 6 bytes 0xFF
  for (let i = 0; i < 6; i++) {
    magicPacket[i] = 0xff;
  }
  // Body: MAC repetida 16 veces
  for (let i = 0; i < 16; i++) {
    macBytes.copy(magicPacket, 6 + i * 6);
  }

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');

    socket.once('error', (err) => {
      socket.close();
      logger.warn(`Error enviando WoL a ${macAddress}`, { error: err.message });
      reject(new Error(`Error enviando magic packet: ${err.message}`));
    });

    socket.bind(() => {
      socket.setBroadcast(true);

      // Enviar a broadcast address en puerto 9
      socket.send(magicPacket, 0, magicPacket.length, 9, '255.255.255.255', (err) => {
        socket.close();

        if (err) {
          logger.warn(`Error enviando WoL a ${macAddress}`, { error: err.message });
          reject(new Error(`Error enviando magic packet: ${err.message}`));
        } else {
          logger.info(`Wake-on-LAN enviado exitosamente a ${macAddress}`);
          resolve({
            success: true,
            message: `Magic packet enviado a ${macAddress}. El dispositivo debería encender en unos segundos si soporta Wake-on-LAN y está configurado correctamente.`,
          });
        }
      });
    });
  });
}
