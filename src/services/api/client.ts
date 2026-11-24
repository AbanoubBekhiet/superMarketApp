import { create as createAxios } from 'axios';
import { env } from '@/lib/env';
import { mobileMockAdapter } from '@/services/mock/adapter';

let tokenGetter: () => string | null = () => null;

export function setMobileAuthTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

export const apiClient = createAxios({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
  adapter: env.useMocks ? mobileMockAdapter : undefined,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
