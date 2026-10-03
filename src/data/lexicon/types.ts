/**
 * Formato de um arquivo de área do dicionário. Veja src/data/README.md para as regras de edição.
 */
export interface AreaLexicon {
  /** Nome da área (apenas para organização). */
  area: string;
  /** Hard skills: ferramentas, técnicas, normas e conhecimentos específicos da área. */
  hardSkills: string[];
  /** Competências comportamentais, idiomas e metodologias. */
  softSkills?: string[];
  /**
   * Grupos de termos EQUIVALENTES (mesma coisa, nome diferente). O PRIMEIRO termo de cada grupo é a
   * forma exibida pelo CATS. Nunca agrupe termos apenas parecidos (ex.: Vue e React).
   */
  synonyms?: string[][];
}

export const defineArea = (lexicon: AreaLexicon): AreaLexicon => lexicon;
