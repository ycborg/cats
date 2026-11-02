// @vitest-environment jsdom
import { strToU8, zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { serializeResume as serializeFromClipboard } from '../src/utils/clipboard';
import { loadDraft, saveDraft } from '../src/utils/draftStorage';
import { ResumeImportError, readResumeFile } from '../src/utils/fileImport';
import { buildResumeDocx, resumeFileName } from '../src/utils/resumeExport';
import { serializeResume } from '../src/utils/resumeSheet';

// O jsdom não implementa `innerText`; nas folhas de teste `textContent` dá o mesmo resultado.
if (!('innerText' in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    get(this: HTMLElement) {
      return this.textContent ?? '';
    },
  });
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const LONG_TEXT = 'Analista de sistemas com experiência em projetos de integração e suporte a clientes corporativos.';
/** Caracteres de controle proibidos em XML 1.0 (montado por código para o arquivo de teste ficar legível). */
const CONTROL = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}${String.fromCharCode(14)}-${String.fromCharCode(31)}]`,
);
const BEL = String.fromCharCode(7);

function sheet(name: string): HTMLElement {
  const root = document.createElement('article');
  root.innerHTML = `<header><h1></h1><p>Desenvolvedora</p></header><section><h2>Resumo</h2><p>${LONG_TEXT}</p></section>`;
  root.querySelector('h1')!.textContent = name;
  document.body.replaceChildren(root);
  return root;
}

/** Monta um .docx mínimo com o document.xml dado. */
function docxFile(documentXml: string, name = 'cv.docx', type = ''): File {
  return new File([zipSync({ 'word/document.xml': strToU8(documentXml) })], name, { type });
}
const docxBody = (text: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`;

describe('1. caracteres de controle no .docx', () => {
  test('o .docx exportado é XML válido e reimporta sem o caractere', async () => {
    const blob = await buildResumeDocx(sheet(`Maria${BEL} Silva`));

    const { unzipSync, strFromU8 } = await import('fflate');
    const xml = strFromU8(unzipSync(new Uint8Array(await blob.arrayBuffer()))['word/document.xml']!);
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);

    const { text } = await readResumeFile(new File([blob], 'cv.docx'));
    expect(text.split('\n')[0]).toBe('Maria Silva');
    expect(text).not.toMatch(CONTROL);
  });

  test('a importação também descarta caracteres de controle do texto lido', async () => {
    const dirty = `Maria${BEL} Silva\n${LONG_TEXT}${String.fromCharCode(11)}${String.fromCharCode(0)}`;
    const { text } = await readResumeFile(new File([dirty], 'cv.txt'));
    expect(text.split('\n')[0]).toBe('Maria Silva');
    expect(text).not.toMatch(CONTROL);
  });
});

describe('2. codificação do .txt', () => {
  test('bytes Windows-1252 (acentos) são decodificados sem "�"', async () => {
    // cp1252: é=E9, ç=E7, ã=E3, ê=EA (o Node decodifica 0x80-0x9F como Latin-1, então ficam fora do teste)
    const bytes = new Uint8Array([
      ...strToU8('Jos'),
      0xe9,
      ...strToU8(' da Silva\nAnalista de integra'),
      0xe7,
      0xe3,
      ...strToU8('o com experi'),
      0xea,
      ...strToU8('ncia'),
      ...strToU8(' e suporte a clientes corporativos e projetos.'),
    ]);
    const { text } = await readResumeFile(new File([bytes], 'cv.txt', { type: 'text/plain' }));
    expect(text).not.toContain('�');
    expect(text).toContain('José da Silva');
    expect(text).toContain('integração com experiência e suporte');
  });

  test('UTF-8 válido continua funcionando (com e sem BOM)', async () => {
    const content = `João Ação\n${LONG_TEXT}`;
    for (const bytes of [strToU8(content), new Uint8Array([0xef, 0xbb, 0xbf, ...strToU8(content)])]) {
      const { text } = await readResumeFile(new File([bytes], 'cv.txt'));
      expect(text.startsWith('João Ação')).toBe(true);
    }
  });

  test.each([
    ['LE', [0xff, 0xfe], (code: number) => [code & 0xff, code >> 8]],
    ['BE', [0xfe, 0xff], (code: number) => [code >> 8, code & 0xff]],
  ] as const)('UTF-16 %s com BOM', async (_label, bom, encode) => {
    const content = `João Ação\n${LONG_TEXT}`;
    const bytes = new Uint8Array([...bom, ...[...content].flatMap((char) => encode(char.charCodeAt(0)))]);
    const { text } = await readResumeFile(new File([bytes], 'cv.txt'));
    expect(text.startsWith('João Ação')).toBe(true);
    expect(text).not.toContain(String.fromCharCode(0));
  });
});

describe('3. liberação do pdf.js quando a leitura falha', () => {
  afterEach(() => {
    vi.doUnmock('pdfjs-dist');
    vi.doUnmock('pdfjs-dist/build/pdf.worker.min.mjs?url');
    vi.resetModules();
  });

  test('destrói a tarefa e devolve ResumeImportError se uma página falha', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    vi.resetModules();
    vi.doMock('pdfjs-dist', () => ({
      GlobalWorkerOptions: {},
      getDocument: () => ({
        promise: Promise.resolve({ numPages: 1, getPage: () => Promise.reject(new Error('página quebrada')) }),
        destroy,
      }),
    }));
    vi.doMock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }));
    const { readResumeFile: read, ResumeImportError: ImportError } = await import('../src/utils/fileImport');

    const error = await read(new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImportError);
    expect((error as Error).message).toContain('ler o texto deste PDF');
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

describe('4. "bomba" de DOCX', () => {
  test('recusa document.xml descompactado acima de 20 MB, com mensagem clara', async () => {
    const file = docxFile(docxBody('x'.repeat(21 * 1024 * 1024)));
    expect(file.size).toBeLessThan(10 * 1024 * 1024); // passa no limite do arquivo compactado
    const error = await readResumeFile(file).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ResumeImportError);
    expect((error as Error).message).toContain('grande demais');
  });

  test('um .docx normal continua sendo lido', async () => {
    const { text } = await readResumeFile(docxFile(docxBody(LONG_TEXT)));
    expect(text).toBe(LONG_TEXT);
  });
});

describe('5. .docx sem extensão, com o MIME do Word', () => {
  test('é aceito pelo tipo MIME', async () => {
    const { text } = await readResumeFile(docxFile(docxBody(LONG_TEXT), 'curriculo', DOCX_MIME));
    expect(text).toBe(LONG_TEXT);
  });

  test('sem extensão e sem MIME segue como formato não suportado', async () => {
    await expect(readResumeFile(docxFile(docxBody(LONG_TEXT), 'curriculo'))).rejects.toThrow('Formato não suportado');
  });
});

describe('8. nome do arquivo com emoji', () => {
  test('o corte em 60 caracteres não parte um emoji ao meio', () => {
    // 59 letras + emoji (par substituto) + sobra: cortar por unidades UTF-16 deixaria meio emoji.
    const result = resumeFileName(sheet(`${'a'.repeat(59)}😀 fim`), 'docx');
    expect(result).toBe(`Curriculo - ${'a'.repeat(59)}😀.docx`);
  });
});

describe('9. leitura da folha centralizada', () => {
  test('serializeResume continua exportado de clipboard e dá o mesmo texto', () => {
    const root = sheet('Ana Lima');
    expect(serializeFromClipboard(root)).toBe(serializeResume(root));
    expect(serializeResume(root)).toBe(`Ana Lima\nDesenvolvedora\n\nRESUMO\n${LONG_TEXT}`);
  });
});

describe('10. cota de armazenamento cheia', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  test('se setItem falha, o rascunho antigo é removido (não ressuscita)', () => {
    saveDraft({ jobText: 'Vaga antiga', resumeText: 'CV antigo', importedResume: null });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError');
    });
    saveDraft({ jobText: 'Vaga nova', resumeText: 'CV novo', importedResume: null });
    vi.restoreAllMocks();
    expect(loadDraft()).toEqual({ jobText: '', resumeText: '', importedResume: null });
  });
});

describe('11. validade do rascunho', () => {
  const KEY = 'cats:rascunho:v1';
  const DAY = 24 * 60 * 60 * 1000;
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  test('grava savedAt e restaura dentro do prazo', () => {
    saveDraft({ jobText: 'Vaga', resumeText: 'CV', importedResume: null });
    expect(JSON.parse(localStorage.getItem(KEY)!).savedAt).toBe(Date.now());
    vi.setSystemTime(Date.now() + 6 * DAY);
    expect(loadDraft()).toEqual({ jobText: 'Vaga', resumeText: 'CV', importedResume: null });
  });

  test('rascunho com mais de 7 dias é descartado e apagado', () => {
    saveDraft({ jobText: 'Vaga', resumeText: 'CV', importedResume: null });
    vi.setSystemTime(Date.now() + 8 * DAY);
    expect(loadDraft()).toEqual({ jobText: '', resumeText: '', importedResume: null });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  test('formato antigo (sem savedAt) vale uma vez e é regravado com a data', () => {
    localStorage.setItem(KEY, JSON.stringify({ jobText: 'Vaga', resumeText: 'CV' }));
    expect(loadDraft()).toEqual({ jobText: 'Vaga', resumeText: 'CV', importedResume: null });
    expect(JSON.parse(localStorage.getItem(KEY)!).savedAt).toBe(Date.now());
    vi.setSystemTime(Date.now() + 8 * DAY);
    expect(loadDraft().resumeText).toBe('');
  });
});
