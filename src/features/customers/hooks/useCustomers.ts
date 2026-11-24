import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, UserAccountStatus } from '@/types/domain';
import { fetchCustomers, updateCustomerStatus } from '../api/customersApi';

export const customerKeys = {
  all: ['customers'] as const,
};

export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.all,
    queryFn: fetchCustomers,
  });
}

export function useUpdateCustomerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, status }: { customerId: string; status: UserAccountStatus }) =>
      updateCustomerStatus(customerId, status),
    onMutate: async ({ customerId, status }) => {
      await qc.cancelQueries({ queryKey: customerKeys.all });
      const previous = qc.getQueryData<User[]>(customerKeys.all);
      qc.setQueryData<User[]>(customerKeys.all, (old) =>
        old?.map((c) => (c.id === customerId ? { ...c, status } : c)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(customerKeys.all, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}
