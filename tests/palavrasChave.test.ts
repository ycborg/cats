import { describe, expect, test } from 'vitest';
import { NOISE_WORDS, STOPWORDS } from '../src/data/linguagem';
import { analyzeResume, extractKeywords } from '../src/utils/atsAnalyzer';
import { termKey } from '../src/utils/textProcessing';

const keysOf = (jobText: string) => extractKeywords(jobText).map((keyword) => keyword.key);
const labelsOf = (jobText: string) => extractKeywords(jobText).map((keyword) => keyword.label);

/** Vaga que repete a palavra várias vezes, em requisitos: o pior cenário para vazamento. */
const jobRepeating = (word: string) => `Analista
Requisitos
- ${word} ${word} com Excel.
- Experiência ${word} em ${word}.
- ${word}.`;

describe('nenhuma stopword vira palavra-chave, mesmo repetida', () => {
  test.each([...STOPWORDS])('"%s"', (word) => {
    expect(keysOf(jobRepeating(word))).not.toContain(termKey(word));
  });
});

/**
 * Palavras que também são termos do dicionário: o dicionário vence. Cada item aqui é um conflito
 * conhecido, anotado de propósito. Ao resolver um deles, remova-o da lista.
 */
const CONFLITOS_CONHECIDOS = new Set<string>([]);

describe('nenhuma palavra genérica de vaga (ruído) vira palavra-chave, mesmo repetida', () => {
  test.each([...NOISE_WORDS].filter((word) => !CONFLITOS_CONHECIDOS.has(word)))('"%s"', (word) => {
    expect(keysOf(jobRepeating(word))).not.toContain(termKey(word));
  });
});

describe('termos do dicionário', () => {
  test('contam mesmo citados uma única vez', () => {
    expect(labelsOf('Desenvolvedor\nRequisitos\n- Kubernetes.')).toContain('Kubernetes');
  });

  test('expressão mais longa tem prioridade ("Testes Unitários", não "Testes")', () => {
    const labels = labelsOf('Desenvolvedor\nRequisitos\n- Testes unitários com Jest.');
    expect(labels).toContain('Testes Unitários');
    expect(labels).not.toContain('Testes');
  });

  test('sinônimo é exibido pela forma principal (R&S → Recrutamento e Seleção)', () => {
    expect(labelsOf('Analista de RH\nRequisitos\n- R&S de ponta a ponta.')).toContain('Recrutamento e Seleção');
  });

  test('itens de lista não se juntam ("React, TypeScript" não vira "React TypeScript")', () => {
    const keys = keysOf('Dev\nRequisitos\n- React, TypeScript, Jest.');
    expect(keys).toEqual(expect.arrayContaining([termKey('React'), termKey('TypeScript'), termKey('Jest')]));
    expect(keys).not.toContain(`${termKey('React')} ${termKey('TypeScript')}`);
  });
});

describe('termos genéricos (fora do dicionário)', () => {
  test('palavra citada uma vez é ignorada; repetida, entra', () => {
    expect(labelsOf('Analista\nRequisitos\n- Vivência com cooperativas.')).not.toContain('cooperativas');
    expect(labelsOf('Analista\nRequisitos\n- Vivência com cooperativas.\n- Atendimento a cooperativas.')).toContain(
      'cooperativas',
    );
  });

  test('palavras com menos de 4 letras não entram', () => {
    expect(keysOf('Analista\n- sim sim sim.\n- sim.')).not.toContain('sim');
    expect(keysOf('Analista\n- fio fio.\n- fio.')).not.toContain('fio');
  });

  test('números não entram', () => {
    expect(labelsOf('Analista\n- 2024 2024.\n- turno 6x1, turno 6x1.').some((label) => /\d/.test(label))).toBe(false);
  });
});

describe('peso das seções da vaga', () => {
  const job = `Desenvolvedor
Requisitos
- Docker.
Diferenciais
- Kubernetes.`;

  test('requisito é marcado como obrigatório e pesa mais que diferencial', () => {
    const keywords = extractKeywords(job);
    const docker = keywords.find((keyword) => keyword.label === 'Docker');
    const kubernetes = keywords.find((keyword) => keyword.label === 'Kubernetes');
    expect(docker?.required).toBe(true);
    expect(kubernetes?.required).toBe(false);
    expect(docker!.weight).toBeGreaterThan(kubernetes!.weight);
  });

  test('linha que se declara diferencial dentro de Requisitos também pesa menos', () => {
    const keywords = extractKeywords('Dev\nRequisitos\n- Docker.\n- Kubernetes será um diferencial.');
    const kubernetes = keywords.find((keyword) => keyword.label === 'Kubernetes');
    expect(kubernetes?.required).toBe(false);
  });

  test('limite de 30 palavras-chave', () => {
    const many = Array.from({ length: 50 }, (_, i) => `- termo${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}xyz`);
    const job = `Analista\nRequisitos\n${many.join('\n')}\n${many.join('\n')}`;
    expect(extractKeywords(job).length).toBeLessThanOrEqual(30);
  });
});

describe('cruzamento com o currículo', () => {
  const job = `Desenvolvedor Front-end
Requisitos
- React, TypeScript e testes unitários.
- JavaScript.`;
  const resume = `Ana Souza
Desenvolvedora Front-end
ana@email.com | (11) 91234-5678

Resumo
Desenvolvedora com foco em React.

Habilidades
TypeScript, JS

Experiência
Desenvolvedora Front-end — Empresa | jan/2021 – atual
- Interfaces em React.`;
  const result = analyzeResume(job, resume);
  const found = result.found.map((keyword) => keyword.label);
  const missing = result.missing.map((keyword) => keyword.label);

  test('encontra e lista os ausentes', () => {
    expect(found).toEqual(expect.arrayContaining(['React', 'TypeScript', 'JavaScript']));
    expect(missing).toContain('Testes Unitários');
  });

  test('marca "em contexto" quem aparece em resumo/experiência, não só em Habilidades', () => {
    expect(result.found.find((keyword) => keyword.label === 'React')?.inContext).toBe(true);
    expect(result.found.find((keyword) => keyword.label === 'TypeScript')?.inContext).toBe(false);
  });

  test('match só por equivalência gera dica de escrever a forma da vaga (JS → JavaScript)', () => {
    expect(result.synonymHints.map((hint) => [hint.resumeForm, hint.jobForm])).toContainEqual(['JS', 'JavaScript']);
  });

  test('ética: o currículo gerado nunca ganha competência que não estava no texto', () => {
    const sheet = JSON.stringify(result.resume).toLowerCase();
    expect(sheet).not.toContain('testes unitários');
  });

  test('vaga sem nenhum termo reconhecível não dá nota de palavras-chave', () => {
    const empty = analyzeResume('Oi', resume);
    expect(empty.subScores.find((item) => item.id === 'keywords')?.score).toBeNull();
  });
});
