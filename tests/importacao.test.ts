// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import type { PositionedLine, PositionedText } from '../src/utils/fileImport';
import {
  ResumeImportError,
  docxHasColumns,
  hasMultipleColumns,
  isFromImportedFile,
  joinWrappedLines,
  pageToLines,
  readResumeFile,
} from '../src/utils/fileImport';

/* ---------------------------------------------------------------------------
 * PDF: posições simuladas (pontos; y cresce para cima, como no pdf.js)
 * ------------------------------------------------------------------------- */

const item = (text: string, x: number, y: number, width: number): PositionedText => ({ text, x, y, width, height: 10 });
const PAGE_TOP = 800;
const rowY = (row: number) => PAGE_TOP - row * 14;

/** Currículo de uma coluna: texto corrido de margem a margem e cargos com data alinhada à direita. */
function singleColumnPage(): PositionedText[] {
  const items: PositionedText[] = [item('Mariana Costa', 240, rowY(0), 120), item('mariana@email.com | (11) 90000-0000', 180, rowY(1), 240)];
  for (let row = 2; row < 32; row += 1) {
    if (row % 6 === 2) {
      items.push(item('Desenvolvedora Front-end — Loja Aurora', 50, rowY(row), 220), item('mar/2022 – atual', 470, rowY(row), 75));
    } else {
      items.push(item('Texto corrido de uma conquista que vai de uma margem até a outra da página.', 50, rowY(row), 495));
    }
  }
  return items;
}

/** Modelo "lado a lado": barra lateral estreita à esquerda e conteúdo principal à direita. */
function twoColumnPage(): PositionedText[] {
  const items: PositionedText[] = [item('Mariana Costa', 200, rowY(0), 200)];
  for (let row = 2; row < 22; row += 1) items.push(item('Habilidade', 40, rowY(row), 130));
  for (let row = 2; row < 34; row += 1) items.push(item('Conquista no histórico profissional', 220, rowY(row), 340));
  return items;
}

describe('detecção de colunas no PDF', () => {
  test('uma coluna (com datas alinhadas à direita) não é coluna dupla', () => {
    expect(hasMultipleColumns(singleColumnPage())).toBe(false);
  });

  test('barra lateral + conteúdo principal é coluna dupla', () => {
    expect(hasMultipleColumns(twoColumnPage())).toBe(true);
  });

  test('duas colunas de mesma largura', () => {
    const items: PositionedText[] = [];
    for (let row = 0; row < 25; row += 1) items.push(item('Coluna esquerda', 40, rowY(row), 230), item('Coluna direita', 310, rowY(row), 240));
    expect(hasMultipleColumns(items)).toBe(true);
  });

  test('página com poucas linhas não permite concluir nada', () => {
    expect(hasMultipleColumns(twoColumnPage().slice(0, 6))).toBe(false);
    expect(hasMultipleColumns([])).toBe(false);
  });

  test('tabela pequena de idiomas numa página de uma coluna não dispara', () => {
    const items = singleColumnPage();
    for (let row = 32; row < 36; row += 1) items.push(item('Inglês', 50, rowY(row), 60), item('Avançado', 400, rowY(row), 70));
    expect(hasMultipleColumns(items)).toBe(false);
  });
});

describe('reconstrução das linhas do PDF', () => {
  test('trechos na mesma altura viram uma linha, em ordem, com espaço onde há vão', () => {
    const lines = pageToLines([item('Mundo', 120, 700, 40), item('Olá', 50, 700, 30), item('Linha 2', 50, 686, 40)]);
    expect(lines.map((line) => line.text)).toEqual(['Olá Mundo', 'Linha 2']);
  });

  test('trechos colados (mesma palavra quebrada em pedaços) não ganham espaço', () => {
    const lines = pageToLines([item('Type', 50, 700, 25), item('Script', 75, 700, 30)]);
    expect(lines[0]?.text).toBe('TypeScript');
  });

  const line = (text: string, right: number, left = 50): PositionedLine => ({ text, left, right });

  test('frase que quebrou na margem é juntada', () => {
    expect(joinWrappedLines([line('Desenvolvi a nova vitrine do e-commerce em React, reduzindo o', 540), line('tempo de carregamento em 38%.', 300)])).toEqual([
      'Desenvolvi a nova vitrine do e-commerce em React, reduzindo o tempo de carregamento em 38%.',
    ]);
  });

  test('linha curta seguida de minúscula não é juntada (não chegou na margem)', () => {
    expect(joinWrappedLines([line('Habilidades', 540), line('Título curto', 120), line('continua aqui', 200)])).toHaveLength(3);
  });

  test('linha que termina com pontuação não é juntada', () => {
    expect(joinWrappedLines([line('Frase completa que vai até a margem direita da página.', 540), line('outra frase', 200)])).toHaveLength(2);
  });

  test('linhas de contato nunca são juntadas (PR #6)', () => {
    const lines = [
      line('Desenvolvedora Front-end com foco em performance e acessibilidade web', 540),
      line('mariana.albuquerque@email.com | (11) 90000-0000', 400),
      line('linkedin.com/in/mariana', 200),
    ];
    expect(joinWrappedLines(lines)).toHaveLength(3);
  });
});

/* ---------------------------------------------------------------------------
 * DOCX
 * ------------------------------------------------------------------------- */

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const docxXml = (body: string) =>
  new DOMParser().parseFromString(`<w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`, 'application/xml');
const paragraph = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
const cell = (text: string) => `<w:tc>${paragraph(text)}</w:tc>`;

describe('detecção de colunas no DOCX', () => {
  test('documento simples não tem colunas', () => {
    expect(docxHasColumns(docxXml(paragraph('Mariana') + paragraph('Experiência')))).toBe(false);
  });

  test('seção com 2 colunas (Layout → Colunas)', () => {
    expect(docxHasColumns(docxXml(`${paragraph('Texto')}<w:sectPr><w:cols w:num="2"/></w:sectPr>`))).toBe(true);
  });

  test('seção declarando 1 coluna não dispara', () => {
    expect(docxHasColumns(docxXml(`${paragraph('Texto')}<w:sectPr><w:cols w:num="1"/></w:sectPr>`))).toBe(false);
  });

  test('tabela usada como layout lado a lado', () => {
    expect(docxHasColumns(docxXml(`<w:tbl><w:tr>${cell('Habilidades')}${cell('Experiência')}</w:tr></w:tbl>`))).toBe(true);
  });

  test('tabela com uma só célula preenchida por linha não dispara', () => {
    expect(docxHasColumns(docxXml(`<w:tbl><w:tr>${cell('Mariana')}${cell('')}</w:tr></w:tbl>`))).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
 * Entrada pública
 * ------------------------------------------------------------------------- */

const RESUME_TEXT = `Mariana Costa
mariana@email.com

Experiência
Desenvolvedora Front-end — Loja Aurora | mar/2022 – atual`;

describe('readResumeFile', () => {
  test('TXT: lê o texto e limpa espaços e linhas em branco sobrando', async () => {
    const file = new File([`  ${RESUME_TEXT.replace('\n\n', '\n\n\n\n')}   `], 'cv.txt', { type: 'text/plain' });
    await expect(readResumeFile(file)).resolves.toEqual({ text: RESUME_TEXT, multiColumn: false });
  });

  test.each([
    ['cv.doc', 'Word 97–2003'],
    ['cv.odt', 'Formato não suportado'],
  ])('%s → erro explicativo', async (name, message) => {
    await expect(readResumeFile(new File(['x'], name))).rejects.toThrow(message);
  });

  test('arquivo grande demais', async () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'cv.pdf', { type: 'application/pdf' });
    await expect(readResumeFile(big)).rejects.toBeInstanceOf(ResumeImportError);
  });

  test('arquivo quase vazio', async () => {
    await expect(readResumeFile(new File(['Oi'], 'cv.txt'))).rejects.toThrow('quase sem texto');
  });

  test('DOCX corrompido', async () => {
    await expect(readResumeFile(new File(['não é zip'], 'cv.docx'))).rejects.toThrow('corrompido');
  });
});

describe('vínculo entre o texto do campo e o arquivo importado', () => {
  const imported = { text: RESUME_TEXT };

  test('mesmo texto ou pequenas edições: continua sendo o arquivo', () => {
    expect(isFromImportedFile(imported, RESUME_TEXT)).toBe(true);
    expect(isFromImportedFile(imported, `${RESUME_TEXT}\n- Nova conquista adicionada.`)).toBe(true);
    expect(isFromImportedFile(imported, RESUME_TEXT.replace('mariana@email.com', 'mari@email.com'))).toBe(true);
  });

  test('outro currículo colado por cima: não é mais o arquivo', () => {
    expect(isFromImportedFile(imported, 'João Lima\njoao@email.com\n\nExperiência\nAnalista — Banco | 2019 – atual')).toBe(false);
    expect(isFromImportedFile(imported, '')).toBe(false);
  });
});
