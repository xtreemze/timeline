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
    rolldownOptions: {
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
