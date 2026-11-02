// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { sanitizeSheetHtml } from '../src/hooks/useSheetBridge';

describe('sanitizeSheetHtml (folha restaurada após "Desfazer")', () => {
  test('mantém o conteúdo e remove scripts, eventos e javascript:', () => {
    const html = sanitizeSheetHtml(
      '<h1 onclick="x()">Ana</h1><script>alert(1)</script><img src="a" onerror="x()"><a href="javascript:x()">l</a><p>ok</p>',
    );
    expect(html).toContain('<h1>Ana</h1>');
    expect(html).toContain('<p>ok</p>');
    expect(html).not.toMatch(/script|onerror|onclick|javascript:/);
  });
});
