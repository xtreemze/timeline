import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  build: {
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
