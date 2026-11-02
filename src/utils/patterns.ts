/** Padrões de texto compartilhados pelo motor (marcadores de lista e contatos). */

export const BULLET = /^[-•*▪►➤–—·●○◦■□✓✔→]\s*/;
// Tamanhos limitados: sem limite, texto longo sem espaços custa tempo quadrático (≈1 s em 30 mil caracteres).
export const EMAIL = /[\w.+-]{1,64}@[\w-]{1,253}\.[\w.-]{2,63}/;
export const PHONE = /(\+?\d{2}\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/;
