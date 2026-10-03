import type { TitleVerdict } from '../types/ats';
import {
  AREA_NEIGHBORS,
  AREA_WORDS,
  HEAD_PHRASES,
  HEAD_WORDS,
  IGNORED_WORDS,
  LADDER,
  RELATED_HEADS,
  TECH_AREAS,
  TECH_EQUIVALENT_HEADS,
} from '../data/cargos';
import { stripAccents } from './textProcessing';

/**
 * Comparação de títulos de cargo por regras + léxico de PALAVRAS (não de títulos inteiros):
 * 1) padroniza (senioridade, gênero, marcações), 2) traduz cada palavra para uma forma canônica,
 * 3) separa FUNÇÃO (desenvolvedor, analista, gerente…) de ÁREA (frontend, financeiro, rh…),
 * 4) compara. Palavras desconhecidas são comparadas literalmente — o erro possível é ser mais
 * rígido que um ATS, nunca mais generoso.
 */

const SENIORITY_LABEL: Array<[RegExp, string]> = [
  [/\b(estagiari[oa]|estagio|intern)\b/, 'Estágio'],
  [/\b(junior|jr)\b/, 'Júnior'],
  [/\b(pleno|pl)\b/, 'Pleno'],
  [/\b(senior|sr)\b/, 'Sênior'],
];

/* ---------------------------------------------------------------------------
 * Normalização
 * ------------------------------------------------------------------------- */

const GENDER_RULES: Array<[RegExp, string]> = [
  [/ora$/, 'or'], [/eira$/, 'eiro'], [/aria$/, 'ario'], [/ica$/, 'ico'], [/oga$/, 'ogo'], [/ada$/, 'ado'], [/a$/, 'o'],
];

const SPELLING: Record<string, string> = {
  'front-end': 'frontend', 'back-end': 'backend', 'full-stack': 'fullstack', 'full stack': 'fullstack',
  'front end': 'frontend', 'back end': 'backend', 'dev-ops': 'devops', 'e commerce': 'ecommerce',
};

const isKnown = (word: string): boolean => word in HEAD_WORDS || word in AREA_WORDS;

/** "desenvolvedora" → "desenvolvedor", "financeira" → "financeiro" — só aceita se a forma existe no léxico. */
function normalizeGender(word: string): string {
  if (isKnown(word)) return word;
  for (const [pattern, replacement] of GENDER_RULES) {
    if (!pattern.test(word)) continue;
    const candidate = word.replace(pattern, replacement);
    if (isKnown(candidate)) return candidate;
  }
  return word;
}

export interface NormalizedTitle {
  original: string;
  head: string | null;
  areas: Set<string>;
  /** Palavras restantes não reconhecidas (comparadas literalmente). */
  others: Set<string>;
}

export function normalizeTitle(raw: string): NormalizedTitle {
  let text = stripAccents(raw.toLowerCase())
    .replace(/\((a|o|as|os|e)\)/g, '')
    .replace(/\b(\w+)\/(a|o)\b/g, '$1')
    .replace(/[^a-z0-9/+#&\s-]/g, ' ');
  for (const [variant, canonical] of Object.entries(SPELLING)) text = text.split(variant).join(canonical);

  const words = text.split(/\s+/).filter(Boolean).map((word) => word.replace(/^-+|-+$/g, '')).filter(Boolean);
  let head: string | null = null;
  const areas = new Set<string>();
  const others = new Set<string>();

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]!;
    // Frases de duas ou três palavras (com ou sem "de" no meio).
    const pair = `${word} ${words[i + 1] ?? ''}`;
    const triple = `${pair} ${words[i + 2] ?? ''}`;
    if (HEAD_PHRASES[triple]) { head ??= HEAD_PHRASES[triple]!; i += 2; continue; }
    if (HEAD_PHRASES[pair]) { head ??= HEAD_PHRASES[pair]!; i += 1; continue; }
    if (AREA_WORDS[triple]) { areas.add(AREA_WORDS[triple]!); i += 2; continue; }
    if (AREA_WORDS[pair]) { areas.add(AREA_WORDS[pair]!); i += 1; continue; }

    if (IGNORED_WORDS.has(word)) continue;
    const normalized = normalizeGender(word);
    // A primeira função encontrada é a principal; depois dela, palavras ambíguas valem como área
    // ("Engenheiro Mecânico": "mecânico" é área, não função).
    if (head === null && HEAD_WORDS[normalized]) {
      head = HEAD_WORDS[normalized]!;
      continue;
    }
    if (AREA_WORDS[normalized]) {
      areas.add(AREA_WORDS[normalized]!);
      continue;
    }
    if (HEAD_WORDS[normalized]) continue;
    if (word.length > 2) others.add(normalized);
  }

  return { original: raw.trim(), head, areas, others };
}

export function seniorityOf(raw: string): string | null {
  const plain = stripAccents(raw.toLowerCase());
  return SENIORITY_LABEL.find(([pattern]) => pattern.test(plain))?.[1] ?? null;
}

/* ---------------------------------------------------------------------------
 * Comparação
 * ------------------------------------------------------------------------- */

type AreaRelation = 'same' | 'neighbor' | 'different' | 'job-generic' | 'resume-generic';

function areaRelation(job: NormalizedTitle, resume: NormalizedTitle): AreaRelation {
  const jobAreas = new Set([...job.areas, ...job.others]);
  const resumeAreas = new Set([...resume.areas, ...resume.others]);
  if (jobAreas.size === 0) return 'job-generic';
  if (resumeAreas.size === 0) return 'resume-generic';

  const shared = [...jobAreas].filter((area) => resumeAreas.has(area)).length;
  if (shared > 0 && shared / jobAreas.size >= 0.5) return 'same';
  const isNeighbor = AREA_NEIGHBORS.some(
    (group) => [...job.areas].some((a) => group.includes(a)) && [...resume.areas].some((b) => group.includes(b)),
  );
  if (isNeighbor || shared > 0) return 'neighbor';
  return 'different';
}

type HeadRelation = 'same' | 'adjacent' | 'different' | 'missing';

function headRelation(job: NormalizedTitle, resume: NormalizedTitle): HeadRelation {
  if (!job.head || !resume.head) return 'missing';
  if (job.head === resume.head) return 'same';
  const allAreas = [...job.areas, ...resume.areas];
  const techContext = allAreas.length > 0 && allAreas.every((area) => TECH_AREAS.has(area));
  if (techContext && TECH_EQUIVALENT_HEADS.has(job.head) && TECH_EQUIVALENT_HEADS.has(resume.head)) return 'same';
  const jobLevel = LADDER[job.head];
  const resumeLevel = LADDER[resume.head];
  if (jobLevel !== undefined && resumeLevel !== undefined && Math.abs(jobLevel - resumeLevel) <= 1) return 'adjacent';
  if (RELATED_HEADS.some((group) => group.includes(job.head!) && group.includes(resume.head!))) return 'adjacent';
  return 'different';
}

export interface TitleComparison {
  score: number;
  verdict: TitleVerdict;
}

const SCORE_TABLE: Record<HeadRelation, Partial<Record<AreaRelation, number>>> = {
  same: { same: 100, 'job-generic': 100, 'resume-generic': 70, neighbor: 50, different: 20 },
  adjacent: { same: 60, 'job-generic': 50, 'resume-generic': 40, neighbor: 35 },
  different: { same: 40, neighbor: 20 },
  missing: { same: 70, neighbor: 40 },
};

export function compareTitles(job: NormalizedTitle, resume: NormalizedTitle): TitleComparison {
  const score = SCORE_TABLE[headRelation(job, resume)][areaRelation(job, resume)] ?? 0;
  const verdict: TitleVerdict = score >= 90 ? 'same' : score >= 50 ? 'close' : score > 0 ? 'neighbor' : 'none';
  return { score, verdict };
}

/** Um título é "reconhecível" quando tem função ou área conhecida. */
export const isRecognizable = (title: NormalizedTitle): boolean => title.head !== null || title.areas.size > 0;
