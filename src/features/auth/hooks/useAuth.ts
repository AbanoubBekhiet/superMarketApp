import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { loginMobile, registerMobile, type LoginPayload, type RegisterPayload } from '../api/authApi';

export function useMobileLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (payload: LoginPayload) => loginMobile(payload),
    onSuccess: async (session) => {
      await setSession(session);
    },
  });
}

export function useMobileRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerMobile(payload),
    onSuccess: async (session) => {
      await setSession(session);
    },
  });
}
