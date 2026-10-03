import { HEAD_WORDS } from '../data/cargos';
import { HARD_SKILLS, SOFT_SKILLS, SYNONYM_GROUPS } from '../data/lexicon';
import type { Keyword, KeywordCategory, SynonymHint, TypoAlert } from '../types/ats';
import type { JobSectionMode } from './jobSections';
import { jobContentLines } from './jobSections';
import type { Block } from './resumeBuilder';
import {
  canonicalToken,
  isNoise,
  isStopword,
  isVerbLike,
  literalToken,
  splitSegments,
  stripAccents,
  termKey,
  tokenize,
} from './textProcessing';

const MAX_KEYWORDS = 30;
/** Expressões do dicionário com mais palavras que isso são ignoradas (evita custo desnecessário). */
const MAX_PHRASE_LIMIT = 6;

const CATEGORY_BONUS: Record<KeywordCategory, number> = { tech: 3, soft: 1.5, general: 0 };
const REQUIRED_BONUS = 1.5;
const NICE_TO_HAVE_FACTOR = 0.6;
/** Termo citado em conquista/resumo vale um pouco mais (o recrutador e o ranking valorizam). */
const CONTEXT_BONUS = 0.1;

/* ---------------------------------------------------------------------------
 * Dicionário (src/data/lexicon): termos conhecidos + sinônimos
 * ------------------------------------------------------------------------- */

interface LexiconEntry {
  label: string;
  /** 'tech' = hard skill (qualquer área); 'soft' = comportamental, idioma ou metodologia. */
  category: Exclude<KeywordCategory, 'general'>;
}

const LEXICON = new Map<string, LexiconEntry>();
/** Chave de uma variante → chave da forma principal ("r&s" → "recrutamento e selecao"). */
const SYNONYMS = new Map<string, string>();

for (const term of HARD_SKILLS) {
  const key = termKey(term);
  if (key && !LEXICON.has(key)) LEXICON.set(key, { label: term, category: 'tech' });
}
for (const term of SOFT_SKILLS) {
  const key = termKey(term);
  if (key && !LEXICON.has(key)) LEXICON.set(key, { label: term, category: 'soft' });
}
for (const [main, ...variants] of SYNONYM_GROUPS) {
  if (!main) continue;
  const mainKey = termKey(main);
  if (!LEXICON.has(mainKey)) LEXICON.set(mainKey, { label: main, category: 'tech' });
  for (const variant of variants) {
    const variantKey = termKey(variant);
    if (variantKey && variantKey !== mainKey && !SYNONYMS.has(variantKey)) SYNONYMS.set(variantKey, mainKey);
  }
}

const MAX_PHRASE = Math.min(
  MAX_PHRASE_LIMIT,
  Math.max(1, ...[...LEXICON.keys(), ...SYNONYMS.keys()].map((key) => key.split(' ').length)),
);

/** Resolve sinônimos para a forma principal. */
const resolve = (key: string): string => SYNONYMS.get(key) ?? key;

function lexiconCategory(key: string): LexiconEntry['category'] | null {
  return LEXICON.get(resolve(key))?.category ?? null;
}

/* ---------------------------------------------------------------------------
 * Extração de keywords da vaga
 * ------------------------------------------------------------------------- */

interface Segment {
  tokens: string[];
  keys: string[];
  mode: JobSectionMode;
}

function segmentJob(jobText: string): Segment[] {
  return jobContentLines(jobText).flatMap(({ text, mode }) =>
    splitSegments(text)
      .map((part) => tokenize(part))
      .filter((tokens) => tokens.length > 0)
      .map((tokens) => ({ tokens, keys: tokens.map(canonicalToken), mode })),
  );
}

interface Candidate {
  key: string;
  surface: string;
  frequency: number;
  required: boolean;
  nice: boolean;
  neutral: boolean;
}

/**
 * Palavras de cargo ("enfermeiro", "analista") não viram palavra-chave genérica: quem as avalia é o
 * critério de título, que entende gênero e tradução ("Enfermeira" = "Enfermeiro").
 */
function isRoleWord(token: string): boolean {
  const plain = stripAccents(token);
  const masculine = plain.replace(/ora$/, 'or').replace(/eira$/, 'eiro').replace(/a$/, 'o');
  return plain in HEAD_WORDS || masculine in HEAD_WORDS;
}

function isEligibleGeneral(token: string, key: string): boolean {
  return (
    key.length >= 3 && !/\d/.test(key) && !isStopword(token) && !isNoise(token) && !isVerbLike(token) && !isRoleWord(token)
  );
}

function computeWeight(candidate: Candidate, category: KeywordCategory): number {
  let weight = Math.min(candidate.frequency, 3) + CATEGORY_BONUS[category];
  if (candidate.required) weight += REQUIRED_BONUS;
  else if (candidate.nice && !candidate.neutral) weight *= NICE_TO_HAVE_FACTOR;
  return Math.round(weight * 10) / 10;
}

/** Procura, a partir de `start`, a expressão do dicionário mais longa (inclui "de", "e", "a" no meio). */
function longestLexiconMatch(keys: string[], start: number): { key: string; length: number } | null {
  for (let length = Math.min(MAX_PHRASE, keys.length - start); length >= 1; length -= 1) {
    const key = keys.slice(start, start + length).join(' ');
    if (LEXICON.has(key) || SYNONYMS.has(key)) return { key: resolve(key), length };
  }
  return null;
}

export function extractKeywords(jobText: string): Keyword[] {
  const segments = segmentJob(jobText);
  const candidates = new Map<string, Candidate>();

  const register = (key: string, surface: string, mode: JobSectionMode): void => {
    const candidate = candidates.get(key) ?? {
      key,
      surface,
      frequency: 0,
      required: false,
      nice: false,
      neutral: false,
    };
    candidate.frequency += 1;
    if (mode === 'required') candidate.required = true;
    if (mode === 'nice') candidate.nice = true;
    if (mode === 'neutral') candidate.neutral = true;
    candidates.set(key, candidate);
  };

  // 1) Termos do dicionário: sempre contam, mesmo citados uma única vez (maior expressão primeiro).
  const coveredBySegment = segments.map(({ tokens, keys, mode }) => {
    const covered = new Array<boolean>(keys.length).fill(false);
    for (let i = 0; i < keys.length; ) {
      const match = longestLexiconMatch(keys, i);
      if (!match) {
        i += 1;
        continue;
      }
      register(match.key, tokens.slice(i, i + match.length).join(' '), mode);
      covered.fill(true, i, i + match.length);
      i += match.length;
    }
    return covered;
  });

  // 2) Expressões genéricas de duas palavras: só se recorrentes na vaga.
  const generic = new Map<string, Candidate>();
  const registerGeneric = (key: string, surface: string, mode: JobSectionMode) => {
    const candidate = generic.get(key) ?? { key, surface, frequency: 0, required: false, nice: false, neutral: false };
    candidate.frequency += 1;
    if (mode === 'required') candidate.required = true;
    if (mode === 'nice') candidate.nice = true;
    if (mode === 'neutral') candidate.neutral = true;
    generic.set(key, candidate);
  };
  segments.forEach(({ tokens, keys, mode }, s) => {
    const covered = coveredBySegment[s]!;
    for (let i = 0; i < keys.length - 1; i += 1) {
      if (covered[i] || covered[i + 1]) continue;
      if (isEligibleGeneral(tokens[i]!, keys[i]!) && isEligibleGeneral(tokens[i + 1]!, keys[i + 1]!)) {
        registerGeneric(`${keys[i]} ${keys[i + 1]}`, `${tokens[i]} ${tokens[i + 1]}`, mode);
      }
    }
  });
  const genericBigrams = new Set([...generic.values()].filter((c) => c.frequency >= 2).map((c) => c.key));

  // 3) Palavras genéricas soltas, fora dos trechos já cobertos.
  segments.forEach(({ tokens, keys, mode }, s) => {
    const covered = coveredBySegment[s]!;
    keys.forEach((key, i) => {
      if (covered[i]) return;
      if (genericBigrams.has(`${key} ${keys[i + 1]}`) || genericBigrams.has(`${keys[i - 1]} ${key}`)) return;
      if (isEligibleGeneral(tokens[i]!, key)) registerGeneric(key, tokens[i]!, mode);
    });
  });
  for (const candidate of generic.values()) {
    const isBigram = candidate.key.includes(' ');
    if ((isBigram && genericBigrams.has(candidate.key)) || (!isBigram && candidate.frequency >= 2)) {
      candidates.set(candidate.key, candidate);
    }
  }

  const keywords: Keyword[] = [];
  for (const candidate of candidates.values()) {
    const entry = LEXICON.get(candidate.key);
    const category: KeywordCategory = entry?.category ?? 'general';
    keywords.push({
      key: candidate.key,
      label: entry?.label ?? candidate.surface,
      category,
      weight: computeWeight(candidate, category),
      frequency: candidate.frequency,
      required: candidate.required,
      jobForm: candidate.surface,
    });
  }

  return keywords
    .sort((a, b) => b.weight - a.weight || b.frequency - a.frequency)
    .slice(0, MAX_KEYWORDS);
}

/* ---------------------------------------------------------------------------
 * Índice do currículo
 * ------------------------------------------------------------------------- */

interface ResumeIndex {
  /** Chaves canônicas (com equivalências e sinônimos): é o que conta para o score. */
  canonical: Set<string>;
  /** Chaves literais (sem equivalências): detectam quando o match foi só por sinônimo. */
  literal: Set<string>;
  /** Como cada chave canônica aparece escrita no currículo. */
  surfaceByKey: Map<string, string>;
}

/** Indexa todas as sequências de 1 a N palavras, para casar expressões do dicionário. */
function indexText(text: string): ResumeIndex {
  const index: ResumeIndex = { canonical: new Set(), literal: new Set(), surfaceByKey: new Map() };
  const add = (canonicalKey: string, literalKey: string, surface: string) => {
    for (const key of new Set([canonicalKey, resolve(canonicalKey)])) {
      index.canonical.add(key);
      if (!index.surfaceByKey.has(key)) index.surfaceByKey.set(key, surface);
    }
    index.literal.add(literalKey);
  };
  for (const segment of splitSegments(text)) {
    const tokens = tokenize(segment);
    const keys = tokens.map(canonicalToken);
    const literals = tokens.map(literalToken);
    for (let i = 0; i < keys.length; i += 1) {
      for (let length = 1; length <= MAX_PHRASE && i + length <= keys.length; length += 1) {
        add(
          keys.slice(i, i + length).join(' '),
          literals.slice(i, i + length).join(' '),
          tokens.slice(i, i + length).join(' '),
        );
      }
    }
  }
  return index;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Recupera a grafia original ("APIs RESTful") de um termo normalizado ("apis restful"). */
function originalCase(text: string, surface: string): string {
  const pattern = surface.split(' ').map(escapeRegExp).join('[\\s\\W]{1,3}');
  return new RegExp(pattern, 'iu').exec(text)?.[0] ?? surface;
}

/** Seções em que um termo aparece "em uso" (não apenas listado). */
const CONTEXT_SECTIONS = new Set<Block['id']>(['summary', 'experience', 'projects', 'other']);

/* ---------------------------------------------------------------------------
 * Erros de digitação (Damerau–Levenshtein restrito)
 * ------------------------------------------------------------------------- */

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, d[i - 2]![j - 2]! + 1);
      d[i]![j] = value;
    }
  }
  return d[a.length]![b.length]!;
}

/**
 * Palavras candidatas a erro: as da seção de habilidades e as escritas com maiúscula no meio da
 * frase (nomes de ferramentas). Evita confundir verbos comuns ("reduz") com termos ("Redux").
 */
function typoCandidates(blocks: Block[], headerLines: string[]): Map<string, string> {
  const candidates = new Map<string, string>();
  const scan = (line: string, includeAll: boolean) => {
    const words = [...line.matchAll(/[\p{L}\p{N}+#.]+/gu)].map((match) => match[0].replace(/\.+$/, ''));
    words.forEach((word, index) => {
      const plain = stripAccents(word.toLowerCase());
      if (plain.length < 4 || isStopword(plain)) return;
      const capitalizedMidSentence = index > 0 && /\p{Lu}/u.test(word);
      if (includeAll || capitalizedMidSentence) candidates.set(plain, word);
    });
  };
  for (const block of blocks) for (const line of block.lines) scan(line, block.id === 'skills');
  for (const line of headerLines) scan(line, false);
  return candidates;
}

/* ---------------------------------------------------------------------------
 * Cruzamento
 * ------------------------------------------------------------------------- */

export interface KeywordMatch {
  keywords: Keyword[];
  found: Keyword[];
  missing: Keyword[];
  synonymHints: SynonymHint[];
  typoAlerts: TypoAlert[];
  /** 0–100, ou null se a vaga não tiver termos reconhecíveis. */
  score: number | null;
}

export function matchKeywords(jobText: string, resumeText: string, blocks: Block[], headerLines: string[]): KeywordMatch {
  const keywords = extractKeywords(jobText);
  const resumeIndex = indexText(resumeText);
  const contextIndex = indexText(
    blocks.filter((block) => CONTEXT_SECTIONS.has(block.id)).flatMap((block) => block.lines).join('\n'),
  );

  const found: Keyword[] = [];
  const missing: Keyword[] = [];
  const synonymHints: SynonymHint[] = [];

  for (const keyword of keywords) {
    if (!resumeIndex.canonical.has(keyword.key)) {
      missing.push(keyword);
      continue;
    }
    const matched = { ...keyword, inContext: contextIndex.canonical.has(keyword.key) };
    found.push(matched);
    // Encontrado só por equivalência: sugere escrever também a forma usada na vaga.
    const jobLiteral = tokenize(keyword.jobForm).map(literalToken).join(' ');
    if (jobLiteral && !resumeIndex.literal.has(jobLiteral)) {
      const surface = resumeIndex.surfaceByKey.get(keyword.key);
      synonymHints.push({
        keyword: matched,
        jobForm: originalCase(jobText, keyword.jobForm),
        resumeForm: surface ? originalCase(resumeText, surface) : keyword.label,
      });
    }
  }

  // Erros de digitação: só para termos ausentes de uma palavra, com grafia próxima no currículo.
  const jobWords = new Set(tokenize(jobText).map((token) => stripAccents(token)));
  const candidates = typoCandidates(blocks, headerLines);
  const typoAlerts: TypoAlert[] = [];
  for (const keyword of missing) {
    const target = stripAccents(keyword.label.toLowerCase());
    if (target.includes(' ') || target.length < 5 || keyword.category === 'general') continue;
    const sortedTarget = [...target].sort().join('');
    for (const [plain, original] of candidates) {
      if (plain === target || plain[0] !== target[0] || jobWords.has(plain)) continue;
      if (Math.abs(plain.length - target.length) > 2) continue;
      if (lexiconCategory(canonicalToken(plain))) continue; // é outro termo válido
      // Distância 2 só para termos longos ou letras embaralhadas ("Phyton" → Python).
      const scrambled = [...plain].sort().join('') === sortedTarget;
      const maxDistance = target.length >= 9 || (scrambled && target.length >= 6) ? 2 : 1;
      if (editDistance(plain, target) <= maxDistance) {
        typoAlerts.push({ keyword, resumeForm: original });
        break;
      }
    }
  }

  const totalWeight = keywords.reduce((sum, keyword) => sum + keyword.weight, 0);
  const matchedWeight = found.reduce(
    (sum, keyword) => sum + keyword.weight * (keyword.inContext ? 1 + CONTEXT_BONUS : 1),
    0,
  );
  const score = totalWeight === 0 ? null : Math.min(100, Math.round((matchedWeight / totalWeight) * 100));

  return { keywords, found, missing, synonymHints, typoAlerts, score };
}
