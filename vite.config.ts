import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// CSP aplicada só no build: o dev server precisa de script inline (preamble do React
// Refresh) e de websocket (HMR), e afrouxar a política para isso mascararia a de produção.
// - style-src 'unsafe-inline': o React emite atributos style="" (o Tailwind em si vira .css).
// - worker-src 'self' blob:: o worker do pdf.js é um módulo servido do próprio site; blob:
//   fica como rede de segurança caso o pdf.js crie o worker por Blob (fallback).
// - img-src data:: ícones/imagens pequenas podem ser inlinadas pelo Vite.
// - connect-src 'self': nada é enviado a terceiros (promessa do produto).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin = (): Plugin => ({
  name: 'cats-csp',
  apply: 'build',
  // Substitui logo após o <meta charset> (que deve vir primeiro) e antes de qualquer
  // script/link que o Vite injete, pois a meta CSP só vale para o que vem depois dela.
  transformIndexHtml(html) {
    const charset = /<meta\s+charset=[^>]*>/i;
    if (!charset.test(html)) throw new Error('cats-csp: <meta charset> não encontrado em index.html');
    return html.replace(
      charset,
      (m) => `${m}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    );
  },
});

// `base: './'` gera caminhos relativos, compatíveis com GitHub Pages em qualquer subpasta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), cspPlugin()],
});
