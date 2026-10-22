import { describe, expect, test } from 'vitest';
import { analyzeResume, classifyScore } from '../src/utils/atsAnalyzer';
import { findDateRanges, mergedMonths, monthsToYears } from '../src/utils/dates';
import { analyzeEducation } from '../src/utils/educationAnalyzer';
import { extractRequiredYears } from '../src/utils/experienceAnalyzer';
import { analyzeLegibility } from '../src/utils/legibilityAnalyzer';
import { parseBlocks } from '../src/utils/resumeBuilder';

/** Mês absoluto (ano * 12 + mês - 1), como em dates.ts. Hoje (fixado em tests/setup.ts) = out/2026. */
const month = (year: number, monthNumber: number) => year * 12 + monthNumber - 1;
const TODAY = month(2026, 10);

describe('períodos de experiência', () => {
  test.each([
    ['mar/2022 – atual', month(2022, 3), TODAY],
    ['03/2019 - 02/2021', month(2019, 3), month(2021, 2)],
    ['Janeiro de 2020 a Dezembro de 2021', month(2020, 1), month(2021, 12)],
    ['2018 a 2020', month(2018, 1), month(2020, 12)],
    ['jan 2021 – presente', month(2021, 1), TODAY],
    ['Sep 2019 - Aug 2020', month(2019, 9), month(2020, 8)],
    ['ago/2023 até o momento', month(2023, 8), TODAY],
  ])('"%s"', (text, start, end) => {
    const [range] = findDateRanges(text);
    expect(range).toMatchObject({ start, end });
  });

  test('datas no futuro são limitadas a hoje e período invertido é ignorado', () => {
    expect(findDateRanges('jan/2026 – dez/2030')[0]?.end).toBe(TODAY);
    expect(findDateRanges('2022 – 2019')).toEqual([]);
  });

  test('ano solto ("formada em 2019") não é período', () => {
    expect(findDateRanges('Formada em 2019')).toEqual([]);
  });

  test('períodos sobrepostos não contam em dobro', () => {
    const total = mergedMonths([
      { start: month(2020, 1), end: month(2020, 12) },
      { start: month(2020, 7), end: month(2021, 6) },
      { start: month(2023, 1), end: month(2023, 3) },
    ]);
    expect(total).toBe(18 + 3);
    expect(monthsToYears(18)).toBe(1.5);
  });
});

describe('anos exigidos pela vaga', () => {
  test.each([
    ['- 3+ anos de experiência com React.', 3],
    ['- Experiência mínima de 2 anos em contabilidade.', 2],
    ['- At least 4 years of experience.', 4],
    ['- Mínimo de 5 anos na função.', 5],
    ['- Experiência com Excel.', null],
    ['- 40 anos de mercado (sobre a empresa).', null],
  ])('"%s" → %s', (line, expected) => {
    expect(extractRequiredYears(`Analista\nRequisitos\n${line}`)).toBe(expected);
  });
});

describe('formação', () => {
  const analyze = (job: string, resume: string) => analyzeEducation(job, resume, parseBlocks(resume).blocks);

  test('superior exigido × bacharelado no currículo', () => {
    const result = analyze('Analista\nRequisitos\n- Superior completo em Administração.', 'Formação\nBacharelado em Administração — USP | 2018');
    expect(result.requiredLevel).toBe('superior');
    expect(result.resumeLevel).toBe('superior');
    expect(result.score).toBe(100);
  });

  test('cursando quando a vaga exige completo pesa menos', () => {
    const completed = analyze('Analista\n- Superior completo.', 'Formação\nBacharelado em Economia — USP | 2018').score!;
    const inProgress = analyze('Analista\n- Superior completo.', 'Formação\nBacharelado em Economia (cursando) — USP').score!;
    expect(inProgress).toBeLessThan(completed);
  });

  test('vaga sem exigência de formação → critério fora da conta', () => {
    expect(analyze('Designer\n- Photoshop.', 'Formação\nBacharelado em Design').score).toBeNull();
  });

  test('registro profissional exigido (OAB) é verificado', () => {
    const result = analyze('Advogado\nRequisitos\n- OAB ativa.', 'Advogada\nOAB/SP 123.456\n\nFormação\nDireito — PUC | 2015');
    expect(result.credentials).toContainEqual({ name: 'OAB', found: true });
  });

  test('"CRM de vendas" não é registro de médico', () => {
    const result = analyze('Vendedor\nRequisitos\n- Experiência com CRM de vendas.', 'Vendedor');
    expect(result.credentials.map((credential) => credential.name)).not.toContain('CRM');
  });
});

describe('legibilidade ATS', () => {
  const complete = `Ana Souza
ana@email.com | (11) 91234-5678

Habilidades
Excel

Experiência
Analista — Empresa | jan/2020 – atual
- Relatórios.

Formação
Administração — USP | 2018`;
  const analyze = (text: string, typos = 0, layout: { multiColumn: boolean } | null = null) =>
    analyzeLegibility(text, parseBlocks(text).blocks, typos, layout);

  test('currículo completo passa em tudo (100)', () => {
    const result = analyze(complete);
    expect(result.checks.filter((check) => !check.passed).map((check) => check.id)).toEqual([]);
    expect(result.score).toBe(100);
  });

  test.each([
    ['email', complete.replace('ana@email.com | ', '')],
    ['phone', complete.replace(' | (11) 91234-5678', '')],
    ['skills-section', complete.replace('Habilidades\nExcel\n\n', '')],
    ['dates', complete.replace(' | jan/2020 – atual', '')],
  ])('sem %s: a verificação falha e a nota cai', (id, text) => {
    const result = analyze(text);
    expect(result.checks.find((check) => check.id === id)?.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  test('erro de digitação reprova "termos escritos corretamente"', () => {
    expect(analyze(complete, 1).checks.find((check) => check.id === 'spelling')?.passed).toBe(false);
  });

  test('texto colado: o layout não é verificado (não dá para saber)', () => {
    const result = analyze(complete);
    expect(result.layoutChecked).toBe(false);
    expect(result.checks.map((check) => check.id)).not.toContain('layout');
  });

  test('arquivo de uma coluna: passa no layout e a nota continua 100', () => {
    const result = analyze(complete, 0, { multiColumn: false });
    expect(result.layoutChecked).toBe(true);
    expect(result.checks.find((check) => check.id === 'layout')?.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  test('arquivo em colunas: reprova o layout e a nota cai', () => {
    const result = analyze(complete, 0, { multiColumn: true });
    expect(result.checks.find((check) => check.id === 'layout')?.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThan(80);
  });

  test('o layout chega até a análise completa', () => {
    const job = 'Analista\nRequisitos\n- Excel.';
    const pasted = analyzeResume(job, complete);
    const fromColumns = analyzeResume(job, complete, { fileLayout: { multiColumn: true } });
    expect(fromColumns.legibility.score).toBeLessThan(pasted.legibility.score);
    expect(fromColumns.score).toBeLessThanOrEqual(pasted.score);
  });
});

describe('nota final', () => {
  test.each([
    [0, 'low'],
    [49, 'low'],
    [50, 'medium'],
    [74, 'medium'],
    [75, 'strong'],
    [100, 'strong'],
  ] as const)('%i → %s', (score, level) => {
    expect(classifyScore(score)).toBe(level);
  });

  test('critério não exigido sai da conta (peso redistribuído, ninguém ganha ponto de graça)', () => {
    const result = analyzeResume('Designer\nRequisitos\n- Photoshop.', 'Bia\nbia@email.com\n\nHabilidades\nPhotoshop');
    const education = result.subScores.find((item) => item.id === 'education')!;
    expect(education.score).toBeNull();
    expect(education.effectiveWeight).toBe(0);
    const totalWeight = result.subScores.reduce((sum, item) => sum + item.effectiveWeight, 0);
    expect(totalWeight).toBeGreaterThanOrEqual(99);
    expect(totalWeight).toBeLessThanOrEqual(101);
  });

  test('textos vazios não quebram a análise', () => {
    expect(() => analyzeResume('', '')).not.toThrow();
    expect(analyzeResume('', '').level).toBe('low');
  });
});
