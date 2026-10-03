import { Target } from 'lucide-react';
import type { RefObject } from 'react';
import { useLayoutEffect } from 'react';
import type { AnalysisResult, MatchLevel } from '../types/ats';
import { MATCH_LEVEL_LABEL } from '../utils/atsAnalyzer';
import { SittingCat } from './CatIllustrations';
import { MatchDonut } from './MatchDonut';
import { SubScoreList } from './SubScoreList';

const LEVEL_COPY: Record<MatchLevel, string> = {
  low: 'Seu currículo cobre poucos termos-chave desta vaga. Revise os termos ausentes que você realmente domina.',
  medium: 'Boa base. Alguns termos importantes da vaga ainda não aparecem no seu currículo.',
  strong: 'Seu currículo está bem alinhado aos termos-chave desta vaga.',
};

const LEVEL_BADGE: Record<Exclude<MatchLevel, 'strong'>, { label: string; className: string }> = {
  low: { label: 'Baixa Aderência ATS', className: 'border-missing-border bg-missing-bg text-missing-text' },
  medium: { label: 'Aderência Moderada ATS', className: 'border-amber-200 bg-amber-50 text-amber-800' },
};

function LevelBadge({ level, compact = false }: { level: MatchLevel; compact?: boolean }) {
  if (level === 'strong') {
    return (
      <span className="inline-flex items-end gap-2">
        <SittingCat className={compact ? 'h-7 w-6 text-ink' : 'h-11 w-9 text-ink'} />
        <span className="mb-0.5 rounded-full bg-ink px-3 py-1 text-xs font-semibold whitespace-nowrap text-white">
          Excelente Aderência ATS
        </span>
      </span>
    );
  }
  const badge = LEVEL_BADGE[level];
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${badge.className}`}>
      {badge.label}
    </span>
  );
}

const MINI_SIZE = 40;
const MINI_STROKE = 5;
const MINI_RADIUS = (MINI_SIZE - MINI_STROKE) / 2;
const MINI_CIRCUMFERENCE = 2 * Math.PI * MINI_RADIUS;

/** Donut estático da versão compacta (sem reanimar a cada rolagem). */
function MiniDonut({ score }: { score: number }) {
  const center = MINI_SIZE / 2;
  return (
    <svg width={MINI_SIZE} height={MINI_SIZE} viewBox={`0 0 ${MINI_SIZE} ${MINI_SIZE}`} className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx={center} cy={center} r={MINI_RADIUS} fill="none" stroke="#E2E8F0" strokeWidth={MINI_STROKE} />
      <circle
        cx={center}
        cy={center}
        r={MINI_RADIUS}
        fill="none"
        stroke="#0F141E"
        strokeWidth={MINI_STROKE}
        strokeLinecap="round"
        strokeDasharray={MINI_CIRCUMFERENCE}
        strokeDashoffset={MINI_CIRCUMFERENCE * (1 - score / 100)}
        opacity={score === 0 ? 0 : 1}
      />
    </svg>
  );
}

/** Progresso p ∈ [0, 1]: 0 = card completo, 1 = faixa compacta. */
export const progressVar = 'var(--collapse, 0)';

/**
 * Distância de rolagem do encolhimento = diferença de altura entre o card completo e o compacto.
 * Como o espaço liberado é devolvido ao fluxo por margem no cabeçalho fixo, o conteúdo abaixo
 * acompanha a rolagem 1:1, sempre colado à base do cabeçalho.
 */
export function getCollapseDistance(root: HTMLElement): number {
  const style = getComputedStyle(root);
  return parseFloat(style.getPropertyValue('--full-h')) - parseFloat(style.getPropertyValue('--compact-h')) || 0;
}

/**
 * Liga o encolhimento do card à posição de rolagem. Atualiza apenas variáveis CSS
 * (no cabeçalho fixo `root`) a cada quadro, sem re-render do React.
 * Deve ser chamado no componente que renderiza `root`: o efeito de um filho roda antes
 * de a ref do pai ser conectada.
 */
export function useScrollCollapse(
  sentinelRef: RefObject<HTMLElement | null>,
  rootRef: RefObject<HTMLElement | null>,
  fullRef: RefObject<HTMLElement | null>,
  compactRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const full = fullRef.current;
    const compact = compactRef.current;
    if (!root || !full || !compact) return;

    let distance = 1;
    let lastCollapsed: boolean | null = null;
    const update = () => {
      const sentinelTop = sentinelRef.current?.getBoundingClientRect().top ?? 0;
      const progress = Math.min(1, Math.max(0, -sentinelTop / distance));
      root.style.setProperty('--collapse', progress.toFixed(4));

      // Só a camada predominante fica acessível/clicável.
      const collapsed = progress > 0.5;
      if (collapsed !== lastCollapsed) {
        lastCollapsed = collapsed;
        full.inert = collapsed;
        compact.inert = !collapsed;
      }
    };

    const measure = () => {
      distance = Math.max(1, full.offsetHeight - compact.offsetHeight);
      root.style.setProperty('--full-h', `${full.offsetHeight}px`);
      root.style.setProperty('--compact-h', `${compact.offsetHeight}px`);
      update();
    };

    let frame = 0;
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          update();
        });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(full);
    observer.observe(compact);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [sentinelRef, rootRef, fullRef, compactRef]);
}

interface ScoreHeaderProps {
  result: AnalysisResult;
  /** Camadas medidas por `useScrollCollapse` (chamado no componente pai). */
  fullRef: RefObject<HTMLDivElement | null>;
  compactRef: RefObject<HTMLDivElement | null>;
}

export function ScoreHeader({ result, fullRef, compactRef }: ScoreHeaderProps) {
  const total = result.found.length + result.missing.length;

  return (
    <div
      className="relative animate-fade-up overflow-hidden rounded-2xl border border-line bg-white shadow-[0_4px_16px_-10px_rgba(15,20,30,0.18)]"
      style={{
        // Altura interpolada entre o card completo e a faixa compacta.
        height: `calc(var(--full-h, 0px) - (var(--full-h, 0px) - var(--compact-h, 0px)) * ${progressVar})`,
      }}
    >
      {/* Camada completa: some e encolhe levemente na primeira metade do trajeto. */}
      <section
        ref={fullRef}
        className="absolute inset-x-0 top-0 p-5 sm:p-6"
        style={{
          opacity: `calc(1 - ${progressVar} * 1.8)`,
          transform: `scale(calc(1 - ${progressVar} * 0.06))`,
          transformOrigin: 'top center',
        }}
      >
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
          <Target className="size-4" aria-hidden="true" />
          Match Score
        </h3>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <MatchDonut score={result.score} level={result.level} />
          <div className="flex-1 text-center sm:text-left">
            <LevelBadge level={result.level} />
            <p className="mt-3 text-sm leading-relaxed text-body">{LEVEL_COPY[result.level]}</p>
            <p className="mt-2 text-xs text-muted">
              Score composto: palavras-chave, título do cargo, experiência, formação e legibilidade.{' '}
              <strong className="font-semibold text-ink tabular-nums">{result.found.length}</strong> de{' '}
              <strong className="font-semibold text-ink tabular-nums">{total}</strong> termos-chave encontrados.
            </p>
          </div>
        </div>
        <SubScoreList subScores={result.subScores} />
      </section>

      {/* Camada compacta: surge na segunda metade do trajeto. */}
      <div
        ref={compactRef}
        className="absolute inset-x-0 top-0 flex items-center gap-3 px-4 py-2.5"
        style={{
          opacity: `calc((${progressVar} - 0.4) / 0.6)`,
          transform: `translateY(calc((1 - ${progressVar}) * 12px))`,
        }}
        aria-label={`Match Score: ${result.score}%, ${MATCH_LEVEL_LABEL[result.level]}`}
      >
        <MiniDonut score={result.score} />
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-ink tabular-nums">{result.score}%</span>
            <span className="truncate text-sm font-medium text-body">{MATCH_LEVEL_LABEL[result.level]}</span>
          </p>
          <p className="text-xs text-muted tabular-nums">
            {result.found.length} de {total} termos-chave encontrados
          </p>
        </div>
        <span className="ml-auto hidden 2xl:inline-flex">
          <LevelBadge level={result.level} compact />
        </span>
      </div>
    </div>
  );
}
