import { execFileSync } from "node:child_process";

const run = (command, args) =>
  execFileSync(command, args, { stdio: "inherit", env: process.env });

run("pnpm", ["exec", "vite", "build"]);
