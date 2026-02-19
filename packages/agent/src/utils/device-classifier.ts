import type { DeviceType } from '@netcheckup/shared';

// ─── Vendor/hostname regex patterns ─────────────────────────
// Order matters: first match wins, so more specific patterns go first

const VENDOR_PATTERNS: { pattern: RegExp; type: DeviceType }[] = [
  // ─── Routers ────────────────────────────────────────────
  { pattern: /mikrotik|routerboard|routeros/i, type: 'router' },
  { pattern: /cisco.*router|cisco.*rv\d|linksys.*router|linksys.*wrt/i, type: 'router' },
  { pattern: /tp-?link.*archer|tp-?link.*router|netgear.*nighthawk|netgear.*r\d{3,4}/i, type: 'router' },
  { pattern: /asus.*rt-|draytek|peplink|pfsense|openwrt|dd-?wrt|tomato/i, type: 'router' },
  { pattern: /huawei.*router|zte.*router|nokia.*router/i, type: 'router' },

  // ─── Switches ───────────────────────────────────────────
  { pattern: /cisco.*switch|cisco.*catalyst|cisco.*nexus|cisco.*sg\d/i, type: 'switch' },
  { pattern: /hp.*switch|aruba.*switch|hpe.*switch|procurve/i, type: 'switch' },
  { pattern: /netgear.*gs\d|netgear.*switch|tp-?link.*switch|tp-?link.*tl-sg/i, type: 'switch' },
  { pattern: /juniper.*switch|dell.*switch|ubiquiti.*switch|unifi.*switch/i, type: 'switch' },

  // ─── Access Points ─────────────────────────────────────
  { pattern: /ubiquiti|unifi.*ap|unifi.*nano|unifi.*lite|unifi.*pro/i, type: 'access-point' },
  { pattern: /ruckus|aruba.*ap|aruba.*iap|meraki.*mr|meraki.*ap/i, type: 'access-point' },
  { pattern: /access.?point|wifi.*extender|range.*extender|repeater/i, type: 'access-point' },
  { pattern: /tp-?link.*eap|tp-?link.*re\d|netgear.*wac|netgear.*ex\d/i, type: 'access-point' },
  { pattern: /engenius|cambium|mimosa.*ap/i, type: 'access-point' },

  // ─── Servers ────────────────────────────────────────────
  { pattern: /vmware|esxi|hyper-?v|proxmox|xen.*server/i, type: 'server' },
  { pattern: /dell.*poweredge|hp.*proliant|hpe.*proliant|supermicro/i, type: 'server' },
  { pattern: /lenovo.*thinksystem|ibm.*system.*x|fujitsu.*primergy/i, type: 'server' },
  { pattern: /truenas|freenas|openmediavault|unraid/i, type: 'server' },

  // ─── NAS ────────────────────────────────────────────────
  { pattern: /synology|diskstation|ds\d{3,4}/i, type: 'nas' },
  { pattern: /qnap|ts-\d{3,4}|hs-\d{3,4}/i, type: 'nas' },
  { pattern: /western.*digital.*my.*cloud|wd.*my.*cloud|drobo/i, type: 'nas' },
  { pattern: /asustor|terramaster|buffalo.*linkstation|buffalo.*terastation/i, type: 'nas' },

  // ─── Printers ───────────────────────────────────────────
  { pattern: /epson|brother|canon.*printer|canon.*pixma|canon.*imageclass/i, type: 'printer' },
  { pattern: /hp.*(laser|officejet|deskjet|envy|pagewide|designjet)/i, type: 'printer' },
  { pattern: /lexmark|xerox|ricoh|konica|minolta|kyocera|sharp.*mx/i, type: 'printer' },
  { pattern: /samsung.*printer|oki.*printer|zebra.*printer/i, type: 'printer' },

  // ─── Cameras ────────────────────────────────────────────
  { pattern: /hikvision|dahua|axis.*comm|axis.*net/i, type: 'camera' },
  { pattern: /ring.*cam|ring.*doorbell|nest.*cam|google.*cam/i, type: 'camera' },
  { pattern: /arlo|wyze.*cam|reolink|amcrest|foscam|eufy.*cam/i, type: 'camera' },
  { pattern: /vivotek|bosch.*security|pelco|geovision|lorex/i, type: 'camera' },
  { pattern: /unifi.*protect|unifi.*cam|ubiquiti.*cam/i, type: 'camera' },

  // ─── Phones ─────────────────────────────────────────────
  { pattern: /apple|iphone|ipad.*phone/i, type: 'phone' },
  { pattern: /samsung.*galaxy(?!.*tab)|samsung.*sm-[a-z]/i, type: 'phone' },
  { pattern: /xiaomi|redmi|poco|huawei(?!.*router)|honor/i, type: 'phone' },
  { pattern: /oneplus|oppo|vivo(?!tek)|motorola|moto\s*[gez]/i, type: 'phone' },
  { pattern: /google.*pixel(?!.*watch)|nothing.*phone|realme/i, type: 'phone' },
  { pattern: /nokia.*phone|sony.*xperia|zte.*blade/i, type: 'phone' },

  // ─── Tablets ────────────────────────────────────────────
  { pattern: /ipad|galaxy.*tab|kindle|fire.*hd|surface.*go/i, type: 'tablet' },
  { pattern: /lenovo.*tab|huawei.*matepad|xiaomi.*pad|samsung.*tab/i, type: 'tablet' },

  // ─── Laptops ────────────────────────────────────────────
  { pattern: /macbook|thinkpad|latitude|elitebook|zbook/i, type: 'laptop' },
  { pattern: /surface.*pro|surface.*laptop|ideapad|pavilion|spectre/i, type: 'laptop' },
  { pattern: /xps.*\d{2}|inspiron|vivobook|zenbook|swift.*\d/i, type: 'laptop' },
  { pattern: /chromebook|matebook|gram.*\d{2}/i, type: 'laptop' },

  // ─── IoT / Smart Home ──────────────────────────────────
  { pattern: /amazon.*echo|alexa|fire.*tv.*stick/i, type: 'iot' },
  { pattern: /google.*home|google.*nest(?!.*cam)|chromecast/i, type: 'iot' },
  { pattern: /apple.*tv|homepod|apple.*home/i, type: 'iot' },
  { pattern: /sonos|bose.*soundbar|bose.*home/i, type: 'iot' },
  { pattern: /philips.*hue|hue.*bridge|wemo|belkin.*wemo/i, type: 'iot' },
  { pattern: /nest.*thermostat|ecobee|honeywell.*lyric|sensibo/i, type: 'iot' },
  { pattern: /shelly|tuya|tasmota|esphome|wled|smart.*plug|smart.*bulb/i, type: 'iot' },
  { pattern: /roku|fire.*tv|apple.*tv|shield.*tv/i, type: 'iot' },
  { pattern: /samsung.*tizen|lg.*webos|vizio.*smart|tcl.*roku/i, type: 'iot' },
  { pattern: /roomba|roborock|eufy.*clean|dyson.*pure|dyson.*hot/i, type: 'iot' },
  { pattern: /ring.*alarm|aqara|smartthings|home.*assistant/i, type: 'iot' },

  // ─── Desktops (generic) ────────────────────────────────
  { pattern: /intel.*nuc|mac.*mini|mac.*studio|mac.*pro/i, type: 'desktop' },
  { pattern: /dell.*optiplex|dell.*precision|hp.*prodesk|hp.*elitedesk/i, type: 'desktop' },
  { pattern: /lenovo.*thinkcentre|lenovo.*ideacentre|acer.*aspire.*tc/i, type: 'desktop' },
  { pattern: /intel|realtek|gigabyte|asustek|msi|amd|nvidia/i, type: 'desktop' },
];

// ─── Hostname-based heuristics ──────────────────────────────
// Match patterns commonly found in hostnames/DHCP names

const HOSTNAME_PATTERNS: { pattern: RegExp; type: DeviceType }[] = [
  // Routers & network infra
  { pattern: /^(gw|gateway|router|rt|fw|firewall|edge)\b/i, type: 'router' },
  { pattern: /\b(mikrotik|openwrt|pfsense|ubnt|edgerouter)\b/i, type: 'router' },

  // Switches
  { pattern: /^(sw|switch|core-?sw)\b/i, type: 'switch' },

  // APs
  { pattern: /^(ap|wap|wifi|wireless)\b/i, type: 'access-point' },
  { pattern: /\b(access-?point|unifi-?ap)\b/i, type: 'access-point' },

  // Servers
  { pattern: /^(srv|server|svr|dc|dns|dhcp|web|db|mail|smtp|ftp)\b/i, type: 'server' },
  { pattern: /\b(proxmox|esxi|vmware|docker|k8s|kubernetes)\b/i, type: 'server' },
  { pattern: /\bnas\b/i, type: 'nas' },

  // Printers
  { pattern: /\b(print|printer|prn|mfp|plotter|laserjet|deskjet|officejet)\b/i, type: 'printer' },
  { pattern: /^(hp|brother|canon|epson|xerox|ricoh|lexmark)[_-]?\d/i, type: 'printer' },

  // Cameras
  { pattern: /\b(cam|camera|ipcam|nvr|dvr|cctv)\b/i, type: 'camera' },

  // Phones
  { pattern: /\b(iphone|android|phone|galaxy-?[a-z]\d|pixel-?\d|redmi)\b/i, type: 'phone' },

  // Tablets
  { pattern: /\b(ipad|tablet|kindle|fire-?hd|galaxy-?tab)\b/i, type: 'tablet' },

  // Laptops
  { pattern: /\b(laptop|macbook|thinkpad|surface|chromebook|notebook)\b/i, type: 'laptop' },

  // IoT
  { pattern: /\b(echo|alexa|google-?home|chromecast|roku|appletv|apple-?tv)\b/i, type: 'iot' },
  { pattern: /\b(sonos|hue|smart-?tv|fire-?tv|shield|homepod)\b/i, type: 'iot' },
  { pattern: /\b(esp32|esp8266|tasmota|shelly|tuya|wled)\b/i, type: 'iot' },
  { pattern: /\b(thermostat|doorbell|roomba|vacuum|sensor)\b/i, type: 'iot' },

  // Desktops
  { pattern: /^(pc|desktop|workstation|ws|imac|mac-?mini|nuc)\b/i, type: 'desktop' },
];

// ─── MAC OUI prefix patterns ────────────────────────────────
// First 3 bytes (6 hex chars) → manufacturer → likely device type

const MAC_OUI_PATTERNS: { prefix: string; type: DeviceType }[] = [
  // Apple devices — could be phone, laptop, tablet, iot (Apple TV)
  // We'll classify Apple as phone by default (most common), vendor patterns will override
  // Actually skip Apple here since vendor string "Apple" is already handled above

  // Raspberry Pi
  { prefix: 'b8:27:eb', type: 'iot' },
  { prefix: 'dc:a6:32', type: 'iot' },
  { prefix: 'e4:5f:01', type: 'iot' },
  { prefix: '28:cd:c1', type: 'iot' },
  { prefix: 'd8:3a:dd', type: 'iot' },

  // Espressif (ESP32/ESP8266 — IoT)
  { prefix: '24:0a:c4', type: 'iot' },
  { prefix: '24:6f:28', type: 'iot' },
  { prefix: '30:ae:a4', type: 'iot' },
  { prefix: 'a4:cf:12', type: 'iot' },
  { prefix: '3c:71:bf', type: 'iot' },
  { prefix: 'ec:fa:bc', type: 'iot' },
  { prefix: '84:cc:a8', type: 'iot' },
  { prefix: 'ac:67:b2', type: 'iot' },
  { prefix: '7c:df:a1', type: 'iot' },

  // Sonos
  { prefix: '00:0e:58', type: 'iot' },
  { prefix: 'b8:e9:37', type: 'iot' },
  { prefix: '48:a6:b8', type: 'iot' },
  { prefix: '5c:aa:fd', type: 'iot' },

  // Philips Hue
  { prefix: '00:17:88', type: 'iot' },
  { prefix: 'ec:b5:fa', type: 'iot' },

  // Ring / Amazon
  { prefix: '18:b4:30', type: 'iot' },
  { prefix: '44:73:d6', type: 'iot' },

  // Hikvision
  { prefix: '8c:e7:48', type: 'camera' },
  { prefix: 'c0:56:e3', type: 'camera' },
  { prefix: '44:19:b6', type: 'camera' },

  // Dahua
  { prefix: '3c:ef:8c', type: 'camera' },
  { prefix: 'a0:bd:1d', type: 'camera' },

  // Ubiquiti
  { prefix: '24:5a:4c', type: 'access-point' },
  { prefix: 'fc:ec:da', type: 'access-point' },
  { prefix: '80:2a:a8', type: 'access-point' },
  { prefix: '18:e8:29', type: 'access-point' },
  { prefix: '78:8a:20', type: 'access-point' },
  { prefix: '68:d7:9a', type: 'access-point' },
  { prefix: 'e0:63:da', type: 'access-point' },

  // MikroTik
  { prefix: 'e4:8d:8c', type: 'router' },
  { prefix: '6c:3b:6b', type: 'router' },
  { prefix: '48:a9:8a', type: 'router' },
  { prefix: 'b8:69:f4', type: 'router' },
  { prefix: 'd4:01:c3', type: 'router' },

  // TP-Link
  { prefix: '50:c7:bf', type: 'router' },
  { prefix: 'ec:08:6b', type: 'router' },
  { prefix: '60:a4:b7', type: 'router' },
  { prefix: 'f4:f2:6d', type: 'router' },
  { prefix: '30:b5:c2', type: 'router' },

  // Brother (printers)
  { prefix: '00:80:77', type: 'printer' },
  { prefix: '30:05:5c', type: 'printer' },

  // Canon (printers)
  { prefix: '00:1e:8f', type: 'printer' },
  { prefix: '18:0c:ac', type: 'printer' },

  // Epson (printers)
  { prefix: '00:26:ab', type: 'printer' },
  { prefix: '64:eb:8c', type: 'printer' },

  // Roku
  { prefix: 'dc:3a:5e', type: 'iot' },
  { prefix: 'b0:a7:37', type: 'iot' },
  { prefix: 'b0:ee:7b', type: 'iot' },

  // Google (Chromecast, Home)
  { prefix: 'f4:f5:d8', type: 'iot' },
  { prefix: '54:60:09', type: 'iot' },

  // Synology
  { prefix: '00:11:32', type: 'nas' },

  // QNAP
  { prefix: '00:08:9b', type: 'nas' },
  { prefix: '24:5e:be', type: 'nas' },
];

// ─── Port-based classification ──────────────────────────────

const PORT_CLASSIFICATION: { ports: number[]; type: DeviceType; minMatch: number }[] = [
  // Printer ports (1 match sufficient)
  { ports: [9100, 631, 515], type: 'printer', minMatch: 1 },

  // Camera RTSP (1 match)
  { ports: [554, 8554], type: 'camera', minMatch: 1 },

  // NAS (Synology DSM, QNAP, web admin)
  { ports: [5000, 5001], type: 'nas', minMatch: 1 },

  // Server profile (need 2+)
  { ports: [22, 3306, 5432, 8080, 3000, 8443, 6379, 27017, 2375], type: 'server', minMatch: 2 },

  // Router web admin (need 2+)
  { ports: [80, 443, 8080, 8443, 8291, 8728], type: 'router', minMatch: 2 },

  // Desktop file sharing (need 2+)
  { ports: [445, 139, 548, 3389, 5900], type: 'desktop', minMatch: 2 },
];

// ─── Main classification function ───────────────────────────

/**
 * Clasifica el tipo de dispositivo basándose en vendor, hostname,
 * puertos abiertos, dirección MAC y si es gateway.
 */
export function classifyDevice(
  vendor: string | null,
  hostname: string | null,
  openPorts: number[] | null,
  isGateway: boolean,
  macAddress?: string | null
): DeviceType {
  // Si es el gateway, es un router
  if (isGateway) return 'router';

  const searchString = [vendor, hostname].filter(Boolean).join(' ');

  // 1. Vendor/hostname patterns (most reliable)
  for (const { pattern, type } of VENDOR_PATTERNS) {
    if (pattern.test(searchString)) {
      return type;
    }
  }

  // 2. Hostname-specific patterns (DHCP names, mDNS, etc.)
  if (hostname) {
    for (const { pattern, type } of HOSTNAME_PATTERNS) {
      if (pattern.test(hostname)) {
        return type;
      }
    }
  }

  // 3. MAC OUI prefix lookup
  if (macAddress) {
    const mac = macAddress.toLowerCase().replace(/[^a-f0-9]/g, '');
    const prefix = `${mac.slice(0, 2)}:${mac.slice(2, 4)}:${mac.slice(4, 6)}`;
    for (const { prefix: ouiPrefix, type } of MAC_OUI_PATTERNS) {
      if (prefix === ouiPrefix) {
        return type;
      }
    }
  }

  // 4. Port-based classification
  if (openPorts && openPorts.length > 0) {
    for (const { ports, type, minMatch } of PORT_CLASSIFICATION) {
      const matchCount = ports.filter((p) => openPorts.includes(p)).length;
      if (matchCount >= minMatch) return type;
    }
  }

  return 'unknown';
}
