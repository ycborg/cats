// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { loadDraft, saveDraft } from '../src/utils/draftStorage';
import { readResumeFile } from '../src/utils/fileImport';
import { buildResumeDocx, buildResumeText, resumeFileName } from '../src/utils/resumeExport';

// O jsdom não implementa `innerText` (o navegador sim). Nas folhas do currículo cada bloco é uma
// linha de texto simples, então `textContent` dá o mesmo resultado.
if (!('innerText' in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    get(this: HTMLElement) {
      return this.textContent ?? '';
    },
  });
}

/** Folha do currículo como o ResumePreview a desenha. */
function sheet(name = 'Mariana Costa'): HTMLElement {
  const root = document.createElement('article');
  root.innerHTML = `
    <header><h1></h1><p>Desenvolvedora Front-end</p><p>São Paulo, SP | mariana@email.com</p></header>
    <section><h2>Histórico profissional</h2><div>
      <h3>Desenvolvedora — Loja Aurora &amp; Cia | mar/2022 – atual</h3>
      <ul><li>Reduzi o tempo de carregamento em 38% com React &lt;Suspense&gt;.</li><li>Criei o Design System.</li></ul>
    </div></section>
    <section><h2>Formação</h2><div><p>Ciência da Computação — USP | 2019</p></div></section>`;
  root.querySelector('h1')!.textContent = name;
  document.body.replaceChildren(root);
  return root;
}

describe('exportação para Word (.docx)', () => {
  test('o .docx gerado é lido de volta pelo próprio importador, com acentos e símbolos', async () => {
    const blob = await buildResumeDocx(sheet());
    const { text } = await readResumeFile(new File([blob], 'cv.docx'));
    expect(text.split('\n')).toEqual([
      'Mariana Costa',
      'Desenvolvedora Front-end',
      'São Paulo, SP | mariana@email.com',
      'HISTÓRICO PROFISSIONAL',
      'Desenvolvedora — Loja Aurora & Cia | mar/2022 – atual',
      '• Reduzi o tempo de carregamento em 38% com React <Suspense>.',
      '• Criei o Design System.',
      'FORMAÇÃO',
      'Ciência da Computação — USP | 2019',
    ]);
  });

  test('o .docx exportado é de uma coluna (passa na verificação de layout)', async () => {
    const blob = await buildResumeDocx(sheet());
    await expect(readResumeFile(new File([blob], 'cv.docx'))).resolves.toMatchObject({ multiColumn: false });
  });
});

describe('exportação para texto (.txt)', () => {
  test('começa com BOM (acentos certos no Bloco de Notas) e mantém o conteúdo', async () => {
    const bytes = new Uint8Array(await buildResumeText(sheet()).arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('Mariana Costa');
    expect(text).toContain('Ciência da Computação');
  });
});

describe('nome do arquivo', () => {
  test.each([
    ['Mariana Costa', 'docx', 'Curriculo - Mariana Costa.docx'],
    ['Ana: "A/B" <teste>?', 'txt', 'Curriculo - Ana AB teste.txt'],
    ['', 'docx', 'Curriculo.docx'],
  ] as const)('"%s" → %s', (name, extension, expected) => {
    expect(resumeFileName(sheet(name), extension)).toBe(expected);
  });
});

describe('rascunho no navegador', () => {
  beforeEach(() => localStorage.clear());

  test('salva e recupera a vaga, o currículo e o arquivo importado', () => {
    const draft = { jobText: 'Vaga', resumeText: 'Currículo', importedResume: { text: 'Currículo', multiColumn: true } };
    saveDraft(draft);
    expect(loadDraft()).toEqual(draft);
  });

  test('campos vazios apagam o rascunho', () => {
    saveDraft({ jobText: 'Vaga', resumeText: '', importedResume: null });
    saveDraft({ jobText: '', resumeText: '', importedResume: null });
    expect(localStorage.length).toBe(0);
  });

  test('rascunho antigo (sem arquivo importado) continua funcionando', () => {
    localStorage.setItem('cats:rascunho:v1', JSON.stringify({ jobText: 'Vaga', resumeText: 'CV' }));
    expect(loadDraft()).toEqual({ jobText: 'Vaga', resumeText: 'CV', importedResume: null });
  });

  test.each(['{quebrado', '"texto"', 'null', '{"jobText": 42}'])('conteúdo inválido (%s) vira rascunho vazio', (raw) => {
    localStorage.setItem('cats:rascunho:v1', raw);
    expect(loadDraft()).toEqual({ jobText: '', resumeText: '', importedResume: null });
  });
});
