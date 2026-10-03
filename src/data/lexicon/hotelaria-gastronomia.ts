import { defineArea } from './types';

export default defineArea({
  area: 'Hotelaria, gastronomia e turismo',
  hardSkills: [
    // Hotelaria
    'Check-in e Check-out', 'Recepção Hoteleira', 'Governança Hoteleira', 'Gestão de Reservas', 'Revenue Management',
    'Gestão de Ocupação', 'Atendimento ao Hóspede', 'Opera PMS', 'Channel Manager', 'Booking',
    // Gastronomia e A&B
    'Boas Práticas de Manipulação', 'Segurança Alimentar', 'Ficha Técnica', 'CMV', 'Mise en Place', 'Cozinha Industrial',
    'Confeitaria', 'Panificação', 'Cozinha Quente', 'Cozinha Fria', 'Controle de Validade', 'APPCC', 'Alimentos e Bebidas',
    'Serviço de Salão', 'Sommelier', 'Barista', 'Coquetelaria',
    // Eventos e turismo
    'Organização de Eventos', 'Cerimonial', 'Agenciamento de Viagens', 'Emissão de Passagens', 'Roteiros Turísticos',
    'Amadeus', 'Sabre',
  ],
  synonyms: [
    ['Alimentos e Bebidas', 'A&B'],
    ['CMV', 'Custo de Mercadoria Vendida'],
    ['APPCC', 'Análise de Perigos e Pontos Críticos de Controle', 'HACCP'],
    ['Boas Práticas de Manipulação', 'Boas Práticas de Manipulação de Alimentos', 'BPF'],
    ['Check-in e Check-out', 'Check-in', 'Check-out'],
  ],
});
