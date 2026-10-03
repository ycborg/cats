/**
 * Regras de linguagem usadas pelo motor de análise (palavras ignoradas, grafias equivalentes).
 * As competências de cada área ficam em ./lexicon/. Tudo aqui é armazenado sem acento e em minúsculas.
 */

const words = (list: string): Set<string> => new Set(list.trim().split(/\s+/));

export const STOPWORDS: Set<string> = words(`
  a ao aos as ate com como contra da das de dela dele deles do dos e e/ou ela elas ele eles em entre era
  essa essas esse esses esta estas este estes eu foi for ha isso isto ja la lhe mais mas me mesmo meu minha
  muito muita muitos muitas na nas nem no nos num numa o os ou para pela pelas pelo pelos por qual quais quando
  que quem se sem ser seu seus sua suas sao so tambem te tem teu tua um uma umas uns voce voces vos ter sobre
  apos cada onde todo toda todos todas outro outra outros outras sendo seja sejam sera serao pois porem assim
  ainda bem nosso nossa nossos nossas etc via ate tal tais desde durante ser estar estao esta sua
  an and are as at be but by for from has have in into is it its of on or that the their this to was we were
  will with you your our us they them i my not can other such using use within across about all any able must
  should would could who what which while if than then so plus also
`);

/** Palavras frequentes em vagas/currículos que não são competências. */
export const NOISE_WORDS: Set<string> = words(`
  vaga vagas empresa empresas experiencia experiencias conhecimento conhecimentos requisito requisitos
  responsabilidade responsabilidades atividade atividades qualificacao qualificacoes desejavel desejaveis
  diferencial diferenciais obrigatorio obrigatorios obrigatoria necessario necessaria ano anos area areas nivel
  trabalho modelo regime contratacao clt pj remoto remota hibrido presencial salario oportunidade oportunidades
  time times equipe equipes pessoa pessoas cliente clientes forma bom boa boas bons otimo otima solido solida
  solidos solidas forte fortes grande grandes novo novos nova novas principal principais dia dias parte junto
  mercado buscamos procuramos candidato candidata profissional profissionais junior pleno senior jr sr vale
  refeicao alimentacao plano saude odontologico auxilio home office horario flexivel local cargo funcao descricao
  missao valores cultura projeto projetos produto produtos solucao solucoes desenvolvimento ambiente ferramenta
  ferramentas tecnologia tecnologias pratica praticas uso utilizacao exemplo dominio vivencia capacidade
  habilidade habilidades competencia competencias atuacao foco base milhares centenas diversos diversas varios
  varias melhor melhores alta alto qualidade intermediario intermediaria avancado avancada basico basica
  experience years year knowledge strong good ability skills skill requirements responsibilities team work working
  required preferred nice job role company position candidate escritorio ponta pontas jornada
`);

/** Variações equivalentes → forma canônica (chaves sem acento). */
export const TOKEN_ALIASES: Record<string, string> = {
  reactjs: 'react',
  'react.js': 'react',
  js: 'javascript',
  ts: 'typescript',
  nodejs: 'node.js',
  node: 'node.js',
  vuejs: 'vue',
  'vue.js': 'vue',
  nextjs: 'next.js',
  nuxtjs: 'nuxt',
  angularjs: 'angular',
  tailwindcss: 'tailwind',
  css3: 'css',
  html5: 'html',
  scss: 'sass',
  postgres: 'postgresql',
  mongo: 'mongodb',
  k8s: 'kubernetes',
  'front-end': 'frontend',
  'back-end': 'backend',
  'full-stack': 'fullstack',
  restful: 'rest',
  apis: 'api',
  'ci-cd': 'ci/cd',
  'ux/ui': 'ui/ux',
  'micro-frontends': 'microfrontends',
  'micro-frontend': 'microfrontends',
  microsservicos: 'microservices',
  microservicos: 'microservices',
  'micro-servicos': 'microservices',
  agil: 'agile',
  ageis: 'agile',
  'end-to-end': 'e2e',
  powerbi: 'power bi',
};

/** Pares de tokens que devem ser fundidos antes da análise ("front end" → "frontend"). */
export const MERGE_PAIRS: Record<string, string> = {
  'front end': 'frontend',
  'back end': 'backend',
  'full stack': 'fullstack',
  'micro frontends': 'microfrontends',
  'micro frontend': 'microfrontends',
  'node js': 'node.js',
  'next js': 'next.js',
  'react js': 'react',
  'vue js': 'vue',
};

/** Tokens com barra que são um termo único (os demais "react/vue" são separados). */
export const KNOWN_SLASH_TOKENS: Set<string> = new Set(['ci/cd', 'ui/ux', 'ux/ui', 'e/ou', 'pl/sql', 'tcp/ip']);
