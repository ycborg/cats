import { describe, expect, test } from 'vitest';
import type { Keyword } from '../src/types/ats';
import { analyzeResume, extractKeywords } from '../src/utils/atsAnalyzer';
import { extractRequiredYears } from '../src/utils/experienceAnalyzer';
import { stripAccents, termKey } from '../src/utils/textProcessing';
import { CASOS } from './casos/casos';

/** Compara ignorando acento, maiúsculas, plural e sinônimos de grafia (mesma chave do motor). */
const sameTerm = (keyword: Keyword, term: string): boolean => {
  const plain = (value: string) => stripAccents(value.toLowerCase()).trim();
  return keyword.key === termKey(term) || plain(keyword.label) === plain(term) || plain(keyword.jobForm) === plain(term);
};

const labels = (keywords: Keyword[]) => keywords.map((keyword) => keyword.label);

describe.each(CASOS)('$nome', (caso) => {
  const keywords = extractKeywords(caso.vaga);
  const result = caso.curriculo === undefined ? null : analyzeResume(caso.vaga, caso.curriculo);

  if (caso.nuncaPalavrasChave) {
    test.each(caso.nuncaPalavrasChave)('"%s" não é palavra-chave', (term) => {
      expect(keywords.filter((keyword) => sameTerm(keyword, term)).map((keyword) => keyword.label)).toEqual([]);
    });
  }

  if (caso.palavrasChave) {
    test.each(caso.palavrasChave)('"%s" é palavra-chave da vaga', (term) => {
      expect(keywords.some((keyword) => sameTerm(keyword, term)), `palavras-chave: ${labels(keywords).join(', ')}`).toBe(true);
    });
  }

  if (caso.anosExigidos !== undefined) {
    test(`exige ${caso.anosExigidos ?? 'nenhum'} ano(s) de experiência`, () => {
      expect(extractRequiredYears(caso.vaga)).toBe(caso.anosExigidos);
    });
  }

  if (!result) return;

  if (caso.encontradas) {
    test.each(caso.encontradas)('"%s" é encontrada no currículo', (term) => {
      expect(result.found.some((keyword) => sameTerm(keyword, term)), `encontradas: ${labels(result.found).join(', ')}`).toBe(true);
    });
  }

  if (caso.faltando) {
    test.each(caso.faltando)('"%s" aparece como faltando', (term) => {
      expect(result.missing.some((keyword) => sameTerm(keyword, term)), `faltando: ${labels(result.missing).join(', ')}`).toBe(true);
    });
  }

  if (caso.errosDeDigitacao) {
    test.each(caso.errosDeDigitacao)('"%s" gera alerta de erro de digitação', (written) => {
      expect(result.typoAlerts.map((alert) => alert.resumeForm)).toContain(written);
    });
  }

  if (caso.semErroDeDigitacao) {
    test.each(caso.semErroDeDigitacao)('"%s" não gera alerta de erro de digitação', (written) => {
      expect(result.typoAlerts.map((alert) => alert.resumeForm)).not.toContain(written);
    });
  }

  if (caso.titulo) {
    test(`título: ${caso.titulo}`, () => {
      expect(result.title.verdict, result.title.explanation).toBe(caso.titulo);
    });
  }

  if (caso.formacaoNoCurriculo !== undefined) {
    test(`formação lida do currículo: ${caso.formacaoNoCurriculo ?? 'nenhuma'}`, () => {
      expect(result.education.resumeLevel).toBe(caso.formacaoNoCurriculo);
    });
  }

  if (caso.nota) {
    const { min = 0, max = 100 } = caso.nota;
    test(`nota entre ${min} e ${max}`, () => {
      expect(result.score).toBeGreaterThanOrEqual(min);
      expect(result.score).toBeLessThanOrEqual(max);
    });
  }

  if (caso.nivel) {
    test(`nível: ${caso.nivel}`, () => {
      expect(result.level).toBe(caso.nivel);
    });
  }
});
