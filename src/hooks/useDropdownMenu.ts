import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

/** Margem mínima entre o menu e a borda da tela, em px. */
const VIEWPORT_GUTTER_PX = 16;

/**
 * Lógica comum dos menus em botão ("Carregar exemplo ▾", "Exportar ▾"): abrir/fechar, lado de
 * alinhamento, clique fora, foco no primeiro item e teclado (setas, Home, End, Esc, Tab).
 * `menuWidthPx` é a largura do menu, usada para decidir se ele cabe alinhado à direita do botão.
 */
export function useDropdownMenu(menuWidthPx: number) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<'left' | 'right'>('right');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  /**
   * Abre para o lado que cabe na tela, medindo onde o botão está (e não pela largura da tela):
   * alinhado pela direita do botão quando há espaço à esquerda; senão, pela esquerda. No celular o
   * botão pode quebrar para o início da linha e o menu sumiria pela borda esquerda.
   */
  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(menuWidthPx, window.innerWidth - 2 * VIEWPORT_GUTTER_PX);
      setAlign(rect.right - width >= VIEWPORT_GUTTER_PX ? 'right' : 'left');
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const handlePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close();
        break;
    }
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault();
      openMenu();
    }
  };

  const setItemRef = (index: number) => (element: HTMLButtonElement | null) => {
    itemRefs.current[index] = element;
  };

  return {
    open,
    align,
    menuId,
    containerRef,
    buttonRef,
    setItemRef,
    close,
    toggle: () => (open ? close() : openMenu()),
    onButtonKeyDown,
    onMenuKeyDown,
  };
}
