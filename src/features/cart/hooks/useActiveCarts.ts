import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, onSnapshot } from 'firebase/firestore';
import { fetchActiveCarts } from '@/features/cart/api/cartApi';
import { firestoreDb } from '@/services/firebase/app';
import { useAuthStore } from '@/store/authStore';

export const activeCartKeys = {
  all: ['active-carts'] as const,
};

export function useActiveCarts() {
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === 'admin' || user?.role === 'sub_admin';
  const qc = useQueryClient();

  useEffect(() => {
    if (!isStaff) return undefined;
    let initial = true;
    const unsub = onSnapshot(
      collection(firestoreDb, 'carts'),
      () => {
        if (initial) {
          initial = false;
          return;
        }
        void qc.invalidateQueries({ queryKey: activeCartKeys.all });
      },
      () => undefined,
    );
    return () => unsub();
  }, [isStaff, qc]);

  return useQuery({
    queryKey: activeCartKeys.all,
    queryFn: fetchActiveCarts,
    enabled: isStaff,
  });
}
