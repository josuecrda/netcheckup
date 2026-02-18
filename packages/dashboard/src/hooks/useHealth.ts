import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthApi } from '../lib/api';

export function useHealthScore() {
  return useQuery({ queryKey: ['health'], queryFn: healthApi.current, retry: false });
}

export function useHealthHistory(period = '7d') {
  return useQuery({
    queryKey: ['health', 'history', period],
    queryFn: () => healthApi.history(period),
    retry: false,
  });
}

export function useProblems() {
  return useQuery({
    queryKey: ['health', 'problems'],
    queryFn: healthApi.problems,
    retry: false,
  });
}

export function useResolveProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => healthApi.resolveProblem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
