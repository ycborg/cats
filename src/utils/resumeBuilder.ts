import type { AtsResume, Keyword, ResumeLine, ResumeSection, ResumeSectionId } from '../types/ats';
import type { KeywordMatch } from './keywordAnalyzer';
import { stripAccents, termKey } from './textProcessing';

/**
 * Reestrutura o texto bruto do currículo no formato vertical aceito por ATS.
 * Regra ética: apenas reorganiza e padroniza — nunca adiciona competências
 * que não estejam no texto original.
 */

export type ParsedSectionId = ResumeSectionId | 'certifications';

const HEADING_RULES: Array<{ id: ParsedSectionId; pattern: RegExp }> = [
  { id: 'summary', pattern: /^(resumo|perfil|sobre|objetivo|summary|profile|about)/ },
  { id: 'skills', pattern: /^(habilidades|competencias|skills|conhecimentos|tecnologias|stack|hard skills|soft skills)/ },
  { id: 'experience', pattern: /^(experiencia|historico profissional|trajetoria|carreira|experience|work experience|employment)/ },
  { id: 'education', pattern: /^(formacao|educacao|escolaridade|education|academic)/ },
  { id: 'certifications', pattern: /^(cursos|curso|certifica|certifications|courses|licenses)/ },
  { id: 'languages', pattern: /^(idiomas|linguas|languages)/ },
  { id: 'projects', pattern: /^(projetos|projects|portfolio)/ },
  {
    id: 'other',
    pattern: /^(voluntariado|premios|premiacoes|conquistas|publicacoes|informacoes adicionais|atividades extracurriculares|awards|volunteer)/,
  },
];

const SECTION_TITLES: Record<ResumeSectionId, string> = {
  summary: 'RESUMO PROFISSIONAL',
  skills: 'HABILIDADES TÉCNICAS E COMPETÊNCIAS',
  experience: 'HISTÓRICO PROFISSIONAL',
  education: 'FORMAÇÃO ACADÊMICA E CERTIFICAÇÕES',
  projects: 'PROJETOS',
  languages: 'IDIOMAS',
  other: 'INFORMAÇÕES ADICIONAIS',
};

const SECTION_ORDER: ResumeSectionId[] = ['summary', 'skills', 'experience', 'education', 'projects', 'languages', 'other'];

export const BULLET = /^[-•*▪►➤–—·●○◦■□✓✔→]\s*/;
// Tamanhos limitados: sem limite, texto longo sem espaços custa tempo quadrático (≈1 s em 30 mil caracteres).
export const EMAIL = /[\w.+-]{1,64}@[\w-]{1,253}\.[\w.-]{2,63}/;
export const PHONE = /(\+?\d{2}\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/;
const URL = /(https?:\/\/|www\.)\S+|\b(linkedin|github|gitlab|behance)\.com\/\S+/i;
const CONTACT_LABEL = /^(e-?mail|telefone|tel|celular|whatsapp|linkedin|github|portf[oó]lio|site|endere[cç]o|localiza[cç][aã]o|cidade)\s*:\s*/i;
const LOCATION = /^[\p{L}\s.'-]+(,|\s[-/])\s?[A-Za-z]{2}\b/u;
/** "Rótulo: conteúdo" ("Stack: React, Node.js"): é conteúdo da seção, não título. */
const LABELED_CONTENT = /^[^:]{1,30}:\s*\S/;
const DATE_HINT = /\b(19|20)\d{2}\b|\b(atual|presente|present|current)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

export const cleanText = (value: string): string => value.replace(EMOJI, '').replace(/\s+/g, ' ').trim();

const isContact = (value: string): boolean => EMAIL.test(value) || PHONE.test(value) || URL.test(value);

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function detectHeading(line: string): ParsedSectionId | null {
  const raw = line.replace(/[:\-–—_=*#]+$/, '').trim();
  if (!raw || raw.length > 48 || BULLET.test(line) || /\d/.test(raw) || /[.,;]$/.test(raw)) return null;
  // Só o ":" final indica título. "Stack: React" ou "Resumo: …" no meio de uma seção é conteúdo:
  // tratá-lo como título abria uma seção nova e apagava as linhas seguintes.
  if (LABELED_CONTENT.test(raw)) return null;
  const plain = stripAccents(raw.toLowerCase()).replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain || plain.split(' ').length > 5) return null;
  return HEADING_RULES.find((rule) => rule.pattern.test(plain))?.id ?? null;
}

export interface Block {
  id: ParsedSectionId;
  heading: string;
  lines: string[];
}

export function parseBlocks(text: string): { headerLines: string[]; blocks: Block[] } {
  const headerLines: string[] = [];
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = detectHeading(line);
    if (heading) {
      current = { id: heading, heading: cleanText(line.replace(/:+$/, '')), lines: [] };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      headerLines.push(line);
    }
  }
  return { headerLines, blocks };
}

interface ParsedHeader {
  name: string;
  headline: string;
  contacts: string[];
  overflow: string[];
}

/** As primeiras linhas formam o cabeçalho; linhas além disso sem contato viram conteúdo. */
const HEADER_MAX_LINES = 4;

function parseHeader(headerLines: string[]): ParsedHeader {
  const contacts: string[] = [];
  const headlineParts: string[] = [];
  const overflow: string[] = [];
  let name = '';

  headerLines.forEach((line, index) => {
    const looksLikeContact = isContact(line) || CONTACT_LABEL.test(line);
    if (index === 0 && !looksLikeContact) {
      name = cleanText(line);
      return;
    }
    if (!looksLikeContact && index >= HEADER_MAX_LINES) {
      overflow.push(line);
      return;
    }
    for (const rawPiece of line.split(/\s[|•·]\s|\s{2,}|\t|\s[–—]\s/)) {
      const hasLabel = CONTACT_LABEL.test(rawPiece.trim());
      const piece = cleanText(rawPiece.trim().replace(CONTACT_LABEL, ''));
      if (!piece) continue;
      if (hasLabel || isContact(piece) || LOCATION.test(piece)) contacts.push(piece);
      else if (index < HEADER_MAX_LINES) headlineParts.push(piece);
      else overflow.push(piece);
    }
  });

  return {
    name: name || 'Seu Nome Completo',
    headline: headlineParts.join(' · '),
    contacts: [...new Set(contacts)],
    overflow,
  };
}

function looksLikeEntryTitle(text: string): boolean {
  if (LABELED_CONTENT.test(text) && !DATE_HINT.test(text)) return false;
  return text.length <= 110 && (DATE_HINT.test(text) || /\s[|–—@]\s/.test(text) || (text.length <= 60 && !/[.!?]$/.test(text)));
}

function toLines(lines: string[], mode: 'entries' | 'plain'): ResumeLine[] {
  return lines
    .map((line): ResumeLine => {
      if (BULLET.test(line)) return { kind: 'bullet', text: cleanText(line.replace(BULLET, '')) };
      const text = cleanText(line);
      return { kind: mode === 'entries' && looksLikeEntryTitle(text) ? 'subheading' : 'paragraph', text };
    })
    .filter((line) => line.text.length > 0);
}

/** O que a folha precisa do cruzamento: os termos encontrados e como estão escritos no currículo. */
export type SheetKeywords = Pick<KeywordMatch, 'found' | 'resumeForms'>;

/** Um item de habilidade maior que isso não é um termo de lista: a linha é mantida inteira. */
const MAX_SKILL_ITEM = 40;

/** Grafia que a pessoa usou no currículo para cada termo encontrado (nunca o rótulo da vaga). */
function writtenTerms(keywords: Keyword[], resumeForms: Map<string, string>): string[] {
  const terms = new Map<string, string>();
  for (const keyword of keywords) {
    const form = resumeForms.get(keyword.key);
    if (form && !terms.has(termKey(form))) terms.set(termKey(form), cleanText(form));
  }
  return [...terms.values()];
}

function buildSkills(match: SheetKeywords, originalLines: string[]): ResumeLine[] {
  const { found, resumeForms } = match;
  const lines: ResumeLine[] = [];
  const technical = writtenTerms(found.filter((keyword) => keyword.category === 'tech'), resumeForms);
  const competencies = writtenTerms(found.filter((keyword) => keyword.category !== 'tech'), resumeForms).map(capitalize);

  if (technical.length) lines.push({ kind: 'paragraph', text: `Técnicas: ${technical.join(', ')}` });
  if (competencies.length) lines.push({ kind: 'paragraph', text: `Competências e métodos: ${competencies.join(', ')}` });

  // Demais habilidades do currículo original que não coincidem com a vaga — preservadas.
  const knownKeys = new Set(found.map((keyword) => keyword.key));
  const extras = new Map<string, string>();
  const wholeLines: ResumeLine[] = [];
  for (const line of originalLines) {
    const content = line.replace(BULLET, '').replace(/^[^:]{1,30}:\s*/, '');
    const items = content.split(/[,;|•·]/).map((rawItem) => cleanText(rawItem).replace(/\.$/, ''));
    // Item longo é frase ("Gestão de fornecedores internacionais e importação"): fica a linha inteira.
    if (items.some((item) => item.length > MAX_SKILL_ITEM)) {
      wholeLines.push({ kind: 'bullet', text: cleanText(line.replace(BULLET, '')) });
      continue;
    }
    for (const item of items) {
      const key = termKey(item);
      if (!item || !key || knownKeys.has(key) || extras.has(key)) continue;
      extras.set(key, item);
    }
  }
  if (extras.size) lines.push({ kind: 'paragraph', text: `Complementares: ${[...extras.values()].join(', ')}` });
  lines.push(...wholeLines);

  return lines;
}

function buildSummary(summaryLines: ResumeLine[], match: SheetKeywords): ResumeLine[] {
  if (summaryLines.length) return summaryLines;
  const highlights = writtenTerms(match.found, match.resumeForms).slice(0, 5);
  const text = highlights.length
    ? `Profissional com atuação em ${joinPt(highlights)}, conforme detalhado no histórico profissional abaixo.`
    : 'Escreva aqui um resumo de 3 a 4 linhas com seu cargo-alvo, anos de experiência e principais resultados reais.';
  return [{ kind: 'paragraph', text }];
}

/** Monta a folha a partir dos blocos já separados por `parseBlocks` (evita refazer a leitura). */
export function buildAtsResume(
  { headerLines, blocks }: ReturnType<typeof parseBlocks>,
  match: SheetKeywords,
): AtsResume {
  const header = parseHeader(headerLines);

  const grouped = new Map<ResumeSectionId, ResumeLine[]>();
  const append = (id: ResumeSectionId, lines: ResumeLine[]): void => {
    grouped.set(id, [...(grouped.get(id) ?? []), ...lines]);
  };
  const originalSkills: string[] = [];

  // Conteúdo sem título reconhecido vai para o histórico, preservado.
  if (header.overflow.length) append('experience', toLines(header.overflow, 'entries'));

  for (const block of blocks) {
    switch (block.id) {
      case 'summary':
        append('summary', toLines(block.lines, 'plain'));
        break;
      case 'skills':
        originalSkills.push(...block.lines);
        break;
      case 'experience':
        append('experience', toLines(block.lines, 'entries'));
        break;
      case 'education':
      case 'certifications':
        append('education', toLines(block.lines, 'entries'));
        break;
      case 'projects':
        append('projects', toLines(block.lines, 'entries'));
        break;
      case 'languages':
        append('languages', toLines(block.lines, 'plain'));
        break;
      case 'other':
        append('other', [{ kind: 'subheading', text: block.heading }, ...toLines(block.lines, 'plain')]);
        break;
    }
  }

  grouped.set('summary', buildSummary(grouped.get('summary') ?? [], match));
  grouped.set('skills', buildSkills(match, originalSkills));

  const sections: ResumeSection[] = SECTION_ORDER.map((id) => ({
    id,
    title: SECTION_TITLES[id],
    lines: grouped.get(id) ?? [],
  })).filter((section) => section.lines.length > 0);

  return { name: header.name, headline: header.headline, contacts: header.contacts, sections };
}
