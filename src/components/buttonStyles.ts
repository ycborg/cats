/** Classes compartilhadas dos botões: hover, foco visível e "afundar" ao clicar (≤ 300ms). */
const base =
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-4 active:scale-[0.96] disabled:pointer-events-none';

export const buttonStyles = {
  primary: `${base} bg-ink px-5 py-3 font-semibold text-white shadow-sm hover:bg-ink-soft hover:shadow-md focus-visible:ring-ink/25 disabled:opacity-45`,
  primaryCompact: `${base} bg-ink px-3.5 py-2 font-medium text-white shadow-sm hover:bg-ink-soft hover:shadow-md focus-visible:ring-ink/25 disabled:opacity-60`,
  secondary: `${base} border border-line bg-white px-3.5 py-2 font-medium text-ink hover:border-ink/40 hover:bg-canvas focus-visible:ring-ink/15 disabled:opacity-60`,
  ghost: `${base} px-3 py-2 font-medium text-muted hover:bg-white hover:text-ink focus-visible:ring-ink/15 disabled:opacity-40`,
  /** Estado de confirmação temporário ("Copiado!", "Exemplo carregado"). */
  success: 'border-found-border! bg-found-bg! text-found-text!',
} as const;
