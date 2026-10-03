import { useEffect, useState } from 'react';
import type { MatchLevel } from '../types/ats';
import { MATCH_LEVEL_LABEL } from '../utils/atsAnalyzer';

const SIZE = 176;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION_MS = 1000;

function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

interface MatchDonutProps {
  score: number;
  level: MatchLevel;
  loading?: boolean;
}

export function MatchDonut({ score, level, loading = false }: MatchDonutProps) {
  const [progress, setProgress] = useState(0);
  const displayed = useCountUp(loading ? 0 : score, DURATION_MS);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      return;
    }
    // Atraso mínimo para o navegador pintar o anel vazio antes da transição.
    const timer = window.setTimeout(() => setProgress(score), 40);
    return () => window.clearTimeout(timer);
  }, [score, loading]);

  const center = SIZE / 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={loading ? 'Calculando compatibilidade' : `Compatibilidade de ${score}%: ${MATCH_LEVEL_LABEL[level]}`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle cx={center} cy={center} r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth={STROKE} />
        {loading ? (
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke="#0F141E"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * 0.22} ${CIRCUMFERENCE}`}
            className="animate-spin"
            style={{ transformOrigin: 'center', transformBox: 'fill-box', animationDuration: '1.1s' }}
          />
        ) : (
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke="#0F141E"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress / 100)}
            opacity={score === 0 ? 0 : 1}
            style={{ transition: `stroke-dashoffset ${DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` }}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
        {loading ? (
          <span className="animate-pulse text-sm font-medium text-muted">Analisando…</span>
        ) : (
          <>
            <span className="text-4xl font-bold tracking-tight text-ink tabular-nums">{displayed}%</span>
            <span className="mt-1 max-w-[110px] text-[11px] leading-tight font-medium text-muted">
              {MATCH_LEVEL_LABEL[level]}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
