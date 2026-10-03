import type { ExperienceEntry, TitleAnalysis } from '../types/ats';
import { cleanText } from './resumeBuilder';
import { stripAccents } from './textProcessing';
import type { NormalizedTitle } from './titleMatcher';
import { compareTitles, isRecognizable, normalizeTitle, seniorityOf } from './titleMatcher';

const LABELED_TITLE = /^(vaga|cargo|posicao|position|job title|titulo|role)\s*:\s*/;
/** Cargos mais antigos que o atual valem um pouco menos. */
const OLDER_ROLE_FACTOR = 0.9;

/** Título da vaga: linha rotulada ("Cargo: …") ou a primeira linha, sem empresa/modalidade. */
export function extractJobTitle(jobText: string): { raw: string; normalized: NormalizedTitle } | null {
  const lines = jobText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 4);
  const labeled = lines.find((line) => LABELED_TITLE.test(stripAccents(line.toLowerCase())));
  const source = labeled ? labeled.slice(labeled.indexOf(':') + 1) : lines[0];
  if (!source || source.length > 120) return null;

  const raw = cleanText(source.replace(/\((a|o|as|os|e)\)/gi, '').split(/\s[—–|]\s|\s-\s|\s\(|:\s/)[0] ?? '');
  const normalized = normalizeTitle(raw);
  return raw && isRecognizable(normalized) ? { raw, normalized } : null;
}

const VERDICT_TEXT = {
  same: (best: string) => `Seu cargo "${best}" corresponde ao cargo da vaga.`,
  close: (best: string, job: string) =>
    `"${best}" é próximo de "${job}", mas não idêntico. O ATS pode ranquear abaixo de quem tem exatamente esse título.`,
  neighbor: (best: string, job: string) =>
    `"${best}" é um cargo vizinho. A maioria dos ATS e recrutadores não o considera equivalente a "${job}".`,
  none: (job: string) =>
    `Nenhum cargo do seu currículo corresponde a "${job}". Se você exerceu essa função com outro nome, deixe isso claro na descrição da experiência.`,
};

export function analyzeTitle(jobText: string, headline: string, entries: ExperienceEntry[]): TitleAnalysis {
  const job = extractJobTitle(jobText);
  if (!job) {
    return {
      jobTitle: null,
      bestMatch: null,
      verdict: 'unknown',
      score: null,
      explanation: 'Não identificamos o título do cargo. Deixe o nome da vaga na primeira linha da descrição.',
    };
  }

  // O cargo mais recente vem primeiro no histórico; o título do cabeçalho vale como o atual.
  const candidates = [
    ...entries.map((entry, index) => ({ title: entry.role, factor: index === 0 ? 1 : OLDER_ROLE_FACTOR })),
    ...(headline ? [{ title: headline, factor: 1 }] : []),
  ];

  let best: { title: string; score: number } | null = null;
  for (const candidate of candidates) {
    const { score } = compareTitles(job.normalized, normalizeTitle(candidate.title));
    const weighted = Math.round(score * candidate.factor);
    if (!best || weighted > best.score) best = { title: candidate.title, score: weighted };
  }

  const score = best?.score ?? 0;
  const bestTitle = best && best.score > 0 ? best.title : null;
  const verdict = score >= 90 ? 'same' : score >= 50 ? 'close' : score > 0 ? 'neighbor' : 'none';

  let explanation =
    verdict === 'none' || !bestTitle
      ? VERDICT_TEXT.none(job.raw)
      : verdict === 'same'
        ? VERDICT_TEXT.same(bestTitle)
        : VERDICT_TEXT[verdict](bestTitle, job.raw);

  const jobSeniority = seniorityOf(job.raw);
  const resumeSeniority = bestTitle ? seniorityOf(bestTitle) : null;
  if (jobSeniority && resumeSeniority && jobSeniority !== resumeSeniority) {
    explanation += ` Atenção à senioridade: a vaga é ${jobSeniority} e seu cargo é ${resumeSeniority}.`;
  }

  return { jobTitle: job.raw, bestMatch: bestTitle, verdict, score, explanation };
}
