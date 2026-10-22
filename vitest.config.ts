import { defineConfig } from 'vitest/config';

// Testes do motor de análise (filtro de palavras, títulos, datas, legibilidade, importação e exportação).
// Rodam em Node; os que precisam de DOM declaram `@vitest-environment jsdom` no topo do arquivo.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
