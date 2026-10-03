import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

interface FitOptions {
  /** Distância do topo da tela em que o elemento fica fixo (deve bater com o `top` do sticky). */
  stickyTop: number;
  /** Respiro entre o elemento e a borda inferior da tela. */
  bottomGap: number;
  /** Altura mínima, para telas pequenas não espremerem o conteúdo. */
  minHeight: number;
}

/**
 * Calcula a altura que faz um elemento sticky caber exatamente na tela.
 * Antes de "grudar", o elemento está mais abaixo (após o header), então a altura
 * cresce conforme a página rola até ele atingir `stickyTop`.
 */
export function useViewportFitHeight(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  { stickyTop, bottomGap, minHeight }: FitOptions,
): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      setHeight(undefined);
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const top = Math.max(element.getBoundingClientRect().top, stickyTop);
      const next = Math.max(minHeight, Math.round(window.innerHeight - top - bottomGap));
      setHeight((current) => (current === next ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref, enabled, stickyTop, bottomGap, minHeight]);

  return height;
}
