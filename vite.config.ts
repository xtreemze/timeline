import { copyFileSync, mkdirSync } from 'node:fs';
import { defineConfig } from 'vite';

const runtimeFiles = [
  'orb-graph.bundle.js',
  'leaflet.bundle.js',
  'evidence-extraction.bundle.js',
  'pdf.worker.mjs',
] as const;

export default defineConfig({
  root: 'site',
  // Keep production assets relative so the same build works under GitHub Pages' /timeline/ subpath.
  base: './',
  plugins: [
    {
      name: 'copy-static-runtime-bundles',
      closeBundle() {
        const outputDirectory = new URL('./dist/', import.meta.url);
        mkdirSync(outputDirectory, { recursive: true });
        for (const file of runtimeFiles) {
          copyFileSync(
            new URL(`./site/${file}`, import.meta.url),
            new URL(`./dist/${file}`, import.meta.url),
          );
        }
      },
    },
  ],
  build: {
    emptyOutDir: true,
    outDir: '../dist',
    sourcemap: false,
    target: 'chrome155',
    rollupOptions: {
      input: {
        main: new URL('./site/index.html', import.meta.url).pathname,
      },
      output: {
        dir: '../dist',
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    watch: {
      include: ['site/**', 'src/**'],
    },
  },
  preview: {
    port: 4173,
  },
});
