import { ChevronDown } from 'lucide-react';
import type { SubScore } from '../types/ats';

export function SubScoreList({ subScores }: { subScores: SubScore[] }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <ul className="grid gap-2.5" aria-label="Notas por critério">
        {subScores.map((item) => {
          return (
            <li key={item.id} className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[9.5rem_1fr_3rem]">
              <span className="truncate font-medium text-body" title={item.summary}>
                {item.label}
              </span>
              {item.score === null ? (
                <span className="text-muted italic">Não exigida pela vaga</span>
              ) : (
                <span className="h-1.5 overflow-hidden rounded-full bg-line" title={item.summary}>
                  <span
                    className="block h-full origin-left animate-bar-grow rounded-full bg-ink"
                    style={{ width: `${item.score}%` }}
                  />
                </span>
              )}
              <span className={`text-right font-semibold tabular-nums ${item.score === null ? 'text-muted' : 'text-ink'}`}>
                {item.score === null ? '—' : item.score}
              </span>
            </li>
          );
        })}
      </ul>

      <details className="group mt-3 text-xs text-muted">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded font-medium text-body transition-colors duration-200 select-none hover:text-ink focus-visible:ring-4 focus-visible:ring-ink/15 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          Como calculamos
          <ChevronDown className="size-3.5 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-2 space-y-2 leading-relaxed">
          <p>
            Não existe um "score ATS" universal: cada sistema ranqueia de um jeito e não divulga a fórmula. O CATS segue a
            lógica dos simuladores de mercado e combina cinco critérios, com estes pesos:
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {subScores.map((item) => (
              <li key={item.id}>
                <span className="font-medium text-body">{item.label}</span>: {item.weight}%
                {item.score === null
                  ? ' · não exigido, peso redistribuído'
                  : item.effectiveWeight !== item.weight
                    ? ` · ${item.effectiveWeight}% nesta vaga`
                    : ''}
              </li>
            ))}
          </ul>
          <p>
            Critérios que a vaga não exige saem da conta e o peso deles é redistribuído entre os demais, sem pontos de
            graça. Termos parecidos, mas não equivalentes (ex.: Vue × React), nunca contam: o CATS prefere ser mais
            rigoroso que o ATS a criar uma falsa expectativa.
          </p>
        </div>
      </details>
    </div>
  );
}
