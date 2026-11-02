import { describe, expect, test } from 'vitest';
import type { AnalysisResult, ResumeSectionId } from '../src/types/ats';
import { analyzeResume } from '../src/utils/atsAnalyzer';
import { EMAIL } from '../src/utils/resumeBuilder';
import { SAMPLES } from '../src/utils/sampleData';
import { stripAccents, termKey } from '../src/utils/textProcessing';

/**
 * Defeitos confirmados pela banca de revisão no currículo gerado e no cruzamento de palavras-chave.
 * Regra central: a folha gerada só pode conter o que a pessoa escreveu.
 */

const sectionText = (result: AnalysisResult, id: ResumeSectionId): string =>
  (result.resume.sections.find((section) => section.id === id)?.lines ?? []).map((line) => line.text).join('\n');

const sheetText = (result: AnalysisResult): string =>
  result.resume.sections.flatMap((section) => section.lines.map((line) => line.text)).join('\n');

const foundKeys = (result: AnalysisResult): string[] => result.found.map((keyword) => keyword.key);

const normalize = (value: string): string => stripAccents(value.toLowerCase()).replace(/\s+/g, ' ').trim();

describe('sinônimo amplo não faz aparecer competência que a pessoa não escreveu', () => {
  test('"Raspberry Pi" não vira Propriedade Intelectual', () => {
    const result = analyzeResume(
      'Advogado(a)\nRequisitos\n- Propriedade Intelectual',
      'Ana Lima\nProjetos\nAutomação residencial com Raspberry Pi',
    );
    expect(sheetText(result)).not.toMatch(/Propriedade Intelectual/i);
    expect(foundKeys(result)).not.toContain(termKey('Propriedade Intelectual'));
  });

  test('"AutoCAD drafting" não vira Elaboração de Contratos', () => {
    const result = analyzeResume(
      'Advogado(a)\nRequisitos\n- Elaboração de Contratos',
      'Ana Lima\nHabilidades\nAutoCAD drafting',
    );
    expect(sectionText(result, 'skills')).not.toMatch(/Elabora[cç][aã]o de Contratos/i);
    expect(foundKeys(result)).not.toContain(termKey('Elaboração de Contratos'));
  });

  test('"trabalho em altura" não vira a certificação NR-35', () => {
    const result = analyzeResume(
      'Técnico(a) de Segurança\nRequisitos\n- NR-35',
      'Ana Lima\nExperiência\n- Execução de trabalho em altura em obras',
    );
    expect(sheetText(result)).not.toMatch(/NR-?35/i);
    expect(foundKeys(result)).not.toContain(termKey('NR-35'));
  });

  test('sinônimo legítimo continua contando, mas a folha usa a forma escrita pela pessoa', () => {
    const result = analyzeResume('Dev\nRequisitos\n- JavaScript', 'Ana Lima\nHabilidades\nJS, Git');
    expect(foundKeys(result)).toContain(termKey('JavaScript'));
    expect(result.synonymHints.map((hint) => hint.jobForm)).toContain('JavaScript');
    const skills = sectionText(result, 'skills');
    expect(skills).toMatch(/\bJS\b/);
    expect(skills).not.toMatch(/JavaScript/);
  });

  test('R&S continua igual a Recrutamento e Seleção na nota', () => {
    const result = analyzeResume('Analista de RH\nRequisitos\n- Recrutamento e Seleção', 'Ana Lima\nHabilidades\nR&S');
    expect(foundKeys(result)).toContain(termKey('Recrutamento e Seleção'));
    expect(sectionText(result, 'skills')).not.toMatch(/Recrutamento/);
  });
});

describe('termo citado em negação não vira habilidade', () => {
  test('"Não tenho experiência com Java, apenas Python"', () => {
    const result = analyzeResume('Dev\nRequisitos\n- Java', 'Ana Lima\nResumo\nNão tenho experiência com Java, apenas Python.');
    expect(sectionText(result, 'skills')).not.toMatch(/Java/);
    expect(foundKeys(result)).not.toContain(termKey('Java'));
    expect(result.subScores.find((score) => score.id === 'keywords')?.score).not.toBe(100);
  });

  test('o que vem depois de "apenas" continua valendo', () => {
    const result = analyzeResume('Dev\nRequisitos\n- Python', 'Ana Lima\nResumo\nNão tenho experiência com Java, apenas Python.');
    expect(foundKeys(result)).toContain(termKey('Python'));
  });

  test.each([
    'Não só Java, mas também Python.',
    'Não apenas Java, mas também Python.',
    'Não só tenho experiência com Java como também com Python.',
    'Not only Java but also Python.',
  ])('"%s" não é negação', (resume) => {
    const result = analyzeResume('Dev\nRequisitos\n- Java\n- Python', `Ana Lima\nResumo\n${resume}`);
    expect(foundKeys(result)).toEqual(expect.arrayContaining([termKey('Java'), termKey('Python')]));
  });
});

describe('linha "Rótulo: conteúdo" no meio de uma seção não abre seção nova', () => {
  const resume = `Ana Lima
Experiência
Desenvolvedora | Loja X | 2020 – atual
Stack: React, Node.js
- Liderei a migração do checkout para microsserviços com ganho de 30%
Analista | Loja Y | 2018 – 2020`;

  test('nada do histórico se perde nem vai para Complementares', () => {
    const result = analyzeResume('Dev\nRequisitos\n- Kubernetes', resume);
    const experience = sectionText(result, 'experience');
    expect(experience).toContain('Liderei a migração do checkout para microsserviços com ganho de 30%');
    expect(experience).toContain('React, Node.js');
    expect(experience).toContain('Analista | Loja Y | 2018 – 2020');
    expect(sectionText(result, 'skills')).not.toContain('Complementares');
  });

  test.each(['Tecnologias: Java, Spring', 'Projetos: Portal do cliente', 'Resumo: atuei no time de pagamentos'])(
    '"%s" fica no histórico',
    (line) => {
      const result = analyzeResume('Dev\nRequisitos\n- Kubernetes', `Ana Lima\nExperiência\nDesenvolvedora | Loja X | 2020 – atual\n${line}\n- Entreguei o app`);
      const experience = sectionText(result, 'experience');
      expect(experience).toContain(line);
      expect(experience).toContain('Entreguei o app');
    },
  );

  test('título com dois-pontos no fim continua sendo título', () => {
    const result = analyzeResume('Dev\nRequisitos\n- Kubernetes', 'Ana Lima\nHabilidades:\n- Kubernetes, Docker');
    expect(sectionText(result, 'skills')).toContain('Docker');
  });
});

test('item de habilidade longo (mais de 40 caracteres) não é descartado', () => {
  const result = analyzeResume('Comprador(a)\nRequisitos\n- Excel', 'Ana Lima\nHabilidades\n- Gestão de fornecedores internacionais e importação');
  expect(sectionText(result, 'skills')).toContain('Gestão de fornecedores internacionais e importação');
});

describe('regex de e-mail', () => {
  test('30 mil caracteres sem espaço em menos de 50 ms', () => {
    const inputs = ['a'.repeat(30_000), `${'a'.repeat(30_000)}@`, `a@${'b'.repeat(30_000)}`, 'a.'.repeat(15_000)];
    for (const input of inputs) {
      const start = performance.now();
      EMAIL.test(input);
      expect(performance.now() - start, `${input.slice(0, 5)}… (${input.length})`).toBeLessThan(50);
    }
  });

  test('continua reconhecendo e-mails comuns', () => {
    expect(EMAIL.test('mariana.albuquerque@email.com')).toBe(true);
    expect(EMAIL.test('joao+cv@empresa.com.br')).toBe(true);
    expect(EMAIL.test('sem arroba aqui')).toBe(false);
  });
});

describe.each(SAMPLES.map((sample) => [sample.area, sample] as const))('exemplo de %s', (_, sample) => {
  test('todo termo das habilidades e do resumo gerados está escrito no currículo original', () => {
    const result = analyzeResume(sample.job, sample.resume);
    const original = normalize(sample.resume);
    const terms: string[] = [];

    for (const line of sectionText(result, 'skills').split('\n').filter(Boolean)) {
      const content = line.replace(/^(Técnicas|Competências e métodos|Complementares):\s*/, '');
      terms.push(...(content === line ? [line] : content.split(', ')));
    }
    const summary = sectionText(result, 'summary');
    const generated = /^Profissional com atuação em (.+), conforme detalhado/.exec(summary);
    if (generated) terms.push(...generated[1]!.split(/, | e /));
    else terms.push(...summary.split('\n'));

    const invented = terms.map((term) => term.replace(/\.$/, '')).filter((term) => !original.includes(normalize(term)));
    expect(invented).toEqual([]);
  });
});
