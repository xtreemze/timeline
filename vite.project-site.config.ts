import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const entry = fileURLToPath(new URL("./site/project-site-entry.ts", import.meta.url));

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist-project-site",
    sourcemap: false,
    target: "chrome155",
    lib: {
      entry,
      formats: ["es"],
      fileName: () => "xtreemze-project-site.js",
    },
    rolldownOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
