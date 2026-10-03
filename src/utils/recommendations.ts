import type { AtsTip, Keyword, MissingKeywordSuggestion } from '../types/ats';
import { stripAccents } from './textProcessing';

const ACTION_VERBS =
  /\b(desenvolvi|implementei|liderei|criei|otimizei|reduzi|aumentei|entreguei|construi|projetei|automatizei|migrei|coordenei|gerenciei|conduzi|estruturei|melhorei|lancei|integrei|configurei|developed|led|built|implemented|designed|improved|reduced|increased|delivered|created)\b/g;
const METRICS = /\d+\s?%|\br\$\s?\d|\b\d+\s?(x|k|mil|horas|dias|usuarios|clientes|squads)\b/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const COLUMN_LAYOUT = /\t|\S {3,}\S|[│┃┌┐└┘├┤─]/;

const DEFAULT_TIPS: AtsTip[] = [
  {
    id: 'linear',
    status: 'info',
    title: 'Mantenha a estrutura linear, em uma coluna',
    description:
      'Títulos padrão (Resumo, Experiência, Formação) em sequência vertical são lidos corretamente por Gupy, Workday, Greenhouse e Taleo.',
  },
  {
    id: 'no-graphics',
    status: 'info',
    title: 'Sem imagens, ícones ou caixas de texto',
    description:
      'Barras de habilidade, gráficos e caixas de texto costumam ser ignorados ou embaralhados pelos robôs de triagem.',
  },
  {
    id: 'mirror-terms',
    status: 'info',
    title: 'Espelhe a terminologia da vaga',
    description:
      'Se a vaga diz "Testes Unitários" e você escreveu "testes de unidade", use a forma da vaga — desde que descreva algo que você realmente faz.',
  },
  {
    id: 'text-pdf',
    status: 'info',
    title: 'Exporte em PDF de texto selecionável',
    description: 'Gere o PDF a partir de texto (como faz o botão "Exportar PDF"), nunca a partir de imagem ou captura de tela.',
  },
];

export function buildTips(resumeText: string): AtsTip[] {
  const plain = stripAccents(resumeText.toLowerCase());
  const warnings: AtsTip[] = [];

  if (resumeText.split(/\r?\n/).some((line) => COLUMN_LAYOUT.test(line))) {
    warnings.push({
      id: 'columns',
      status: 'warning',
      title: 'Evite colunas, tabelas e tabulações',
      description:
        'Detectamos espaçamentos que sugerem colunas ou tabelas. Robôs de triagem leem da esquerda para a direita e podem misturar o conteúdo.',
    });
  }
  if ((plain.match(ACTION_VERBS) ?? []).length < 3) {
    warnings.push({
      id: 'action-verbs',
      status: 'warning',
      title: 'Comece as conquistas com verbos de ação',
      description: 'Inicie cada bullet com verbos como "Desenvolvi", "Implementei" ou "Reduzi" para deixar seu impacto explícito.',
    });
  }
  if ((plain.match(METRICS) ?? []).length < 2) {
    warnings.push({
      id: 'metrics',
      status: 'warning',
      title: 'Quantifique seus resultados',
      description:
        'Percentuais, prazos e volumes ajudam a medir impacto. Use apenas números reais que você consiga sustentar em entrevista.',
    });
  }
  if (!EMAIL.test(resumeText)) {
    warnings.push({
      id: 'contact',
      status: 'warning',
      title: 'Inclua um e-mail de contato',
      description: 'Sem e-mail no cabeçalho, o ATS pode não conseguir preencher seu cadastro automaticamente.',
    });
  }

  return [...warnings, ...DEFAULT_TIPS].slice(0, 4);
}

const SECTION_BY_CATEGORY: Record<Keyword['category'], string> = {
  tech: 'Habilidades Técnicas + Histórico Profissional',
  soft: 'Resumo Profissional ou conquista no Histórico',
  general: 'Histórico Profissional',
};

function hintFor(keyword: Keyword): string {
  switch (keyword.category) {
    case 'tech':
      return `Se você já usou ${keyword.label} em projetos reais, liste em Habilidades e cite no Histórico onde e como aplicou.`;
    case 'soft':
      return 'Se é uma competência sua, demonstre com um exemplo concreto em vez de apenas listá-la.';
    default:
      return `Se fez parte da sua rotina, mencione "${keyword.label}" no contexto de uma experiência real.`;
  }
}

export function buildMissingSuggestions(missing: Keyword[]): MissingKeywordSuggestion[] {
  return missing.slice(0, 6).map((keyword) => ({
    keyword,
    targetSection: SECTION_BY_CATEGORY[keyword.category],
    hint: hintFor(keyword),
  }));
}
