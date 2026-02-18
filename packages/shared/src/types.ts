// ============================================================
// DEVICE
// ============================================================

export type DeviceType =
  | 'router'
  | 'switch'
  | 'access-point'
  | 'server'
  | 'desktop'
  | 'laptop'
  | 'printer'
  | 'phone'
  | 'tablet'
  | 'iot'
  | 'camera'
  | 'nas'
  | 'unknown';

export type DeviceStatus = 'online' | 'offline' | 'degraded';

export interface Device {
  id: string;
  ipAddress: string;
  macAddress: string;
  hostname: string | null;
  customName: string | null;
  vendor: string | null;
  deviceType: DeviceType;
  status: DeviceStatus;
  lastSeen: string;
  firstSeen: string;
  isGateway: boolean;
  isMonitored: boolean;
  notes: string | null;
  latencyMs: number | null;
  packetLoss: number | null;
  openPorts: number[] | null;
}

// ============================================================
// SCAN
// ============================================================

export type ScanType = 'discovery' | 'ping' | 'speed' | 'full';
export type ScanStatus = 'running' | 'completed' | 'failed';

export interface Scan {
  id: string;
  type: ScanType;
  status: ScanStatus;
  startedAt: string;
  completedAt: string | null;
  devicesFound: number;
  newDevices: number;
  duration: number;
  triggeredBy: 'manual' | 'scheduled';
}

// ============================================================
// METRIC (datos de ping/latencia por dispositivo)
// ============================================================

export interface Metric {
  id: string;
  deviceId: string;
  timestamp: string;
  latencyMs: number | null;
  packetLoss: number;
  jitter: number | null;
  isReachable: boolean;
}

export interface MetricSummary {
  deviceId: string;
  period: string;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  avgPacketLoss: number;
  uptimePercent: number;
  dataPoints: { timestamp: string; latencyMs: number; packetLoss: number }[];
}

// ============================================================
// SPEED TEST
// ============================================================

export interface SpeedTestResult {
  id: string;
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitter: number | null;
  isp: string | null;
  serverName: string | null;
  serverLocation: string | null;
  contractedDownloadMbps: number | null;
  contractedUploadMbps: number | null;
  downloadPercent: number | null;
  uploadPercent: number | null;
  triggeredBy: 'manual' | 'scheduled';
}

// ============================================================
// HEALTH SCORE
// ============================================================

export type HealthCategory = 'excellent' | 'good' | 'fair' | 'critical';

export interface HealthScore {
  score: number;
  category: HealthCategory;
  calculatedAt: string;
  factors: {
    name: string;
    score: number;
    weight: number;
    description: string;
  }[];
  trend: 'improving' | 'stable' | 'declining';
  previousScore: number | null;
}

// ============================================================
// PROBLEM / RECOMMENDATION
// ============================================================

export type ProblemSeverity = 'critical' | 'warning' | 'info';
export type ProblemCategory =
  | 'latency'
  | 'packet-loss'
  | 'availability'
  | 'speed'
  | 'dns'
  | 'security'
  | 'infrastructure'
  | 'configuration';

export interface Problem {
  id: string;
  detectedAt: string;
  resolvedAt: string | null;
  severity: ProblemSeverity;
  category: ProblemCategory;
  title: string;
  description: string;
  affectedDevices: string[];
  impact: string;
  recommendation: string;
  isActive: boolean;
  ruleId: string;
}

// ============================================================
// ALERT
// ============================================================

export type AlertType =
  | 'device-offline'
  | 'device-online'
  | 'high-latency'
  | 'packet-loss'
  | 'speed-degraded'
  | 'new-device'
  | 'problem-detected'
  | 'problem-resolved';

export interface Alert {
  id: string;
  type: AlertType;
  severity: ProblemSeverity;
  title: string;
  message: string;
  deviceId: string | null;
  problemId: string | null;
  createdAt: string;
  readAt: string | null;
  sentVia: ('inapp' | 'email' | 'telegram')[];
}

// ============================================================
// SETTINGS
// ============================================================

export interface AppSettings {
  companyName: string;
  language: 'es' | 'en';
  scanInterval: number;
  pingInterval: number;
  speedTestInterval: number;
  ispName: string | null;
  contractedDownloadMbps: number | null;
  contractedUploadMbps: number | null;
  alertsEnabled: boolean;
  emailEnabled: boolean;
  emailTo: string | null;
  emailSmtpHost: string | null;
  emailSmtpPort: number | null;
  emailSmtpUser: string | null;
  emailSmtpPass: string | null;
  telegramEnabled: boolean;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  highLatencyThresholdMs: number;
  packetLossThresholdPercent: number;
  speedDegradedPercent: number;
  alertCooldownMinutes: number;
  weeklyReportEnabled: boolean;
  weeklyReportDay: number;
  monthlyReportEnabled: boolean;
  licenseKey: string | null;
  tier: 'free' | 'monitoring' | 'consulting';
}

// ============================================================
// API RESPONSES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================
// WEBSOCKET EVENTS
// ============================================================

export type WSEventType =
  | 'scan:started'
  | 'scan:progress'
  | 'scan:completed'
  | 'device:updated'
  | 'device:new'
  | 'metric:new'
  | 'alert:new'
  | 'speedtest:started'
  | 'speedtest:completed'
  | 'health:updated';

export interface WSEvent {
  type: WSEventType;
  payload: unknown;
  timestamp: string;
}

// ============================================================
// NETWORK TOOLS
// ============================================================

export interface PingResult {
  host: string;
  alive: boolean;
  time: number | null;
  min: number;
  max: number;
  avg: number;
  packetLoss: number;
  output: string;
}

export interface TracerouteHop {
  hop: number;
  ip: string | null;
  hostname: string | null;
  rtt1: number | null;
  rtt2: number | null;
  rtt3: number | null;
}

export interface DnsLookupResult {
  domain: string;
  addresses: string[];
  cname: string | null;
  mx: { priority: number; exchange: string }[];
  ns: string[];
  txt: string[];
  responseTimeMs: number;
}

export interface PortScanResult {
  host: string;
  ports: {
    port: number;
    state: 'open' | 'closed' | 'filtered';
    service: string | null;
  }[];
  scanDuration: number;
}

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

export interface WakeOnLanResult {
  success: boolean;
  message: string;
}
