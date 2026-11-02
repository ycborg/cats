import type { LucideIcon } from 'lucide-react';
import { ChevronDown, FileDown, FileText, FileType, LoaderCircle } from 'lucide-react';
import { useDropdownMenu } from '../hooks/useDropdownMenu';
import { buttonStyles } from './buttonStyles';

export type ExportFormat = 'pdf' | 'docx' | 'txt';

const OPTIONS: Array<{ format: ExportFormat; label: string; hint: string; icon: LucideIcon }> = [
  { format: 'pdf', label: 'PDF', hint: 'Imprimir ou salvar como PDF', icon: FileDown },
  { format: 'docx', label: 'Word (.docx)', hint: 'Editável no Word ou Google Docs', icon: FileType },
  { format: 'txt', label: 'Texto (.txt)', hint: 'Para colar em formulários de vaga', icon: FileText },
];

/** Largura do menu (w-72), usada para decidir o lado de abertura. */
const MENU_WIDTH_PX = 288;

interface ExportMenuProps {
  busy: boolean;
  onExport: (format: ExportFormat) => void;
}

/** Botão "Exportar ▾": abre as opções de formato (PDF, Word, texto). */
export function ExportMenu({ busy, onExport }: ExportMenuProps) {
  const menu = useDropdownMenu(MENU_WIDTH_PX);
  const { close } = menu;

  return (
    <div ref={menu.containerRef} className="relative">
      <button
        ref={menu.buttonRef}
        type="button"
        onClick={menu.toggle}
        onKeyDown={menu.onButtonKeyDown}
        disabled={busy}
        aria-busy={busy}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menu.menuId}
        className={`${buttonStyles.primaryCompact} min-w-[140px]`}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FileDown className="size-4" aria-hidden="true" />}
        {busy ? 'Exportando…' : 'Exportar'}
        {!busy && (
          <ChevronDown className={`size-4 transition-transform duration-200 ${menu.open ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </button>

      {menu.open && (
        <div
          id={menu.menuId}
          role="menu"
          aria-label="Formatos de exportação"
          onKeyDown={menu.onMenuKeyDown}
          className={`absolute top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-fade-up ${menu.align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,20,30,0.28)]`}
        >
          {OPTIONS.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={option.format}
                ref={menu.setItemRef(index)}
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
