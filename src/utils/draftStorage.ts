/**
 * Rascunho da vaga e do currículo guardado só no navegador da pessoa (localStorage), para não perder
 * o texto ao recarregar a página. Nada é enviado a servidores. Toda leitura/escrita é protegida: em
 * aba anônima ou com armazenamento bloqueado, o site simplesmente funciona sem rascunho.
 */

import type { ImportedResume } from './fileImport';

const DRAFT_KEY = 'cats:rascunho:v1';
/** O currículo completo é dado pessoal: o rascunho some sozinho depois de 7 dias sem ser regravado. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function removeStoredDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // sem armazenamento: nada a remover
  }
}

function writeDraft(draft: Draft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Cota cheia ou armazenamento bloqueado: apaga o rascunho antigo para ele não "ressuscitar" no
    // próximo carregamento, já que o texto atual da pessoa não coube.
    removeStoredDraft();
  }
}

export function loadDraft(): Draft {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_DRAFT;
    const { jobText, resumeText, importedResume, savedAt } = parsed as Partial<Draft> & { savedAt?: unknown };

    // Validade: rascunho vencido é descartado. `savedAt` com valor estranho conta como vencido.
    if (savedAt !== undefined && (typeof savedAt !== 'number' || !(Date.now() - savedAt <= DRAFT_TTL_MS))) {
      removeStoredDraft();
      return EMPTY_DRAFT;
    }

    const draft: Draft = {
      jobText: typeof jobText === 'string' ? jobText : '',
      resumeText: typeof resumeText === 'string' ? resumeText : '',
      importedResume: isImportedResume(importedResume) ? importedResume : null,
    };
    // Formato antigo (sem `savedAt`): vale uma vez e é regravado já com a data, começando a contar o prazo.
    if (savedAt === undefined && (draft.jobText || draft.resumeText)) writeDraft(draft);
    return draft;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: Draft): void {
  if (!draft.jobText && !draft.resumeText) removeStoredDraft();
  else writeDraft(draft);
}
