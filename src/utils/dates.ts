import { stripAccents } from './textProcessing';

/** Leitura de períodos de experiência ("mar/2022 – atual", "03/2019 - 02/2021", "2018 a 2020"). */

const MONTH_INDEX: Record<string, number> = {
  jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12,
};

const MONTH_NAME =
  '(jan(?:eiro|uary)?|fev(?:ereiro)?|feb(?:ruary)?|mar(?:co|ch)?|abr(?:il)?|apr(?:il)?|mai(?:o)?|may|jun(?:ho|e)?|jul(?:ho|y)?|ago(?:sto)?|aug(?:ust)?|set(?:embro)?|sep(?:t(?:ember)?)?|out(?:ubro)?|oct(?:ober)?|nov(?:embro|ember)?|dez(?:embro)?|dec(?:ember)?)';
const MONTH_YEAR = `(?:${MONTH_NAME}\\.?(?:\\s+de\\s+|\\s*[/.-]\\s*|\\s+)|(0?[1-9]|1[0-2])\\s*[/.-]\\s*)?((?:19|20)\\d{2})`;
const CURRENT = '(atual|atualmente|presente|present|current|hoje|o momento|now|em andamento)';
const SEPARATOR = '\\s*(?:-|–|—|a|ate|to|until)\\s*';

const rangePattern = () => new RegExp(`${MONTH_YEAR}${SEPARATOR}(?:${MONTH_YEAR}|${CURRENT})`, 'g');

export interface DateRange {
  /** Índice absoluto de mês (ano * 12 + mês - 1), inclusivo. */
  start: number;
  end: number;
  current: boolean;
  /** Trecho original reconhecido, para remover do texto. */
  text: string;
}

const monthFrom = (name: string | undefined, numeric: string | undefined, fallback: number): number => {
  if (name) return MONTH_INDEX[name.slice(0, 3)] ?? fallback;
  if (numeric) return Number(numeric);
  return fallback;
};

const NOW = (() => {
  const today = new Date();
  return today.getFullYear() * 12 + today.getMonth();
})();

/** Encontra todos os períodos de uma linha. O texto deve vir em minúsculas e sem acento. */
export function findDateRanges(line: string): DateRange[] {
  const plain = stripAccents(line.toLowerCase());
  const ranges: DateRange[] = [];
  for (const match of plain.matchAll(rangePattern())) {
    const [text, startName, startNum, startYear, endName, endNum, endYear, current] = match;
    const start = Number(startYear) * 12 + monthFrom(startName, startNum, 1) - 1;
    const end = current ? NOW : Number(endYear) * 12 + monthFrom(endName, endNum, 12) - 1;
    if (end >= start && start <= NOW) ranges.push({ start, end: Math.min(end, NOW), current: Boolean(current), text });
  }
  return ranges;
}

/** Soma de meses sem contar duas vezes períodos sobrepostos. */
export function mergedMonths(ranges: Array<Pick<DateRange, 'start' | 'end'>>): number {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let total = 0;
  let currentStart = -1;
  let currentEnd = -2;
  for (const range of sorted) {
    if (range.start > currentEnd + 1) {
      if (currentEnd >= currentStart && currentStart >= 0) total += currentEnd - currentStart + 1;
      currentStart = range.start;
      currentEnd = range.end;
    } else {
      currentEnd = Math.max(currentEnd, range.end);
    }
  }
  if (currentStart >= 0) total += currentEnd - currentStart + 1;
  return total;
}

export const monthsToYears = (months: number): number => Math.round((months / 12) * 10) / 10;
