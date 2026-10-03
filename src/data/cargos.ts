/**
 * Palavras de títulos de cargo, usadas para comparar o cargo da vaga com os do currículo.
 * Veja src/data/README.md. Tudo em minúsculas e sem acento.
 *
 * - HEAD_WORDS / HEAD_PHRASES: funções (desenvolvedor, analista, gerente...) e suas traduções.
 * - AREA_WORDS: áreas (frontend, financeiro, rh...) e suas traduções.
 * - LADDER: níveis hierárquicos; níveis vizinhos na mesma área recebem crédito parcial.
 * - RELATED_HEADS / AREA_NEIGHBORS: funções e áreas vizinhas (crédito parcial, nunca total).
 */

/* ---------------------------------------------------------------------------
 * Léxico de funções (cabeças do título)
 * ------------------------------------------------------------------------- */

export const HEAD_WORDS: Record<string, string> = {
  desenvolvedor: 'desenvolvedor', developer: 'desenvolvedor', dev: 'desenvolvedor', programador: 'desenvolvedor',
  programmer: 'desenvolvedor', engenheiro: 'engenheiro', engineer: 'engenheiro', analista: 'analista', analyst: 'analista',
  assistente: 'assistente', assistant: 'assistente', auxiliar: 'auxiliar', especialista: 'especialista',
  specialist: 'especialista', coordenador: 'coordenador', coordinator: 'coordenador', supervisor: 'supervisor',
  gerente: 'gerente', manager: 'gerente', gestor: 'gerente', diretor: 'diretor', director: 'diretor', head: 'head',
  lider: 'lider', lead: 'lider', leader: 'lider', consultor: 'consultor', consultant: 'consultor', tecnico: 'tecnico',
  technician: 'tecnico', estagiario: 'estagiario', intern: 'estagiario', estagio: 'estagiario', trainee: 'trainee',
  advogado: 'advogado', lawyer: 'advogado', attorney: 'advogado', paralegal: 'paralegal', enfermeiro: 'enfermeiro',
  nurse: 'enfermeiro', medico: 'medico', physician: 'medico', doctor: 'medico', contador: 'contador',
  accountant: 'contador', designer: 'designer', arquiteto: 'arquiteto', architect: 'arquiteto', cientista: 'cientista',
  scientist: 'cientista', administrador: 'administrador', administrator: 'administrador', vendedor: 'vendedor',
  salesperson: 'vendedor', executivo: 'executivo', executive: 'executivo', representante: 'representante',
  representative: 'representante', operador: 'operador', operator: 'operador', recepcionista: 'recepcionista',
  receptionist: 'recepcionista', professor: 'professor', teacher: 'professor', docente: 'professor',
  psicologo: 'psicologo', psychologist: 'psicologo', farmaceutico: 'farmaceutico', pharmacist: 'farmaceutico',
  fisioterapeuta: 'fisioterapeuta', physiotherapist: 'fisioterapeuta', nutricionista: 'nutricionista',
  nutritionist: 'nutricionista', dentista: 'dentista', dentist: 'dentista', biomedico: 'biomedico',
  motorista: 'motorista', driver: 'motorista', eletricista: 'eletricista', electrician: 'eletricista',
  mecanico: 'mecanico', mechanic: 'mecanico', comprador: 'comprador', buyer: 'comprador', recrutador: 'recrutador',
  recruiter: 'recrutador', redator: 'redator', copywriter: 'redator', writer: 'redator', jornalista: 'jornalista',
  journalist: 'jornalista', editor: 'editor', atendente: 'atendente', secretario: 'secretario',
  secretary: 'secretario', economista: 'economista', economist: 'economista', auditor: 'auditor',
  controller: 'controller', tesoureiro: 'tesoureiro', treasurer: 'tesoureiro', corretor: 'corretor',
  broker: 'corretor', promotor: 'promotor', estoquista: 'estoquista', almoxarife: 'almoxarife',
  cozinheiro: 'cozinheiro', cook: 'cozinheiro', chef: 'chef', garcom: 'garcom', waiter: 'garcom',
  farmacista: 'farmaceutico', veterinario: 'veterinario', veterinarian: 'veterinario', fonoaudiologo: 'fonoaudiologo',
  terapeuta: 'terapeuta', therapist: 'terapeuta', instrutor: 'instrutor', instructor: 'instrutor', tutor: 'tutor',
  pesquisador: 'pesquisador', researcher: 'pesquisador', planejador: 'planejador', planner: 'planejador',
  projetista: 'projetista', desenhista: 'projetista', drafter: 'projetista', inspetor: 'inspetor',
  inspector: 'inspetor', vistoriador: 'inspetor', porteiro: 'porteiro', vigilante: 'vigilante',
  // Educação
  pedagogo: 'pedagogo', pedagogue: 'pedagogo', educador: 'professor', educator: 'professor', monitor: 'monitor',
  // Design e audiovisual
  fotografo: 'fotografo', photographer: 'fotografo', ilustrador: 'ilustrador', videomaker: 'videomaker',
  animador: 'animador', animator: 'animador',
  // Hotelaria e gastronomia
  camareiro: 'camareiro', housekeeper: 'camareiro', barista: 'barista', sommelier: 'sommelier', maitre: 'maitre',
  confeiteiro: 'confeiteiro', padeiro: 'padeiro', baker: 'padeiro', concierge: 'concierge',
  // Agronegócio
  agronomo: 'agronomo', agronomist: 'agronomo', zootecnista: 'zootecnista',
  // Varejo
  repositor: 'repositor',
};

/** Funções de duas palavras, reconhecidas antes das palavras isoladas. */
export const HEAD_PHRASES: Record<string, string> = {
  'product owner': 'product owner', 'product manager': 'product manager', 'gerente de produto': 'product manager',
  'scrum master': 'scrum master', 'agile coach': 'agile coach', 'tech lead': 'lider', 'team lead': 'lider',
  'business partner': 'business partner', 'customer success': 'customer success', 'sales development': 'sdr',
  'business development': 'bdr', 'key account': 'key account', 'account manager': 'key account',
  'tecnico de enfermagem': 'tecnico enfermagem', 'tecnica de enfermagem': 'tecnico enfermagem',
  'auxiliar de enfermagem': 'tecnico enfermagem',
  'jovem aprendiz': 'aprendiz', 'diretor de arte': 'diretor de arte', 'art director': 'diretor de arte',
  'operador de caixa': 'operador de caixa', 'fiscal de loja': 'fiscal de loja', 'tecnico agricola': 'tecnico agricola',
};

/** Escada de níveis: funções adjacentes na mesma área recebem crédito parcial. */
export const LADDER: Record<string, number> = {
  estagiario: 0, aprendiz: 0, trainee: 1, auxiliar: 1, assistente: 2, tecnico: 2, analista: 3, consultor: 3,
  especialista: 4, lider: 4, supervisor: 4, coordenador: 5, gerente: 6, head: 6, diretor: 7,
};

/** Funções diferentes mas relacionadas: crédito parcial (como nível vizinho), nunca total. */
export const RELATED_HEADS: string[][] = [
  ['vendedor', 'representante', 'executivo', 'key account', 'sdr', 'bdr'],
  ['product owner', 'product manager'],
  ['scrum master', 'agile coach'],
  ['recrutador', 'business partner'],
  ['enfermeiro', 'tecnico enfermagem'],
  ['contador', 'auditor', 'controller'],
  ['professor', 'instrutor', 'tutor'],
  ['designer', 'redator'],
];

/** Em áreas de tecnologia, essas funções são tratadas como o mesmo cargo pelo mercado. */
export const TECH_EQUIVALENT_HEADS = new Set(['desenvolvedor', 'engenheiro']);

/* ---------------------------------------------------------------------------
 * Léxico de áreas
 * ------------------------------------------------------------------------- */

export const AREA_WORDS: Record<string, string> = {
  // Tecnologia
  frontend: 'frontend', backend: 'backend', fullstack: 'fullstack', mobile: 'mobile', android: 'mobile', ios: 'mobile',
  web: 'web', software: 'software', sistemas: 'software', systems: 'software', ti: 'ti', it: 'ti', dados: 'dados',
  data: 'dados', bi: 'dados', devops: 'devops', sre: 'devops', cloud: 'cloud', nuvem: 'cloud', infraestrutura: 'infra',
  infrastructure: 'infra', infra: 'infra', redes: 'redes', network: 'redes', networks: 'redes', suporte: 'suporte',
  support: 'suporte', helpdesk: 'suporte', qa: 'qa', testes: 'qa', teste: 'qa', test: 'qa', tester: 'qa',
  ux: 'ux', ui: 'ui', 'ui/ux': 'ux', 'ux/ui': 'ux', produto: 'produto', product: 'produto', ciberseguranca: 'seguranca-ti',
  cybersecurity: 'seguranca-ti', security: 'seguranca-ti', 'machine learning': 'dados', ml: 'dados', ia: 'dados', ai: 'dados',
  // Finanças e contabilidade
  financeiro: 'financeiro', financial: 'financeiro', finance: 'financeiro', financas: 'financeiro',
  contabil: 'contabil', contabilidade: 'contabil', accounting: 'contabil', fiscal: 'fiscal', tributario: 'fiscal',
  tax: 'fiscal', controladoria: 'controladoria', controlling: 'controladoria', tesouraria: 'tesouraria',
  treasury: 'tesouraria', credito: 'credito', credit: 'credito', cobranca: 'cobranca', collections: 'cobranca',
  investimentos: 'investimentos', investment: 'investimentos', fpa: 'fpa', custos: 'custos', costs: 'custos',
  faturamento: 'faturamento', billing: 'faturamento', pagar: 'contas-pagar', receber: 'contas-receber',
  // Pessoas
  rh: 'rh', hr: 'rh', 'recursos humanos': 'rh', 'human resources': 'rh', people: 'rh', pessoas: 'rh',
  recrutamento: 'recrutamento', selecao: 'recrutamento', recruitment: 'recrutamento', talent: 'recrutamento',
  talentos: 'recrutamento', 'departamento pessoal': 'dp', dp: 'dp', payroll: 'dp', folha: 'dp',
  treinamento: 'treinamento', training: 'treinamento',
  remuneracao: 'remuneracao', compensation: 'remuneracao', beneficios: 'remuneracao',
  // Jurídico
  juridico: 'juridico', legal: 'juridico', trabalhista: 'trabalhista', labor: 'trabalhista', civel: 'civel',
  contratos: 'contratos', contracts: 'contratos', compliance: 'compliance', societario: 'societario',
  corporate: 'societario', penal: 'penal', criminal: 'penal', previdenciario: 'previdenciario',
  // Engenharia e indústria
  civil: 'civil', eletrica: 'eletrica', eletrico: 'eletrica', electrical: 'eletrica', mecanica: 'mecanica',
  mecanico: 'mecanica', mechanical: 'mecanica', producao: 'producao', production: 'producao',
  processos: 'processos', process: 'processos', qualidade: 'qualidade', quality: 'qualidade', ambiental: 'ambiental',
  environmental: 'ambiental', quimica: 'quimica', chemical: 'quimica', manutencao: 'manutencao',
  maintenance: 'manutencao', automacao: 'automacao', automation: 'automacao', obras: 'obras', estruturas: 'estruturas',
  structural: 'estruturas', 'seguranca do trabalho': 'sst', sst: 'sst', hse: 'sst', ehs: 'sst',
  // Saúde
  enfermagem: 'enfermagem', nursing: 'enfermagem', uti: 'uti', icu: 'uti', hospitalar: 'hospitalar',
  hospital: 'hospitalar', clinico: 'clinica', clinica: 'clinica', clinical: 'clinica', pediatria: 'pediatria',
  pediatric: 'pediatria', cirurgico: 'centro-cirurgico', obstetricia: 'obstetricia', farmacia: 'farmacia',
  laboratorio: 'laboratorio', laboratory: 'laboratorio', radiologia: 'radiologia', saude: 'saude', health: 'saude',
  // Comercial e marketing
  vendas: 'comercial', sales: 'comercial', comercial: 'comercial', commercial: 'comercial', marketing: 'marketing',
  digital: 'digital', growth: 'growth', trade: 'trade', contas: 'contas', accounts: 'contas', atendimento: 'atendimento',
  'customer service': 'atendimento', sac: 'atendimento', comunicacao: 'comunicacao', communications: 'comunicacao',
  conteudo: 'conteudo', content: 'conteudo', seo: 'seo', midia: 'midia', media: 'midia', ecommerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  // Operações e suprimentos
  logistica: 'logistica', logistics: 'logistica', compras: 'compras', procurement: 'compras', purchasing: 'compras',
  suprimentos: 'compras', supply: 'compras', estoque: 'estoque', inventory: 'estoque', transporte: 'transporte',
  transportation: 'transporte', administrativo: 'administrativo', administrative: 'administrativo',
  operacoes: 'operacoes', operations: 'operacoes', facilities: 'facilities', projetos: 'projetos', projects: 'projetos',
  project: 'projetos', pmo: 'projetos', planejamento: 'planejamento', planning: 'planejamento',
  // Educação
  educacao: 'educacao', education: 'educacao', ensino: 'educacao', pedagogia: 'educacao', pedagogico: 'educacao',
  escolar: 'educacao', infantil: 'educacao', ead: 'educacao', instrucional: 'educacao',
  // Design e audiovisual
  grafico: 'design-grafico', graphic: 'design-grafico', motion: 'motion', video: 'audiovisual', audiovisual: 'audiovisual',
  fotografia: 'audiovisual', '3d': 'motion', editorial: 'design-grafico',
  // Hotelaria, gastronomia e turismo
  hotelaria: 'hotelaria', hotel: 'hotelaria', hospitality: 'hotelaria', recepcao: 'hotelaria', gastronomia: 'gastronomia',
  cozinha: 'gastronomia', kitchen: 'gastronomia', restaurante: 'gastronomia', eventos: 'eventos', events: 'eventos',
  turismo: 'turismo', tourism: 'turismo', 'alimentos e bebidas': 'gastronomia',
  // Agronegócio
  agronomia: 'agro', agricola: 'agro', agronegocio: 'agro', agro: 'agro', rural: 'agro', pecuaria: 'pecuaria',
  // Varejo
  loja: 'varejo', varejo: 'varejo', retail: 'varejo', store: 'varejo',
};

/** Áreas vizinhas: cargo na área ao lado recebe crédito parcial, nunca total. */
export const AREA_NEIGHBORS: string[][] = [
  ['frontend', 'backend', 'fullstack', 'mobile', 'web', 'software', 'qa'],
  ['devops', 'cloud', 'infra', 'backend', 'redes', 'seguranca-ti'],
  ['dados', 'backend', 'software'],
  ['suporte', 'infra', 'redes', 'ti'],
  ['ux', 'ui', 'produto'],
  ['financeiro', 'contabil', 'fiscal', 'controladoria', 'tesouraria', 'fpa', 'custos', 'faturamento', 'contas-pagar', 'contas-receber', 'credito', 'cobranca'],
  ['rh', 'recrutamento', 'dp', 'treinamento', 'remuneracao'],
  ['juridico', 'trabalhista', 'civel', 'contratos', 'compliance', 'societario', 'penal', 'previdenciario'],
  ['producao', 'processos', 'qualidade', 'manutencao', 'automacao', 'mecanica', 'eletrica'],
  ['civil', 'obras', 'estruturas'],
  ['enfermagem', 'uti', 'hospitalar', 'clinica', 'pediatria', 'centro-cirurgico', 'obstetricia', 'saude'],
  ['comercial', 'contas', 'atendimento', 'trade', 'ecommerce'],
  ['marketing', 'digital', 'growth', 'comunicacao', 'conteudo', 'seo', 'midia'],
  ['logistica', 'compras', 'estoque', 'transporte', 'operacoes'],
  ['administrativo', 'operacoes', 'facilities'],
  ['projetos', 'planejamento', 'produto'],
  ['design-grafico', 'motion', 'audiovisual', 'ui'],
  ['hotelaria', 'gastronomia', 'eventos', 'turismo'],
  ['agro', 'pecuaria'],
  ['varejo', 'comercial', 'atendimento'],
];

export const TECH_AREAS = new Set(['frontend', 'backend', 'fullstack', 'mobile', 'web', 'software', 'ti', 'dados', 'devops', 'cloud', 'infra', 'qa', 'seguranca-ti']);

/** Senioridade, marcações e ruído removidos antes de comparar. */
export const IGNORED_WORDS = new Set([
  'junior', 'jr', 'pleno', 'pl', 'senior', 'sr', 'i', 'ii', 'iii', 'iv', 'v', 'nivel', 'level', 'staff', 'principal',
  'pessoa', 'profissional', 'vaga', 'oportunidade', 'remoto', 'remota', 'remote', 'hibrido', 'hybrid', 'presencial',
  'pcd', 'afirmativa', 'externo', 'externa', 'interno', 'interna', 'assistencial', 'generalista', 'plantonista', 'temporario', 'temporaria', 'clt', 'pj', 'home', 'office', 'de', 'da', 'do', 'das', 'dos', 'em',
  'e', 'of', 'the', 'and', 'para', 'for', 'na', 'no', 'a', 'o', 'com', 'with', 'sr.', 'jr.', 'part', 'time', 'full',
]);
