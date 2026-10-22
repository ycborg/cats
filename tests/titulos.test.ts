import { describe, expect, test } from 'vitest';
import type { TitleVerdict } from '../src/types/ats';
import { extractJobTitle } from '../src/utils/titleAnalyzer';
import { compareTitles, normalizeTitle, seniorityOf } from '../src/utils/titleMatcher';

const verdict = (job: string, resume: string): TitleVerdict =>
  compareTitles(normalizeTitle(job), normalizeTitle(resume)).verdict;

describe('comparação de títulos de cargo', () => {
  test.each<[string, string, TitleVerdict]>([
    // Mesmo cargo: gênero, grafia, senioridade e marcações não importam.
    ['Desenvolvedor(a) Front-end Pleno', 'Desenvolvedora Frontend', 'same'],
    ['Analista Financeiro(a)', 'Analista Financeira', 'same'],
    ['Enfermeiro(a) de UTI', 'Enfermeira de UTI', 'same'],
    ['Engenheiro(a) Civil', 'Engenheira Civil', 'same'],
    ['Advogado(a) Trabalhista', 'Advogada Trabalhista', 'same'],
    ['Professor(a) de Língua Portuguesa', 'Professora de Língua Portuguesa', 'same'],
    ['Desenvolvedor Back-end Sênior', 'Desenvolvedor Backend Júnior', 'same'],
    // Em tecnologia, desenvolvedor e engenheiro de software são equivalentes.
    ['Engenheiro de Software', 'Desenvolvedor de Software', 'same'],
    // Sem relação.
    ['Desenvolvedor Front-end', 'Enfermeiro', 'none'],
    ['Analista Financeiro', 'Engenheiro Civil', 'none'],
  ])('vaga "%s" × currículo "%s" → %s', (job, resume, expected) => {
    expect(verdict(job, resume)).toBe(expected);
  });

  test('função igual em área vizinha não é "mesmo cargo" (Front-end × Back-end)', () => {
    expect(verdict('Desenvolvedor Front-end', 'Desenvolvedor Back-end')).not.toBe('same');
  });

  test('função vizinha na mesma área não é "mesmo cargo" (Analista × Coordenador financeiro)', () => {
    expect(verdict('Coordenador Financeiro', 'Analista Financeiro')).not.toBe('same');
  });

  test('"Engenheiro Mecânico": mecânico é área, não função', () => {
    const title = normalizeTitle('Engenheiro Mecânico');
    expect(title.head).not.toBeNull();
    expect(title.areas.size).toBeGreaterThan(0);
    expect(verdict('Engenheiro Mecânico', 'Engenheiro Civil')).not.toBe('same');
  });
});

describe('senioridade', () => {
  test.each([
    ['Desenvolvedor Júnior', 'Júnior'],
    ['Dev Jr', 'Júnior'],
    ['Analista Pleno', 'Pleno'],
    ['Engenheira Sênior', 'Sênior'],
    ['Senior Software Engineer', 'Sênior'],
    ['Estagiária de RH', 'Estágio'],
    ['Analista de RH', null],
  ])('%s → %s', (title, expected) => {
    expect(seniorityOf(title)).toBe(expected);
  });
});

describe('título da vaga', () => {
  test('usa a primeira linha, sem empresa e modalidade', () => {
    expect(extractJobTitle('Desenvolvedor(a) Front-end Pleno — Fintech (Remoto)\nSobre a vaga')?.raw).toBe(
      'Desenvolvedor Front-end Pleno',
    );
  });

  test('prefere a linha rotulada ("Cargo: …")', () => {
    expect(extractJobTitle('Empresa Exemplo S.A.\nCargo: Analista de RH\nRequisitos')?.raw).toBe('Analista de RH');
  });

  test('sem título reconhecível → null (o critério sai da conta)', () => {
    expect(extractJobTitle('Estamos contratando!\nVenha fazer parte')).toBeNull();
  });
});
