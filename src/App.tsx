import { useCallback, useEffect, useRef, useState } from 'react';
import { BackgroundTexture } from './components/BackgroundTexture';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { ResultsPanel } from './components/ResultsPanel';
import { useToast } from './components/Toast';
import { STICKY_LAYOUT_QUERY, useMediaQuery } from './hooks/useMediaQuery';
import { useTransientFlag } from './hooks/useTransientFlag';
import { useViewportFitHeight } from './hooks/useViewportFitHeight';
import type { AnalysisResult, UiStatus } from './types/ats';
import { MATCH_LEVEL_LABEL, analyzeResume } from './utils/atsAnalyzer';
import type { SampleId } from './utils/sampleData';
import { SAMPLES } from './utils/sampleData';

/** A análise é instantânea; o atraso existe só para o feedback visual do estado de carregamento. */
const ANALYSIS_DELAY_MS = 1100;
const DESKTOP_BREAKPOINT = 1024;
/** Deve bater com `top-6` da coluna fixa. */
const STICKY_TOP_PX = 24;

export default function App() {
  const [jobText, setJobText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [status, setStatus] = useState<UiStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [runId, setRunId] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);
  const resultsRef = useRef<HTMLDivElement>(null);
  const showToast = useToast();
  const inputColumnRef = useRef<HTMLDivElement>(null);
  const isStickyLayout = useMediaQuery(STICKY_LAYOUT_QUERY);
  const inputColumnHeight = useViewportFitHeight(inputColumnRef, isStickyLayout, {
    stickyTop: STICKY_TOP_PX,
    bottomGap: STICKY_TOP_PX,
    minHeight: 560,
  });
  const [sampleLoaded, flashSampleLoaded] = useTransientFlag(2200);
  const [analysisDone, flashAnalysisDone] = useTransientFlag(2200);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleAnalyze = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setStatus('loading');
    if (window.innerWidth < DESKTOP_BREAKPOINT) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    timerRef.current = window.setTimeout(() => {
      const analysis = analyzeResume(jobText, resumeText);
      setResult(analysis);
      setRunId((id) => id + 1);
      setStatus('success');
      flashAnalysisDone();
      showToast(`Análise concluída: ${analysis.score}% · ${MATCH_LEVEL_LABEL[analysis.level]}.`);
    }, ANALYSIS_DELAY_MS);
  }, [jobText, resumeText, flashAnalysisDone, showToast]);

  const handleLoadSample = useCallback(
    (id: SampleId) => {
      const sample = SAMPLES.find((item) => item.id === id);
      if (!sample) return;
      setJobText(sample.job);
      setResumeText(sample.resume);
      flashSampleLoaded();
      showToast(`Exemplo de ${sample.area} carregado. Agora clique em "Analisar compatibilidade".`, 'info');
    },
    [flashSampleLoaded, showToast],
  );

  const handleClear = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setJobText('');
    setResumeText('');
    setResult(null);
    setStatus('idle');
    showToast('Campos limpos. Pronto para uma nova análise.', 'info');
  }, [showToast]);

  return (
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
              analysisDone={analysisDone}
              fitted={isStickyLayout}
              onJobChange={setJobText}
              onResumeChange={setResumeText}
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
  );
}
