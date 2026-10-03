import { defineArea } from './types';

/** Competências comportamentais, idiomas e metodologias comuns a todas as áreas. */
export default defineArea({
  area: 'Comportamental, idiomas e metodologias',
  hardSkills: [],
  softSkills: [
    // Competências
    'Comunicação', 'Comunicação Assertiva', 'Liderança', 'Colaboração', 'Trabalho em Equipe', 'Proatividade',
    'Autonomia', 'Negociação', 'Empatia', 'Criatividade', 'Adaptabilidade', 'Flexibilidade', 'Resiliência',
    'Pensamento Crítico', 'Pensamento Analítico', 'Visão Analítica', 'Visão Estratégica', 'Resolução de Problemas',
    'Tomada de Decisão', 'Gestão do Tempo', 'Inteligência Emocional', 'Relacionamento Interpessoal',
    'Orientação a Resultados', 'Foco no Cliente', 'Gestão de Conflitos', 'Oratória', 'Storytelling', 'Mentoria',
    'Feedback', 'Senso de Urgência', 'Atenção aos Detalhes', 'Organização Pessoal',
    // Metodologias
    'Scrum', 'Kanban', 'Agile', 'Metodologias Ágeis', 'Lean', 'Design Thinking', 'OKR', 'PDCA', 'Six Sigma',
    'Product Discovery', 'Pair Programming',
    // Idiomas
    'Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Mandarim', 'Libras',
  ],
  synonyms: [
    ['Trabalho em Equipe', 'Teamwork', 'Trabalho em Time'],
    ['Resolução de Problemas', 'Problem Solving', 'Solução de Problemas'],
    ['Pensamento Analítico', 'Raciocínio Analítico'],
    ['Inglês', 'English'],
    ['Espanhol', 'Spanish'],
    ['Metodologias Ágeis', 'Metodologia Ágil', 'Métodos Ágeis'],
    ['Comunicação Assertiva', 'Comunicação Clara'],
    ['Foco no Cliente', 'Orientação ao Cliente', 'Customer Centric'],
    ['Orientação a Resultados', 'Foco em Resultados'],
  ],
});
