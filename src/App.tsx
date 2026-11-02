import { useCallback, useEffect, useRef, useState } from 'react';
import { BackgroundTexture } from './components/BackgroundTexture';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { ResultsPanel } from './components/ResultsPanel';
import { useToast } from './components/Toast';
import { STICKY_LAYOUT_QUERY, TWO_COLUMN_QUERY, useMediaQuery } from './hooks/useMediaQuery';
import { usePreventFileDrop } from './hooks/usePreventFileDrop';
import { useSheetBridgeProvider } from './hooks/useSheetBridge';
import { useTransientFlag } from './hooks/useTransientFlag';
import { useViewportFitHeight } from './hooks/useViewportFitHeight';
import type { AnalysisResult, UiStatus } from './types/ats';
import { MATCH_LEVEL_LABEL, analyzeResume } from './utils/atsAnalyzer';
import type { SampleId } from './utils/sampleData';
import { SAMPLES } from './utils/sampleData';
import { loadDraft, saveDraft } from './utils/draftStorage';
import type { ImportedResume } from './utils/fileImport';
import { isFromImportedFile } from './utils/fileImport';

/** A análise é instantânea; o atraso existe só para o feedback visual do estado de carregamento. */
const ANALYSIS_DELAY_MS = 1100;
const DRAFT_SAVE_DELAY_MS = 400;
/** Deve bater com `top-6` da coluna fixa. */
const STICKY_TOP_PX = 24;

export default function App() {
  // O rascunho salvo no navegador é lido uma única vez, ao abrir a página.
  const [initialDraft] = useState(loadDraft);
  const [jobText, setJobText] = useState(initialDraft.jobText);
  const [resumeText, setResumeText] = useState(initialDraft.resumeText);
  const [importedResume, setImportedResume] = useState<ImportedResume | null>(initialDraft.importedResume);
  const [status, setStatus] = useState<UiStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [runId, setRunId] = useState(0);
  // Textos usados na última análise: se mudarem depois, o resultado na tela está desatualizado.
  const [analyzedWith, setAnalyzedWith] = useState<{ job: string; resume: string } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const resultsRef = useRef<HTMLDivElement>(null);
  const showToast = useToast();
  const inputColumnRef = useRef<HTMLDivElement>(null);
  const isStickyLayout = useMediaQuery(STICKY_LAYOUT_QUERY);
  const isTwoColumns = useMediaQuery(TWO_COLUMN_QUERY);
  const inputColumnHeight = useViewportFitHeight(inputColumnRef, isStickyLayout, {
    stickyTop: STICKY_TOP_PX,
    bottomGap: STICKY_TOP_PX,
    minHeight: 480,
  });
  const [sampleLoaded, flashSampleLoaded] = useTransientFlag(2200);
  const [analysisDone, flashAnalysisDone] = useTransientFlag(2200);
  const { bridge, Provider: SheetBridgeProvider } = useSheetBridgeProvider();

  // Valores atuais para as ações de toast ("Desfazer", "Analisar mesmo assim"): o aviso fica vários
  // segundos na tela, e a ação precisa agir com o estado do momento do clique, não do aviso.
  const latest = useRef({ jobText, resumeText, importedResume, status, result, analyzedWith });
  useEffect(() => {
    latest.current = { jobText, resumeText, importedResume, status, result, analyzedWith };
  });

  const stale =
    status === 'success' && analyzedWith !== null && (analyzedWith.job !== jobText || analyzedWith.resume !== resumeText);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // Soltar arquivo fora do card do currículo não pode abrir o arquivo e tirar a pessoa do app.
  usePreventFileDrop(() => showToast('Solte o arquivo no campo do currículo.', 'info'));

  // Folha editada e ainda não exportada: o navegador pergunta antes de fechar ou recarregar a aba.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!bridge.hasUnsavedEdits()) return;
      event.preventDefault();
      // Navegadores mais antigos só mostram o aviso se `returnValue` estiver preenchido.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [bridge]);

  // Guarda o rascunho no navegador (com pequena espera, para não gravar a cada tecla).
  useEffect(() => {
    const timer = window.setTimeout(() => saveDraft({ jobText, resumeText, importedResume }), DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [jobText, resumeText, importedResume]);

  const runAnalysis = useCallback(() => {
    // Usa o texto do momento em que a análise começa (clique, ou confirmação no toast).
    const { jobText: job, resumeText: resume, importedResume: imported } = latest.current;
    window.clearTimeout(timerRef.current);
    setStatus('loading');
    if (!isTwoColumns) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    timerRef.current = window.setTimeout(() => {
      // O layout do arquivo só vale enquanto o texto do campo ainda for o que veio dele.
      const fromFile = imported && isFromImportedFile(imported, resume) ? imported : null;
      const analysis = analyzeResume(job, resume, { fileLayout: fromFile });
      setResult(analysis);
      setAnalyzedWith({ job, resume });
      setRunId((id) => id + 1);
      setStatus('success');
      flashAnalysisDone();
      showToast(`Análise concluída: ${analysis.score}% · ${MATCH_LEVEL_LABEL[analysis.level]}.`);
    }, ANALYSIS_DELAY_MS);
  }, [isTwoColumns, flashAnalysisDone, showToast]);

  /**
   * Reanalisar desmonta a folha do currículo e joga fora as edições feitas nela. Com edição ainda
   * não exportada, pede confirmação por toast com ação (o projeto evita `window.confirm`): sem o
   * clique, nada acontece e o trabalho continua na tela.
   */
  const handleAnalyze = useCallback(() => {
    if (bridge.hasUnsavedEdits()) {
      showToast('Você editou o currículo e ainda não exportou. Analisar de novo descarta as edições.', 'info', {
        label: 'Analisar mesmo assim',
        onClick: runAnalysis,
      });
      return;
    }
    runAnalysis();
  }, [bridge, runAnalysis, showToast]);

  const handleLoadSample = useCallback(
    (id: SampleId) => {
      const sample = SAMPLES.find((item) => item.id === id);
      if (!sample) return;
      const previous = latest.current;
      const hadText = previous.jobText.trim() !== '' || previous.resumeText.trim() !== '';
      setJobText(sample.job);
      setResumeText(sample.resume);
      setImportedResume(null);
      flashSampleLoaded();
      showToast(
        `Exemplo de ${sample.area} carregado. Agora clique em "Analisar compatibilidade".`,
        'info',
        hadText
          ? {
              label: 'Desfazer',
              onClick: () => {
                setJobText(previous.jobText);
                setResumeText(previous.resumeText);
                setImportedResume(previous.importedResume);
              },
            }
          : undefined,
      );
    },
    [flashSampleLoaded, showToast],
  );

  const handleClear = useCallback(() => {
    const previous = latest.current;
    // Folha editada à mão (se houver) também volta no "Desfazer".
    const editedSheetHtml = bridge.readEditedHtml();
    window.clearTimeout(timerRef.current);
    setJobText('');
    setResumeText('');
    setImportedResume(null);
    setResult(null);
    setAnalyzedWith(null);
    setStatus('idle');
    showToast('Campos limpos. Pronto para uma nova análise.', 'info', {
      label: 'Desfazer',
      onClick: () => {
        bridge.setPendingHtml(editedSheetHtml);
        setJobText(previous.jobText);
        setResumeText(previous.resumeText);
        setImportedResume(previous.importedResume);
        setResult(previous.result);
        setAnalyzedWith(previous.analyzedWith);
        setStatus(previous.status);
      },
    });
  }, [bridge, showToast]);

  return (
    <SheetBridgeProvider>
      <div className="relative isolate flex min-h-screen flex-col">
        <BackgroundTexture />
        <Header />

        <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-10 print:block print:p-0">
          <div className="min-w-0 print:hidden">
            {/* Coluna fixa: ocupa exatamente a altura da tela enquanto o diagnóstico rola ao lado. */}
            <div
              ref={inputColumnRef}
              style={isStickyLayout ? { height: inputColumnHeight } : undefined}
              className={isStickyLayout ? 'sticky top-6' : undefined}
            >
              <InputSection
                jobText={jobText}
                resumeText={resumeText}
                isAnalyzing={status === 'loading'}
                sampleLoaded={sampleLoaded}
                analysisDone={analysisDone && !stale}
                stale={stale}
                fitted={isStickyLayout}
                autoGrow={!isTwoColumns}
                onJobChange={setJobText}
                onResumeChange={setResumeText}
                onResumeImported={setImportedResume}
                onLoadSample={handleLoadSample}
                onClear={handleClear}
                onAnalyze={handleAnalyze}
              />
            </div>
          </div>

          <div ref={resultsRef} className="min-w-0 scroll-mt-6">
            <ResultsPanel status={status} result={result} runId={runId} />
          </div>
        </main>

        <Footer />
      </div>
    </SheetBridgeProvider>
  );
}
