import type { ApiResponse, PaginatedResponse } from '@netcheckup/shared';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error || 'Unknown error');
  return json.data;
}

function get<T>(path: string) {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function put<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

// ─── Devices ────────────────────────────────────────────────
import type { Device, Alert, MetricSummary } from '@netcheckup/shared';

export const devicesApi = {
  list: () => get<Device[]>('/devices'),
  summary: () => get<{ total: number; online: number; offline: number; degraded: number; byType: Record<string, number> }>('/devices/summary'),
  get: (id: string) => get<Device>(`/devices/${id}`),
  update: (id: string, data: Partial<Device>) => put<Device>(`/devices/${id}`, data),
  delete: (id: string) => del<null>(`/devices/${id}`),
  metrics: (id: string, period = '24h') => get<MetricSummary>(`/devices/${id}/metrics?period=${period}`),
  alerts: (id: string) => get<Alert[]>(`/devices/${id}/alerts`),
};

// ─── Scans ──────────────────────────────────────────────────
import type { Scan } from '@netcheckup/shared';

export const scansApi = {
  list: (limit = 50) => get<Scan[]>(`/scans?limit=${limit}`),
  latest: () => get<Scan[]>('/scans/latest'),
  get: (id: string) => get<Scan>(`/scans/${id}`),
  triggerDiscovery: () => post<{ message: string }>('/scans/discovery'),
  triggerPing: () => post<{ message: string }>('/scans/ping'),
};

// ─── Metrics ────────────────────────────────────────────────
import type { Metric } from '@netcheckup/shared';

export const metricsApi = {
  latest: () => get<Metric[]>('/metrics/latest'),
  history: (deviceId: string, period = '24h') =>
    get<MetricSummary>(`/metrics/history?deviceId=${deviceId}&period=${period}`),
};

// ─── Speed Test ─────────────────────────────────────────────
import type { SpeedTestResult } from '@netcheckup/shared';

export const speedTestApi = {
  list: (limit = 50) => get<SpeedTestResult[]>(`/speedtest?limit=${limit}`),
  latest: () => get<SpeedTestResult>('/speedtest/latest'),
  average: (period = '7d') => get<{ avgDownload: number; avgUpload: number; avgPing: number; count: number }>(`/speedtest/average?period=${period}`),
  run: () => post<{ message: string }>('/speedtest/run'),
};

// ─── Alerts ─────────────────────────────────────────────────
interface AlertsListResult {
  data: Alert[];
  total: number;
  page: number;
  pageSize: number;
}

export const alertsApi = {
  list: async (page = 1, pageSize = 20, unreadOnly = false) => {
    const res = await fetch(`${BASE}/alerts?page=${page}&pageSize=${pageSize}&unreadOnly=${unreadOnly}`);
    const json: PaginatedResponse<Alert> = await res.json();
    return { data: json.data, total: json.total, page: json.page, pageSize: json.pageSize };
  },
  unreadCount: () => get<{ count: number }>('/alerts/unread-count'),
  markRead: (id: string) => put<null>(`/alerts/${id}/read`),
  markAllRead: () => put<null>('/alerts/read-all'),
  delete: (id: string) => del<null>(`/alerts/${id}`),
};

// ─── Health ─────────────────────────────────────────────────
import type { HealthScore, Problem } from '@netcheckup/shared';

export const healthApi = {
  current: () => get<HealthScore>('/health'),
  history: (period = '7d') => get<HealthScore[]>(`/health/history?period=${period}`),
  problems: () => get<Problem[]>('/health/problems'),
  problemDetail: (id: string) => get<Problem>(`/health/problems/${id}`),
  resolveProblem: (id: string) => put<Problem>(`/health/problems/${id}/resolve`),
};

// ─── Tools ─────────────────────────────────────────────────
import type { PingResult, TracerouteHop, DnsLookupResult, PortScanResult, SubnetCalcResult, WakeOnLanResult } from '@netcheckup/shared';

export const toolsApi = {
  ping: (host: string, count?: number) =>
    post<PingResult>('/tools/ping', { host, count }),
  traceroute: (host: string) =>
    post<TracerouteHop[]>('/tools/traceroute', { host }),
  dnsLookup: (domain: string, type?: string) =>
    post<DnsLookupResult>('/tools/dns-lookup', { domain, type }),
  portScan: (host: string, ports?: number[], range?: { start: number; end: number }) =>
    post<PortScanResult>('/tools/port-scan', { host, ports, range }),
  wakeOnLan: (macAddress: string) =>
    post<WakeOnLanResult>('/tools/wake-on-lan', { macAddress }),
  subnetCalc: (ip: string, mask: string) =>
    post<SubnetCalcResult>('/tools/subnet-calc', { ip, mask }),
};

// ─── License ───────────────────────────────────────────────
import type { LicenseInfo, TierLimits, LicenseTier } from '@netcheckup/shared';

interface LicenseResponse extends LicenseInfo {
  limits: TierLimits;
}

interface TierInfo {
  id: LicenseTier;
  name: string;
  price: { amount: number; currency: string; label: string };
  limits: TierLimits;
}

export const licenseApi = {
  get: () => get<LicenseResponse>('/license'),
  activate: (licenseKey: string) => post<LicenseResponse>('/license/activate', { licenseKey }),
  deactivate: () => post<LicenseResponse>('/license/deactivate'),
  tiers: () => get<TierInfo[]>('/license/tiers'),
};

// ─── Settings ───────────────────────────────────────────────
import type { AppSettings } from '@netcheckup/shared';

export const settingsApi = {
  get: () => get<AppSettings>('/settings'),
  update: (data: Partial<AppSettings>) => put<AppSettings>('/settings', data),
  status: () => get<{
    version: string;
    uptime: number;
    platform: string;
    hostname: string;
    nodeVersion: string;
    memoryUsage: { rss: number; heapTotal: number; heapUsed: number };
  }>('/settings/status'),
};
