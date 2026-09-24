import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname } from "node:path";

const supportedExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (!allowFailure && result.status !== 0) {
    process.stderr.write(result.stderr || `git ${args.join(" ")} failed\n`);
    process.exit(result.status ?? 1);
  }
  return result;
}

function resolveBase() {
  const requested = process.env.QUALITY_BASE_SHA?.trim();
  if (requested && !/^0+$/.test(requested)) {
    const exists = git(["cat-file", "-e", `${requested}^{commit}`], { allowFailure: true });
    if (exists.status === 0) return requested;
  }

  const mergeBase = git(["merge-base", "origin/main", "HEAD"], { allowFailure: true });
  if (mergeBase.status === 0 && mergeBase.stdout.trim()) return mergeBase.stdout.trim();

  const parent = git(["rev-parse", "HEAD^"], { allowFailure: true });
  if (parent.status === 0 && parent.stdout.trim()) return parent.stdout.trim();

  return null;
}

function pathsFrom(result) {
  return result.stdout
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean);
}

function changedFiles(base) {
  if (!base) return [];

  const paths = new Set([
    ...pathsFrom(git(["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`])),
    ...pathsFrom(git(["diff", "--name-only", "--diff-filter=ACMR"])),
    ...pathsFrom(git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])),
    ...pathsFrom(git(["ls-files", "--others", "--exclude-standard"])),
  ]);

  return [...paths]
    .filter((path) => supportedExtensions.has(extname(path)))
    .filter((path) => existsSync(path));
}

const base = resolveBase();
if (!base) {
  console.error("Unable to resolve a quality-gate base commit.");
  process.exit(1);
}

const files = changedFiles(base);
if (files.length === 0) {
  console.log("No Biome-supported files changed; strict changed-file quality gate passed.");
  process.exit(0);
}

console.log(
  `Strict quality gate: checking ${files.length} changed file(s) against ${base.slice(0, 12)}.`,
);

const command =
  process.platform === "win32" ? "node_modules/.bin/biome.cmd" : "node_modules/.bin/biome";
const result = spawnSync(
  command,
  [
    "check",
    "--config-path=biome.strict.json",
    "--diagnostic-level=error",
    "--max-diagnostics=200",
    ...files,
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
