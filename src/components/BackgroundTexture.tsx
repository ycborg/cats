/**
 * Textura de fundo: poucas marcas de arranhão de gato (3 garras finas e curtas), quase
 * imperceptíveis. Ficam atrás de todo o conteúdo, em posições espalhadas pela página.
 */

/** Uma garra: lasca fina e afilada nas pontas (preenchida, não traço). */
const CLAW = 'M0 0 Q7.5 19 10 44 Q4.5 22 0 0 Z';

interface ScratchProps {
  /** Posição em % da largura/altura da página. */
  left: string;
  top: string;
  rotate: number;
  scale?: number;
  /** Algumas marcas têm 4 garras, outras 3, para não parecerem carimbadas. */
  claws?: 3 | 4;
}

function Scratch({ left, top, rotate, scale = 1, claws = 3 }: ScratchProps) {
  const offsets = claws === 4 ? [0, 7, 14.5, 21.5] : [0, 7.5, 15];
  const lengths = claws === 4 ? [0.82, 1, 0.95, 0.74] : [0.85, 1, 0.8];

  return (
    <svg
      viewBox="0 0 36 48"
      className="absolute h-12 w-9"
      style={{ left, top, transform: `rotate(${rotate}deg) scale(${scale})` }}
    >
      {offsets.map((x, index) => (
        <path
          key={x}
          d={CLAW}
          transform={`translate(${x} ${index % 2 ? 0 : 2}) scale(1 ${lengths[index]})`}
        />
      ))}
    </svg>
  );
}

const SCRATCHES: ScratchProps[] = [
  { left: '2.5%', top: '14%', rotate: -18 },
  { left: '95%', top: '27%', rotate: 22, scale: 0.9, claws: 4 },
  { left: '48%', top: '9%', rotate: 8, scale: 0.8 },
  { left: '1.5%', top: '58%', rotate: 14, scale: 1.1, claws: 4 },
  { left: '96%', top: '71%', rotate: -26 },
  { left: '30%', top: '90%', rotate: -10, scale: 0.85 },
  { left: '6%', top: '36%', rotate: 30, scale: 0.75 },
  { left: '89%', top: '8%', rotate: -12, scale: 0.85, claws: 4 },
  { left: '72%', top: '48%', rotate: 16, scale: 0.8 },
  { left: '20%', top: '78%', rotate: -32, scale: 0.9, claws: 4 },
];

/* ---------------------------------------------------------------------------
 * Caminho de patinhas
 * ------------------------------------------------------------------------- */

/** Almofada principal e 4 dedos de uma pegada (desenhada "andando para cima"). */
const PAW_PAD = 'M10 19c-3.3 0-6-1.9-6-4.3 0-2.3 2.6-4.7 6-4.7s6 2.4 6 4.7c0 2.4-2.7 4.3-6 4.3z';
const PAW_TOES: Array<[cx: number, cy: number, tilt: number]> = [
  [3.6, 9.2, -22],
  [7.7, 5.2, -8],
  [12.3, 5.2, 8],
  [16.4, 9.2, 22],
];

const TRAIL = {
  width: 600,
  height: 280,
  steps: 10,
  /** Curva de Bézier quadrática por onde o gato caminhou. */
  from: [20, 250],
  control: [300, 265],
  to: [580, 30],
  /** Distância de cada pegada até o centro do caminho (pata esquerda/direita). */
  stride: 8,
} as const;

function trailPrints() {
  const [x0, y0] = TRAIL.from;
  const [x1, y1] = TRAIL.control;
  const [x2, y2] = TRAIL.to;
  return Array.from({ length: TRAIL.steps }, (_, i) => {
    const t = i / (TRAIL.steps - 1);
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t ** 2 * x2;
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t ** 2 * y2;
    const dx = 2 * (1 - t) * (x1 - x0) + 2 * t * (x2 - x1);
    const dy = 2 * (1 - t) * (y1 - y0) + 2 * t * (y2 - y1);
    const length = Math.hypot(dx, dy);
    const side = i % 2 === 0 ? 1 : -1;
    return {
      x: x + (-dy / length) * TRAIL.stride * side,
      y: y + (dx / length) * TRAIL.stride * side,
      // A pegada aponta na direção da caminhada.
      angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90,
    };
  });
}

const PRINTS = trailPrints();

function PawTrail({ left, top }: { left: string; top: string }) {
  return (
    <svg
      viewBox={`0 0 ${TRAIL.width} ${TRAIL.height}`}
      className="absolute"
      style={{ left, top, width: TRAIL.width, height: TRAIL.height }}
    >
      {PRINTS.map((print, index) => (
        <g
          key={index}
          transform={`translate(${print.x.toFixed(1)} ${print.y.toFixed(1)}) rotate(${print.angle.toFixed(1)}) scale(0.7) translate(-10 -12)`}
        >
          <path d={PAW_PAD} />
          {PAW_TOES.map(([cx, cy, tilt]) => (
            <ellipse key={cx} cx={cx} cy={cy} rx={1.9} ry={2.5} transform={`rotate(${tilt} ${cx} ${cy})`} />
          ))}
        </g>
      ))}
    </svg>
  );
}

const TEXTURE_CLASSES = 'pointer-events-none -z-10 overflow-hidden fill-ink opacity-[0.075] print:hidden';

export function BackgroundTexture() {
  return (
    <>
      {/* Garras: rolam junto com a página, como uma textura do papel. */}
      <div aria-hidden="true" className={`absolute inset-0 ${TEXTURE_CLASSES}`}>
        {SCRATCHES.map((scratch) => (
          <Scratch key={`${scratch.left}-${scratch.top}`} {...scratch} />
        ))}
      </div>
      {/*
        Patinhas: fixas na tela. Ao rolar, os cards deslizam por cima e o caminho vai aparecendo
        nos vãos entre eles. Posicionado atrás da coluna de diagnóstico.
      */}
      <div aria-hidden="true" className={`fixed inset-0 ${TEXTURE_CLASSES}`}>
        <PawTrail left="calc(50% + 16px)" top="38%" />
      </div>
    </>
  );
}
