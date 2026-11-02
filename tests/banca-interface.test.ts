// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { sanitizeSheetHtml } from '../src/hooks/useSheetBridge';

/** Sanitiza e relê o resultado como o navegador o faria (innerHTML). */
function reparse(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = sanitizeSheetHtml(html);
  return container;
}

const ALLOWED = new Set(['HEADER', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'P', 'UL', 'OL', 'LI', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'BR']);

/** Nada perigoso pode sobrar: só tags da folha, no máximo `class`, sem url()/esquemas de script. */
function expectSafe(container: HTMLElement) {
  for (const element of Array.from(container.querySelectorAll('*'))) {
    expect(ALLOWED.has(element.tagName)).toBe(true);
    for (const attribute of Array.from(element.attributes)) expect(attribute.name).toBe('class');
  }
  expect(container.querySelector('img, svg, a, script, style, iframe, animate')).toBeNull();
  expect(container.innerHTML).not.toMatch(/javascript:|vbscript:|data:|url\(|onerror|onclick|href=|src=/i);
}

describe('sanitizeSheetHtml (folha restaurada após "Desfazer")', () => {
  test('preserva a estrutura e o texto da folha', () => {
    const container = reparse('<header class="text-center"><h1 class="x">Ana Lima</h1><p>SP | a@b.com</p></header><section><h2>Resumo</h2><ul><li>Item <b>um</b></li></ul></section>');
    expect(container.querySelector('h1')?.textContent).toBe('Ana Lima');
    expect(container.querySelector('h1')?.getAttribute('class')).toBe('x');
    expect(container.querySelector('li')?.innerHTML).toBe('Item <b>um</b>');
    expect(container.textContent).toContain('SP | a@b.com');
    expectSafe(container);
  });

  const vectors: Record<string, string> = {
    'javascript: com TAB': '<p>texto<a href="java\tscript:alert(1)">link</a></p>',
    'javascript: com entidade': '<p>texto<a href="java&#x09;script:alert(1)">link</a></p>',
    'javascript: com C0': '<p>texto<a href="\u0001javascript:alert(1)">link</a></p>',
    'data:': '<p>texto<a href="data:text/html,<script>alert(1)</script>">link</a></p>',
    'vbscript:': '<p>texto<a href="vbscript:msgbox(1)">link</a></p>',
    'svg animate': '<p>texto</p><svg><a><animate attributeName="href" values="x;javascript:alert(1)"/><text>t</text></a></svg>',
    'style com url()': '<p style="background:url(javascript:alert(1))">texto</p>',
    'img externo': '<p>texto<img src="https://evil.example/x.png"></p>',
    'onerror': '<p>texto<img src="x" onerror="alert(1)"></p>',
    'script': '<p>texto</p><script>alert(1)</script>',
    'evento no h1': '<h1 onclick="alert(1)">texto</h1>',
  };

  for (const [name, html] of Object.entries(vectors)) {
    test(`bloqueia: ${name}`, () => {
      const container = reparse(html);
      expectSafe(container);
      if (!name.includes('script') || name === 'svg animate') expect(container.textContent).toContain('texto');
    });
  }

  test('texto de tags desconhecidas é mantido (sem perder conteúdo)', () => {
    const container = reparse('<p>antes <a href="https://x.y">depois</a> <font color="red">fim</font></p>');
    expect(container.textContent).toBe('antes depois fim');
    expectSafe(container);
  });
});
