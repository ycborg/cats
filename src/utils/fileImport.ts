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

interface PositionedText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Linha reconstruída, com as bordas horizontais (para detectar frases que quebraram na margem). */
interface PositionedLine {
  text: string;
  left: number;
  right: number;
}

/** Reconstrói as linhas a partir das posições dos trechos de texto da página. */
function pageToLines(items: PositionedText[]): PositionedLine[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PositionedText[][] = [];
  for (const item of sorted) {
    const current = lines[lines.length - 1];
    const reference = current?.[0];
    const tolerance = Math.max(2, (reference?.height ?? item.height) * 0.5);
    if (current && reference && Math.abs(reference.y - item.y) <= tolerance) current.push(item);
    else lines.push([item]);
  }

  return lines.map((line) => {
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
function joinWrappedLines(lines: PositionedLine[]): string[] {
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

async function readPdf(buffer: ArrayBuffer): Promise<string> {
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
    pages.push(joinWrappedLines(pageToLines(items)).join('\n'));
  }
  await loadingTask.destroy();
  return pages.join('\n\n');
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

async function readDocx(buffer: ArrayBuffer): Promise<string> {
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
  return lines.join('\n');
}

/* ---------------------------------------------------------------------------
 * Entrada pública
 * ------------------------------------------------------------------------- */

export async function readResumeFile(file: File): Promise<string> {
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

  const text =
    kind === 'txt' ? await file.text() : kind === 'pdf' ? await readPdf(await file.arrayBuffer()) : await readDocx(await file.arrayBuffer());
  const cleaned = tidy(text);

  if (cleaned.replace(/\s/g, '').length < MIN_EXTRACTED_CHARS) {
    throw new ResumeImportError(
      kind === 'pdf'
        ? 'Não encontramos texto neste PDF: ele parece ser uma imagem escaneada. O ATS também não conseguiria lê-lo. Exporte o currículo como PDF de texto.'
        : 'O arquivo está vazio ou quase sem texto.',
    );
  }
  return cleaned;
}
