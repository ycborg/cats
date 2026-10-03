import { defineArea } from './types';

export default defineArea({
  area: 'Saúde',
  hardSkills: [
    // Assistência
    'Administração de Medicamentos', 'Sinais Vitais', 'Curativos', 'Sondagem Vesical', 'Sondagem Nasogástrica',
    'Punção Venosa', 'Coleta de Exames', 'Coleta de Sangue', 'SAE', 'Processo de Enfermagem', 'Evolução de Enfermagem',
    'Prontuário Eletrônico', 'Classificação de Risco', 'Protocolo de Manchester', 'Urgência e Emergência', 'UTI',
    'Centro Cirúrgico', 'Instrumentação Cirúrgica', 'CME', 'Hemodiálise', 'Oncologia', 'Quimioterapia', 'Pediatria',
    'Neonatologia', 'Obstetrícia', 'Saúde Mental', 'Home Care', 'Cuidados Paliativos', 'Feridas e Coberturas',
    'Ventilação Mecânica', 'Monitorização Hemodinâmica', 'Suporte Básico de Vida', 'Suporte Avançado de Vida', 'PALS',
    'Atendimento Pré-Hospitalar',
    // Gestão, qualidade e segurança
    'CCIH', 'Biossegurança', 'Segurança do Paciente', 'Humanização', 'Acolhimento', 'Acreditação Hospitalar',
    'ONA', 'Joint Commission', 'Gestão de Leitos', 'Auditoria em Saúde', 'Faturamento Hospitalar', 'Glosas',
    'Regulação', 'ANVISA', 'Vigilância Sanitária', 'Vigilância Epidemiológica', 'Vacinação',
    // Saúde pública e farmácia
    'SUS', 'Atenção Primária', 'ESF', 'Farmacovigilância', 'Dispensação de Medicamentos', 'Farmácia Hospitalar',
    'Farmácia de Manipulação', 'Análises Clínicas',
    // Sistemas
    'Tasy', 'MV Soul', 'e-SUS', 'Prontuário Eletrônico do Paciente',
  ],
  synonyms: [
    ['SAE', 'Sistematização da Assistência de Enfermagem'],
    ['CME', 'Central de Material e Esterilização'],
    ['CCIH', 'Controle de Infecção Hospitalar', 'Comissão de Controle de Infecção Hospitalar'],
    ['ESF', 'Estratégia Saúde da Família', 'Estratégia de Saúde da Família'],
    ['Suporte Básico de Vida', 'BLS', 'Basic Life Support'],
    ['Suporte Avançado de Vida', 'ACLS', 'Advanced Cardiovascular Life Support'],
    ['Vacinação', 'Imunização'],
    ['UTI', 'Terapia Intensiva', 'CTI', 'Unidade de Terapia Intensiva'],
    ['Prontuário Eletrônico', 'PEP', 'Prontuário Eletrônico do Paciente'],
    ['Sinais Vitais', 'Aferição de Sinais Vitais'],
    ['Atenção Primária', 'Atenção Básica', 'APS'],
    ['Atendimento Pré-Hospitalar', 'APH'],
  ],
});
