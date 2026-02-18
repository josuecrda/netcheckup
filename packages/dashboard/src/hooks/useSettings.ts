import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../lib/api';
import type { AppSettings } from '@netcheckup/shared';

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: ['settings', 'status'],
    queryFn: settingsApi.status,
    refetchInterval: 60_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => settingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
