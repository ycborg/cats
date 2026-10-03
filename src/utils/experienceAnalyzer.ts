import type { ExperienceAnalysis, ExperienceEntry } from '../types/ats';
import { findDateRanges, mergedMonths, monthsToYears } from './dates';
import { jobContentLines } from './jobSections';
import type { Block } from './resumeBuilder';
import { BULLET, cleanText } from './resumeBuilder';
import { stripAccents } from './textProcessing';
import type { NormalizedTitle } from './titleMatcher';
import { compareTitles, isRecognizable, normalizeTitle } from './titleMatcher';

/** Cargos com pelo menos esta nota de título contam como experiência relevante. */
const RELEVANT_TITLE_SCORE = 50;
const MAX_REASONABLE_YEARS = 20;

const YEARS_PATTERNS: RegExp[] = [
  // "3+ anos de experiência", "5 years of experience"
  /(\d{1,2})\s*\+?\s*(?:anos?|years?)\s*(?:de|of)?\s*(?:experiencia|experience|atuacao|vivencia)/g,
  // "experiência mínima de 3 anos", "experiência de pelo menos 2 anos com..."
  /(?:experiencia|experience|atuacao|vivencia)[^.\n]{0,40}?(?:minim[oa] de|pelo menos|at least|acima de|mais de)\s*(\d{1,2})\s*\+?\s*(?:anos?|years?)/g,
  // "mínimo de 2 anos", "at least 4 years"
  /(?:minimo de|pelo menos|at least)\s*(\d{1,2})\s*(?:anos?|years?)/g,
];

/** Anos de experiência exigidos pela vaga (ignora diferenciais e benefícios). */
export function extractRequiredYears(jobText: string): number | null {
  const values: number[] = [];
  for (const { text, mode } of jobContentLines(jobText)) {
    if (mode === 'nice') continue;
    const plain = stripAccents(text.toLowerCase());
    for (const pattern of YEARS_PATTERNS) {
      for (const match of plain.matchAll(pattern)) {
        const years = Number(match[1]);
        if (years > 0 && years <= MAX_REASONABLE_YEARS) values.push(years);
      }
    }
  }
  // "5 anos em TI, sendo 2 com React": a exigência principal é a maior.
  return values.length ? Math.max(...values) : null;
}

/** Remove datas e separadores, ficando com o trecho do cargo ("Desenvolvedora Front-end"). */
function roleCandidates(text: string): string[] {
  return text
    .replace(BULLET, '')
    .split(/\s*[|–—@•·]\s*|\s+-\s+|,\s+/)
    .map((part) => cleanText(part.replace(/[()]/g, ' ')))
    .filter((part) => part.length >= 3 && /[a-zA-ZÀ-ú]/.test(part));
}

interface RawEntry {
  roleOptions: string[];
  period: string;
  ranges: ReturnType<typeof findDateRanges>;
}

/** Cada período encontrado vira uma experiência; o cargo vem da mesma linha ou das anteriores. */
function extractEntries(blocks: Block[]): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const block of blocks) {
    if (block.id !== 'experience') continue;
    block.lines.forEach((line, index) => {
      const ranges = findDateRanges(line);
      if (!ranges.length || BULLET.test(line)) return;
      // Sem acento o texto mantém o mesmo comprimento, então o índice vale para a linha original.
      const plain = stripAccents(line.normalize('NFC').toLowerCase());
      const cut = Math.max(0, plain.indexOf(ranges[0]!.text));
      const original = line.normalize('NFC');
      const sameLine = roleCandidates(original.slice(0, cut));
      const previous = [block.lines[index - 1], block.lines[index - 2]]
        .filter((candidate): candidate is string => Boolean(candidate) && !BULLET.test(candidate!))
        .flatMap(roleCandidates);
      // O cargo das linhas anteriores só vale quando a própria linha não traz um cargo reconhecível
      // (formato "Cargo\nEmpresa | período"); senão herdaria o cargo da experiência anterior.
      const sameLineHasRole = sameLine.some((candidate) => isRecognizable(normalizeTitle(candidate)));
      entries.push({
        roleOptions: sameLineHasRole ? sameLine : [...sameLine, ...previous],
        period: cleanText(original.slice(cut)),
        ranges,
      });
    });
  }
  return entries;
}

export interface ExperienceContext {
  blocks: Block[];
  jobTitle: NormalizedTitle | null;
}

export function analyzeExperience(jobText: string, { blocks, jobTitle }: ExperienceContext): ExperienceAnalysis {
  const requiredYears = extractRequiredYears(jobText);
  const rawEntries = extractEntries(blocks);

  const entries: ExperienceEntry[] = [];
  const allRanges: RawEntry['ranges'] = [];
  const relevantRanges: RawEntry['ranges'] = [];

  for (const entry of rawEntries) {
    // Melhor cargo candidato para esta experiência (mesma linha ou linhas anteriores).
    let role = entry.roleOptions[0] ?? 'Cargo não identificado';
    let bestScore = jobTitle ? 0 : 100;
    if (jobTitle) {
      for (const option of entry.roleOptions) {
        const { score } = compareTitles(jobTitle, normalizeTitle(option));
        if (score > bestScore) {
          bestScore = score;
          role = option;
        }
      }
    }
    const relevant = bestScore >= RELEVANT_TITLE_SCORE;
    const months = mergedMonths(entry.ranges);
    entries.push({ role, period: entry.period, months, relevant });
    allRanges.push(...entry.ranges);
    if (relevant) relevantRanges.push(...entry.ranges);
  }

  const totalYears = monthsToYears(mergedMonths(allRanges));
  const relevantYears = monthsToYears(mergedMonths(relevantRanges));
  const score =
    requiredYears === null ? null : Math.min(100, Math.round((relevantYears / requiredYears) * 100));

  return { requiredYears, totalYears, relevantYears, entries, score };
}
