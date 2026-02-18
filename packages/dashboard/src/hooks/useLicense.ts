import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { licenseApi } from '../lib/api';

export function useLicense() {
  return useQuery({ queryKey: ['license'], queryFn: licenseApi.get });
}

export function useTiers() {
  return useQuery({ queryKey: ['license', 'tiers'], queryFn: licenseApi.tiers });
}

export function useActivateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => licenseApi.activate(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['license'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useDeactivateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => licenseApi.deactivate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['license'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
