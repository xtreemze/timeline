import { spawnSync } from "node:child_process";
import { extname } from "node:path";

const behaviorRoots = ["src/", "site/", "schemas/"];
const behaviorExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
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

  return [
    ...new Set([
      ...pathsFrom(git(["diff", "--name-only", "--diff-filter=ACMRD", `${base}...HEAD`])),
      ...pathsFrom(git(["diff", "--name-only", "--diff-filter=ACMRD"])),
      ...pathsFrom(git(["diff", "--cached", "--name-only", "--diff-filter=ACMRD"])),
      ...pathsFrom(git(["ls-files", "--others", "--exclude-standard"])),
    ]),
  ];
}

function isProductionBehavior(path) {
  return (
    behaviorRoots.some((root) => path.startsWith(root)) && behaviorExtensions.has(extname(path))
  );
}

function isExecutableTest(path) {
  return path.startsWith("tests/") && /\.(?:test|spec)\.(?:[cm]?js|tsx?)$/.test(path);
}

const base = resolveBase();
if (!base) {
  console.error("Unable to resolve a TDD-gate base commit.");
  process.exit(1);
}

const changed = changedFiles(base);
const production = changed.filter(isProductionBehavior);
if (production.length === 0) {
  console.log("No production behavior files changed; TDD accompaniment gate passed.");
  process.exit(0);
}

const tests = changed.filter(isExecutableTest);
if (tests.length > 0) {
  console.log(
    `TDD accompaniment gate passed: ${production.length} production behavior file(s), ${tests.length} executable test file(s).`,
  );
  process.exit(0);
}

console.error("TDD gate failed: production behavior changed without a test change.");
console.error("Production behavior files:");
for (const path of production) console.error(`  - ${path}`);
console.error(
  "Add or modify an executable tests/**/*.test.* or tests/**/*.spec.* file. Follow RED → GREEN → REFACTOR and observe the test fail for the intended reason before implementation.",
);
process.exit(1);
