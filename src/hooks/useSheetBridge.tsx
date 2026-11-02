import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

/**
 * Ponte entre a folha editável do currículo (ResumePreview) e o App.
 *
 * A folha mora dentro do resultado e some quando o resultado some (reanalisar, limpar campos). O App
 * precisa saber se há edição ainda não exportada (para avisar antes de perder) e, ao desfazer um
 * "Limpar campos", devolver o HTML editado. Tudo vive em refs: não causa re-renderização.
 */
export interface SheetBridge {
  /** Há edição manual que ainda não foi copiada nem exportada. */
  hasUnsavedEdits: () => boolean;
  setUnsavedEdits: (value: boolean) => void;
  /** A folha monta registrando como ler o HTML dela; ao desmontar, o registro é removido. */
  registerReader: (read: (() => string | null) | null) => void;
  /** HTML da folha se ela foi editada à mão; null se não há folha ou ela está como foi gerada. */
  readEditedHtml: () => string | null;
  /** HTML editado a ser reaplicado na próxima folha que montar (desfazer "Limpar campos"). */
  setPendingHtml: (html: string | null) => void;
  peekPendingHtml: () => string | null;
}

const SheetBridgeContext = createContext<SheetBridge | null>(null);

function createSheetBridge(): SheetBridge {
  let unsaved = false;
  let reader: (() => string | null) | null = null;
  let pending: string | null = null;
  return {
    hasUnsavedEdits: () => unsaved,
    setUnsavedEdits: (value) => {
      unsaved = value;
    },
    registerReader: (read) => {
      reader = read;
      // Sem folha na tela, não há o que perder.
      if (!read) unsaved = false;
    },
    readEditedHtml: () => reader?.() ?? null,
    setPendingHtml: (html) => {
      pending = html;
    },
    peekPendingHtml: () => pending,
  };
}

/** Cria a ponte (uma por App) e o provider que a entrega à folha. */
export function useSheetBridgeProvider() {
  // O estado vive em variáveis da própria ponte (não em refs lidos na renderização).
  const [value] = useState(() => {
    const bridge = createSheetBridge();
    const Provider = ({ children }: { children: ReactNode }) => (
      <SheetBridgeContext.Provider value={bridge}>{children}</SheetBridgeContext.Provider>
    );
    return { bridge, Provider };
  });
  return value;
}

/** Ponte da folha; fora do App (ex.: componente isolado) devolve null e a folha funciona sem ela. */
export function useSheetBridge(): SheetBridge | null {
  return useContext(SheetBridgeContext);
}

/** Tags que a folha do currículo usa. Qualquer outra vira o seu texto (ou some, se não tiver texto). */
const ALLOWED_TAGS = new Set([
  'HEADER', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'P', 'UL', 'OL', 'LI', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'BR',
]);
/** Elementos cujo conteúdo não é texto de currículo: somem por inteiro, sem virar texto visível. */
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'SVG', 'MATH', 'IFRAME', 'OBJECT', 'EMBED', 'TEXTAREA', 'SELECT']);

function copySafe(source: Node, target: Node): void {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent ?? ''));
    } else if (child instanceof Element) {
      const tag = child.tagName.toUpperCase();
      if (DROPPED_TAGS.has(tag)) continue;
      if (ALLOWED_TAGS.has(tag)) {
        // Elemento novo e vazio: nenhum atributo do original passa, só `class` (estilo da folha;
        // não executa nada nem carrega recurso externo).
        const clone = document.createElement(tag.toLowerCase());
        const className = child.getAttribute('class');
        if (className) clone.setAttribute('class', className);
        copySafe(child, clone);
        target.appendChild(clone);
      } else {
        // Tag desconhecida (a, img, font…): fica só o conteúdo de texto, sem atributos.
        copySafe(child, target);
      }
    }
    // Comentários e outros tipos de nó são descartados.
  }
}

/**
 * Reconstrói o HTML guardado da folha por lista de PERMISSÃO antes de reinjetá-lo: só as tags e o
 * atributo `class` acima, e texto. O texto colado na folha pode ter vindo de qualquer lugar, então
 * nada do original (atributos, esquemas de URL, SVG, estilos) é copiado — apenas o que é permitido.
 */
export function sanitizeSheetHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  const output = document.createElement('div');
  copySafe(template.content, output);
  return output.innerHTML;
}
