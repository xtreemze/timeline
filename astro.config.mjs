import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://xtreemze.github.io",
  base: "/timeline",
  srcDir: "./landing/src",
  publicDir: "./landing/public",
  outDir: "./dist-astro",
  output: "static",
  trailingSlash: "always",
});
