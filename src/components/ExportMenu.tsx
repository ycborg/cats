import type { LucideIcon } from 'lucide-react';
import { ChevronDown, FileDown, FileText, FileType, LoaderCircle } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { buttonStyles } from './buttonStyles';

export type ExportFormat = 'pdf' | 'docx' | 'txt';

const OPTIONS: Array<{ format: ExportFormat; label: string; hint: string; icon: LucideIcon }> = [
  { format: 'pdf', label: 'PDF', hint: 'Imprimir ou salvar como PDF', icon: FileDown },
  { format: 'docx', label: 'Word (.docx)', hint: 'Editável no Word ou Google Docs', icon: FileType },
  { format: 'txt', label: 'Texto (.txt)', hint: 'Para colar em formulários de vaga', icon: FileText },
];

/** Largura do menu (w-72) e margem mínima até a borda da tela, em px. */
const MENU_WIDTH = 288;
const VIEWPORT_MARGIN = 16;

interface ExportMenuProps {
  busy: boolean;
  onExport: (format: ExportFormat) => void;
}

/** Botão "Exportar ▾": abre as opções de formato (PDF, Word, texto). */
export function ExportMenu({ busy, onExport }: ExportMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  // Abre para a esquerda (alinhado à direita do botão) quando há espaço; senão, para a direita.
  // No celular o botão quebra para o início da linha e o menu sumiria pela borda esquerda.
  const [alignRight, setAlignRight] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    setAlignRight(!rect || rect.right - MENU_WIDTH >= VIEWPORT_MARGIN);
    setOpen(true);
  };

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
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

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusAt(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            openMenu();
          }
        }}
        disabled={busy}
        aria-busy={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={`${buttonStyles.primaryCompact} min-w-[140px]`}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FileDown className="size-4" aria-hidden="true" />}
        {busy ? 'Exportando…' : 'Exportar'}
        {!busy && (
          <ChevronDown className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Formatos de exportação"
          onKeyDown={handleMenuKeyDown}
          className={`absolute top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-fade-up ${alignRight ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,20,30,0.28)]`}
        >
          {OPTIONS.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={option.format}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(true);
                  onExport(option.format);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 outline-none hover:bg-canvas focus-visible:bg-canvas focus-visible:ring-2 focus-visible:ring-ink/15"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{option.label}</span>
                  <span className="block text-xs leading-snug text-muted">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
