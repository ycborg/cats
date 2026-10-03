import { LyingCat, RestingYarnBall } from './CatIllustrations';

export function Footer() {
  return (
    <footer className="relative mt-16 bg-ink text-white print:hidden">
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* A linha de base do gato (y=32 de 48) repousa exatamente sobre a borda superior do rodapé. */}
        <LyingCat className="absolute -top-8 right-6 h-12 w-[120px] text-ink sm:right-12" />
        {/* Novelo apoiado na divisória (linha de base y=32 de 34), ao lado da cabeça do gato. */}
        <RestingYarnBall className="absolute -top-8 right-[146px] h-[34px] w-16 text-ink sm:right-[170px]" />

        <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">CATS • Feito para quem cai em pé no mercado de trabalho.</p>
            <p className="mt-1 text-xs text-slate-400">
              Análise processada localmente no seu navegador. Nenhum texto é enviado a servidores ou APIs externas.
            </p>
          </div>
          <p className="shrink-0 text-xs text-slate-400">
            desenvolvido por{' '}
            <span className="font-brand text-sm font-extrabold tracking-tight text-white italic">ycborg</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
