import { Check, CircleCheck, CircleX, GraduationCap, Info, Minus, ScanText, Timer, UserRoundSearch, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AnalysisResult, TitleVerdict } from '../types/ats';
import { EDUCATION_LEVEL_LABEL } from '../utils/educationAnalyzer';
import { Card } from './Card';

function ScorePill({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">Não exigida pela vaga</span>;
  }
  return (
    <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink tabular-nums">
      {score}/100
    </span>
  );
}

function CriterionCard({ title, icon, score, children }: { title: string; icon: typeof Timer; score: number | null; children: ReactNode }) {
  const Icon = icon;
  return (
    <section className="animate-fade-up rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,20,30,0.04)] sm:p-6">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon className="size-4" aria-hidden="true" />
          {title}
        </h3>
        <ScorePill score={score} />
      </header>
      {children}
    </section>
  );
}

const VERDICT_BADGE: Record<TitleVerdict, { label: string; className: string }> = {
  same: { label: 'Mesmo cargo', className: 'border-found-border bg-found-bg text-found-text' },
  close: { label: 'Cargo próximo', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  neighbor: { label: 'Cargo vizinho', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  none: { label: 'Sem correspondência', className: 'border-missing-border bg-missing-bg text-missing-text' },
  unknown: { label: 'Não identificado', className: 'border-line bg-canvas text-muted' },
};

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-canvas px-3.5 py-2.5">
      <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

const years = (value: number) =>
  `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${value === 1 ? 'ano' : 'anos'}`;

const months = (value: number) => {
  const y = Math.floor(value / 12);
  const m = value % 12;
  return [y && `${y} ${y === 1 ? 'ano' : 'anos'}`, m && `${m} ${m === 1 ? 'mês' : 'meses'}`].filter(Boolean).join(' e ') || '—';
};

export function TitleCard({ title }: { title: AnalysisResult['title'] }) {
  const badge = VERDICT_BADGE[title.verdict];
  return (
    <CriterionCard title="Título do cargo" icon={UserRoundSearch} score={title.score}>
      <dl className="grid gap-2 sm:grid-cols-2">
        <Fact label="Cargo da vaga" value={title.jobTitle ?? '—'} />
        <Fact label="Seu cargo mais próximo" value={title.bestMatch ?? '—'} />
      </dl>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <span className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
        <p className="text-[13px] leading-relaxed text-body">{title.explanation}</p>
      </div>
    </CriterionCard>
  );
}

export function ExperienceCard({ experience }: { experience: AnalysisResult['experience'] }) {
  return (
    <CriterionCard title="Anos de experiência" icon={Timer} score={experience.score}>
      <dl className="grid gap-2 sm:grid-cols-3">
        <Fact label="Exigido pela vaga" value={experience.requiredYears === null ? 'Não informado' : `${experience.requiredYears}+ anos`} />
        <Fact label="Em cargos relacionados" value={years(experience.relevantYears)} />
        <Fact label="Total no histórico" value={years(experience.totalYears)} />
      </dl>
      {experience.entries.length > 0 ? (
        <ul className="mt-3 divide-y divide-line">
          {experience.entries.map((entry, index) => (
            <li key={`${entry.role}-${index}`} className="flex items-center gap-3 py-2 text-[13px]">
              {entry.relevant ? (
                <CircleCheck className="size-4 shrink-0 text-found-text" aria-label="Conta para a vaga" />
              ) : (
                <Minus className="size-4 shrink-0 text-muted" aria-label="Não relacionado à vaga" />
              )}
              <span className="min-w-0 flex-1">
                <span className="font-medium text-ink">{entry.role}</span>
                <span className="block text-xs text-muted">{entry.period}</span>
              </span>
              <span className="shrink-0 text-xs text-muted tabular-nums">{months(entry.months)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-body">
          Não encontramos períodos com datas no seu histórico. Escreva-os como "mar/2022 – atual" na linha de cada cargo.
        </p>
      )}
      <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        Só contam cargos relacionados ao da vaga, e períodos sobrepostos não são somados duas vezes.
      </p>
    </CriterionCard>
  );
}

export function EducationCard({ education }: { education: AnalysisResult['education'] }) {
  const required = education.requiredLevel
    ? `${EDUCATION_LEVEL_LABEL[education.requiredLevel]}${education.requiresCompletion ? ' completo' : ''}`
    : 'Não informado';
  const found = education.resumeLevel
    ? `${EDUCATION_LEVEL_LABEL[education.resumeLevel]}${education.resumeLevelInProgress ? ' (em andamento)' : ''}`
    : 'Não encontrado';

  return (
    <CriterionCard title="Formação e certificações" icon={GraduationCap} score={education.score}>
      <dl className="grid gap-2 sm:grid-cols-2">
        <Fact label="Exigido pela vaga" value={required} />
        <Fact label="No seu currículo" value={found} />
      </dl>
      {education.requiredFields.length > 0 && (
        <p className="mt-3 flex items-start gap-2 text-[13px] text-body">
          {education.fieldMatched ? (
            <Check className="mt-0.5 size-4 shrink-0 text-found-text" aria-label="Área compatível" />
          ) : (
            <X className="mt-0.5 size-4 shrink-0 text-missing-text" aria-label="Área não encontrada" />
          )}
          <span>
            Áreas pedidas: <span className="font-medium text-ink">{education.requiredFields.join(', ')}</span>
            {education.fieldMatched ? '.' : ' — não encontramos essas áreas na sua formação.'}
          </span>
        </p>
      )}
      {education.credentials.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {education.credentials.map((credential) => (
            <li
              key={credential.name}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                credential.found
                  ? 'border-found-border bg-found-bg text-found-text'
                  : 'border-missing-border bg-missing-bg text-missing-text'
              }`}
            >
              {credential.found ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}
              {credential.name}
            </li>
          ))}
        </ul>
      )}
    </CriterionCard>
  );
}

export function LegibilityCard({ legibility }: { legibility: AnalysisResult['legibility'] }) {
  return (
    <CriterionCard title="Legibilidade ATS" icon={ScanText} score={legibility.score}>
      <p className="mb-3 text-[13px] leading-relaxed text-body">
        O que o leitor automático do ATS consegue extrair do seu currículo para preencher o cadastro.
      </p>
      <ul className="grid gap-2">
        {legibility.checks.map((check) => (
          <li key={check.id} className="flex gap-2.5 text-[13px]">
            {check.passed ? (
              <CircleCheck className="mt-px size-4 shrink-0 text-found-text" aria-label="Aprovado" />
            ) : (
              <CircleX className="mt-px size-4 shrink-0 text-missing-text" aria-label="Reprovado" />
            )}
            <span>
              <span className={check.passed ? 'text-body' : 'font-medium text-ink'}>{check.label}</span>
              {!check.passed && <span className="block text-xs text-muted">{check.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex gap-2 rounded-xl bg-canvas p-3 text-xs leading-relaxed text-muted">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        Limitação: o CATS analisa o texto colado. Colunas, tabelas, imagens e cabeçalhos/rodapés do arquivo original não
        são verificados. Por isso este critério tem peso menor.
      </p>
    </CriterionCard>
  );
}

export function WritingAdjustments({ result }: { result: AnalysisResult }) {
  if (!result.typoAlerts.length && !result.synonymHints.length) return null;
  return (
    <Card
      title="Ajustes de escrita"
      description="Detalhes de grafia que fazem diferença para o robô de triagem."
    >
      <ul className="grid gap-3">
        {result.typoAlerts.map(({ keyword, resumeForm }) => (
          <li key={`typo-${keyword.key}`} className="flex gap-3 rounded-xl border border-missing-border bg-missing-bg/60 p-3.5">
            <CircleX className="mt-0.5 size-4 shrink-0 text-missing-text" aria-hidden="true" />
            <p className="text-[13px] leading-relaxed text-body">
              <span className="font-semibold text-missing-text">Possível erro de digitação:</span> você escreveu{' '}
              <span className="font-medium text-ink">"{resumeForm}"</span>. O ATS não reconhece essa grafia e conta o termo como
              ausente. Se você domina a ferramenta, corrija para <span className="font-medium text-ink">"{keyword.label}"</span>.
            </p>
          </li>
        ))}
        {result.synonymHints.map(({ keyword, jobForm, resumeForm }) => (
          <li key={`syn-${keyword.key}`} className="flex gap-3 rounded-xl border border-line bg-canvas p-3.5">
            <Info className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden="true" />
            <p className="text-[13px] leading-relaxed text-body">
              A vaga escreve <span className="font-medium text-ink">"{jobForm}"</span> e o seu currículo,{' '}
              <span className="font-medium text-ink">"{resumeForm}"</span>. Contamos como equivalente, mas ATS mais simples podem não
              reconhecer. Escreva as duas formas: <span className="font-medium text-ink">"{jobForm} ({resumeForm})"</span>.
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
