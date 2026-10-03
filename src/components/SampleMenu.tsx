import type { LucideIcon } from 'lucide-react';
import {
  Check,
  ChevronDown,
  Code,
  FileText,
  GraduationCap,
  HardHat,
  Landmark,
  Palette,
  Scale,
  Stethoscope,
  Users,
} from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import type { SampleId } from '../utils/sampleData';
import { SAMPLES } from '../utils/sampleData';
import { buttonStyles } from './buttonStyles';

const SAMPLE_ICONS: Record<SampleId, LucideIcon> = {
  tech: Code,
  finance: Landmark,
  hr: Users,
  health: Stethoscope,
  legal: Scale,
  engineering: HardHat,
  education: GraduationCap,
  design: Palette,
};

/** Largura do menu (w-[19rem]) e margem mínima até a borda da tela. */
const MENU_WIDTH_PX = 304;
const VIEWPORT_GUTTER_PX = 16;

interface SampleMenuProps {
  disabled: boolean;
  /** Feedback temporário após carregar um exemplo. */
  loaded: boolean;
  onSelect: (id: SampleId) => void;
}

/** Botão "Carregar exemplo ▾": abre a lista de áreas; escolher uma preenche vaga e currículo. */
export function SampleMenu({ disabled, loaded, onSelect }: SampleMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [align, setAlign] = useState<'left' | 'right'>('right');

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  /**
   * Abre para o lado que cabe na tela, medindo onde o botão está (e não pela largura da tela):
   * alinhado pela direita do botão quando há espaço à esquerda; senão, pela esquerda.
   */
  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = Math.min(MENU_WIDTH_PX, window.innerWidth - 2 * VIEWPORT_GUTTER_PX);
      setAlign(rect.right - menuWidth >= VIEWPORT_GUTTER_PX ? 'right' : 'left');
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

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  const choose = (id: SampleId) => {
    close(true);
    onSelect(id);
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
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={`${buttonStyles.secondary} min-w-[184px] ${loaded ? buttonStyles.success : ''}`}
      >
        {loaded ? <Check className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
        {loaded ? 'Exemplo carregado' : 'Carregar exemplo'}
        {!loaded && (
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Exemplos por área"
          onKeyDown={handleMenuKeyDown}
          className={`absolute top-full z-30 mt-2 flex w-[19rem] max-w-[calc(100vw-2rem)] animate-fade-up flex-col rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,20,30,0.28)] ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          }`}
        >
          <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Escolha uma área</p>
          {/* Só a lista rola: cabeçalho e rodapé ficam fixos, mesmo com muitas áreas. */}
          <div className="max-h-[min(19rem,50vh)] overflow-y-auto overscroll-contain pr-0.5">
            {SAMPLES.map((sample, index) => {
              const Icon = SAMPLE_ICONS[sample.id];
              return (
                <button
                  key={sample.id}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => choose(sample.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 outline-none hover:bg-canvas focus-visible:bg-canvas focus-visible:ring-2 focus-visible:ring-ink/15"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{sample.area}</span>
                    <span className="block truncate text-xs text-muted">{sample.role}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 border-t border-line px-3 pt-2 pb-1 text-[11px] text-muted">
            Vagas e currículos fictícios, criados para demonstração.
          </p>
        </div>
      )}
    </div>
  );
}
