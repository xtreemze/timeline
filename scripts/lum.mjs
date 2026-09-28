#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  createEmptyProjectInterchange,
  formatProjectInterchange,
  LUM_PROJECT_FILE_EXTENSION,
  LUM_PROJECT_INTERCHANGE_VERSION,
  LUM_PROJECT_SCHEMA_ID,
  lintProjectInterchange,
  validateProjectInterchange,
} from "../src/application/project-interchange.ts";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "../src/application/project-repository.ts";
import { parseOccurrenceSentence } from "../site/occurrence-composer-model.ts";
import { runLumLanguageServer } from "./lum-lsp.mjs";
import { attachLumDiagnosticRanges } from "./lib/lum-diagnostics.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_PATH = path.join(ROOT, "schemas", "lum-project-v1.schema.json");

function usage() {
  return `Lūm developer toolchain

Usage:
  lum init [directory|project.lum.json] [--project-key <key>] [--force]
  lum check <project.lum.json|-> [--json]
  lum lint <project.lum.json|-> [--json]
  lum fmt <project.lum.json|-> [--check]
  lum compose "<subject> <action> <object> ..." [--json]
  lum agent context <project.lum.json|-> [--json]
  lum schema [--json]
  lum lsp
`;
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function positional(args) {
  const withValue = new Set(["--project-key"]);
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (withValue.has(value)) {
      index += 1;
      continue;
    }
    if (value.startsWith("--")) continue;
    result.push(value);
  }
  return result;
}

async function readStdin() {
  let source = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) source += chunk;
  return source;
}

async function readTarget(target) {
  return target === "-" ? readStdin() : readFile(path.resolve(target), "utf8");
}

function printDiagnostics(diagnostics) {
  for (const diagnostic of diagnostics) {
    const location = diagnostic.path || "/";
    process.stderr.write(
      `${diagnostic.severity.toUpperCase()} ${diagnostic.code} ${location}: ${diagnostic.message}\n`,
    );
  }
}

function outputValidation(valid, diagnostics, json, source = null) {
  const locatedDiagnostics = source
    ? attachLumDiagnosticRanges(source, diagnostics)
    : diagnostics;
  if (json) {
    process.stdout.write(`${JSON.stringify({ valid, diagnostics: locatedDiagnostics }, null, 2)}\n`);
  } else if (valid) {
    process.stdout.write("Lūm project is valid.\n");
  } else {
    printDiagnostics(locatedDiagnostics);
  }
}

function slug(value) {
  return (
    String(value)
      .trim()
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

async function commandInit(args) {
  const targetArg = positional(args)[0] ?? ".";
  const force = args.includes("--force");
  const explicitKey = optionValue(args, "--project-key");

  const absoluteTarget = path.resolve(targetArg);
  const filePath = targetArg.endsWith(LUM_PROJECT_FILE_EXTENSION)
    ? absoluteTarget
    : path.join(absoluteTarget, `project${LUM_PROJECT_FILE_EXTENSION}`);
  const directory = path.dirname(filePath);

  if (existsSync(filePath) && !force) {
    throw new Error(`${filePath} already exists. Pass --force to replace it.`);
  }

  await mkdir(directory, { recursive: true });
  const projectKey = explicitKey ?? slug(path.basename(directory));
  const serialized = createEmptyProjectInterchange({
    projectKey,
    savedAt: new Date().toISOString(),
  });
  await writeFile(filePath, serialized, "utf8");
  process.stdout.write(`${filePath}\n`);
}

async function commandCheck(args) {
  const target = positional(args)[0];
  if (!target) throw new Error("check requires a .lum.json path or - for stdin.");
  const source = await readTarget(target);
  const result = validateProjectInterchange(source);
  outputValidation(result.valid, result.diagnostics, args.includes("--json"), source);
  if (!result.valid) process.exitCode = 1;
}

async function commandLint(args) {
  const target = positional(args)[0];
  if (!target) throw new Error("lint requires a .lum.json path or - for stdin.");
  const source = await readTarget(target);
  const result = lintProjectInterchange(source, { fileName: target });
  outputValidation(result.valid, result.diagnostics, args.includes("--json"), source);
  if (!result.valid) process.exitCode = 1;
}

async function commandFmt(args) {
  const target = positional(args)[0];
  if (!target) throw new Error("fmt requires a .lum.json path or - for stdin.");
  const source = await readTarget(target);
  const formatted = formatProjectInterchange(source);

  if (args.includes("--check")) {
    if (formatted !== source) {
      process.stderr.write("Lūm project is not canonically formatted.\n");
      process.exitCode = 1;
    }
    return;
  }

  if (target === "-") {
    process.stdout.write(formatted);
    return;
  }
  await writeFile(path.resolve(target), formatted, "utf8");
}

function commandCompose(args) {
  const source = positional(args).join(" ").trim();
  if (!source) throw new Error("compose requires an occurrence sentence.");
  const parsed = parseOccurrenceSentence(source);
  process.stdout.write(`${JSON.stringify(parsed, null, 2)}\n`);
  if (parsed.stage !== "complete" || parsed.diagnostics.length > 0) {
    process.exitCode = 1;
  }
}


async function commandAgent(args) {
  const [subcommand, target] = positional(args);
  if (subcommand !== "context" || !target) {
    throw new Error("agent currently supports: lum agent context <project.lum.json|->");
  }

  const source = await readTarget(target);
  const validation = validateProjectInterchange(source);
  if (!validation.valid) {
    outputValidation(false, validation.diagnostics, args.includes("--json"), source);
    process.exitCode = 1;
    return;
  }

  const project = validation.snapshot.project;
  const context = {
    protocol: "lum-agent-context-v1",
    schema: {
      id: LUM_PROJECT_SCHEMA_ID,
      interchangeVersion: LUM_PROJECT_INTERCHANGE_VERSION,
      canonicalSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    },
    project: {
      projectKey: validation.snapshot.projectKey,
      revision: validation.snapshot.revision,
      entities: project.entities.map((entity) => ({
        id: String(entity.id),
        name: entity.name,
        type: entity.type,
      })),
      relationships: project.relationships.map((relationship) => ({
        id: String(relationship.id),
        subjectId: String(relationship.subjectId),
        predicate: relationship.predicate,
        objectId: String(relationship.objectId),
      })),
      occurrences: (project.occurrences ?? []).map((occurrence) => ({
        id: String(occurrence.id),
        ...(occurrence.title ? { title: occurrence.title } : {}),
        ...(occurrence.occurrenceType ? { occurrenceType: occurrence.occurrenceType } : {}),
        participantEntityIds: occurrence.participantContexts.map((participant) =>
          String(participant.entityId),
        ),
        relationshipIds: occurrence.relationshipIds.map(String),
      })),
      trajectories: (project.trajectories ?? []).map((trajectory) => ({
        id: String(trajectory.id),
        sampleCount: trajectory.sampleCount,
      })),
    },
    composer: {
      syntax:
        "SUBJECT ACTION OBJECT [at PLACE] [on INSTANT | from START to END] [[category: CATEGORY, tags: A|B]]",
      command: 'lum compose "<sentence>" --json',
      rule:
        "Composer output is a proposal. It must pass canonical validation before any project mutation.",
    },
    workflow: [
      "lum agent context <project.lum.json> --json",
      'lum compose "<occurrence sentence>" --json',
      "edit the bounded canonical records required by the proposal",
      "lum fmt <project.lum.json>",
      "lum lint <project.lum.json> --json",
    ],
  };

  process.stdout.write(`${JSON.stringify(context, null, 2)}\n`);
}

function commandSchema(args) {
  const value = {
    id: LUM_PROJECT_SCHEMA_ID,
    path: SCHEMA_PATH,
    interchangeVersion: LUM_PROJECT_INTERCHANGE_VERSION,
    canonicalSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
  };
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${value.id}\n${value.path}\n`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  switch (command) {
    case "init":
      await commandInit(args);
      return;
    case "check":
      await commandCheck(args);
      return;
    case "lint":
      await commandLint(args);
      return;
    case "fmt":
      await commandFmt(args);
      return;
    case "compose":
      commandCompose(args);
      return;
    case "agent":
      await commandAgent(args);
      return;
    case "schema":
      commandSchema(args);
      return;
    case "lsp":
      runLumLanguageServer();
      return;
    default:
      throw new Error(`Unknown lum command "${command}".\n\n${usage()}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
