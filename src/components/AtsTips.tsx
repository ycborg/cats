import { Lightbulb, TriangleAlert } from 'lucide-react';
import type { AtsTip } from '../types/ats';

export function AtsTips({ tips }: { tips: AtsTip[] }) {
  return (
    <ul className="grid gap-3">
      {tips.map((tip) => {
        const isWarning = tip.status === 'warning';
        const Icon = isWarning ? TriangleAlert : Lightbulb;
        return (
          <li key={tip.id} className="flex gap-3 rounded-xl border border-line bg-canvas p-3.5">
            <span
              className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${
                isWarning ? 'bg-amber-50 text-amber-700' : 'bg-white text-ink'
              } border border-line`}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {isWarning && <span className="sr-only">Atenção: </span>}
                {tip.title}
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-body">{tip.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
