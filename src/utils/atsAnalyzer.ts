import type { AnalysisResult, MatchLevel, SubScore, SubScoreId } from '../types/ats';
import { EDUCATION_LEVEL_LABEL, analyzeEducation } from './educationAnalyzer';
import { analyzeExperience } from './experienceAnalyzer';
import { matchKeywords } from './keywordAnalyzer';
import type { FileLayout } from './legibilityAnalyzer';
import { analyzeLegibility } from './legibilityAnalyzer';
import { detectJobSection } from './jobSections';
import { buildMissingSuggestions, buildTips } from './recommendations';
import { EMAIL } from './patterns';
import { buildAtsResume, parseBlocks } from './resumeBuilder';
import { analyzeTitle, extractJobTitle } from './titleAnalyzer';
import { TITLE_VERDICT_LABEL } from './titleMatcher';

export { extractKeywords } from './keywordAnalyzer';

export const MATCH_LEVEL_LABEL: Record<MatchLevel, string> = {
  low: 'Baixa Compatibilidade',
  medium: 'Média Compatibilidade',
  strong: 'Forte Compatibilidade',
};

/** Pesos nominais do score composto (%). Critérios não exigidos pela vaga saem da conta. */
export const SUB_SCORE_WEIGHTS: Record<SubScoreId, number> = {
  keywords: 45,
  title: 15,
  experience: 15,
  education: 10,
  legibility: 15,
};

export const SUB_SCORE_LABEL: Record<SubScoreId, string> = {
  keywords: 'Palavras-chave',
  title: 'Título do cargo',
  experience: 'Experiência',
  education: 'Formação',
  legibility: 'Legibilidade ATS',
};

export function classifyScore(score: number): MatchLevel {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'medium';
  return 'low';
}

export const formatYears = (years: number): string =>
  `${years.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${years === 1 ? 'ano' : 'anos'}`;

export interface AnalyzeOptions {
  /** Layout do arquivo de onde o currículo foi importado (ausente quando o texto foi colado). */
  fileLayout?: FileLayout | null;
}

export function analyzeResume(jobText: string, resumeText: string, options: AnalyzeOptions = {}): AnalysisResult {
  const { headerLines, blocks } = parseBlocks(resumeText);

  const keywordMatch = matchKeywords(jobText, resumeText, blocks, headerLines);
  const resume = buildAtsResume({ headerLines, blocks }, keywordMatch);
  const jobTitle = extractJobTitle(jobText);
  const experience = analyzeExperience(jobText, { blocks, jobTitle: jobTitle?.normalized ?? null });
  const title = analyzeTitle(jobTitle, resume.headline, experience.entries);
  const education = analyzeEducation(jobText, resumeText, blocks);
  const legibility = analyzeLegibility(resumeText, blocks, keywordMatch.typoAlerts.length, options.fileLayout ?? null);

  const inContext = keywordMatch.found.filter((keyword) => keyword.inContext).length;
  const totalKeywords = keywordMatch.found.length + keywordMatch.missing.length;
  const passedChecks = legibility.checks.filter((check) => check.passed).length;

  const raw: Array<Omit<SubScore, 'effectiveWeight' | 'weight' | 'label'>> = [
    {
      id: 'keywords',
      score: keywordMatch.score,
      summary:
        keywordMatch.score === null
          ? 'Nenhum termo reconhecível na vaga'
          : `${keywordMatch.found.length} de ${totalKeywords} termos · ${inContext} citados em contexto`,
    },
    {
      id: 'title',
      score: title.score,
      summary:
        title.verdict === 'unknown'
          ? 'Título da vaga não identificado'
          : TITLE_VERDICT_LABEL[title.verdict],
    },
    {
      id: 'experience',
      score: experience.score,
      summary:
        experience.requiredYears === null
          ? 'Não exigida pela vaga'
          : `${formatYears(experience.relevantYears)} relevantes de ${formatYears(experience.requiredYears)} exigidos`,
    },
    {
      id: 'education',
      score: education.score,
      summary:
        education.score === null
          ? 'Não exigida pela vaga'
          : education.requiredLevel
            ? `${EDUCATION_LEVEL_LABEL[education.requiredLevel]} exigido · ${
                education.resumeLevel ? EDUCATION_LEVEL_LABEL[education.resumeLevel] : 'não encontrado'
              }${education.resumeLevelInProgress ? ' (em andamento)' : ''}`
            : `${education.credentials.filter((c) => c.found).length} de ${education.credentials.length} registros/certificações`,
    },
    {
      id: 'legibility',
      score: legibility.score,
      summary: `${passedChecks} de ${legibility.checks.length} verificações`,
    },
  ];

  // Redistribui o peso dos critérios não exigidos: ninguém ganha pontos "de graça".
  const applicableWeight = raw.reduce((sum, item) => sum + (item.score === null ? 0 : SUB_SCORE_WEIGHTS[item.id]), 0);
  const subScores: SubScore[] = raw.map((item) => ({
    ...item,
    label: SUB_SCORE_LABEL[item.id],
    weight: SUB_SCORE_WEIGHTS[item.id],
    effectiveWeight:
      item.score === null || applicableWeight === 0
        ? 0
        : Math.round((SUB_SCORE_WEIGHTS[item.id] / applicableWeight) * 100),
  }));

  const score =
    applicableWeight === 0
      ? 0
      : Math.round(
          subScores.reduce((sum, item) => sum + (item.score ?? 0) * SUB_SCORE_WEIGHTS[item.id], 0) / applicableWeight,
        );

  // Sem nenhum critério da vaga reconhecido, só a legibilidade pontua: a nota seria enganosa.
  const jobRecognized = subScores.some((item) => item.id !== 'legibility' && item.score !== null);

  return {
    score,
    jobRecognized,
    level: classifyScore(score),
    subScores,
    found: keywordMatch.found,
    missing: keywordMatch.missing,
    synonymHints: keywordMatch.synonymHints,
    typoAlerts: keywordMatch.typoAlerts,
    title,
    experience,
    education,
    legibility,
    tips: buildTips(resumeText),
    suggestions: buildMissingSuggestions(keywordMatch.missing),
    resume,
  };
}

/** Texto sem diferença de caixa ou de espaço e quebra de linha, para comparar os dois campos. */
const squash = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** Linha de título de seção de vaga que só aparece em vagas ("Requisitos", "Diferenciais"). */
const hasJobHeading = (text: string): boolean =>
  text.split(/\r?\n/).some((line) => {
    const mode = detectJobSection(line);
    return mode === 'required' || mode === 'nice';
  });

/**
 * Avisa quando os campos parecem errados. Conservador: "same" só com texto idêntico; "swapped" só
 * quando a vaga tem e-mail e nenhum título de requisitos E o currículo tem título de requisitos
 * e nenhum e-mail.
 */
export function detectInputMixup(jobText: string, resumeText: string): 'same' | 'swapped' | null {
  const job = squash(jobText);
  const resume = squash(resumeText);
  if (job.length < 40 || resume.length < 40) return null;
  if (job === resume) return 'same';
  const jobLooksLikeResume = EMAIL.test(jobText) && !hasJobHeading(jobText);
  const resumeLooksLikeJob = !EMAIL.test(resumeText) && hasJobHeading(resumeText);
  return jobLooksLikeResume && resumeLooksLikeJob ? 'swapped' : null;
}
