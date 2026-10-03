import { Lock, Scale } from 'lucide-react';
import { YarnBall } from './CatIllustrations';

export function CatsLogo({ className }: { className?: string }) {
  return (
    <svg width="105" height="30" viewBox="0 0 105 30" fill="none" className={className} role="img" aria-label="CATS">
      <path
        d="M22 9C20.5 7 17.5 6 14 6C8.5 6 4 10.5 4 16C4 21.5 8.5 26 14 26C17.5 26 20.5 25 22 23"
        stroke="#0F141E"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M31 26L37 7L40 10L43 7L49 26"
        stroke="#0F141E"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="34" y1="20" x2="46" y2="20" stroke="#0F141E" strokeWidth="2.5" />
      <line x1="56" y1="6" x2="74" y2="6" stroke="#0F141E" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="6" x2="65" y2="26" stroke="#0F141E" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M96 10C94.5 7.5 91.5 6 87.5 6C83 6 80 8.5 80 11.5C80 15 83 16 88 17C93 18 96 19.5 96 23C96 26.5 92.5 29 87.5 29C82.5 29 79 26.5 78 24"
        stroke="#0F141E"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Header() {
  return (
    <header className="border-b border-line bg-white print:hidden">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CatsLogo />
            <YarnBall className="h-[22px] w-[31px] text-ink" />
          </div>
          <span className="hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
          <p className="hidden text-sm font-medium text-muted sm:block">Otimizador Ético de Currículos para ATS</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-body">
          <Lock className="size-3.5" aria-hidden="true" />
          <span>
            100% no navegador<span className="hidden sm:inline"> · nenhum dado sai do seu dispositivo</span>
          </span>
        </span>
      </div>

      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1440px] items-start gap-3 px-4 py-3 sm:items-center sm:px-6 lg:px-8">
          <Scale className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-slate-200">
            <strong className="font-semibold text-white">Diretriz ética: </strong>O CATS aprimora a semântica e a clareza das suas
            qualificações reais, mas <strong className="font-semibold text-white">NUNCA</strong> inventa competências, cargos ou
            experiências que você não possui.
          </p>
        </div>
      </div>
    </header>
  );
}
