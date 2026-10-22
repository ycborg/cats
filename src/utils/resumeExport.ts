import { serializeResume } from './clipboard';

/**
 * Exportação do currículo gerado (com as edições feitas na folha) para Word (.docx) e texto (.txt),
 * 100% no navegador. O .docx é montado do zero: Arial, A4, títulos de seção com linha inferior e
 * marcadores em texto ("•"), formato simples que os ATS leem bem.
 */

const BLOCK_SELECTOR = 'h1,h2,h3,p,li,div';

type BlockKind = 'name' | 'header' | 'section' | 'subheading' | 'bullet' | 'paragraph';

interface Block {
  kind: BlockKind;
  text: string;
}

/** Lê os blocos da folha (mesmo critério do "Copiar texto": só os blocos "folha", sem filhos). */
function readBlocks(root: HTMLElement): Block[] {
  return Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
    .filter((element) => !element.querySelector(BLOCK_SELECTOR))
    .map((element): Block | null => {
      const text = element.innerText.replace(/\s+/g, ' ').trim();
      if (!text) return null;
      const inHeader = Boolean(element.closest('header'));
      switch (element.tagName) {
        case 'H1':
          return { kind: 'name', text };
        case 'H2':
          return { kind: 'section', text: text.toUpperCase() };
        case 'H3':
          return { kind: 'subheading', text };
        case 'LI':
          return { kind: 'bullet', text };
        default:
          return { kind: inHeader ? 'header' : 'paragraph', text };
      }
    })
    .filter((block): block is Block => block !== null);
}

const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Tamanhos em meios-pontos (padrão do Word): 21 = 10,5pt. */
const SIZE = { name: 36, header: 20, section: 22, body: 21 } as const;

function paragraphXml({ kind, text }: Block): string {
  const run = (options: { bold?: boolean; size: number; color?: string }) =>
    `<w:r><w:rPr>${options.bold ? '<w:b/>' : ''}${options.color ? `<w:color w:val="${options.color}"/>` : ''}<w:sz w:val="${options.size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;

  switch (kind) {
    case 'name':
      return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>${run({ bold: true, size: SIZE.name, color: '0F141E' })}</w:p>`;
    case 'header':
      return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>${run({ size: SIZE.header, color: '334155' })}</w:p>`;
    case 'section':
      return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="CBD5E1"/></w:pBdr><w:spacing w:before="280" w:after="100"/></w:pPr>${run({ bold: true, size: SIZE.section, color: '0F141E' })}</w:p>`;
    case 'subheading':
      return `<w:p><w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr>${run({ bold: true, size: SIZE.body, color: '0F141E' })}</w:p>`;
    case 'bullet':
      return `<w:p><w:pPr><w:ind w:left="360" w:hanging="200"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="${SIZE.body}"/></w:rPr><w:t xml:space="preserve">•  ${escapeXml(text)}</w:t></w:r></w:p>`;
    default:
      return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>${run({ size: SIZE.body, color: '334155' })}</w:p>`;
  }
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

/** Fonte padrão Arial 10,5pt para todo o documento. */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="21"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;

/** Página A4 com margens de 2 cm (1134 twips). */
const SECTION = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';

export async function buildResumeDocx(root: HTMLElement): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate');
  const body = readBlocks(root).map(paragraphXml).join('');
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${SECTION}</w:body></w:document>`;

  const zip = zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(ROOT_RELS),
    'word/document.xml': strToU8(document),
    'word/_rels/document.xml.rels': strToU8(DOCUMENT_RELS),
    'word/styles.xml': strToU8(STYLES),
  });
  return new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export function buildResumeText(root: HTMLElement): Blob {
  // BOM no início: o Bloco de Notas do Windows reconhece os acentos corretamente.
  return new Blob(['﻿', serializeResume(root)], { type: 'text/plain;charset=utf-8' });
}

/** Nome do arquivo a partir do nome da pessoa: "Curriculo - Mariana Costa.docx". */
export function resumeFileName(root: HTMLElement, extension: 'docx' | 'txt'): string {
  const name = root.querySelector('h1')?.innerText.replace(/\s+/g, ' ').trim() ?? '';
  const safeName = name.replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
  return `${safeName ? `Curriculo - ${safeName}` : 'Curriculo'}.${extension}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
