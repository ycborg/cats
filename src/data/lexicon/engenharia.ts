import { defineArea } from './types';

export default defineArea({
  area: 'Engenharia, indústria e segurança do trabalho',
  hardSkills: [
    // Projeto e software
    'AutoCAD', 'Revit', 'BIM', 'SketchUp', 'Civil 3D', 'SolidWorks', 'Inventor', 'CATIA', 'MS Project', 'Primavera P6',
    'Desenho Técnico', 'Leitura de Desenho Técnico', 'Memorial Descritivo', 'Projetos Estruturais', 'Projetos Elétricos',
    'Projetos Hidrossanitários', 'Topografia', 'Normas ABNT',
    // Obras
    'Orçamento de Obras', 'Planejamento de Obras', 'Gestão de Obras', 'Acompanhamento de Obras', 'Fiscalização de Obras',
    'Levantamento de Quantitativos', 'Controle Tecnológico', 'Diário de Obra', 'Medição de Obras',
    // Indústria e qualidade
    'Lean Manufacturing', 'Kaizen', '5S', 'FMEA', 'MASP', 'Controle de Qualidade', 'Controle Estatístico de Processo',
    'ISO 9001', 'ISO 14001', 'ISO 45001', 'Manutenção Preventiva', 'Manutenção Corretiva', 'Manutenção Preditiva',
    'TPM', 'PCM', 'PCP', 'CLP', 'Automação Industrial', 'Instrumentação', 'Comandos Elétricos', 'Hidráulica',
    'Pneumática', 'Metrologia', 'Usinagem', 'Soldagem', 'Eficiência Energética', 'Melhoria de Processos',
    // Segurança do trabalho e meio ambiente
    'Segurança do Trabalho', 'NR-10', 'NR-12', 'NR-18', 'NR-33', 'NR-35', 'PGR', 'PCMSO', 'APR', 'CIPA', 'EPI',
    'Licenciamento Ambiental', 'Gestão de Resíduos', 'Anotação de Responsabilidade Técnica',
  ],
  synonyms: [
    ['NR-10', 'NR 10', 'NR10'],
    ['NR-12', 'NR 12', 'NR12'],
    ['NR-18', 'NR 18', 'NR18'],
    ['NR-33', 'NR 33', 'NR33'],
    ['NR-35', 'NR 35', 'NR35', 'Trabalho em Altura'],
    ['PCP', 'Planejamento e Controle da Produção'],
    ['PCM', 'Planejamento e Controle da Manutenção'],
    ['CLP', 'PLC', 'Controlador Lógico Programável'],
    ['APR', 'Análise Preliminar de Riscos', 'Análise Preliminar de Risco'],
    ['EPI', 'EPIs', 'Equipamentos de Proteção Individual'],
    ['TPM', 'Manutenção Produtiva Total'],
    ['MS Project', 'Microsoft Project'],
    ['Segurança do Trabalho', 'SST', 'Saúde e Segurança do Trabalho'],
  ],
});
