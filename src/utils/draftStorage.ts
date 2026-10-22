/**
 * Rascunho da vaga e do currículo guardado só no navegador da pessoa (localStorage), para não perder
 * o texto ao recarregar a página. Nada é enviado a servidores. Toda leitura/escrita é protegida: em
 * aba anônima ou com armazenamento bloqueado, o site simplesmente funciona sem rascunho.
 */

import type { ImportedResume } from './fileImport';

const DRAFT_KEY = 'cats:rascunho:v1';

export interface Draft {
  jobText: string;
  resumeText: string;
  /** Último arquivo importado (para o alerta de colunas continuar valendo após recarregar). */
  importedResume: ImportedResume | null;
}

const EMPTY_DRAFT: Draft = { jobText: '', resumeText: '', importedResume: null };

const isImportedResume = (value: unknown): value is ImportedResume =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ImportedResume).text === 'string' &&
  typeof (value as ImportedResume).multiColumn === 'boolean';

export function loadDraft(): Draft {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_DRAFT;
    const { jobText, resumeText, importedResume } = parsed as Partial<Draft>;
    return {
      jobText: typeof jobText === 'string' ? jobText : '',
      resumeText: typeof resumeText === 'string' ? resumeText : '',
      importedResume: isImportedResume(importedResume) ? importedResume : null,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    if (!draft.jobText && !draft.resumeText) window.localStorage.removeItem(DRAFT_KEY);
    else window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Armazenamento indisponível (aba anônima, cota cheia): segue sem rascunho.
  }
}
