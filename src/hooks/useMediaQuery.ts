import { useCallback, useSyncExternalStore } from 'react';

/** Acompanha uma media query CSS e re-renderiza quando ela muda. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Layout em duas colunas (entrada | diagnóstico). Abaixo disso, tudo fica empilhado em uma coluna. */
export const TWO_COLUMN_QUERY = '(min-width: 1024px)';

/** Desktop com altura suficiente para a coluna de entrada ficar fixa sem ficar espremida. */
export const STICKY_LAYOUT_QUERY = '(min-width: 1024px) and (min-height: 700px)';
