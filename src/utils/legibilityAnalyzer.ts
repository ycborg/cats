import type { LegibilityAnalysis, LegibilityCheck } from '../types/ats';
import { findDateRanges } from './dates';
import type { Block } from './resumeBuilder';
import { BULLET, EMAIL, PHONE } from './resumeBuilder';

/**
 * Simula o que o leitor automático do ATS consegue extrair do TEXTO do currículo.
 * Limitação: colunas, tabelas, imagens e cabeçalhos do arquivo original não são visíveis aqui.
 */
export function analyzeLegibility(resumeText: string, blocks: Block[], typoCount: number): LegibilityAnalysis {
  const has = (id: Block['id']) => blocks.some((block) => block.id === id && block.lines.length > 0);
  const experienceLines = blocks.filter((block) => block.id === 'experience').flatMap((block) => block.lines);
  const entryLines = experienceLines.filter((line) => !BULLET.test(line));
  const datedEntries = entryLines.filter((line) => findDateRanges(line).length > 0).length;

  const checks: LegibilityCheck[] = [
    {
      id: 'email',
      label: 'E-mail reconhecível',
      passed: EMAIL.test(resumeText),
      weight: 20,
      hint: 'Inclua um e-mail no cabeçalho, em texto (nada de ícone ou imagem).',
    },
    {
      id: 'phone',
      label: 'Telefone reconhecível',
      passed: PHONE.test(resumeText),
      weight: 15,
      hint: 'Use o formato (11) 91234-5678 ou +55 11 91234-5678.',
    },
    {
      id: 'experience-section',
      label: 'Seção de experiência identificada',
      passed: has('experience'),
      weight: 20,
      hint: 'Use um título padrão como "Experiência Profissional" para o ATS localizar seu histórico.',
    },
    {
      id: 'dates',
      label: 'Períodos com datas legíveis',
      passed: datedEntries > 0,
      weight: 15,
      hint: 'Escreva os períodos como "mar/2022 – atual" ou "03/2020 – 02/2022", na mesma linha do cargo.',
    },
    {
      id: 'education-section',
      label: 'Seção de formação identificada',
      passed: has('education') || has('certifications'),
      weight: 10,
      hint: 'Use um título padrão como "Formação Acadêmica".',
    },
    {
      id: 'skills-section',
      label: 'Seção de habilidades identificada',
      passed: has('skills'),
      weight: 10,
      hint: 'Liste suas competências sob um título como "Habilidades" ou "Competências".',
    },
    {
      id: 'spelling',
      label: 'Termos-chave escritos corretamente',
      passed: typoCount === 0,
      weight: 10,
      hint: 'Corrija os termos com possível erro de digitação: o ATS não os reconhece.',
    },
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0);
  return { checks, score };
}
