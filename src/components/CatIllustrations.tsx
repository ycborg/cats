import { useId } from 'react';

/** Micro-ilustrações felinas em traço fino — herdam a cor via `currentColor`. */

interface CatProps {
  className?: string;
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Estado vazio: gato dormindo sobre uma linha de base. */
export function SleepingCat({ className }: CatProps) {
  return (
    <svg viewBox="0 0 160 80" className={className} aria-hidden="true">
      <g {...strokeProps} strokeWidth={1.6}>
        <line x1="8" y1="70" x2="152" y2="70" />
        <path d="M44 70 C34 70 28 64 29 56 C30 49 36 45 43 45 C50 45 55 49 56 55" />
        <path d="M56 55 C62 42 76 38 88 38 C108 38 120 52 118 70" />
        <path d="M31 51 L29 40 L38 46" />
        <path d="M46 45 L52 36 L54 48" />
        <path d="M36 58 Q39 60.5 42 58" />
        <path d="M56 70 C58 66 64 66 66 70" />
        <path d="M118 70 C130 70 138 66 134 58 C132 54 126 56 128 60" />
      </g>
      <g fill="currentColor" fontFamily="Inter, sans-serif" fontWeight={600} className="animate-zzz">
        <text x="64" y="30" fontSize="9">z</text>
        <text x="74" y="21" fontSize="11">z</text>
        <text x="86" y="11" fontSize="13">Z</text>
      </g>
    </svg>
  );
}

/** Loading: gato espiando pela borda superior do painel. */
export function PeekingCat({ className }: CatProps) {
  return (
    <svg viewBox="0 0 96 44" className={className} aria-hidden="true">
      <g {...strokeProps} strokeWidth={1.8}>
        <path d="M22 44 C22 28 33 19 48 19 C63 19 74 28 74 44" />
        <path d="M26 31 L23 12 L37 21" />
        <path d="M59 21 L73 12 L70 31" />
        <path d="M46 37 L48 38.5 L50 37" />
        <path d="M31 37 L18 35 M31 39.5 L18 41 M65 37 L78 35 M65 39.5 L78 41" />
        <path d="M12 44 C12 39 21 39 21 44 M75 44 C75 39 84 39 84 44" />
      </g>
      <circle cx="39" cy="32" r="2.4" fill="currentColor" />
      <circle cx="57" cy="32" r="2.4" fill="currentColor" />
    </svg>
  );
}

/** Sucesso: gatinho vigilante, sentado ereto. */
export function SittingCat({ className }: CatProps) {
  return (
    <svg viewBox="0 0 44 56" className={className} aria-hidden="true">
      <g {...strokeProps} strokeWidth={1.8}>
        <path d="M14 20 C14 13 18 10 22 10 C26 10 30 13 30 20 C30 25 26 28 22 28 C18 28 14 25 14 20 Z" />
        <path d="M15 15 L14 4 L20 10.5" />
        <path d="M24 10.5 L30 4 L29 15" />
        <path d="M17 27 C11 33 10 44 13 54 M27 27 C33 33 34 44 31 54" />
        <path d="M11 54 L33 54 M19 40 L19 54 M25 40 L25 54" />
        <path d="M31 52 C40 52 42 42 36 36" />
      </g>
      <circle cx="19" cy="19" r="1.4" fill="currentColor" />
      <circle cx="25" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** Rodapé: gato deitado sobre a divisória (linha de base em y=32). */
export function LyingCat({ className }: CatProps) {
  return (
    <svg viewBox="0 0 120 48" className={className} aria-hidden="true">
      <g {...strokeProps} strokeWidth={1.6}>
        <path d="M14 32 C9 32 6 27 7 22 C8 17 12 14 18 14 C24 14 28 18 28 23" />
        <path d="M9 18 L8 8 L15 14" />
        <path d="M21 14 L27 7 L28 19" />
        <path d="M13 23 Q15.5 25 18 23" />
        <path d="M28 23 C36 15 60 14 76 18 C88 21 94 26 94 32" />
        <path d="M18 32 C20 29 26 29 28 32" />
        <path d="M94 31 C103 31 109 27 107 20 C106 16 101 16 101 20" />
      </g>
    </svg>
  );
}

/** Fios enrolados do novelo, recortados pelo contorno da bola. */
function YarnWraps({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const id = `yarn${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const x = (offset: number) => cx + offset * r;
  const y = (offset: number) => cy + offset * r;
  return (
    <>
      <defs>
        <clipPath id={id}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} />
      <g clipPath={`url(#${id})`}>
        {/* Voltas horizontais */}
        <path d={`M${x(-1.1)} ${y(-0.35)} C${x(-0.4)} ${y(-0.7)} ${x(0.4)} ${y(-0.7)} ${x(1.1)} ${y(-0.25)}`} />
        <path d={`M${x(-1.1)} ${y(0.2)} C${x(-0.4)} ${y(-0.15)} ${x(0.45)} ${y(-0.1)} ${x(1.1)} ${y(0.35)}`} />
        <path d={`M${x(-0.9)} ${y(0.75)} C${x(-0.3)} ${y(0.4)} ${x(0.4)} ${y(0.45)} ${x(0.95)} ${y(0.85)}`} />
        {/* Voltas cruzadas */}
        <path d={`M${x(-0.35)} ${y(-1.1)} C${x(-0.75)} ${y(-0.4)} ${x(-0.7)} ${y(0.4)} ${x(-0.25)} ${y(1.1)}`} />
        <path d={`M${x(0.3)} ${y(-1.1)} C${x(0.75)} ${y(-0.4)} ${x(0.7)} ${y(0.45)} ${x(0.3)} ${y(1.1)}`} />
      </g>
    </>
  );
}

/** Novelo de lã do cabeçalho, com uma ponta de fio solta. */
export function YarnBall({ className }: CatProps) {
  return (
    <svg viewBox="0 0 40 28" className={className} aria-hidden="true">
      <g {...strokeProps} strokeWidth={1.6}>
        <YarnWraps cx={12} cy={14} r={10} />
        <path d="M20.5 19.5 C25 24 29 25 32 22 C34.5 19.5 32 16.5 29.5 18 C27.5 19.5 29 23 33 24.5 C35 25.2 37 25 38.5 24" />
      </g>
    </svg>
  );
}

/** Novelo do rodapé: apoiado na divisória (linha de base em y=32), fio estendido em direção ao gato. */
export function RestingYarnBall({ className }: CatProps) {
  return (
    <svg viewBox="0 0 64 34" className={className} aria-hidden="true">
      <g {...strokeProps} strokeWidth={1.6}>
        <YarnWraps cx={13} cy={21} r={10.5} />
        <path d="M22 26.5 C27 31 33 31.2 40 31 C46 30.8 50 29 53 30.5 C55.5 31.6 58 31.4 62 31" />
      </g>
    </svg>
  );
}
