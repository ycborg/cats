import { Scale } from 'lucide-react';
import type { MissingKeywordSuggestion } from '../types/ats';

export function MissingKeywordGuide({ suggestions }: { suggestions: MissingKeywordSuggestion[] }) {
  if (!suggestions.length) return null;

  return (
    <div>
      <div className="flex gap-3 rounded-xl border border-ink/15 bg-canvas p-3.5">
        <Scale className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden="true" />
        <p className="text-[13px] leading-relaxed text-body">
          Só adicione um termo se você <strong className="font-semibold text-ink">realmente o domina</strong> e consegue
          comprovar em entrevista. Caso contrário, deixe de fora: honestidade vale mais que alguns pontos de score.
        </p>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {suggestions.map(({ keyword, targetSection, hint }) => (
          <li key={keyword.key} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
            <span className="inline-flex h-fit w-fit shrink-0 items-center rounded-full border border-missing-border bg-missing-bg px-2.5 py-1 text-xs font-medium text-missing-text">
              {keyword.label}
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Onde: {targetSection}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-body">{hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
