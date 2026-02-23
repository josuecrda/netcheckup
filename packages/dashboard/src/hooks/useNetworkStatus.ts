import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { networkApi } from '../lib/api';

export function useNetworkStatus() {
  return useQuery({
    queryKey: ['network', 'status'],
    queryFn: networkApi.status,
    refetchInterval: 30_000,
  });
}

export function useAcceptNetwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => networkApi.accept(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network'] });
    },
  });
}
