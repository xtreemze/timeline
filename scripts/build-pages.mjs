import { execFileSync } from "node:child_process";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const run = (command, args) =>
  execFileSync(command, args, { stdio: "inherit", env: process.env });

await rm("dist", { recursive: true, force: true });
await rm("dist-astro", { recursive: true, force: true });

run("pnpm", ["exec", "vite", "build"]);
run("pnpm", ["exec", "astro", "build"]);

await mkdir("dist", { recursive: true });
for (const entry of await readdir("dist-astro")) {
  await cp(join("dist-astro", entry), join("dist", entry), {
    recursive: true,
    force: true,
  });
}
await rm("dist-astro", { recursive: true, force: true });
