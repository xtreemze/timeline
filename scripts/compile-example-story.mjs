#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  compileExampleStoryModules,
  compileExampleStoryProject,
} from "../src/application/example-story-compiler.ts";

await import("../site/timeline-graph-shim.ts");
await import("../site/sample-case-shim.ts");

const args = process.argv.slice(2);
const storyId = args.find((arg) => !arg.startsWith("--")) ?? "story-three-little-pigs";
const outIndex = args.indexOf("--out");
const outputPath = outIndex >= 0 ? args[outIndex + 1] : null;
const modulesIndex = args.indexOf("--modules");
const modulesDirectory = modulesIndex >= 0 ? args[modulesIndex + 1] : null;
const savedAtIndex = args.indexOf("--saved-at");
const savedAt =
  savedAtIndex >= 0 && args[savedAtIndex + 1]
    ? args[savedAtIndex + 1]
    : "2026-09-28T09:00:00.000Z";

const sample = globalThis.TimelineSampleCase;
if (!sample) throw new Error("TimelineSampleCase did not initialize.");

const compiled = compileExampleStoryProject(sample, storyId, { savedAt });
if (modulesDirectory) {
  const modules = compileExampleStoryModules(sample, storyId, { savedAt });
  const collections = [
    "entities",
    "relationships",
    "occurrences",
    "places",
    "sources",
    "categories",
    "stories",
  ];
  const directory = path.resolve(modulesDirectory);
  await mkdir(directory, { recursive: true });
  for (let index = 0; index < modules.length; index += 1) {
    const collection = collections[index];
    await writeFile(
      path.join(directory, `${collection}.module.lum.json`),
      modules[index],
      "utf8",
    );
  }
  await writeFile(path.join(directory, "project.lum.json"), compiled.serialized, "utf8");
  process.stdout.write(`${directory}\n`);
} else if (outputPath) {
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, compiled.serialized, "utf8");
  process.stdout.write(`${path.resolve(outputPath)}\n`);
} else {
  process.stdout.write(compiled.serialized);
}
