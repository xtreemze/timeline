#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  compileExampleStoryCorpus,
  compileExampleStoryModules,
  compileExampleStoryProject,
} from "../src/application/example-story-compiler.ts";

await import("../site/timeline-graph-shim.ts");
await import("../site/sample-case-shim.ts");

const args = process.argv.slice(2);
const COLLECTIONS = [
  "entities",
  "relationships",
  "occurrences",
  "places",
  "sources",
  "categories",
  "stories",
];

async function writeCompiledStory(directory, compiled, modules) {
  await mkdir(directory, { recursive: true });
  for (let index = 0; index < modules.length; index += 1) {
    const collection = COLLECTIONS[index];
    await writeFile(path.join(directory, `${collection}.module.lum.json`), modules[index], "utf8");
  }
  await writeFile(path.join(directory, "project.lum.json"), compiled.serialized, "utf8");
}

const storyId = args.find((arg) => !arg.startsWith("--")) ?? "story-three-little-pigs";
const outIndex = args.indexOf("--out");
const outputPath = outIndex >= 0 ? args[outIndex + 1] : null;
const modulesIndex = args.indexOf("--modules");
const modulesDirectory = modulesIndex >= 0 ? args[modulesIndex + 1] : null;
const savedAtIndex = args.indexOf("--saved-at");
const savedAt =
  savedAtIndex >= 0 && args[savedAtIndex + 1] ? args[savedAtIndex + 1] : "2026-09-28T09:00:00.000Z";

const sample = globalThis.TimelineSampleCase;
if (!sample) throw new Error("TimelineSampleCase did not initialize.");

if (args.includes("--all")) {
  const manifestIndex = args.indexOf("--manifest");
  const manifestPath =
    manifestIndex >= 0 && args[manifestIndex + 1]
      ? path.resolve(args[manifestIndex + 1])
      : path.resolve("examples/classic-tales/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const entries = Array.isArray(manifest.stories) ? manifest.stories : [];
  const manifestIds = entries.map((entry) => String(entry?.id ?? "")).filter(Boolean);
  const sampleIds = sample.stories.map((story) => story.id);
  if (
    manifestIds.length !== sampleIds.length ||
    [...manifestIds].sort().join("\n") !== [...sampleIds].sort().join("\n")
  ) {
    throw new Error("Example corpus manifest does not match the shipped story set.");
  }

  const compiledCorpus = compileExampleStoryCorpus(sample, manifestIds, {
    savedAt,
    projectKeyPrefix: String(manifest.project?.id || "classic-tales"),
  });
  const byId = new Map(compiledCorpus.map((entry) => [entry.storyId, entry]));
  for (const entry of entries) {
    const compiledEntry = byId.get(entry.id);
    if (!compiledEntry) throw new Error(`Compiled corpus is missing ${entry.id}.`);
    if (!entry.targetDirectory)
      throw new Error(`Manifest story ${entry.id} has no targetDirectory.`);
    await writeCompiledStory(
      path.resolve(String(entry.targetDirectory)),
      compiledEntry,
      compiledEntry.modules,
    );
  }
  process.stdout.write(`${entries.length} stories compiled from ${manifestPath}\n`);
} else {
  const compiled = compileExampleStoryProject(sample, storyId, { savedAt });
  if (modulesDirectory) {
    const modules = compileExampleStoryModules(sample, storyId, { savedAt });
    const directory = path.resolve(modulesDirectory);
    await writeCompiledStory(directory, compiled, modules);
    process.stdout.write(`${directory}\n`);
  } else if (outputPath) {
    await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
    await writeFile(outputPath, compiled.serialized, "utf8");
    process.stdout.write(`${path.resolve(outputPath)}\n`);
  } else {
    process.stdout.write(compiled.serialized);
  }
}
