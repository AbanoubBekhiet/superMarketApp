import { apiClient } from '@/services/api/client';
import type { AuthSession, UserRole } from '@/types/domain';

export interface LoginPayload {
  identifier: string;
  password: string;
  role?: UserRole;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  email: string;
  password: string;
  area: string;
}

export async function loginMobile(payload: LoginPayload): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>('/auth/login', payload);
  return data;
}

export async function registerMobile(payload: RegisterPayload): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>('/auth/register', payload);
  return data;
}
