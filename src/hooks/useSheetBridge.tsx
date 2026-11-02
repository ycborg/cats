import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useRef } from 'react';

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

function createSheetBridge(
  unsaved: { current: boolean },
  reader: { current: (() => string | null) | null },
  pending: { current: string | null },
): SheetBridge {
  return {
    hasUnsavedEdits: () => unsaved.current,
    setUnsavedEdits: (value) => {
      unsaved.current = value;
    },
    registerReader: (read) => {
      reader.current = read;
      // Sem folha na tela, não há o que perder.
      if (!read) unsaved.current = false;
    },
    readEditedHtml: () => reader.current?.() ?? null,
    setPendingHtml: (html) => {
      pending.current = html;
    },
    peekPendingHtml: () => pending.current,
  };
}

/** Cria a ponte (uma por App) e o provider que a entrega à folha. */
export function useSheetBridgeProvider() {
  const unsaved = useRef(false);
  const reader = useRef<(() => string | null) | null>(null);
  const pending = useRef<string | null>(null);

  return useMemo(() => {
    const bridge = createSheetBridge(unsaved, reader, pending);
    const Provider = ({ children }: { children: ReactNode }) => (
      <SheetBridgeContext.Provider value={bridge}>{children}</SheetBridgeContext.Provider>
    );
    return { bridge, Provider };
  }, []);
}

/** Ponte da folha; fora do App (ex.: componente isolado) devolve null e a folha funciona sem ela. */
export function useSheetBridge(): SheetBridge | null {
  return useContext(SheetBridgeContext);
}

/**
 * Limpa um HTML guardado antes de reinjetá-lo na folha: mantém conteúdo e estrutura, sem scripts,
 * manipuladores de evento (`onerror=`…) nem links `javascript:`. O texto colado na folha pode ter
 * vindo de qualquer lugar.
 */
export function sanitizeSheetHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content
    .querySelectorAll('script, style, iframe, object, embed, link, meta, base, form')
    .forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value.trim().toLowerCase();
      if (attribute.name.startsWith('on') || value.startsWith('javascript:')) element.removeAttribute(attribute.name);
    }
  });
  return template.innerHTML;
}
