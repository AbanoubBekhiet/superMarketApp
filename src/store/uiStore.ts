import { create } from 'zustand';

interface ToastPayload {
  message: string;
  tone: 'success' | 'error';
}

interface UiState {
  toast: ToastPayload | null;
  showToast: (message: string, tone?: 'success' | 'error') => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  showToast: (message, tone = 'success') => set({ toast: { message, tone } }),
  clearToast: () => set({ toast: null }),
}));
