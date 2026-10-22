import { describe, expect, test } from 'vitest';
import type { SubScoreId } from '../src/types/ats';
import { analyzeResume } from '../src/utils/atsAnalyzer';
import type { SampleId } from '../src/utils/sampleData';
import { SAMPLES } from '../src/utils/sampleData';

/**
 * "Foto" do resultado dos 8 exemplos do site. Se uma mudança no filtro alterar alguma nota, este
 * teste falha e mostra exatamente o que mudou. Se a mudança for intencional (o filtro melhorou),
 * atualize os números aqui; se não for, o teste acabou de pegar um efeito colateral.
 */
const ESPERADO: Record<SampleId, { nota: number } & Record<SubScoreId, number | null>> = {
  tech: { nota: 90, keywords: 82, title: 100, experience: 100, education: 100, legibility: 90 },
  finance: { nota: 83, keywords: 63, title: 100, experience: 100, education: 100, legibility: 100 },
  hr: { nota: 81, keywords: 58, title: 100, experience: 100, education: 100, legibility: 100 },
  health: { nota: 87, keywords: 75, title: 100, experience: 100, education: 100, legibility: 90 },
  legal: { nota: 88, keywords: 76, title: 100, experience: 100, education: 100, legibility: 90 },
  engineering: { nota: 86, keywords: 68, title: 100, experience: 100, education: 100, legibility: 100 },
  education: { nota: 83, keywords: 62, title: 100, experience: 100, education: 100, legibility: 100 },
  design: { nota: 83, keywords: 65, title: 100, experience: 100, education: null, legibility: 100 },
};

describe.each(SAMPLES.map((sample) => [sample.area, sample] as const))('exemplo de %s', (_, sample) => {
  const result = analyzeResume(sample.job, sample.resume);
  const expected = ESPERADO[sample.id];

  test('nota final e notas de cada critério', () => {
    const actual = { nota: result.score, ...Object.fromEntries(result.subScores.map((item) => [item.id, item.score])) };
    expect(actual).toEqual(expected);
  });

  test('nenhuma palavra-chave é stopword, ruído, verbo ou número', () => {
    const suspicious = [...result.found, ...result.missing]
      .filter((keyword) => keyword.category === 'general')
      .map((keyword) => keyword.label)
      .filter((label) => /\d/.test(label) || label.length < 4);
    expect(suspicious).toEqual([]);
  });

  test('o currículo gerado mantém o nome e não inventa competências ausentes', () => {
    const sheet = JSON.stringify(result.resume).toLowerCase();
    expect(result.resume.name.length).toBeGreaterThan(0);
    for (const keyword of result.missing) {
      if (keyword.category === 'general') continue;
      // Só pode aparecer na folha se já estava escrito no currículo original.
      if (sample.resume.toLowerCase().includes(keyword.label.toLowerCase())) continue;
      expect(sheet, `"${keyword.label}" foi inventada`).not.toContain(keyword.label.toLowerCase());
    }
  });
});

test('exemplo de Tecnologia: termos, erro de digitação e sinônimo esperados', () => {
  const tech = SAMPLES.find((sample) => sample.id === 'tech')!;
  const result = analyzeResume(tech.job, tech.resume);
  expect(result.missing.map((keyword) => keyword.label)).toEqual(expect.arrayContaining(['Storybook', 'GraphQL', 'Cypress']));
  expect(result.typoAlerts.map((alert) => alert.resumeForm)).toEqual(['Storybok']);
  expect(result.synonymHints.map((hint) => hint.jobForm)).toContain('APIs REST');
});
