import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { speedTestApi } from '../lib/api';

export function useSpeedTests(limit = 20) {
  return useQuery({ queryKey: ['speedtest', limit], queryFn: () => speedTestApi.list(limit) });
}

export function useLatestSpeedTest() {
  return useQuery({ queryKey: ['speedtest', 'latest'], queryFn: speedTestApi.latest, retry: false });
}

export function useSpeedTestAverage(period = '7d') {
  return useQuery({
    queryKey: ['speedtest', 'average', period],
    queryFn: () => speedTestApi.average(period),
    retry: false,
  });
}

export function useRunSpeedTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: speedTestApi.run,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['speedtest'] });
    },
  });
}
