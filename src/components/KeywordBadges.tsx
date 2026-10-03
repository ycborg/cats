import { Check, CircleCheck, CircleX, X } from 'lucide-react';
import type { Keyword } from '../types/ats';

type BadgeVariant = 'found' | 'missing';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  found: 'border-found-border bg-found-bg text-found-text',
  missing: 'border-missing-border bg-missing-bg text-missing-text',
};

export function KeywordBadge({ keyword, variant }: { keyword: Keyword; variant: BadgeVariant }) {
  const Icon = variant === 'found' ? Check : X;
  return (
    <li
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition duration-200 hover:-translate-y-px ${VARIANT_CLASSES[variant]}`}
      title={keyword.required ? 'Requisito obrigatório na vaga' : undefined}
    >
      <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
      {keyword.label}
      {keyword.required && <span className="sr-only"> (obrigatório)</span>}
    </li>
  );
}

interface KeywordBadgesProps {
  found: Keyword[];
  missing: Keyword[];
}

export function KeywordBadges({ found, missing }: KeywordBadgesProps) {
  return (
    <div className="grid gap-6">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CircleCheck className="size-4 text-found-text" aria-hidden="true" />
          Palavras Encontradas
          <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted">{found.length}</span>
        </h3>
        {found.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {found.map((keyword) => (
              <KeywordBadge key={keyword.key} keyword={keyword} variant="found" />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nenhum termo-chave da vaga foi encontrado no currículo.</p>
        )}
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CircleX className="size-4 text-missing-text" aria-hidden="true" />
          Termos Críticos Ausentes
          <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted">{missing.length}</span>
        </h3>
        {missing.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {missing.map((keyword) => (
              <KeywordBadge key={keyword.key} keyword={keyword} variant="missing" />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nenhum termo crítico ausente. Seu currículo cobre todos os termos-chave.</p>
        )}
      </div>
    </div>
  );
}
