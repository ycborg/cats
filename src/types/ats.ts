/** Estados do painel de resultados (RF07). */
export type UiStatus = 'idle' | 'loading' | 'success';

/** Faixas qualitativas do Match Score (RF03). */
export type MatchLevel = 'low' | 'medium' | 'strong';

/** tech = hard skill/ferramenta · soft = competência/método · general = termo recorrente da vaga. */
export type KeywordCategory = 'tech' | 'soft' | 'general';

export interface Keyword {
  /** Forma canônica usada no cruzamento (minúscula, sem acento, singular, aliases resolvidos). */
  key: string;
  /** Forma de exibição (ex.: "Node.js", "Testes Unitários"). */
  label: string;
  category: KeywordCategory;
  weight: number;
  frequency: number;
  /** Apareceu na seção de requisitos obrigatórios da vaga. */
  required: boolean;
  /** Como o termo aparece escrito na vaga. */
  jobForm: string;
  /** Encontrado em contexto (resumo/histórico/projetos), não só listado em Habilidades. */
  inContext?: boolean;
}

export interface MissingKeywordSuggestion {
  keyword: Keyword;
  targetSection: string;
  hint: string;
}

export type TipStatus = 'warning' | 'info';

export interface AtsTip {
  id: string;
  title: string;
  description: string;
  status: TipStatus;
}

export type ResumeLineKind = 'paragraph' | 'bullet' | 'subheading';

export interface ResumeLine {
  kind: ResumeLineKind;
  text: string;
}

export type ResumeSectionId =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'languages'
  | 'other';

export interface ResumeSection {
  id: ResumeSectionId;
  title: string;
  lines: ResumeLine[];
}

export interface AtsResume {
  name: string;
  headline: string;
  contacts: string[];
  sections: ResumeSection[];
}

/* ---------------------------------------------------------------------------
 * Score composto
 * ------------------------------------------------------------------------- */

export type SubScoreId = 'keywords' | 'title' | 'experience' | 'education' | 'legibility';

export interface SubScore {
  id: SubScoreId;
  label: string;
  /** Peso nominal (%). */
  weight: number;
  /** Peso efetivo após redistribuir os critérios não exigidos (%); 0 quando não se aplica. */
  effectiveWeight: number;
  /** 0–100, ou null quando a vaga não exige o critério. */
  score: number | null;
  /** Resumo curto do que definiu a nota. */
  summary: string;
}

/** Mesmo cargo · cargo próximo · cargo vizinho · sem relação · não identificado. */
export type TitleVerdict = 'same' | 'close' | 'neighbor' | 'none' | 'unknown';

export interface TitleAnalysis {
  jobTitle: string | null;
  /** Cargo do currículo que melhor corresponde à vaga. */
  bestMatch: string | null;
  verdict: TitleVerdict;
  score: number | null;
  explanation: string;
}

export interface ExperienceEntry {
  role: string;
  period: string;
  months: number;
  relevant: boolean;
}

export interface ExperienceAnalysis {
  requiredYears: number | null;
  totalYears: number;
  relevantYears: number;
  entries: ExperienceEntry[];
  score: number | null;
}

export type EducationLevel = 'medio' | 'tecnico' | 'superior' | 'pos' | 'mestrado' | 'doutorado';

export interface CredentialCheck {
  name: string;
  found: boolean;
}

export interface EducationAnalysis {
  requiredLevel: EducationLevel | null;
  /** Exige conclusão (ex.: "superior completo") ou aceita em andamento. */
  requiresCompletion: boolean;
  resumeLevel: EducationLevel | null;
  resumeLevelInProgress: boolean;
  requiredFields: string[];
  fieldMatched: boolean | null;
  credentials: CredentialCheck[];
  score: number | null;
}

export interface LegibilityCheck {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  hint: string;
}

export interface LegibilityAnalysis {
  checks: LegibilityCheck[];
  score: number;
}

/** Termo encontrado só por equivalência (ex.: vaga diz "JavaScript", currículo diz "JS"). */
export interface SynonymHint {
  keyword: Keyword;
  /** Como a vaga escreve o termo (ex.: "JavaScript"). */
  jobForm: string;
  /** Como o currículo escreve (ex.: "JS"). */
  resumeForm: string;
}

/** Termo da vaga escrito com erro no currículo — não conta como encontrado. */
export interface TypoAlert {
  keyword: Keyword;
  resumeForm: string;
}

export interface AnalysisResult {
  /** Score composto final (0–100). */
  score: number;
  level: MatchLevel;
  subScores: SubScore[];
  found: Keyword[];
  missing: Keyword[];
  synonymHints: SynonymHint[];
  typoAlerts: TypoAlert[];
  title: TitleAnalysis;
  experience: ExperienceAnalysis;
  education: EducationAnalysis;
  legibility: LegibilityAnalysis;
  tips: AtsTip[];
  suggestions: MissingKeywordSuggestion[];
  resume: AtsResume;
}
