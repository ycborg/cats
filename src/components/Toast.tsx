import { CircleCheck, CircleX, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToastTone = 'success' | 'info' | 'error';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  /** Em saída: toca a animação de desaparecer antes de remover. */
  leaving: boolean;
}

type ShowToast = (message: string, tone?: ToastTone, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast | null>(null);

const TONE_ICON = { success: CircleCheck, info: Info, error: CircleX } as const;

/** Deve bater com a duração da animação "toast-out" em index.css. */
const EXIT_MS = 350;

/**
 * Tempo na tela proporcional ao tamanho da mensagem (≈ velocidade de leitura), com mínimos maiores
 * para erros e avisos com ação ("Desfazer"), e um teto para não ficar parado para sempre.
 */
function visibleDuration({ message, tone, action }: Pick<ToastState, 'message' | 'tone' | 'action'>): number {
  const reading = 2000 + message.length * 55;
  const minimum = tone === 'error' ? 7000 : action ? 6000 : 3500;
  return Math.min(12000, Math.max(minimum, reading));
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  const showToast = useCallback<ShowToast>((message, tone = 'success', action) => {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message, tone, action, leaving: false }));
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setToast((current) => (current ? { ...current, leaving: true } : current));
    timers.current.push(window.setTimeout(() => setToast(null), EXIT_MS));
  }, []);

  useEffect(() => {
    if (!toast || toast.leaving) return;
    clearTimers();
    timers.current.push(window.setTimeout(dismiss, visibleDuration(toast)));
    return clearTimers;
    // Reinicia só quando chega um aviso novo (id), não durante a saída.
  }, [toast?.id]);

  const Icon = toast ? TONE_ICON[toast.tone] : null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/*
        O aviso é só informativo: não captura cliques (pointer-events-none), então nunca bloqueia o
        botão que estiver por baixo. Só o botão de ação ("Desfazer") recebe cliques. No desktop o
        aviso fica no canto direito, longe da coluna de entrada.
      */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center lg:inset-x-auto lg:right-6 print:hidden"
      >
        {toast && Icon && (
          <div
            key={toast.id}
            className={`flex w-max max-w-full items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.leaving ? 'animate-toast-out' : 'animate-fade-up'
            } ${toast.tone === 'error' ? 'bg-missing-text text-white' : 'bg-ink text-white'}`}
          >
            <Icon className={`size-4 shrink-0 ${toast.tone === 'success' ? 'text-found-border' : ''}`} aria-hidden="true" />
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss();
                }}
                className="pointer-events-auto ml-1 shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-white underline underline-offset-2 transition-colors duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
              >
                {toast.action.label}
              </button>
            )}
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
