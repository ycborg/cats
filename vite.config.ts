import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `base: './'` gera caminhos relativos, compatíveis com GitHub Pages em qualquer subpasta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
