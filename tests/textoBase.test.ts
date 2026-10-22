import { describe, expect, test } from 'vitest';
import {
  canonicalToken,
  countWords,
  isNoise,
  isStopword,
  isVerbLike,
  literalToken,
  splitSegments,
  stripAccents,
  termKey,
  tokenize,
} from '../src/utils/textProcessing';

describe('stripAccents', () => {
  test.each([
    ['Comunicação', 'Comunicacao'],
    ['Ênfase à Gestão', 'Enfase a Gestao'],
    ['Pão de Açúcar', 'Pao de Acucar'],
    ['Müller', 'Muller'],
    ['Sem acento', 'Sem acento'],
  ])('%s → %s', (input, expected) => {
    expect(stripAccents(input)).toBe(expected);
  });
});

describe('tokenize: preserva símbolos técnicos', () => {
  test.each([
    ['C# e C++', ['c#', 'e', 'c++']],
    ['Node.js', ['node.js']],
    ['CI/CD', ['ci/cd']],
    ['R&S', ['r&s']],
    ['NR-35', ['nr-35']],
    ['.NET', ['.net']],
    ['Front-end', ['front-end']],
    ['React/Vue', ['react', 'vue']],
  ])('%s', (input, expected) => {
    expect(tokenize(input)).toEqual(expected);
  });

  test('funde pares escritos separados ("front end" → frontend)', () => {
    expect(tokenize('front end e back end')).toEqual(['frontend', 'e', 'backend']);
  });

  test('remove pontuação das bordas', () => {
    expect(tokenize('React, TypeScript.')).toEqual(['react', 'typescript']);
  });
});

describe('splitSegments: não cria bigramas falsos entre itens de lista', () => {
  test('separa por vírgula, ponto, dois-pontos e marcadores', () => {
    expect(splitSegments('Stack: React, TypeScript. Testes • Jest')).toEqual(['Stack', 'React', 'TypeScript', 'Testes', 'Jest']);
  });

  test('separa por travessão com espaços, mas mantém hífen de palavra', () => {
    expect(splitSegments('Front-end — Loja Aurora')).toEqual(['Front-end', 'Loja Aurora']);
  });

  test('não quebra em ponto de Node.js', () => {
    expect(splitSegments('Experiência com Node.js e APIs')).toEqual(['Experiência com Node.js e APIs']);
  });
});

describe('canonicalToken: plural, acento e grafias equivalentes', () => {
  test.each([
    ['testes', 'teste'],
    ['soluções', 'solucao'],
    ['contábeis', 'contabel'],
    ['ReactJS', 'react'],
    ['JS', 'javascript'],
    ['APIs', 'api'],
    ['ágil', 'agile'],
  ])('%s → %s', (input, expected) => {
    expect(canonicalToken(input.toLowerCase())).toBe(expected);
  });

  test('apelido e nome completo têm a mesma chave (k8s = Kubernetes)', () => {
    expect(canonicalToken('k8s')).toBe(canonicalToken('kubernetes'));
  });

  test('palavras curtas não sofrem stemming', () => {
    expect(canonicalToken('aws')).toBe('aws');
    expect(canonicalToken('sass')).toBe('sass');
  });
});

describe('literalToken: grafia como está escrita (sem sinônimos)', () => {
  test('JS continua JS (para detectar match só por equivalência)', () => {
    expect(literalToken('js')).toBe('js');
  });
  test('plural curto é normalizado (APIs → api)', () => {
    expect(literalToken('apis')).toBe('api');
  });
});

describe('termKey', () => {
  test('mesma chave para variações de escrita', () => {
    expect(termKey('Testes Unitários')).toBe(termKey('teste unitario'));
    expect(termKey('Front-end')).toBe(termKey('front end'));
    expect(termKey('Power BI')).toBe(termKey('PowerBI'));
  });
});

describe('isStopword / isNoise', () => {
  test.each(['não', 'também', 'inclusive', 'the', 'with', 'você'])('"%s" é stopword', (word) => {
    expect(isStopword(word)).toBe(true);
  });
  test.each(['profissional', 'experiência', 'oportunidade', 'requirements', 'benefícios'])('"%s" é ruído', (word) => {
    expect(isNoise(word)).toBe(true);
  });
  test.each(['react', 'contabilidade', 'excel'])('"%s" não é stopword nem ruído', (word) => {
    expect(isStopword(word) || isNoise(word)).toBe(false);
  });
});

describe('isVerbLike', () => {
  test.each(['atuar', 'desenvolver', 'construir', 'atuando', 'fazendo', 'construindo', 'rapidamente', 'closely'])(
    '"%s" parece verbo/advérbio',
    (word) => {
      expect(isVerbLike(word)).toBe(true);
    },
  );
  test.each(['react', 'excel', 'contabilidade', 'sql', 'lideranca'])('"%s" não parece verbo', (word) => {
    expect(isVerbLike(word)).toBe(false);
  });
});

describe('countWords', () => {
  test.each([
    ['', 0],
    ['   ', 0],
    ['uma', 1],
    ['  duas   palavras \n e mais  ', 4],
  ])('"%s" → %i', (text, expected) => {
    expect(countWords(text)).toBe(expected);
  });
});
