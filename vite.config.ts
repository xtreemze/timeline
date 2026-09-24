import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";

const runtimeFiles = [
  "orb-graph.bundle.js",
  "leaflet.bundle.js",
  "evidence-extraction.bundle.js",
  "pdf.worker.mjs",
] as const;

export default defineConfig({
  root: "site",
  // Keep production assets relative so the same build works under GitHub Pages' /timeline/ subpath.
  base: "./",
  plugins: [
    {
      // The runtime bundles are prebuilt esbuild IIFEs loaded as classic
      // scripts. Vite's dev transform would rewrite pdf.js' dynamic import()
      // into module syntax and break the classic script, so serve them verbatim.
      name: "serve-static-runtime-bundles",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = (request.url ?? "").split("?")[0]?.replace(/^\//, "");
          if (!runtimeFiles.includes(path as (typeof runtimeFiles)[number])) {
            next();
            return;
          }
          response.setHeader("Content-Type", "text/javascript; charset=utf-8");
          response.setHeader("Cache-Control", "no-cache");
          response.end(readFileSync(new URL(`./site/${path}`, import.meta.url)));
        });
      },
    },
    {
      name: "copy-static-runtime-bundles",
      closeBundle() {
        const outputDirectory = new URL("./dist/", import.meta.url);
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
    outDir: "../dist",
    sourcemap: false,
    target: "chrome155",
    rollupOptions: {
      input: {
        main: new URL("./site/index.html", import.meta.url).pathname,
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
