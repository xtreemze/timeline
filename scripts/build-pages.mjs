import { execFileSync } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";

const run = (command, args) =>
  execFileSync(command, args, { stdio: "inherit", env: process.env });

run("pnpm", ["exec", "vite", "build"]);
run("pnpm", ["exec", "vite", "build", "--config", "vite.project-site.config.ts"]);

await mkdir("dist/project-site", { recursive: true });
await cp(
  "dist-project-site/xtreemze-project-site.js",
  "dist/project-site/xtreemze-project-site.js",
);
await cp("site/project-site.css", "dist/project-site/project-site.css");
await cp(
  "site/project-site-public.d.ts",
  "dist/project-site/xtreemze-project-site.d.ts",
);
