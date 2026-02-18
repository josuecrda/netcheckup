import { useMutation } from '@tanstack/react-query';
import { toolsApi } from '../lib/api';

export function usePingTool() {
  return useMutation({
    mutationFn: ({ host, count }: { host: string; count?: number }) =>
      toolsApi.ping(host, count),
  });
}

export function useTracerouteTool() {
  return useMutation({
    mutationFn: ({ host }: { host: string }) => toolsApi.traceroute(host),
  });
}

export function useDnsLookupTool() {
  return useMutation({
    mutationFn: ({ domain, type }: { domain: string; type?: string }) =>
      toolsApi.dnsLookup(domain, type),
  });
}

export function usePortScanTool() {
  return useMutation({
    mutationFn: ({
      host,
      ports,
      range,
    }: {
      host: string;
      ports?: number[];
      range?: { start: number; end: number };
    }) => toolsApi.portScan(host, ports, range),
  });
}

export function useWakeOnLanTool() {
  return useMutation({
    mutationFn: ({ macAddress }: { macAddress: string }) =>
      toolsApi.wakeOnLan(macAddress),
  });
}

export function useSubnetCalcTool() {
  return useMutation({
    mutationFn: ({ ip, mask }: { ip: string; mask: string }) =>
      toolsApi.subnetCalc(ip, mask),
  });
}
