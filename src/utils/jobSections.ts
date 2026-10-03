import { stripAccents } from './textProcessing';

/**
 * Classifica as linhas da vaga pela seção em que estão: requisitos pesam mais,
 * diferenciais menos e benefícios são ignorados.
 */
export type JobSectionMode = 'neutral' | 'required' | 'nice' | 'ignore';

const SECTION_MODES: Array<{ mode: JobSectionMode; pattern: RegExp }> = [
  { mode: 'ignore', pattern: /(beneficio|oferecemos|remuneracao|perks|benefits)/ },
  { mode: 'nice', pattern: /(diferencia|desejave|nice to have|bonus|sera um plus)/ },
  {
    mode: 'required',
    pattern: /(requisito|obrigatori|qualificac|exigido|essencia|must have|requirements|o que buscamos|o que esperamos|voce precisa)/,
  },
  {
    mode: 'neutral',
    pattern: /(responsabilidade|atividade|atribuic|sobre|descricao|o que voce vai fazer|desafio|responsibilities|about)/,
  },
];

export function detectJobSection(line: string): JobSectionMode | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 45 || /^[-•*▪►➤–—·●]/.test(trimmed)) return null;
  const plain = stripAccents(trimmed.toLowerCase());
  if (plain.split(/\s+/).length > 5) return null;
  return SECTION_MODES.find((section) => section.pattern.test(plain))?.mode ?? null;
}

export interface JobLine {
  text: string;
  mode: JobSectionMode;
}

/** Linha que se declara opcional ("CRC ativo é um diferencial"), mesmo dentro de Requisitos. */
const INLINE_NICE = /(diferencia|desejave|nice to have|sera um plus|\bplus\b|nao obrigatori|is a plus)/;

/** Linhas de conteúdo da vaga (sem os títulos de seção e sem benefícios). */
export function jobContentLines(jobText: string): JobLine[] {
  const lines: JobLine[] = [];
  let mode: JobSectionMode = 'neutral';
  for (const line of jobText.split(/\r?\n/)) {
    const detected = detectJobSection(line);
    if (detected) {
      mode = detected;
      continue;
    }
    if (mode === 'ignore' || !line.trim()) continue;
    const inlineNice = mode !== 'nice' && INLINE_NICE.test(stripAccents(line.toLowerCase()));
    lines.push({ text: line.trim(), mode: inlineNice ? 'nice' : mode });
  }
  return lines;
}
