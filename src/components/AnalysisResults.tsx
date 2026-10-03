import type { LucideIcon } from 'lucide-react';
import { ArrowRight, FileText, ListChecks, SlidersHorizontal, Tags } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { AnalysisResult } from '../types/ats';
import { AtsTips } from './AtsTips';
import { buttonStyles } from './buttonStyles';
import { Card } from './Card';
import { EducationCard, ExperienceCard, LegibilityCard, TitleCard, WritingAdjustments } from './CriteriaPanels';
import { KeywordBadges } from './KeywordBadges';
import { MissingKeywordGuide } from './MissingKeywordGuide';
import { ResumePreview } from './ResumePreview';
import { ScoreHeader, getCollapseDistance, progressVar, useScrollCollapse } from './ScoreHeader';

type TabId = 'keywords' | 'criteria' | 'resume';

interface TabDefinition {
  id: TabId;
  label: string;
  /** Rótulo para telas estreitas. */
  shortLabel: string;
  icon: LucideIcon;
  /** Contador exibido na aba para sinalizar pendências. */
  count?: { value: number; tone: 'missing' | 'warning' | 'neutral'; label: string };
}

const COUNT_TONE = {
  missing: 'bg-missing-bg text-missing-text',
  warning: 'bg-amber-50 text-amber-800',
  neutral: 'bg-canvas text-muted',
} as const;

interface AnalysisResultsProps {
  result: AnalysisResult;
  runId: number;
}

export function AnalysisResults({ result, runId }: AnalysisResultsProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const scoreFullRef = useRef<HTMLDivElement>(null);
  const scoreCompactRef = useRef<HTMLDivElement>(null);
  useScrollCollapse(sentinelRef, stickyRef, scoreFullRef, scoreCompactRef);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const [activeTab, setActiveTab] = useState<TabId>('keywords');

  // Cada nova análise reabre o diagnóstico de palavras-chave.
  useEffect(() => setActiveTab('keywords'), [runId]);

  const keywordIssues = result.missing.length + result.typoAlerts.length;
  // Critérios (fora palavras-chave) abaixo da faixa "forte" pedem atenção.
  const weakCriteria = result.subScores.filter(
    (item) => item.id !== 'keywords' && item.score !== null && item.score < 75,
  ).length;
  const tabs: TabDefinition[] = [
    {
      id: 'keywords',
      label: 'Palavras-chave',
      shortLabel: 'Palavras',
      icon: Tags,
      count: keywordIssues ? { value: keywordIssues, tone: 'missing', label: 'termos ausentes ou com erro' } : undefined,
    },
    {
      id: 'criteria',
      label: 'Critérios ATS',
      shortLabel: 'Critérios',
      icon: SlidersHorizontal,
      count: weakCriteria ? { value: weakCriteria, tone: 'warning', label: 'critérios a melhorar' } : undefined,
    },
    { id: 'resume', label: 'Currículo ATS', shortLabel: 'Currículo', icon: FileText },
  ];

  const selectTab = (id: TabId, focus = false) => {
    setActiveTab(id);
    if (focus) tabRefs.current[id]?.focus();
    // Se o usuário já rolou o diagnóstico, leva o início da nova aba para logo abaixo do
    // cabeçalho fixo, com o score já compacto (fim do trajeto de encolhimento).
    const sentinelTop = sentinelRef.current?.getBoundingClientRect().top;
    if (sentinelTop !== undefined && sentinelTop < 0) {
      const distance = stickyRef.current ? getCollapseDistance(stickyRef.current) : 0;
      window.scrollTo({ top: window.scrollY + sentinelTop + distance });
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    if (next) selectTab(next.id, true);
  };

  const panelClass = (id: TabId) => (activeTab === id ? 'grid gap-5' : 'hidden');

  return (
    <div>
      <div ref={sentinelRef} aria-hidden="true" />

      {/*
        Cabeçalho fixo: score (completo → compacto ao rolar) + abas. A margem inferior devolve ao
        fluxo o espaço que o card perde ao encolher, então o conteúdo abaixo não acelera nem passa
        por trás do cabeçalho. Margem é transparente e não captura cliques.
      */}
      <div
        ref={stickyRef}
        className="sticky top-0 z-20 -mx-2 bg-canvas px-2 pt-6 pb-4 print:hidden"
        style={{ marginBottom: `calc((var(--full-h, 0px) - var(--compact-h, 0px)) * ${progressVar})` }}
      >
        <ScoreHeader result={result} fullRef={scoreFullRef} compactRef={scoreCompactRef} />

        <div
          role="tablist"
          aria-label="Resultados da análise"
          className="mt-3 flex gap-1 rounded-xl border border-line bg-white p-1 shadow-[0_1px_2px_rgba(15,20,30,0.04)]"
        >
          {tabs.map((tab, index) => {
            const selected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[tab.id] = element;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200 select-none focus-visible:ring-4 focus-visible:ring-ink/15 focus-visible:outline-none active:scale-[0.97] sm:gap-2 sm:px-3 sm:text-sm ${
                  selected ? 'bg-ink text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                <Icon className="hidden size-4 shrink-0 sm:block" aria-hidden="true" />
                <span className="truncate xl:hidden">{tab.shortLabel}</span>
                <span className="hidden truncate xl:inline">{tab.label}</span>
                {tab.count && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums ${
                      selected ? 'bg-white/15 text-white' : COUNT_TONE[tab.count.tone]
                    }`}
                  >
                    {tab.count.value}
                    <span className="sr-only"> {tab.count.label}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div id="panel-keywords" role="tabpanel" aria-labelledby="tab-keywords" className={`${panelClass('keywords')} print:hidden`}>
        <Card
          title="Diagnóstico de palavras-chave"
          description="Termos técnicos e competências extraídos da vaga, cruzados com o seu currículo."
        >
          <KeywordBadges found={result.found} missing={result.missing} />
        </Card>
        <WritingAdjustments result={result} />
        {result.suggestions.length > 0 && (
          <Card
            title="Onde encaixar os termos ausentes"
            description="Sugestões contextuais, válidas somente para competências que você realmente possui."
          >
            <MissingKeywordGuide suggestions={result.suggestions} />
          </Card>
        )}
        <NextStep label="Ver critérios ATS" onClick={() => selectTab('criteria')} />
      </div>

      <div id="panel-criteria" role="tabpanel" aria-labelledby="tab-criteria" className={`${panelClass('criteria')} print:hidden`}>
        <TitleCard title={result.title} />
        <ExperienceCard experience={result.experience} />
        <EducationCard education={result.education} />
        <LegibilityCard legibility={result.legibility} />
        <Card title="Boas práticas ATS" icon={ListChecks}>
          <AtsTips tips={result.tips} />
        </Card>
        <NextStep label="Ver currículo otimizado" onClick={() => selectTab('resume')} />
      </div>

      {/* Sempre montado (para não perder edições ao trocar de aba) e sempre impresso. */}
      <div id="panel-resume" role="tabpanel" aria-labelledby="tab-resume" className={`${panelClass('resume')} print:block`}>
        <section className="animate-fade-up rounded-2xl border border-line bg-white p-5 sm:p-6 print:border-0 print:p-0">
          <header className="mb-4 print:hidden">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <FileText className="size-4" aria-hidden="true" />
              Currículo ATS Friendly
            </h3>
            <p className="mt-1 text-[13px] text-muted">
              Estrutura vertical aceita por Workday, Gupy, Greenhouse e Taleo, com o seu conteúdo original reorganizado.
            </p>
          </header>
          <ResumePreview key={runId} resume={result.resume} />
        </section>
      </div>
    </div>
  );
}

function NextStep({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex justify-end">
      <button type="button" onClick={onClick} className={buttonStyles.secondary}>
        {label}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
