/**
 * Importação do currículo a partir de arquivo (PDF, DOCX ou TXT), 100% no navegador: o arquivo é lido
 * localmente e nunca é enviado a servidores. As bibliotecas de PDF e DOCX são carregadas sob demanda,
 * só quando a pessoa importa um arquivo, para não pesar no carregamento inicial do site.
 */

export const ACCEPTED_RESUME_FILES =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Abaixo disso, o PDF provavelmente é uma imagem escaneada (sem texto selecionável). */
const MIN_EXTRACTED_CHARS = 40;

/** Texto extraído do arquivo e o que foi possível observar do layout original. */
export interface ImportedResume {
  text: string;
  /** Layout em duas ou mais colunas (ou tabela usada como layout): muitos ATS misturam a leitura. */
  multiColumn: boolean;
}

/** Erro com mensagem pronta para mostrar ao usuário. */
export class ResumeImportError extends Error {
  override name = 'ResumeImportError';
}

type FileKind = 'pdf' | 'docx' | 'txt' | 'doc' | 'unknown';

function detectKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.doc')) return 'doc';
  if (name.endsWith('.txt') || file.type === 'text/plain') return 'txt';
  return 'unknown';
}

/** Limpa espaços sobrando e excesso de linhas em branco. */
function tidy(text: string): string {
  return text
    .replace(/ /g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------------------------------------------------------------------------
 * PDF (pdf.js)
 * ------------------------------------------------------------------------- */

export interface PositionedText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Linha reconstruída, com as bordas horizontais (para detectar frases que quebraram na margem). */
export interface PositionedLine {
  text: string;
  left: number;
  right: number;
}

/** Agrupa os trechos da página em linhas visuais (mesma altura), de cima para baixo. */
function groupRows(items: PositionedText[]): PositionedText[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedText[][] = [];
  for (const item of sorted) {
    const current = rows[rows.length - 1];
    const reference = current?.[0];
    const tolerance = Math.max(2, (reference?.height ?? item.height) * 0.5);
    if (current && reference && Math.abs(reference.y - item.y) <= tolerance) current.push(item);
    else rows.push([item]);
  }
  return rows;
}

/** Reconstrói as linhas a partir das posições dos trechos de texto da página. */
export function pageToLines(items: PositionedText[]): PositionedLine[] {
  return groupRows(items).map((line) => {
    const ordered = line.sort((a, b) => a.x - b.x);
    let text = '';
    let previousEnd: number | null = null;
    for (const item of ordered) {
      const gap = previousEnd === null ? 0 : item.x - previousEnd;
      // Trechos separados por um vão visível na linha ganham um espaço entre si.
      const needsSpace = text.length > 0 && gap > item.height * 0.15 && !text.endsWith(' ') && !item.text.startsWith(' ');
      text += (needsSpace ? ' ' : '') + item.text;
      previousEnd = item.x + item.width;
    }
    return { text, left: ordered[0]?.x ?? 0, right: previousEnd ?? 0 };
  });
}

/** Linhas de contato (e-mail, site, perfil) costumam começar com minúscula, mas nunca são continuação. */
const CONTACT_LINE = /@|https?:\/\/|www\.|linkedin|github|behance|\|/i;
/** A linha anterior precisa ter ido quase até a margem direita para ser uma frase que quebrou. */
const WRAP_WIDTH_RATIO = 0.6;

/**
 * No PDF, uma frase longa quebra em várias linhas visuais. Junta a linha seguinte à anterior quando:
 * ela começa com letra minúscula, a anterior chegou perto da margem direita e não terminou com
 * pontuação, e nenhuma das duas é uma linha de contato. Assim parágrafos e conquistas não ficam
 * picotados, e cabeçalho/contatos continuam em linhas separadas.
 */
export function joinWrappedLines(lines: PositionedLine[]): string[] {
  const rightEdge = Math.max(0, ...lines.map((line) => line.right));
  const leftEdge = Math.min(...lines.map((line) => line.left));
  const wrapThreshold = leftEdge + (rightEdge - leftEdge) * WRAP_WIDTH_RATIO;

  const joined: PositionedLine[] = [];
  for (const line of lines) {
    const previous = joined[joined.length - 1];
    const continues =
      previous !== undefined &&
      /^\p{Ll}/u.test(line.text) &&
      !/[:.!?;]$/.test(previous.text) &&
      previous.right >= wrapThreshold &&
      !CONTACT_LINE.test(line.text) &&
      !CONTACT_LINE.test(previous.text);
    if (continues) joined[joined.length - 1] = { ...previous, text: `${previous.text} ${line.text}`, right: line.right };
    else joined.push(line);
  }
  return joined.map((line) => line.text);
}

/** Páginas com poucas linhas (capa, rodapé solto) não permitem concluir nada sobre colunas. */
const MIN_ROWS_FOR_COLUMNS = 8;
/** Vão mínimo entre colunas, em pontos (~6 mm). */
const MIN_GUTTER_WIDTH = 16;
/** Parte das linhas que precisa ter texto dos dois lados do vão. */
const MIN_SPLIT_RATIO = 0.3;
/** Parte das linhas que pode atravessar o vão (nome e contatos centralizados no topo, por exemplo). */
const MAX_CROSSING_RATIO = 0.15;

/**
 * Detecta página em duas (ou mais) colunas: procura uma faixa vertical, no miolo da página, que
 * quase nenhuma linha atravessa e que tem texto dos dois lados em boa parte das linhas. Datas
 * alinhadas à direita num currículo de uma coluna não disparam: o texto corrido atravessa a faixa.
 */
export function hasMultipleColumns(items: PositionedText[]): boolean {
  const rows = groupRows(items);
  if (rows.length < MIN_ROWS_FOR_COLUMNS) return false;
  const left = Math.min(...items.map((item) => item.x));
  const right = Math.max(...items.map((item) => item.x + item.width));
  const width = right - left;
  if (width <= 0) return false;

  const isGutterAt = (start: number, end: number): boolean => {
    let crossing = 0;
    let split = 0;
    for (const row of rows) {
      if (row.some((item) => item.x < end && item.x + item.width > start)) crossing += 1;
      else if (row.some((item) => item.x + item.width <= start) && row.some((item) => item.x >= end)) split += 1;
    }
    return crossing <= rows.length * MAX_CROSSING_RATIO && split >= Math.max(4, rows.length * MIN_SPLIT_RATIO);
  };

  for (let start = left + width * 0.15; start + MIN_GUTTER_WIDTH <= left + width * 0.85; start += 2) {
    if (isGutterAt(start, start + MIN_GUTTER_WIDTH)) return true;
  }
  return false;
}

async function readPdf(buffer: ArrayBuffer): Promise<ImportedResume> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  let document;
  try {
    document = await loadingTask.promise;
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new ResumeImportError('Este PDF está protegido por senha. Gere uma versão sem senha e tente de novo.');
    }
    throw new ResumeImportError('Não foi possível abrir este PDF. Ele pode estar corrompido.');
  }

  const pages: string[] = [];
  let multiColumn = false;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: PositionedText[] = [];
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      items.push({
        text: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width: item.width,
        height: item.height || Math.abs(item.transform[3] ?? 10),
      });
    }
    if (!multiColumn && hasMultipleColumns(items)) multiColumn = true;
    pages.push(joinWrappedLines(pageToLines(items)).join('\n'));
  }
  await loadingTask.destroy();
  return { text: pages.join('\n\n'), multiColumn };
}

/* ---------------------------------------------------------------------------
 * DOCX (zip + XML do Word)
 * ------------------------------------------------------------------------- */

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

/** Parágrafo do Word mais próximo (para não duplicar texto de caixas de texto aninhadas). */
function closestParagraph(node: Node): Element | null {
  for (let current: Node | null = node.parentNode; current; current = current.parentNode) {
    if (current instanceof Element && current.namespaceURI === WORD_NS && current.localName === 'p') return current;
  }
  return null;
}

/**
 * Layout em colunas no Word: seção com 2+ colunas (Layout → Colunas) ou tabela com texto em mais de
 * uma célula da mesma linha, recurso comum em modelos de currículo "lado a lado".
 */
export function docxHasColumns(xml: Document): boolean {
  const sectionColumns = Array.from(xml.getElementsByTagNameNS(WORD_NS, 'cols')).some(
    (cols) => Number(cols.getAttributeNS(WORD_NS, 'num') ?? 1) >= 2,
  );
  if (sectionColumns) return true;
  return Array.from(xml.getElementsByTagNameNS(WORD_NS, 'tr')).some((row) => {
    const filledCells = Array.from(row.getElementsByTagNameNS(WORD_NS, 'tc')).filter(
      (cell) => (cell.textContent ?? '').trim().length > 0,
    );
    return filledCells.length >= 2;
  });
}

async function readDocx(buffer: ArrayBuffer): Promise<ImportedResume> {
  const { unzipSync, strFromU8 } = await import('fflate');
  let files;
  try {
    files = unzipSync(new Uint8Array(buffer), { filter: (file) => file.name === 'word/document.xml' });
  } catch {
    throw new ResumeImportError('Não foi possível abrir este arquivo do Word. Ele pode estar corrompido.');
  }
  const xmlBytes = files['word/document.xml'];
  if (!xmlBytes) throw new ResumeImportError('Este arquivo não parece ser um documento do Word (.docx) válido.');

  const xml = new DOMParser().parseFromString(strFromU8(xmlBytes), 'application/xml');
  const lines: string[] = [];
  for (const paragraph of Array.from(xml.getElementsByTagNameNS(WORD_NS, 'p'))) {
    let text = '';
    const walker = xml.createTreeWalker(paragraph, NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node as Element;
      if (element.namespaceURI !== WORD_NS || closestParagraph(element) !== paragraph) continue;
      if (element.localName === 't') text += element.textContent ?? '';
      else if (element.localName === 'tab') text += ' ';
      else if (element.localName === 'br' || element.localName === 'cr') text += '\n';
    }
    // Itens de lista do Word guardam o marcador fora do texto: recolocamos um "•".
    const isListItem = paragraph.getElementsByTagNameNS(WORD_NS, 'numPr').length > 0;
    lines.push(isListItem && text.trim() ? `• ${text}` : text);
  }
  return { text: lines.join('\n'), multiColumn: docxHasColumns(xml) };
}

/* ---------------------------------------------------------------------------
 * Entrada pública
 * ------------------------------------------------------------------------- */

export async function readResumeFile(file: File): Promise<ImportedResume> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ResumeImportError('Arquivo muito grande (máximo de 10 MB). Um currículo costuma ter bem menos que isso.');
  }

  const kind = detectKind(file);
  if (kind === 'doc') {
    throw new ResumeImportError('Arquivos .doc (Word 97–2003) não são suportados. No Word, use "Salvar como" .docx ou PDF.');
  }
  if (kind === 'unknown') {
    throw new ResumeImportError('Formato não suportado. Envie o currículo em PDF, DOCX ou TXT.');
  }

  const extracted: ImportedResume =
    kind === 'txt'
      ? { text: await file.text(), multiColumn: false }
      : kind === 'pdf'
        ? await readPdf(await file.arrayBuffer())
        : await readDocx(await file.arrayBuffer());
  const cleaned = tidy(extracted.text);

  if (cleaned.replace(/\s/g, '').length < MIN_EXTRACTED_CHARS) {
    throw new ResumeImportError(
      kind === 'pdf'
        ? 'Não encontramos texto neste PDF: ele parece ser uma imagem escaneada. O ATS também não conseguiria lê-lo. Exporte o currículo como PDF de texto.'
        : 'O arquivo está vazio ou quase sem texto.',
    );
  }
  return { text: cleaned, multiColumn: extracted.multiColumn };
}

/** Parte das linhas do arquivo que precisa continuar no campo para o layout dele ainda valer. */
const SAME_SOURCE_RATIO = 0.6;

/**
 * O texto do campo ainda é o do arquivo importado? Pequenas edições mantêm o vínculo; colar outro
 * currículo por cima desfaz (e o alerta de colunas deixa de aparecer).
 */
export function isFromImportedFile(imported: Pick<ImportedResume, 'text'>, currentText: string): boolean {
  const normalize = (text: string) =>
    text.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter((line) => line.length > 0);
  const importedLines = normalize(imported.text);
  if (importedLines.length === 0) return false;
  const current = new Set(normalize(currentText));
  const kept = importedLines.filter((line) => current.has(line)).length;
  return kept / importedLines.length >= SAME_SOURCE_RATIO;
}
