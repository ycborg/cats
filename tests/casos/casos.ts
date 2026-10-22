/**
 * CADASTRO DE CASOS DO FILTRO
 *
 * Cada vez que alguém achar um problema na análise (uma palavra que não devia virar palavra-chave,
 * um cargo comparado errado, uma nota estranha), anote o caso aqui. A partir daí, o teste roda
 * sozinho em toda alteração e garante que o problema nunca mais volta.
 *
 * Só `nome` e `vaga` são obrigatórios. Preencha apenas as expectativas que importam para o caso.
 * Veja tests/README.md para exemplos.
 */

import type { EducationLevel, MatchLevel, TitleVerdict } from '../../src/types/ats';

export interface Caso {
  /** O que o caso protege e de onde veio (ex.: "comentário no LinkedIn sobre 'não'"). */
  nome: string;
  vaga: string;
  /** Opcional: sem currículo, só a extração de palavras-chave da vaga é verificada. */
  curriculo?: string;

  /** Palavras que NUNCA podem aparecer como palavra-chave (nem encontrada, nem faltando). */
  nuncaPalavrasChave?: string[];
  /** Palavras-chave que a vaga TEM que gerar (como aparecem na tela, ex.: "React"). */
  palavrasChave?: string[];
  /** Termos que precisam ser reconhecidos no currículo. */
  encontradas?: string[];
  /** Termos que precisam aparecer como faltando. */
  faltando?: string[];
  /** Grafias do currículo que precisam gerar alerta de erro de digitação (ex.: "Phyton"). */
  errosDeDigitacao?: string[];
  /** Grafias do currículo que NÃO podem gerar alerta de erro de digitação. */
  semErroDeDigitacao?: string[];

  /** Veredito do título: same = mesmo cargo, close = próximo, neighbor = vizinho, none = sem relação. */
  titulo?: TitleVerdict;
  /** Anos de experiência exigidos que o CATS deve ler da vaga (null = não exige). */
  anosExigidos?: number | null;
  /** Maior formação que o CATS deve ler do currículo (null = nenhuma). */
  formacaoNoCurriculo?: EducationLevel | null;
  /** Faixa aceitável da nota final (0–100). */
  nota?: { min?: number; max?: number };
  nivel?: MatchLevel;
}

export const CASOS: Caso[] = [
  {
    nome: 'LinkedIn: "não", "profissional" e conectivos viravam palavra-chave',
    vaga: `Analista de Marketing Pleno
Requisitos
- Não é necessário ter experiência profissional em agência, mas é um diferencial.
- Perfil profissional proativo, com experiência profissional em SEO e Google Analytics.
- Não aceitamos candidaturas sem portfólio. Não há exigência de inglês.
- Conhecimento em SEO, inclusive técnico, e também em Google Analytics.`,
    nuncaPalavrasChave: ['não', 'nao', 'profissional', 'também', 'inclusive', 'experiência', 'perfil', 'ter', 'sem'],
    palavrasChave: ['SEO', 'Google Analytics'],
  },
  {
    nome: 'Verbos no infinitivo/gerúndio e advérbios não são competências',
    vaga: `Desenvolvedor Back-end
Responsabilidades
- Atuar desenvolvendo APIs, atuar rapidamente em incidentes e documentar processos.
- Desenvolver e manter serviços; colaborar closely with product.
- Atuar com Node.js e documentar decisões.`,
    nuncaPalavrasChave: ['atuar', 'desenvolvendo', 'rapidamente', 'documentar', 'desenvolver', 'closely', 'manter'],
    palavrasChave: ['Node.js'],
  },
  {
    nome: 'Palavras de cargo ficam com o critério de título, não com as palavras-chave',
    vaga: `Enfermeira de UTI
Requisitos
- Enfermeiro com COREN ativo. Enfermeira com experiência em UTI adulto.
- Enfermeiro assistencial com vivência em UTI.`,
    nuncaPalavrasChave: ['enfermeira', 'enfermeiro'],
    palavrasChave: ['UTI'],
  },
  {
    nome: 'Benefícios não geram palavras-chave',
    vaga: `Analista Financeiro
Requisitos
- Excel avançado e Power BI.
Benefícios
- Vale refeição, Gympass, plano de saúde e Gympass para dependentes.`,
    nuncaPalavrasChave: ['Gympass', 'refeição', 'dependentes'],
    palavrasChave: ['Excel', 'Power BI'],
  },
  {
    nome: 'Sinônimo conta como encontrado (JS = JavaScript, R&S = Recrutamento e Seleção)',
    vaga: `Analista de RH
Requisitos
- Recrutamento e Seleção de ponta a ponta.
- Conhecimento em JavaScript para automações.`,
    curriculo: `Ana Souza
Analista de RH
ana@email.com | (11) 91234-5678

Experiência
Analista de RH — Empresa X | jan/2020 – atual
- Conduzi processos de R&S para 40 vagas por mês.
- Automatizei relatórios com JS.`,
    encontradas: ['Recrutamento e Seleção', 'JavaScript'],
  },
  {
    nome: 'Erro de digitação em ferramenta é avisado e não conta como encontrado',
    vaga: `Cientista de Dados
Requisitos
- Python e PostgreSQL.`,
    curriculo: `João Lima
Cientista de Dados
joao@email.com | (21) 99876-5432

Habilidades
Phyton, PostgreSQL

Experiência
Cientista de Dados — Empresa Y | mar/2021 – atual
- Modelos preditivos com Phyton.`,
    faltando: ['Python'],
    encontradas: ['PostgreSQL'],
    errosDeDigitacao: ['Phyton'],
  },
  {
    nome: 'Verbo parecido com ferramenta não é erro de digitação ("reduz" × Redux)',
    vaga: `Desenvolvedor Front-end
Requisitos
- React e Redux.`,
    curriculo: `Carla Dias
Desenvolvedora Front-end
carla@email.com | (11) 91111-2222

Experiência
Desenvolvedora Front-end — Loja Z | jan/2021 – atual
- Criei um cache que reduz o tempo de carregamento em React.`,
    faltando: ['Redux'],
    semErroDeDigitacao: ['reduz'],
  },
  {
    nome: 'Gênero e grafia do cargo não importam (Desenvolvedora Frontend = Desenvolvedor Front-end)',
    vaga: `Desenvolvedor(a) Front-end Pleno
Requisitos
- React.`,
    curriculo: `Bia Rocha
Desenvolvedora Frontend
bia@email.com | (11) 92222-3333

Experiência
Desenvolvedora Frontend — Empresa W | jan/2022 – atual
- Interfaces em React.`,
    titulo: 'same',
  },
  {
    nome: '"Scrum Master" não é mestrado',
    vaga: `Scrum Master
Requisitos
- Superior completo.
- Experiência com Scrum e Kanban.`,
    curriculo: `Rui Alves
Scrum Master
rui@email.com | (11) 93333-4444

Experiência
Scrum Master — Empresa V | jan/2020 – atual
- Facilitei cerimônias Scrum para 3 times.

Formação
Ensino Médio — Escola Estadual | 2012`,
    titulo: 'same',
    formacaoNoCurriculo: 'medio',
  },
  {
    nome: 'Anos exigidos: a exigência principal é a maior ("5 anos em TI, sendo 2 com React")',
    vaga: `Desenvolvedor Front-end
Requisitos
- 5 anos de experiência em TI, sendo 2 anos de experiência com React.`,
    anosExigidos: 5,
  },
  {
    nome: 'Anos citados como diferencial não viram exigência',
    vaga: `Analista Contábil
Requisitos
- Superior em Ciências Contábeis.
Diferenciais
- 3 anos de experiência em auditoria.`,
    anosExigidos: null,
  },
];
