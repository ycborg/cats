import type { AreaLexicon } from './types';

/**
 * Carrega automaticamente todos os arquivos de área desta pasta (exceto index e types).
 * Para criar uma área nova basta adicionar um arquivo aqui — não é preciso registrá-lo.
 */
const modules = import.meta.glob<{ default: AreaLexicon }>(['./*.ts', '!./index.ts', '!./types.ts'], { eager: true });

export const AREAS: AreaLexicon[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, module]) => {
    if (!module.default?.hardSkills) {
      throw new Error(`O arquivo ${path} precisa exportar uma área com "export default defineArea({ ... })".`);
    }
    return module.default;
  });

export const HARD_SKILLS: string[] = AREAS.flatMap((area) => area.hardSkills);
export const SOFT_SKILLS: string[] = AREAS.flatMap((area) => area.softSkills ?? []);
export const SYNONYM_GROUPS: string[][] = AREAS.flatMap((area) => area.synonyms ?? []);

export type { AreaLexicon } from './types';
