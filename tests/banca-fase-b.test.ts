import { describe, expect, test } from 'vitest';
import { analyzeResume, detectInputMixup } from '../src/utils/atsAnalyzer';
import { detectJobSection } from '../src/utils/jobSections';
import { buildTips } from '../src/utils/recommendations';
import { SAMPLES } from '../src/utils/sampleData';
import { seniorityOf } from '../src/utils/titleMatcher';

const SAMPLE_RESUME = SAMPLES[0]!.resume;
const SAMPLE_JOB = SAMPLES[0]!.job;

describe('item 1: vaga sem termos reconhecíveis', () => {
  test('texto sem requisitos não gera nota alta enganosa', () => {
    const result = analyzeResume('x'.repeat(40), SAMPLE_RESUME);
    expect(result.jobRecognized).toBe(false);
  });

  test('vaga real continua reconhecida', () => {
    expect(analyzeResume(SAMPLE_JOB, SAMPLE_RESUME).jobRecognized).toBe(true);
  });
});

describe('item 2: vaga e currículo trocados ou iguais', () => {
  test('mesmo texto nos dois campos', () => {
    expect(detectInputMixup(SAMPLE_JOB, `  ${SAMPLE_JOB.toUpperCase()}\n`)).toBe('same');
  });

  test('campos trocados', () => {
    const resume = 'Ana Souza\nana@exemplo.com\nResumo\nDesenvolvedora com 5 anos de experiência em React.';
    const job = 'Desenvolvedor React\nRequisitos\n- React e TypeScript\nDiferenciais\n- Docker';
    expect(detectInputMixup(resume, job)).toBe('swapped');
  });

  test('uso normal não dispara aviso', () => {
    expect(detectInputMixup(SAMPLE_JOB, SAMPLE_RESUME)).toBeNull();
    expect(detectInputMixup('', '')).toBeNull();
  });
});

describe('item 6: PL/SQL não é senioridade', () => {
  test('PL/SQL Sênior é Sênior', () => {
    expect(seniorityOf('Desenvolvedor PL/SQL Sênior')).toBe('Sênior');
    expect(seniorityOf('Desenvolvedor PL/SQL')).toBeNull();
  });

  test('"Pl" continua valendo como Pleno', () => {
    expect(seniorityOf('Analista Pl')).toBe('Pleno');
  });
});

describe('item 7: padrões únicos', () => {
  test('bullet ✓ numa vaga não vira título de seção', () => {
    expect(detectJobSection('✓ Requisitos')).toBeNull();
    expect(detectJobSection('→ Benefícios')).toBeNull();
    expect(detectJobSection('Requisitos')).toBe('required');
  });

  test('e-mail em texto longo sem espaços é linear', () => {
    const text = 'a'.repeat(30000);
    const start = performance.now();
    buildTips(text);
    expect(performance.now() - start).toBeLessThan(300);
  });
});

describe('item 8: sinônimo não repete na folha', () => {
  test('"Adobe Photoshop" não aparece em Complementares se "Photoshop" já está em Técnicas', () => {
    const job = SAMPLES.find((sample) => sample.id === 'design')!;
    const sheet = analyzeResume(job.job, job.resume).resume;
    const lines = sheet.sections.flatMap((section) => section.lines.map((line) => line.text));
    const technical = lines.find((text) => text.startsWith('Técnicas:')) ?? '';
    const extras = lines.find((text) => text.startsWith('Complementares:')) ?? '';
    expect(technical).toContain('Photoshop');
    expect(extras).not.toContain('Photoshop');
  });
});
