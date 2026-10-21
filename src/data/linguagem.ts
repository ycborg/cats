/**
 * Regras de linguagem usadas pelo motor de análise (palavras ignoradas, grafias equivalentes).
 * As competências de cada área ficam em ./lexicon/. Tudo aqui é armazenado sem acento e em minúsculas.
 */

const words = (list: string): Set<string> => new Set(list.trim().split(/\s+/));

/**
 * Palavras sem significado próprio: artigos, preposições, pronomes, conectivos, advérbios e verbos
 * auxiliares (português e inglês). Nunca viram palavra-chave genérica.
 */
export const STOPWORDS: Set<string> = words(`
  a ao aos aquela aquelas aquele aqueles aquilo as ate com como contra cujo cuja cujos cujas da das de dela delas
  dele deles depois desde desta deste destes destas dessa desse dessas desses disso disto do dos durante e e/ou
  ela elas ele eles em entre era eram essa essas esse esses esta estas este estes estamos estao estar estava
  estavam estou eu foi fomos for foram fosse fossem ha havia isso isto ja la lhe lhes mais mas me mesma mesmas
  mesmo mesmos meu meus minha minhas muita muitas muito muitos na nas nao naquela naquele nela nele nem nessa
  nesse nesta neste nisso no nos nossa nossas nosso nossos num numa o os ou para pela pelas pelo pelos per
  perante por pra pras pro pros propria proprio qual quais qualquer quaisquer quando quanto quanta quantos
  quantas que quem se seja sejam sem ser sera serao seria seriam seu seus sob sobre sua suas sao so somos tal
  tais tambem tanto tanta tantos tantas te tem tenha tenham ter teu teus tua tuas tudo um uma umas uns voce
  voces vos via etc cada onde todo toda todos todas outro outra outros outras sendo sido tido tendo havendo
  estando pois porem portanto porque entretanto contudo todavia entao enquanto embora caso conforme mediante
  ainda assim bem alem apenas somente sempre nunca jamais tambem quase talvez inclusive inclusivamente aqui
  ali ai agora hoje ontem amanha antes logo cerca dentro fora atraves perto longe junto algum alguma alguns
  algumas alguem nenhum nenhuma ninguem nada pouco pouca poucos poucas menos demais vez vezes sim pode podem
  podera poderao poder possa possam deve devem devera deverao precisa precisam ira irao vai vao faz fazem
  feito feita queira queiram gostaria isto
  a about above across after again against all also am an and any are as at be because been before being
  below between both but by can cannot could did do does doing done down during each either else ever every
  few for from further had has have having he her here hers him his how however i if in including into is it
  its itself just may me might more most must my neither no nor not now of off often on once only or other
  otherwise our ours out over own per plus rather same shall she should so some such than that the their
  theirs them then there therefore these they this those though through thus to too under until up upon us
  very via was we well were what whatever when whenever where whereas whether which while who whom whose why
  will with within without would yet you your yours using use able etc
`);

/**
 * Palavras frequentes em anúncios de vaga e currículos que não são competências ("profissional",
 * "oportunidade", "professional", "role"...). Também nunca viram palavra-chave genérica.
 */
export const NOISE_WORDS: Set<string> = words(`
  vaga vagas empresa empresas experiencia experiencias conhecimento conhecimentos requisito requisitos
  responsabilidade responsabilidades atividade atividades qualificacao qualificacoes desejavel desejaveis
  diferencial diferenciais obrigatorio obrigatorios obrigatoria obrigatorias necessario necessarios necessaria
  necessarias importante importantes ano anos mes meses semana semanas dia dias hora horas area areas nivel
  trabalho modelo regime contratacao contrato clt pj remoto remota hibrido hibrida presencial presencialmente
  salario salarial beneficio beneficios oportunidade oportunidades time times equipe equipes pessoa pessoas
  gente alguem cliente clientes forma bom boa boas bons otimo otima solido solida solidos solidas forte fortes
  grande grandes novo novos nova novas principal principais parte junto mercado busca buscamos procuramos
  candidato candidata candidatos candidatas profissional profissionais colaborador colaboradora colaboradores
  junior pleno senior jr sr vale refeicao alimentacao plano saude odontologico auxilio home office horario
  flexivel local regiao cidade estado cargo funcao descricao missao visao valores cultura proposito projeto
  projetos produto produtos solucao solucoes desenvolvimento ambiente ferramenta ferramentas tecnologia
  tecnologias pratica praticas uso utilizacao exemplo dominio vivencia capacidade habilidade habilidades
  competencia competencias atuacao foco base milhares centenas diversos diversas varios varias melhor melhores
  alta alto qualidade intermediario intermediaria avancado avancada basico basica escritorio ponta pontas
  jornada perfil setor vontade interesse interessado interessada disponibilidade crescimento carreira desafio
  desafios desafiador desafiadora dinamico dinamica impacto resultado resultados melhoria melhorias demanda
  demandas rotina rotinas processo processos informacao informacoes objetivo objetivos interno interna externo
  externa curioso curiosa apoio suporte inicio
  experience years year knowledge strong good great best excellent ideal ability skills skill requirements
  requirement responsibilities responsibility responsible team teams work working job jobs role roles company
  companies position candidate candidates professional professionals passionate passion looking seeking
  opportunity opportunities environment culture mission values benefits salary remote hybrid onsite office
  people person employee employees business new level related field fields background proven track record
  familiarity understanding proficiency proficient solid deep day days week weeks month months hours based
  preferred required nice bonus degree data
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
