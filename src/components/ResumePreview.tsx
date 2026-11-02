import { Check, Copy, PencilLine, RotateCcw } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { sanitizeSheetHtml, useSheetBridge } from '../hooks/useSheetBridge';
import { useTransientFlag } from '../hooks/useTransientFlag';
import type { AtsResume, ResumeLine } from '../types/ats';
import { copyToClipboard } from '../utils/clipboard';
import { serializeResume } from '../utils/resumeSheet';
import { buildResumeDocx, buildResumeText, downloadBlob, resumeFileName } from '../utils/resumeExport';
import { buttonStyles } from './buttonStyles';
import type { ExportFormat } from './ExportMenu';
import { ExportMenu } from './ExportMenu';
import { useToast } from './Toast';

type LineGroup = { kind: 'bullets'; items: ResumeLine[] } | { kind: 'single'; line: ResumeLine };

/** Agrupa bullets consecutivos em uma única lista. */
function groupLines(lines: ResumeLine[]): LineGroup[] {
  const groups: LineGroup[] = [];
  for (const line of lines) {
    const last = groups[groups.length - 1];
    if (line.kind === 'bullet' && last?.kind === 'bullets') last.items.push(line);
    else if (line.kind === 'bullet') groups.push({ kind: 'bullets', items: [line] });
    else groups.push({ kind: 'single', line });
  }
  return groups;
}

const ResumeSheet = memo(function ResumeSheet({ resume }: { resume: AtsResume }) {
  return (
    <>
      <header className="text-center">
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-ink">{resume.name}</h1>
        {resume.headline && <p className="mt-1 text-[13.5px] font-medium text-body">{resume.headline}</p>}
        {resume.contacts.length > 0 && (
          <p className="mt-1.5 text-[12.5px] text-muted">{resume.contacts.join(' | ')}</p>
        )}
      </header>

      {resume.sections.map((section) => (
        <section key={section.id} className="mt-5">
          <h2 className="border-b border-line pb-1 text-[12.5px] font-bold tracking-[0.08em] text-ink">{section.title}</h2>
          <div className="mt-2 space-y-1.5">
            {groupLines(section.lines).map((group, index) =>
              group.kind === 'bullets' ? (
                <ul key={index} className="list-disc space-y-1 pl-5 marker:text-muted">
                  {group.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-[13px] leading-relaxed text-body">
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : group.line.kind === 'subheading' ? (
                <h3 key={index} className="pt-1.5 text-[13px] font-semibold text-ink first:pt-0">
                  {group.line.text}
                </h3>
              ) : (
                <p key={index} className="text-[13px] leading-relaxed text-body">
                  {group.line.text}
                </p>
              ),
            )}
          </div>
        </section>
      ))}
    </>
  );
});

/** Tempo para o estado "Abrindo…" ser pintado antes do diálogo de impressão bloquear a página. */
const PRINT_DELAY_MS = 350;

/** Nome que o gerador coloca quando não acha o nome da pessoa no texto (resumeBuilder). */
const PLACEHOLDER_NAME = 'Seu Nome Completo';

/** Seleciona o nome na folha: já fica pronto para digitar por cima. */
function selectSheetName(sheet: HTMLElement) {
  const heading = sheet.querySelector('h1');
  const selection = window.getSelection();
  if (!heading || !selection) return;
  heading.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  sheet.focus({ preventScroll: true });
  selection.selectAllChildren(heading);
}

const sheetText = (sheet: HTMLElement) => (sheet.textContent ?? '').replace(/\s+/g, ' ').trim();

function ResumePreviewComponent({ resume }: { resume: AtsResume }) {
  const sheetRef = useRef<HTMLElement>(null);
  const showToast = useToast();
  const bridge = useSheetBridge();
  // Folha devolvida por "Desfazer" (limpar campos): reaplica o HTML editado em vez do gerado.
  const [restoredHtml, setRestoredHtml] = useState(() => {
    const html = bridge?.peekPendingHtml();
    return html ? sanitizeSheetHtml(html) : null;
  });
  const [version, setVersion] = useState(0);
  const [isEdited, setIsEditedState] = useState(restoredHtml !== null);
  // Espelho de `isEdited` para a ponte ler fora do ciclo de renderização.
  const editedRef = useRef(restoredHtml !== null);
  const setIsEdited = (value: boolean) => {
    editedRef.current = value;
    setIsEditedState(value);
  };
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, flashCopied] = useTransientFlag();
  const [restored, flashRestored] = useTransientFlag();

  useEffect(() => {
    const reset = () => setIsPrinting(false);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  // Avisa o App enquanto há edição que ainda não foi copiada nem exportada (ver useSheetBridge).
  const markUnsaved = (value: boolean) => bridge?.setUnsavedEdits(value);

  const restoredOnMount = useRef(restoredHtml !== null);
  useEffect(() => {
    if (!bridge) return;
    bridge.registerReader(() => (editedRef.current ? (sheetRef.current?.innerHTML ?? null) : null));
    // Folha reaplicada por "Desfazer": o texto editado continua sem exportar.
    if (restoredOnMount.current) {
      bridge.setPendingHtml(null);
      bridge.setUnsavedEdits(true);
    }
    return () => bridge.registerReader(null);
  }, [bridge]);

  const handleCopy = async () => {
    if (!sheetRef.current) return;
    if (!sheetText(sheetRef.current)) {
      showToast('A folha está vazia. Escreva algo ou clique em Restaurar.', 'error');
      return;
    }
    const ok = await copyToClipboard(serializeResume(sheetRef.current));
    if (ok) {
      markUnsaved(false);
      flashCopied();
      showToast('Currículo copiado para a área de transferência.');
    } else {
      showToast('Não foi possível copiar. Selecione o texto manualmente.', 'error');
    }
  };

  const handleRestore = () => {
    setVersion((current) => current + 1);
    setRestoredHtml(null);
    setIsEdited(false);
    markUnsaved(false);
    flashRestored();
    showToast('Edições descartadas. A versão gerada foi restaurada.', 'info');
  };

  const handlePrint = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    setIsPrinting(true);
    showToast('Abrindo impressão… escolha "Salvar como PDF" no destino.', 'info');
    window.setTimeout(() => {
      window.print();
      // Navegadores sem `afterprint` confiável: garante o retorno ao estado normal.
      window.setTimeout(() => setIsPrinting(false), 500);
    }, PRINT_DELAY_MS);
  };

  const handleExport = async (format: ExportFormat, ignorePlaceholder = false) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Folha apagada à mão: exportaria um arquivo vazio e diria que deu certo.
    if (!sheetText(sheet)) {
      showToast('A folha está vazia. Escreva algo ou clique em Restaurar.', 'error');
      return;
    }
    // Não bloqueia (a pessoa pode querer preencher o nome depois), mas pergunta: o nome vai no arquivo.
    const name = sheet.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim();
    if (!ignorePlaceholder && name === PLACEHOLDER_NAME) {
      selectSheetName(sheet);
      showToast(`O nome ainda é "${PLACEHOLDER_NAME}". Troque pelo seu antes de exportar.`, 'info', {
        label: 'Exportar assim mesmo',
        onClick: () => void handleExport(format, true),
      });
      return;
    }
    if (format === 'pdf') {
      markUnsaved(false);
      handlePrint();
      return;
    }
    setIsExporting(true);
    try {
      const blob = format === 'docx' ? await buildResumeDocx(sheet) : buildResumeText(sheet);
      downloadBlob(blob, resumeFileName(sheet, format));
      markUnsaved(false);
      showToast(format === 'docx' ? 'Currículo exportado em Word (.docx).' : 'Currículo exportado em texto (.txt).');
    } catch {
      showToast('Não foi possível gerar o arquivo. Tente novamente.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
          <PencilLine className="size-3.5" aria-hidden="true" />
          {isEdited ? (
            <span>
              <span className="mr-1.5 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">Editado</span>
              Suas alterações serão incluídas na cópia e na exportação.
            </span>
          ) : (
            'Clique no texto da folha para editar antes de exportar.'
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={!isEdited && !restored}
            className={`${buttonStyles.ghost} ${restored ? buttonStyles.success : ''}`}
            title={isEdited ? 'Descarta as edições manuais e restaura a versão gerada' : 'Nenhuma edição para restaurar'}
          >
            {restored ? <Check className="size-4" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}
            {restored ? 'Restaurado' : 'Restaurar'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={`${buttonStyles.secondary} min-w-[136px] ${copied ? buttonStyles.success : ''}`}
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? 'Copiado!' : 'Copiar texto'}
          </button>
          <ExportMenu busy={isPrinting || isExporting} onExport={handleExport} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-100 p-2 sm:p-5 lg:p-3 xl:p-5 print:bg-transparent print:p-0">
        <article
          key={version}
          id="resume-print-area"
          ref={sheetRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={() => {
            if (!isEdited) setIsEdited(true);
            markUnsaved(true);
          }}
          aria-label="Currículo ATS gerado (editável)"
          {...(restoredHtml !== null ? { dangerouslySetInnerHTML: { __html: restoredHtml } } : {})}
          className={`a4-sheet mx-auto rounded-sm border border-line bg-white px-6 py-8 shadow-[0_1px_3px_rgba(15,20,30,0.06),0_12px_32px_-12px_rgba(15,20,30,0.18)] transition duration-200 outline-none focus:ring-4 focus:ring-ink/10 sm:px-12 sm:py-12 lg:px-8 lg:py-10 xl:px-12 xl:py-12 ${
            version > 0 ? 'animate-sheet-flash' : ''
          }`}
        >
          {restoredHtml === null ? <ResumeSheet resume={resume} /> : undefined}
        </article>
      </div>
    </div>
  );
}

/** Memoizado: re-renderizações do App não devem sobrescrever edições feitas na folha. */
export const ResumePreview = memo(ResumePreviewComponent);
