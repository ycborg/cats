import { describe, expect, test } from 'vitest';
import { AREAS } from '../src/data/lexicon';
import { STOPWORDS } from '../src/data/linguagem';
import { stripAccents, termKey } from '../src/utils/textProcessing';

/**
 * Regras de qualidade do dicionário (src/data/lexicon). Protegem contra erros comuns ao adicionar
 * termos: item vazio, duplicado, termo que é só uma stopword, sinônimo apontando para dois lugares.
 */

describe.each(AREAS.map((area) => [area.area, area] as const))('área "%s"', (_, area) => {
  const terms = [...area.hardSkills, ...(area.softSkills ?? [])];

  test('tem nome e pelo menos um termo', () => {
    expect(area.area.trim()).not.toBe('');
    expect(terms.length).toBeGreaterThan(0);
  });

  test('nenhum termo vazio ou com espaços sobrando', () => {
    for (const term of [...terms, ...(area.synonyms ?? []).flat()]) {
      expect(term, `"${term}"`).toBe(term.trim());
      expect(termKey(term), `"${term}" fica vazio depois de normalizado`).not.toBe('');
    }
  });

  test('nenhum termo repetido dentro da área', () => {
    const seen = new Map<string, string>();
    const duplicated: string[] = [];
    for (const term of terms) {
      const key = termKey(term);
      if (seen.has(key)) duplicated.push(`"${term}" = "${seen.get(key)}"`);
      seen.set(key, term);
    }
    expect(duplicated).toEqual([]);
  });

  test('nenhum termo é apenas uma stopword (viraria palavra-chave em toda vaga)', () => {
    const stopwordTerms = terms.filter((term) => !term.includes(' ') && STOPWORDS.has(stripAccents(term.toLowerCase())));
    expect(stopwordTerms).toEqual([]);
  });
});

describe('dicionário completo', () => {
  test('uma variante não pode ser sinônimo de duas formas principais diferentes', () => {
    const owner = new Map<string, string>();
    const conflicts: string[] = [];
    for (const [main, ...variants] of AREAS.flatMap((area) => area.synonyms ?? [])) {
      const mainKey = termKey(main!);
      for (const variant of variants) {
        const key = termKey(variant);
        const previous = owner.get(key);
        if (previous && previous !== mainKey) conflicts.push(`"${variant}" → "${previous}" e "${mainKey}"`);
        owner.set(key, mainKey);
      }
    }
    expect(conflicts).toEqual([]);
  });

  test('a forma principal de um grupo não é variante de outro grupo', () => {
    const groups = AREAS.flatMap((area) => area.synonyms ?? []);
    const mains = new Set(groups.map(([main]) => termKey(main!)));
    const variantsOfOthers = groups.flatMap(([main, ...variants]) =>
      variants.filter((variant) => mains.has(termKey(variant)) && termKey(variant) !== termKey(main!)).map((variant) => `"${variant}" (em "${main}")`),
    );
    expect(variantsOfOthers).toEqual([]);
  });
});
