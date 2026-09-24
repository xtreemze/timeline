import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  // Keep production assets relative so the same build works under GitHub Pages' /timeline/ subpath.
  base: "./",
  build: {
    emptyOutDir: true,
    outDir: "../dist",
    sourcemap: false,
    target: "chrome155",
    manifest: true,
    rolldownOptions: {
      input: {
        main: new URL("./site/index.html", import.meta.url).pathname,
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: "pdf-runtime",
              test: /node_modules[\\/]pdfjs-dist[\\/]/,
              maxSize: 400_000,
              priority: 30,
            },
            {
              name: "world-rendering",
              test:
                /node_modules[\\/](?:@deck\\.gl|@luma\\.gl|@math\\.gl|@loaders\\.gl|@probe\\.gl)[\\/]/,
              maxSize: 400_000,
              priority: 25,
            },
            {
              name: "legacy-graph",
              test: /node_modules[\\/]@memgraph[\\/]orb[\\/]/,
              maxSize: 400_000,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    watch: {
      include: ["site/**", "src/**"],
    },
  },
  preview: {
    port: 4173,
  },
});
