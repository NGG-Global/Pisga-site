import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * The brand typeface (Ploni) is licensed and is not committed to the repository.
 * When the WOFF2 files are present in public/fonts, this plugin declares them.
 * When they are absent, nothing is declared and the fallback stack (Heebo) applies,
 * so the browser never requests a font file that does not exist.
 */
const PLONI_WEIGHTS: Array<[number, string]> = [
  [300, 'PloniLight.woff2'],
  [400, 'PloniRegular.woff2'],
  [600, 'PloniDBold.woff2'],
  [700, 'PloniBold.woff2'],
];

function ploniFonts(): Plugin {
  return {
    name: 'pisga-ploni-fonts',
    transformIndexHtml() {
      const faces = PLONI_WEIGHTS.filter(([, file]) =>
        existsSync(resolve(import.meta.dirname, 'public/fonts', file)),
      ).map(
        ([weight, file]) =>
          `@font-face{font-family:Ploni;font-weight:${weight};font-style:normal;font-display:swap;src:url(/fonts/${file}) format("woff2")}`,
      );
      if (faces.length === 0) return [];
      return [{ tag: 'style', attrs: { 'data-ploni': '' }, children: faces.join(''), injectTo: 'head' }];
    },
  };
}

export default defineConfig({
  plugins: [react(), ploniFonts()],
  build: { target: 'es2022', sourcemap: false },
  server: { port: 5173 },
});
