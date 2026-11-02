import { describe, expect, test } from 'vitest';
import { findDateRanges } from '../src/utils/dates';
import { analyzeEducation } from '../src/utils/educationAnalyzer';
import { extractRequiredYears } from '../src/utils/experienceAnalyzer';
import { parseBlocks } from '../src/utils/resumeBuilder';

/** Mês absoluto (ano * 12 + mês - 1), como em dates.ts. Hoje (fixado em tests/setup.ts) = out/2026. */
const month = (year: number, monthNumber: number) => year * 12 + monthNumber - 1;
const TODAY = month(2026, 10);

const analyze = (job: string, resume = 'Formação\nEnsino médio completo') =>
  analyzeEducation(job, resume, parseBlocks(resume).blocks);

describe('formação: "superior" sozinho não é exigência', () => {
  test('"gestor superior imediato" não cria critério de formação', () => {
    const result = analyze('Requisitos\n- Reportar ao gestor superior imediato');
    expect(result.requiredLevel).toBeNull();
    expect(result.score).toBeNull();
  });

  test('"possui" e "proposta" não são pós-graduação', () => {
    const result = analyze('Requisitos\n- Possui proposta de valor clara\n- Possui boa comunicação');
    expect(result.requiredLevel).toBeNull();
  });

  test.each([
    'Ensino superior completo em Ciência da Computação',
    'Nível superior em Administração',
    'Superior completo',
    'Superior cursando em Engenharia',
    'Graduação em Direito',
  ])('"%s" continua exigindo superior', (line) => {
    expect(analyze(`Requisitos\n- ${line}`).requiredLevel).toBe('superior');
  });

  test('"Pós-graduação em Finanças" continua pós', () => {
    const result = analyze('Requisitos\n- Pós-graduação em Finanças');
    expect(result.requiredLevel).toBe('pos');
    expect(result.requiredFields).toEqual(['financas']);
  });
});

describe('formação: linha secundária não sobrescreve a que define o nível', () => {
  const job = 'Requisitos\n- Ensino superior completo em Administração\n- Pós-graduação em andamento é bem-vinda';

  test('mantém completude e área da linha do nível exigido', () => {
    const result = analyze(job);
    expect(result.requiredLevel).toBe('superior');
    expect(result.requiresCompletion).toBe(true);
    expect(result.requiredFields).toEqual(['administracao']);
  });

  test('"andamento" e "bem-vinda" nunca viram área', () => {
    const result = analyze('Requisitos\n- Graduação completa\n- Pós-graduação em andamento é bem-vinda');
    expect(result.requiredFields).not.toContain('andamento');
    expect(result.requiredFields.join(' ')).not.toMatch(/bem-vinda|andamento/);
  });

  test('o nível mais baixo aceito continua mandando', () => {
    const result = analyze('Requisitos\n- Ensino superior completo em Direito\n- Ensino médio completo');
    expect(result.requiredLevel).toBe('medio');
  });
});

describe('formação: registros profissionais exigem contexto', () => {
  test('CRM de software não é registro de médico', () => {
    expect(analyze('Requisitos\n- Experiência com CRM e funil de vendas').credentials).toEqual([]);
  });

  test('CRO e CRA de marketing/gestão não são registros', () => {
    expect(analyze('Requisitos\n- Experiência com CRO e testes A/B').credentials).toEqual([]);
    expect(analyze('Requisitos\n- Conhecimento de CRA e métricas de funil').credentials).toEqual([]);
  });

  test.each([
    ['CRM ativo', 'CRM'],
    ['Registro no CRM', 'CRM'],
    ['CRM/SP ativo', 'CRM'],
    ['CRM-SP', 'CRM'],
    ['CRO ativo', 'CRO'],
    ['Registro no CRA', 'CRA'],
    ['CRA-SP', 'CRA'],
  ])('"%s" continua sendo registro', (line, name) => {
    expect(analyze(`Requisitos\n- ${line}`).credentials.map((c) => c.name)).toEqual([name]);
  });

  test('registro presente no currículo é encontrado', () => {
    const result = analyze('Requisitos\n- CRM ativo', 'Formação\nMedicina\nCRM-SP 123456');
    expect(result.credentials).toEqual([{ name: 'CRM', found: true }]);
  });
});

describe('formação: "technical degree"', () => {
  test('é técnico, não superior', () => {
    expect(analyze('Requisitos\n- Technical degree in IT').requiredLevel).toBe('tecnico');
  });

  test('"bachelor degree" continua superior', () => {
    expect(analyze('Requisitos\n- Bachelor degree in IT').requiredLevel).toBe('superior');
  });
});

describe('datas: formatos de período', () => {
  test.each([
    ['mar/2019 – até hoje', month(2019, 3), TODAY],
    ['jan/2020 - até o momento', month(2020, 1), TODAY],
    ['jan/2020 - até atual', month(2020, 1), TODAY],
    ['03/2019 - 02/2021', month(2019, 3), month(2021, 2)],
    ['2018 a 2020', month(2018, 1), month(2020, 12)],
    ['2018 até 2020', month(2018, 1), month(2020, 12)],
    ['mar/2022 – atual', month(2022, 3), TODAY],
  ])('"%s"', (text, start, end) => {
    expect(findDateRanges(text)[0]).toMatchObject({ start, end });
  });

  test('"Santiago 2015" não é agosto (ago em "santiago")', () => {
    const [range] = findDateRanges('Engenheiro | Santiago 2015 – 2018');
    expect(range).toMatchObject({ start: month(2015, 1), end: month(2018, 12) });
  });

  test('mês numérico inválido (13/2020) não vira 03/2020', () => {
    expect(findDateRanges('13/2020 - 12/2020')).toEqual([]);
  });

  test('mês numérico válido depois de outro texto continua funcionando', () => {
    expect(findDateRanges('Analista, 06/2018 - 12/2018')[0]).toMatchObject({
      start: month(2018, 6),
      end: month(2018, 12),
    });
  });
});

describe('experiência: anos exigidos', () => {
  test.each([
    ['Requisitos\n- Experiência de 3 anos em vendas', 3],
    ['Requisitos\n- Experiência: 5 anos', 5],
    ['Requisitos\n- De 3 a 5 anos de experiência', 3],
    ['Requisitos\n- 3 a 5 anos de experiência com Java', 3],
    ['Requisitos\n- 3+ anos de experiência', 3],
    ['Requisitos\n- Experiência mínima de 2 anos', 2],
    ['Requisitos\n- 5 anos de experiência em TI, sendo 2 com React', 5],
  ])('%j', (job, expected) => {
    expect(extractRequiredYears(job)).toBe(expected);
  });

  test('idade da empresa não é exigência', () => {
    expect(
      extractRequiredYears('Sobre a empresa\nSomos uma consultoria com 15 anos de experiência no mercado.'),
    ).toBeNull();
    expect(extractRequiredYears('Somos uma empresa com 20 anos de mercado.')).toBeNull();
  });

  test.each([
    ['Requisitos\n- Nosso time busca alguém com 3 anos de experiência em React', 3],
    ['Para nossa equipe, buscamos pessoa com mínimo de 2 anos de experiência', 2],
    ['Requisitos\n- Nossa vaga exige 4 anos de experiência', 4],
    ['A empresa busca profissional com 3 anos de experiência', 3],
  ])('"nosso/nossa" sozinho não descarta a exigência: %j', (job, expected) => {
    expect(extractRequiredYears(job)).toBe(expected);
  });

  test('idade da empresa não atrapalha a exigência real', () => {
    const job = 'Sobre a empresa\nSomos uma consultoria com 15 anos de experiência.\nRequisitos\n- 3 anos de experiência com vendas';
    expect(extractRequiredYears(job)).toBe(3);
  });

  test('diferencial continua ignorado', () => {
    expect(extractRequiredYears('Diferenciais\n- 5 anos de experiência com AWS')).toBeNull();
  });
});
