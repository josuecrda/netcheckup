import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scansApi } from '../lib/api';

export function useScans(limit = 20) {
  return useQuery({ queryKey: ['scans', limit], queryFn: () => scansApi.list(limit) });
}

export function useTriggerDiscovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: scansApi.triggerDiscovery,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scans'] });
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useTriggerPing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: scansApi.triggerPing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scans'] });
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
