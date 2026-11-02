import { useEffect, useRef } from 'react';

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');

/**
 * Soltar um arquivo fora de uma área que o trate faz o navegador abrir o arquivo e sair do app
 * (perdendo o que a pessoa digitou). Bloqueia esse comportamento na janela toda.
 *
 * Roda depois dos handlers do React (o app fica abaixo da janela na propagação): se um deles já
 * tratou o drop (`defaultPrevented`), não faz nada; senão avisa por `onIgnored`.
 */
export function usePreventFileDrop(onIgnored: () => void) {
  const onIgnoredRef = useRef(onIgnored);
  useEffect(() => {
    onIgnoredRef.current = onIgnored;
  });

  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      const handled = event.defaultPrevented;
      event.preventDefault();
      if (!handled) onIgnoredRef.current();
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);
}
