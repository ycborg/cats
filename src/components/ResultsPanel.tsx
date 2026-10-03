import type { AnalysisResult, UiStatus } from '../types/ats';
import { AnalysisResults } from './AnalysisResults';
import { PeekingCat, SleepingCat } from './CatIllustrations';
import { MatchDonut } from './MatchDonut';

function IdleState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
      <SleepingCat className="h-20 w-40 text-ink/80" />
      <p className="mt-6 max-w-sm text-sm leading-relaxed text-body">
        Nenhuma análise em andamento. Cole a vaga e seu currículo para acordar o CATS.
      </p>
      <ol className="mt-6 grid w-full max-w-sm gap-2 text-left text-[13px] text-muted">
        {['Cole a descrição completa da vaga.', 'Cole o texto do seu currículo atual.', 'Clique em “Analisar compatibilidade”.'].map(
          (step, index) => (
            <li key={step} className="flex items-center gap-3 rounded-lg bg-canvas px-3 py-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                {index + 1}
              </span>
              {step}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="pt-10" aria-busy="true" aria-live="polite">
      <div className="relative rounded-2xl border border-line bg-white px-6 pt-10 pb-8">
        {/* O gato surge de trás da borda superior do painel. */}
        <div className="absolute top-0 left-1/2 h-11 w-24 -translate-x-1/2 -translate-y-full overflow-hidden">
          <PeekingCat className="h-11 w-24 animate-cat-peek text-ink" />
        </div>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <MatchDonut score={0} level="low" loading />
          <div className="w-full flex-1 space-y-3">
            <div className="h-3 w-2/5 animate-pulse rounded bg-line" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-line" />
            <div className="flex flex-wrap gap-2 pt-2">
              {[56, 72, 48, 88, 64, 52].map((width, index) => (
                <span key={index} className="h-6 animate-pulse rounded-full bg-line" style={{ width }} />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">Lendo a vaga, removendo stopwords e cruzando termos…</p>
      </div>
    </div>
  );
}

interface ResultsPanelProps {
  status: UiStatus;
  result: AnalysisResult | null;
  runId: number;
}

export function ResultsPanel({ status, result, runId }: ResultsPanelProps) {
  return (
    <section aria-labelledby="results-title" className="flex flex-col gap-5">
      <div className="print:hidden">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">Etapa 2</p>
        <h2 id="results-title" className="text-xl font-semibold text-ink">
          Diagnóstico ATS
        </h2>
      </div>

      {status === 'idle' && <IdleState />}
      {status === 'loading' && <LoadingState />}
      {status === 'success' && result && <AnalysisResults result={result} runId={runId} />}
    </section>
  );
}
