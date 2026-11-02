import { HEAD_WORDS } from '../data/cargos';
import { HARD_SKILLS, SOFT_SKILLS, SYNONYM_GROUPS } from '../data/lexicon';
import {
  MERGE_PAIRS,
  NEGATION_CUES,
  NEGATION_EXCEPTIONS,
  NEGATION_STOPS,
  NEGATION_TRIGGERS,
  UPPERCASE_ONLY_TERMS,
} from '../data/linguagem';
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
/**
 * Termos genéricos (fora do dicionário) precisam de pelo menos 4 letras: palavras mais curtas quase
 * sempre são conectivos ("não", "sim"). Siglas técnicas curtas (SQL, AWS) vêm do dicionário.
 */
const MIN_GENERIC_LENGTH = 4;
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
export const resolveSynonym = (key: string): string => SYNONYMS.get(key) ?? key;

function lexiconCategory(key: string): LexiconEntry['category'] | null {
  return LEXICON.get(resolveSynonym(key))?.category ?? null;
}

/** Sigla que também é palavra comum ("SOLID" × "solid") só vale escrita em maiúsculas no trecho. */
function isWrittenAsTerm(key: string, raw: string): boolean {
  if (!UPPERCASE_ONLY_TERMS.has(key)) return true;
  return new RegExp(`(?<![\\p{L}])${key.toUpperCase()}(?![\\p{L}])`, 'u').test(raw);
}

/* ---------------------------------------------------------------------------
 * Extração de keywords da vaga
 * ------------------------------------------------------------------------- */

interface Segment {
  /** Trecho original, com maiúsculas (para as siglas que só valem em maiúsculas). */
  raw: string;
  tokens: string[];
  keys: string[];
  mode: JobSectionMode;
}

function segmentJob(jobText: string): Segment[] {
  return jobContentLines(jobText).flatMap(({ text, mode }) =>
    splitSegments(text)
      .map((part) => ({ raw: part, tokens: tokenize(part) }))
      .filter(({ tokens }) => tokens.length > 0)
      .map(({ raw, tokens }) => ({ raw, tokens, keys: tokens.map(canonicalToken), mode })),
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
export function isRoleWord(token: string): boolean {
  const plain = stripAccents(token);
  const masculine = plain.replace(/ora$/, 'or').replace(/eira$/, 'eiro').replace(/a$/, 'o');
  return plain in HEAD_WORDS || masculine in HEAD_WORDS;
}

function isEligibleGeneral(token: string, key: string): boolean {
  return (
    key.length >= MIN_GENERIC_LENGTH &&
    !/\d/.test(key) &&
    !isStopword(token) &&
    !isNoise(token) &&
    !isVerbLike(token) &&
    !isRoleWord(token)
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
    if (LEXICON.has(key) || SYNONYMS.has(key)) return { key: resolveSynonym(key), length };
  }
  return null;
}

/** Soma uma ocorrência do termo ao candidato (cria se ainda não existir). */
function register(target: Map<string, Candidate>, key: string, surface: string, mode: JobSectionMode): void {
  const candidate = target.get(key) ?? { key, surface, frequency: 0, required: false, nice: false, neutral: false };
  candidate.frequency += 1;
  if (mode === 'required') candidate.required = true;
  if (mode === 'nice') candidate.nice = true;
  if (mode === 'neutral') candidate.neutral = true;
  target.set(key, candidate);
}

export function extractKeywords(jobText: string): Keyword[] {
  const segments = segmentJob(jobText);
  const candidates = new Map<string, Candidate>();

  // 1) Termos do dicionário: sempre contam, mesmo citados uma única vez (maior expressão primeiro).
  const coveredBySegment = segments.map(({ raw, tokens, keys, mode }) => {
    const covered = new Array<boolean>(keys.length).fill(false);
    for (let i = 0; i < keys.length; ) {
      const match = longestLexiconMatch(keys, i);
      if (!match || !isWrittenAsTerm(match.key, raw)) {
        i += 1;
        continue;
      }
      register(candidates, match.key, tokens.slice(i, i + match.length).join(' '), mode);
      covered.fill(true, i, i + match.length);
      i += match.length;
    }
    return covered;
  });

  // 2) Expressões genéricas de duas palavras: só se recorrentes na vaga.
  const generic = new Map<string, Candidate>();
  segments.forEach(({ tokens, keys, mode }, s) => {
    const covered = coveredBySegment[s]!;
    for (let i = 0; i < keys.length - 1; i += 1) {
      if (covered[i] || covered[i + 1]) continue;
      if (isEligibleGeneral(tokens[i]!, keys[i]!) && isEligibleGeneral(tokens[i + 1]!, keys[i + 1]!)) {
        register(generic, `${keys[i]} ${keys[i + 1]}`, `${tokens[i]} ${tokens[i + 1]}`, mode);
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
      if (isEligibleGeneral(tokens[i]!, key)) register(generic, key, tokens[i]!, mode);
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
  /** Como cada chave canônica aparece escrita no currículo (a grafia direta vence a do sinônimo). */
  surfaceByKey: Map<string, string>;
}

/**
 * Marca as palavras que estão sob negação ("Não tenho experiência com Java"): do gatilho até um
 * contraste ("mas", "apenas") ou o fim da frase. Ênfase ("não só", "not only") não é negação.
 * `carried` diz se a negação vem aberta do trecho anterior da mesma frase ("Sem experiência: Java,
 * Docker" chega aqui cortado em vírgulas e dois-pontos); `carry` diz se ela continua aberta no fim.
 */
function negatedTokens(tokens: string[], carried: boolean): { negated: boolean[]; carry: boolean } {
  const plain = tokens.map((token) => stripAccents(token));
  const negated = new Array<boolean>(tokens.length).fill(false);
  /** Marca de `from` até o primeiro contraste (a partir de `stopsFrom`); devolve onde parou. */
  const markUntilStop = (from: number, stopsFrom: number): number => {
    let j = from;
    for (; j < plain.length && (j < stopsFrom || !NEGATION_STOPS.has(plain[j]!)); j += 1) negated[j] = true;
    return j;
  };
  let open = false;
  let i = 0;
  if (carried) {
    i = markUntilStop(0, 0);
    open = i >= plain.length;
  }
  for (; i < plain.length; i += 1) {
    if (!NEGATION_CUES.has(plain[i]!) || NEGATION_EXCEPTIONS.has(plain[i + 1] ?? '')) continue;
    const trigger = plain.slice(i + 1, i + 4).findIndex((token) => NEGATION_TRIGGERS.has(token));
    if (trigger < 0) continue;
    i = markUntilStop(i, i + 2 + trigger);
    open = i >= plain.length;
  }
  return { negated, carry: open };
}

/** Frases de uma linha: a negação não passa do ponto final. */
const SENTENCE_END = /(?<=[.!?])\s+/;

/** Indexa todas as sequências de 1 a N palavras, para casar expressões do dicionário. */
function indexText(text: string): ResumeIndex {
  const index: ResumeIndex = { canonical: new Set(), literal: new Set(), surfaceByKey: new Map() };
  const writtenDirectly = new Set<string>();
  const add = (canonicalKey: string, literalKey: string, surface: string) => {
    index.canonical.add(canonicalKey);
    if (!writtenDirectly.has(canonicalKey)) {
      writtenDirectly.add(canonicalKey);
      index.surfaceByKey.set(canonicalKey, surface);
    }
    const mainKey = resolveSynonym(canonicalKey);
    index.canonical.add(mainKey);
    if (!index.surfaceByKey.has(mainKey)) index.surfaceByKey.set(mainKey, surface);
    index.literal.add(literalKey);
  };
  const segments = text
    .split(/\r?\n/)
    .flatMap((line) => line.split(SENTENCE_END))
    .flatMap((sentence) => splitSegments(sentence).map((segment, position) => ({ segment, position })));
  let carry = false;
  for (const { segment, position } of segments) {
    const tokens = tokenize(segment);
    const keys = tokens.map(canonicalToken);
    const literals = tokens.map(literalToken);
    // A negação atravessa vírgulas e dois-pontos da mesma frase, mas recomeça a cada frase nova.
    const negation = negatedTokens(tokens, position > 0 && carry);
    const negated = negation.negated;
    carry = negation.carry;
    for (let i = 0; i < keys.length; i += 1) {
      for (let length = 1; length <= MAX_PHRASE && i + length <= keys.length; length += 1) {
        // Termo citado em negação não é competência da pessoa (nem a expressão que o contém).
        if (negated[i + length - 1]) break;
        const key = keys.slice(i, i + length).join(' ');
        if (!isWrittenAsTerm(resolveSynonym(key), segment)) continue;
        add(
          key,
          literals.slice(i, i + length).join(' '),
          tokens.slice(i, i + length).join(' '),
        );
      }
    }
  }
  return index;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const WORD_GAP = '[\\s\\W]{1,3}';

/** Token fundido → formas originais possíveis ("fullstack" ← "full stack"). */
const SPLIT_FORMS = new Map<string, string[]>();
for (const [pair, fused] of Object.entries(MERGE_PAIRS)) SPLIT_FORMS.set(fused, [...(SPLIT_FORMS.get(fused) ?? []), pair]);

/** Trecho do texto original que corresponde a um termo normalizado ("apis restful" → "APIs RESTful"). */
export function findWritten(text: string, surface: string): string | null {
  const tokenPattern = (token: string): string => {
    const splits = (SPLIT_FORMS.get(token) ?? []).map((pair) => pair.split(' ').map(escapeRegExp).join(WORD_GAP));
    return splits.length ? `(?:${[...splits, escapeRegExp(token)].join('|')})` : escapeRegExp(token);
  };
  const pattern = surface.split(' ').map(tokenPattern).join(WORD_GAP);
  // Fronteira de palavra: "sql" não pode casar dentro de "Mysql".
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'iu').exec(text)?.[0] ?? null;
}

const sameWriting = (a: string, b: string): boolean =>
  stripAccents(a.toLowerCase()).replace(/\s+/g, ' ').trim() === stripAccents(b.toLowerCase()).replace(/\s+/g, ' ').trim();

/** Recupera a grafia original ("APIs RESTful") de um termo normalizado ("apis restful"). */
function originalCase(text: string, surface: string): string {
  return findWritten(text, surface) ?? surface;
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
  /**
   * Como cada termo encontrado está escrito no currículo (chave → grafia original). A folha gerada
   * usa esta forma, nunca o rótulo da vaga: só o que a pessoa escreveu pode aparecer nela.
   */
  resumeForms: Map<string, string>;
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
  const resumeForms = new Map<string, string>();

  for (const keyword of keywords) {
    if (!resumeIndex.canonical.has(keyword.key)) {
      missing.push(keyword);
      continue;
    }
    const matched = { ...keyword, inContext: contextIndex.canonical.has(keyword.key) };
    found.push(matched);
    const surface = resumeIndex.surfaceByKey.get(keyword.key) ?? keyword.label;
    const resumeForm = findWritten(resumeText, surface) ?? surface;
    // O rótulo só substitui a grafia da pessoa quando muda apenas caixa e acento ("testes unitários").
    resumeForms.set(keyword.key, sameWriting(keyword.label, resumeForm) ? keyword.label : resumeForm);
    // Encontrado só por equivalência: sugere escrever também a forma usada na vaga.
    const jobLiteral = tokenize(keyword.jobForm).map(literalToken).join(' ');
    if (jobLiteral && !resumeIndex.literal.has(jobLiteral)) {
      synonymHints.push({ keyword: matched, jobForm: originalCase(jobText, keyword.jobForm), resumeForm });
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

  return { keywords, found, missing, synonymHints, typoAlerts, resumeForms, score };
}
