import type { DeviceType } from '@netcheckup/shared';

// Palabras clave en el vendor/hostname para clasificar dispositivos
const VENDOR_PATTERNS: { pattern: RegExp; type: DeviceType }[] = [
  // Routers
  { pattern: /mikrotik|routerboard/i, type: 'router' },

  // Switches
  { pattern: /cisco.*switch|hp.*switch|aruba.*switch/i, type: 'switch' },

  // Access Points
  { pattern: /ubiquiti|unifi|ruckus|aruba.*ap|access.?point/i, type: 'access-point' },

  // Servidores
  { pattern: /vmware|hyper-?v|proxmox|dell.*server|hp.*proliant/i, type: 'server' },
  { pattern: /synology|qnap|western.*digital.*my.*cloud/i, type: 'nas' },

  // Impresoras
  { pattern: /epson|brother|canon|hp.*(laser|officejet|deskjet|envy)|lexmark|xerox|ricoh/i, type: 'printer' },

  // Cámaras
  { pattern: /hikvision|dahua|axis.*comm|ring|nest.*cam|arlo|wyze|reolink|amcrest/i, type: 'camera' },

  // Teléfonos
  { pattern: /apple|iphone|samsung.*galaxy|samsung.*sm-|xiaomi|huawei|oneplus|oppo|vivo|motorola|pixel/i, type: 'phone' },

  // Tablets
  { pattern: /ipad|galaxy.*tab|kindle|fire.*hd|surface.*go/i, type: 'tablet' },

  // Laptops
  { pattern: /macbook|thinkpad|latitude|elitebook|surface.*pro|surface.*laptop|ideapad|pavilion/i, type: 'laptop' },

  // IoT
  { pattern: /amazon.*echo|google.*home|alexa|sonos|philips.*hue|nest.*thermostat|shelly|tuya|tasmota/i, type: 'iot' },
  { pattern: /roku|chromecast|fire.*tv|apple.*tv|smart.*tv|lg.*webos|samsung.*tizen/i, type: 'iot' },

  // Desktops genéricos
  { pattern: /intel|realtek|gigabyte|asustek|msi|amd|nvidia/i, type: 'desktop' },
];

// Clasificar por puertos abiertos
const PORT_CLASSIFICATION: { ports: number[]; type: DeviceType }[] = [
  { ports: [80, 443, 8080, 8443], type: 'router' }, // Interfaz web de administración
  { ports: [631, 9100, 515], type: 'printer' },       // IPP, RAW printing, LPD
  { ports: [554, 8554], type: 'camera' },              // RTSP
  { ports: [22, 3306, 5432, 8080], type: 'server' },   // SSH + DB + web server
  { ports: [445, 139, 548], type: 'desktop' },          // SMB, NetBIOS, AFP
  { ports: [5000, 5001], type: 'nas' },                 // Synology DSM
];

/**
 * Clasifica el tipo de dispositivo basándose en vendor, hostname y puertos abiertos.
 */
export function classifyDevice(
  vendor: string | null,
  hostname: string | null,
  openPorts: number[] | null,
  isGateway: boolean
): DeviceType {
  // Si es el gateway, es un router
  if (isGateway) return 'router';

  const searchString = [vendor, hostname].filter(Boolean).join(' ');

  // Buscar en patrones de vendor/hostname
  for (const { pattern, type } of VENDOR_PATTERNS) {
    if (pattern.test(searchString)) {
      return type;
    }
  }

  // Buscar por puertos abiertos
  if (openPorts && openPorts.length > 0) {
    for (const { ports, type } of PORT_CLASSIFICATION) {
      const matchCount = ports.filter((p) => openPorts.includes(p)).length;
      if (matchCount >= 2) return type;
    }

    // Puertos de impresora (solo necesita 1)
    if (openPorts.includes(9100) || openPorts.includes(631)) return 'printer';

    // RTSP = cámara
    if (openPorts.includes(554)) return 'camera';
  }

  return 'unknown';
}
