import type { LucideIcon } from 'lucide-react';
import { Briefcase, Check, Eraser, LoaderCircle, ScanSearch, UserRound } from 'lucide-react';
import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { countWords } from '../utils/textProcessing';
import type { SampleId } from '../utils/sampleData';
import { buttonStyles } from './buttonStyles';
import { SampleMenu } from './SampleMenu';

const MIN_CHARS = 40;

/** Proporção do espaço ocupada pela vaga; o currículo fica com o restante. */
const DEFAULT_SPLIT = 0.5;
const MIN_SPLIT = 0.2;
const MAX_SPLIT = 0.8;
const KEYBOARD_STEP = 0.05;

const clampSplit = (value: number): number => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));

interface TextFieldProps {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  icon: LucideIcon;
  value: string;
  highlight: boolean;
  /** Modo coluna fixa: o campo preenche o espaço recebido em vez de ter altura própria. */
  fitted: boolean;
  /** Uma coluna (celular/tablet): o campo cresce com o texto, sem rolagem interna. */
  autoGrow: boolean;
  style?: CSSProperties;
  onChange: (value: string) => void;
}

/** Altura mínima do campo que cresce com o texto (layout de uma coluna). */
const AUTO_GROW_MIN_HEIGHT = 180;

/**
 * Em uma coluna (celular e tablet), o campo cresce com o conteúdo e não tem rolagem interna: no
 * toque, o dedo sempre rola a página, nunca fica "preso" dentro do campo. Em duas colunas o campo
 * mantém altura fixa e barra de rolagem, mesmo em telas baixas sem a coluna fixa.
 */
function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string, enabled: boolean) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!enabled) {
      element.style.height = '';
      return;
    }
    const fit = () => {
      element.style.height = 'auto';
      element.style.height = `${Math.max(AUTO_GROW_MIN_HEIGHT, element.scrollHeight + 2)}px`;
    };
    fit();
    // A largura muda ao girar o celular, e com ela a quebra de linhas.
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [ref, value, enabled]);
}

function TextField({
  id,
  label,
  description,
  placeholder,
  icon: Icon,
  value,
  highlight,
  fitted,
  autoGrow,
  style,
  onChange,
}: TextFieldProps) {
  const chars = value.length;
  const words = countWords(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(textareaRef, value, autoGrow && !fitted);

  return (
    <div
      style={style}
      className={`rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,20,30,0.04)] ${
        fitted ? 'flex min-h-[190px] flex-col' : ''
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </label>
        <span className="text-xs text-muted tabular-nums" aria-live="polite">
          {chars.toLocaleString('pt-BR')} caracteres · {words.toLocaleString('pt-BR')} palavras
        </span>
      </div>
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
        {description}
      </p>
      {/*
        Fonte de 16px no celular: abaixo disso o Safari do iPhone dá zoom automático ao tocar no
        campo e a página fica ampliada, com rolagem horizontal.
      */}
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-describedby={`${id}-hint`}
        spellCheck={false}
        className={`mt-3 block w-full rounded-xl border border-line bg-canvas px-4 py-3 text-base leading-relaxed text-body transition-colors duration-200 placeholder:text-muted hover:border-slate-300 focus:border-ink focus:bg-white focus:ring-4 focus:ring-ink/10 focus:outline-none sm:text-sm ${
          fitted ? 'min-h-0 flex-1 resize-none' : autoGrow ? 'resize-none overflow-hidden' : 'h-[260px] resize-y'
        } ${highlight ? 'animate-field-flash' : ''}`}
      />
    </div>
  );
}

interface SplitHandleProps {
  split: number;
  containerRef: RefObject<HTMLDivElement | null>;
  onChange: (split: number) => void;
}

/** Barra entre os campos: arrastar redistribui a altura entre vaga e currículo. */
function SplitHandle({ split, containerRef, onChange }: SplitHandleProps) {
  const [dragging, setDragging] = useState(false);

  const updateFromPointer = (clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && rect.height > 0) onChange(clampSplit((clientY - rect.top) / rect.height));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) updateFromPointer(event.clientY);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowUp: -KEYBOARD_STEP, ArrowDown: KEYBOARD_STEP }[event.key];
    if (delta !== undefined) {
      event.preventDefault();
      onChange(clampSplit(split + delta));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      onChange(event.key === 'Home' ? MIN_SPLIT : MAX_SPLIT);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Redimensionar campos de vaga e currículo"
      aria-controls="job-description current-resume"
      aria-valuemin={MIN_SPLIT * 100}
      aria-valuemax={MAX_SPLIT * 100}
      aria-valuenow={Math.round(split * 100)}
      tabIndex={0}
      title="Arraste para redimensionar · duplo clique para igualar"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onDoubleClick={() => onChange(DEFAULT_SPLIT)}
      onKeyDown={handleKeyDown}
      className="group flex h-5 shrink-0 cursor-row-resize touch-none items-center justify-center rounded-md focus-visible:ring-4 focus-visible:ring-ink/15 focus-visible:outline-none"
    >
      <span
        className={`h-1.5 rounded-full transition-all duration-200 ${
          dragging ? 'w-16 bg-ink' : 'w-10 bg-slate-300 group-hover:w-14 group-hover:bg-ink/60 group-focus-visible:bg-ink/60'
        }`}
      />
    </div>
  );
}

interface InputSectionProps {
  jobText: string;
  resumeText: string;
  isAnalyzing: boolean;
  /** Feedback temporário após carregar o exemplo. */
  sampleLoaded: boolean;
  /** Feedback temporário após a análise concluir. */
  analysisDone: boolean;
  /** Coluna fixa com a altura da tela: campos dividem o espaço e se redimensionam juntos. */
  fitted: boolean;
  /** Uma coluna: campos crescem com o texto. Duas colunas: campos com barra de rolagem. */
  autoGrow: boolean;
  onJobChange: (value: string) => void;
  onResumeChange: (value: string) => void;
  onLoadSample: (id: SampleId) => void;
  onClear: () => void;
  onAnalyze: () => void;
}

export function InputSection({
  jobText,
  resumeText,
  isAnalyzing,
  sampleLoaded,
  analysisDone,
  fitted,
  autoGrow,
  onJobChange,
  onResumeChange,
  onLoadSample,
  onClear,
  onAnalyze,
}: InputSectionProps) {
  const fieldsRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(DEFAULT_SPLIT);

  const isReady = jobText.trim().length >= MIN_CHARS && resumeText.trim().length >= MIN_CHARS;
  const hasContent = jobText.length > 0 || resumeText.length > 0;

  const AnalyzeIcon = isAnalyzing ? LoaderCircle : analysisDone ? Check : ScanSearch;
  const analyzeLabel = isAnalyzing ? 'Analisando…' : analysisDone ? 'Análise concluída' : 'Analisar compatibilidade';

  return (
    <section aria-labelledby="inputs-title" className={`flex flex-col ${fitted ? 'h-full gap-4' : 'gap-5'}`}>
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Etapa 1</p>
          <h2 id="inputs-title" className="text-xl font-semibold text-ink">
            Vaga e currículo
          </h2>
        </div>
        <SampleMenu disabled={isAnalyzing} loaded={sampleLoaded} onSelect={onLoadSample} />
      </div>

      <div ref={fieldsRef} className={fitted ? 'flex min-h-0 flex-1 flex-col' : 'flex flex-col gap-5'}>
        <TextField
          id="job-description"
          label="Descrição da Vaga"
          description="Cole requisitos, responsabilidades e qualificações exatamente como aparecem no anúncio."
          placeholder="Ex.: Desenvolvedor(a) Front-end Pleno — Requisitos: React, TypeScript, testes unitários..."
          icon={Briefcase}
          value={jobText}
          highlight={sampleLoaded}
          fitted={fitted}
          autoGrow={autoGrow}
          style={fitted ? { flex: `${split} 1 0px` } : undefined}
          onChange={onJobChange}
        />

        {fitted && <SplitHandle split={split} containerRef={fieldsRef} onChange={setSplit} />}

        <TextField
          id="current-resume"
          label="Currículo Atual"
          description="Cole a íntegra do seu currículo em texto. Títulos como Resumo, Experiência e Formação ajudam na reestruturação."
          placeholder="Ex.: Nome Sobrenome — Desenvolvedora Front-end — e-mail | telefone | LinkedIn..."
          icon={UserRound}
          value={resumeText}
          highlight={sampleLoaded}
          fitted={fitted}
          autoGrow={autoGrow}
          style={fitted ? { flex: `${1 - split} 1 0px` } : undefined}
          onChange={onResumeChange}
        />
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onClear} disabled={!hasContent || isAnalyzing} className={buttonStyles.ghost}>
          <Eraser className="size-4" aria-hidden="true" />
          Limpar campos
        </button>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!isReady || isAnalyzing}
          aria-busy={isAnalyzing}
          className={`${buttonStyles.primary} min-w-[236px] ${isAnalyzing ? 'opacity-90!' : ''} ${
            analysisDone ? buttonStyles.success : ''
          }`}
        >
          <AnalyzeIcon className={`size-4 ${isAnalyzing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {analyzeLabel}
        </button>
      </div>
      {!isReady && (
        <p className="-mt-2 shrink-0 text-right text-xs text-muted">
          Preencha os dois campos (mín. {MIN_CHARS} caracteres cada) para habilitar a análise.
        </p>
      )}
    </section>
  );
}
