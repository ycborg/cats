/** Copia texto para a área de transferência, com fallback para navegadores sem Clipboard API. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // segue para o fallback
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

const BLOCK_SELECTOR = 'h1,h2,h3,p,li,div';

/**
 * Serializa a folha editável em texto puro compatível com ATS, preservando
 * títulos, bullets e quaisquer blocos criados pelo usuário durante a edição.
 */
export function serializeResume(root: HTMLElement): string {
  const leaves = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)).filter(
    (element) => !element.querySelector(BLOCK_SELECTOR),
  );
  if (!leaves.length) return root.innerText.trim();

  return leaves
    .map((element) => {
      const text = element.innerText.replace(/\s+/g, ' ').trim();
      if (!text) return '';
      if (element.tagName === 'H2') return `\n${text.toUpperCase()}`;
      if (element.tagName === 'LI') return `• ${text}`;
      return text;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
