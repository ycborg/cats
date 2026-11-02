/**
 * Leitura da folha do currículo (o DOM editável do ResumePreview), compartilhada pelo "Copiar texto"
 * e pelas exportações: um único critério de quais blocos contam e como o texto de cada um é lido.
 */

export const BLOCK_SELECTOR = 'h1,h2,h3,p,li,div';

/** Blocos "folha": os que não têm outro bloco dentro (evita repetir o texto do pai e do filho). */
export function sheetLeaves(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)).filter(
    (element) => !element.querySelector(BLOCK_SELECTOR),
  );
}

/** Texto de um bloco, com espaços colapsados. */
export function blockText(element: HTMLElement): string {
  return element.innerText.replace(/\s+/g, ' ').trim();
}

/**
 * Serializa a folha editável em texto puro compatível com ATS, preservando
 * títulos, bullets e quaisquer blocos criados pelo usuário durante a edição.
 */
export function serializeResume(root: HTMLElement): string {
  const leaves = sheetLeaves(root);
  if (!leaves.length) return root.innerText.trim();

  return leaves
    .map((element) => {
      const text = blockText(element);
      if (!text) return '';
      if (element.tagName === 'H2') return `\n${text.toUpperCase()}`;
      if (element.tagName === 'LI') return `• ${text}`;
      return text;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
