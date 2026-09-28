import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
    } else if (entry.isFile() && entry.name.endsWith(".test.mjs")) {
      files.push(absolute);
    }
  }
  return files;
}

export async function discoverNodeTests(root = process.cwd()) {
  const files = await walk(path.join(root, "tests"));
  return files
    .map((file) => path.relative(root, file).split(path.sep).join("/"))
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  const files = await discoverNodeTests();
  if (files.length === 0) {
    throw new Error("No Node test files were discovered under tests/**/*.test.mjs");
  }
  if (process.argv.includes("--list")) {
    process.stdout.write(`${files.join("\n")}\n`);
    return;
  }
  const result = spawnSync(process.execPath, ["--test", ...files], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (entry === import.meta.url) await main();
