import { create } from 'zustand';

interface ToastOptions {
  title?: string;
  kind?: 'toast' | 'notification';
}

interface ToastPayload {
  message: string;
  tone: 'success' | 'error';
  title?: string;
  kind: 'toast' | 'notification';
}

interface UiState {
  toast: ToastPayload | null;
  showToast: (message: string, tone?: 'success' | 'error', options?: ToastOptions) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  showToast: (message, tone = 'success', options) =>
    set({
      toast: {
        message,
        tone,
        title: options?.title,
        kind: options?.kind ?? (options?.title ? 'notification' : 'toast'),
      },
    }),
  clearToast: () => set({ toast: null }),
}));
