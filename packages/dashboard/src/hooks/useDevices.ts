import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '../lib/api';
import type { Device } from '@netcheckup/shared';

export function useDevices() {
  return useQuery({ queryKey: ['devices'], queryFn: devicesApi.list });
}

export function useDeviceSummary() {
  return useQuery({ queryKey: ['devices', 'summary'], queryFn: devicesApi.summary });
}

export function useDevice(id: string) {
  return useQuery({ queryKey: ['devices', id], queryFn: () => devicesApi.get(id), enabled: !!id });
}

export function useDeviceMetrics(id: string, period = '24h') {
  return useQuery({
    queryKey: ['devices', id, 'metrics', period],
    queryFn: () => devicesApi.metrics(id, period),
    enabled: !!id,
  });
}

export function useDeviceAlerts(id: string) {
  return useQuery({
    queryKey: ['devices', id, 'alerts'],
    queryFn: () => devicesApi.alerts(id),
    enabled: !!id,
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Device> }) => devicesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
