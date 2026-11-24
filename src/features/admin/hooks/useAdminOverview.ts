import { useQuery } from '@tanstack/react-query';
import { fetchAdminOverview } from '../api/adminApi';

export const adminKeys = {
  overview: ['admin', 'overview'] as const,
};

export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview,
    queryFn: fetchAdminOverview,
  });
}
