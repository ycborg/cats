import { CircleCheck, CircleX, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ToastTone = 'success' | 'info' | 'error';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast | null>(null);

const TOAST_MS = 2800;

const TONE_ICON = { success: CircleCheck, info: Info, error: CircleX } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback<ShowToast>((message, tone = 'success') => {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message, tone }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const Icon = toast ? TONE_ICON[toast.tone] : null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/*
        O aviso é só informativo: não captura cliques (pointer-events-none), então nunca bloqueia o
        botão que estiver por baixo. No desktop fica no canto direito, longe da coluna de entrada.
      */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center lg:inset-x-auto lg:right-6 print:hidden"
      >
        {toast && Icon && (
          <div
            key={toast.id}
            className={`flex w-max max-w-full animate-fade-up items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.tone === 'error' ? 'bg-missing-text text-white' : 'bg-ink text-white'
            }`}
          >
            <Icon className={`size-4 shrink-0 ${toast.tone === 'success' ? 'text-found-border' : ''}`} aria-hidden="true" />
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return context;
}
