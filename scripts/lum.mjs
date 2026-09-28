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
import {
  assembleProjectModules,
  createProjectModule,
  formatProjectModule,
  lintProjectModule,
  LUM_PROJECT_MODULE_COLLECTIONS,
  LUM_PROJECT_MODULE_FILE_EXTENSION,
  LUM_PROJECT_MODULE_SCHEMA_ID,
  validateProjectModule,
} from "../src/application/project-module.ts";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "../src/application/project-repository.ts";
import { parseOccurrenceSentence } from "../site/occurrence-composer-model.ts";
import { runLumLanguageServer } from "./lum-lsp.mjs";
import { attachLumDiagnosticRanges } from "./lib/lum-diagnostics.mjs";
import { buildLumAgentContext, parseLumAgentSelectors } from "./lib/lum-agent-context.mjs";
import { runLumAgentAdapter } from "./lib/lum-agent-run.mjs";
import {
  applyLumChangeProposal,
  createLumChangeProposalScaffold,
  LUM_CHANGE_PROPOSAL_SCHEMA_ID,
  validateLumChangeProposal,
} from "./lib/lum-agent-proposal.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_PATH = path.join(ROOT, "schemas", "lum-project-v1.schema.json");
const MODULE_SCHEMA_PATH = path.join(ROOT, "schemas", "lum-project-module-v1.schema.json");

function usage() {
  return `Lūm developer toolchain

Usage:
  lum init [directory|project.lum.json] [--project-key <key>] [--force]
  lum init-module <name.module.lum.json> --project-key <key> --story-id <id> --collection <collection> [--force]
  lum check <project.lum.json|module.module.lum.json|-> [--json]
  lum check-modules <module.module.lum.json...> [--json]
  lum lint <project.lum.json|-> [--json]
  lum fmt <project.lum.json|-> [--check]
  lum compose "<subject> <action> <object> ..." [--json]
  lum agent context <project.lum.json|-> [--json]
  lum agent validate-proposal <change.lum-proposal.json|-> --project <project.lum.json> [--json]
  lum agent apply <change.lum-proposal.json|-> --project <project.lum.json> [--output <candidate.lum.json>] [--json]
  lum agent scaffold-proposal --project <project.lum.json> [--output <change.lum-proposal.json>] [--instruction <text>]
  lum schema [--json]
  lum lsp
`;
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function optionValues(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (typeof value === "string") values.push(value);
  }
  return values;
}

function positional(args) {
  const withValue = new Set([
    "--project-key",
    "--project",
    "--output",
    "--instruction",
    "--story",
    "--occurrence",
    "--entity",
    "--depth",
    "--ids",
    "--adapter",
    "--adapter-arg",
    "--story-id",
    "--collection",
  ]);
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
  const locatedDiagnostics = source ? attachLumDiagnosticRanges(source, diagnostics) : diagnostics;
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ valid, diagnostics: locatedDiagnostics }, null, 2)}\n`,
    );
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

function documentFormat(source) {
  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed.format : null;
  } catch {
    return null;
  }
}

function validateLumDocument(source) {
  return documentFormat(source) === "lum-project-module"
    ? validateProjectModule(source)
    : validateProjectInterchange(source);
}

function lintLumDocument(source, options = {}) {
  return documentFormat(source) === "lum-project-module"
    ? lintProjectModule(source, options)
    : lintProjectInterchange(source, options);
}

function formatLumDocument(source) {
  return documentFormat(source) === "lum-project-module"
    ? formatProjectModule(source)
    : formatProjectInterchange(source);
}

async function commandInitModule(args) {
  const target = positional(args)[0];
  if (!target) throw new Error("init-module requires a .module.lum.json path.");
  const projectKey = optionValue(args, "--project-key");
  const storyId = optionValue(args, "--story-id");
  const collection = optionValue(args, "--collection");
  if (!projectKey || !storyId || !collection) {
    throw new Error(
      "init-module requires --project-key <key>, --story-id <id>, and --collection <collection>.",
    );
  }
  if (!LUM_PROJECT_MODULE_COLLECTIONS.includes(collection)) {
    throw new Error(`--collection must be one of: ${LUM_PROJECT_MODULE_COLLECTIONS.join(", ")}.`);
  }
  if (!target.endsWith(LUM_PROJECT_MODULE_FILE_EXTENSION)) {
    throw new Error(
      `Lūm project modules must use the ${LUM_PROJECT_MODULE_FILE_EXTENSION} suffix.`,
    );
  }
  const absolute = path.resolve(target);
  if (existsSync(absolute) && !args.includes("--force")) {
    throw new Error(`${absolute} already exists. Pass --force to replace it.`);
  }
  await mkdir(path.dirname(absolute), { recursive: true });
  const serialized = createProjectModule({
    projectKey,
    storyId,
    collection,
    records: [],
  });
  await writeFile(absolute, serialized, "utf8");
  process.stdout.write(`${absolute}\n`);
}

function moduleWorkspaceReferenceDiagnostics(modules) {
  const diagnostics = [];
  const byCollection = new Map(modules.map((entry) => [entry.module.collection, entry]));
  const idSets = new Map(
    modules.map((entry) => [
      entry.module.collection,
      new Set(entry.module.records.map((record) => String(record?.id ?? ""))),
    ]),
  );
  const entities = idSets.get("entities") ?? new Set();
  const relationships = idSets.get("relationships") ?? new Set();
  const occurrences = idSets.get("occurrences") ?? new Set();
  const trajectories = idSets.get("trajectories") ?? new Set();
  const places = idSets.get("places") ?? new Set();

  const add = (entry, index, field, collection, id) => {
    if (!id) return;
    const set =
      collection === "entities"
        ? entities
        : collection === "relationships"
          ? relationships
          : collection === "occurrences"
            ? occurrences
            : collection === "trajectories"
              ? trajectories
              : places;
    if (set.has(String(id))) return;
    diagnostics.push({
      severity: "error",
      code: "invalid-module-workspace",
      file: entry.file,
      path: `/records/${index}/${field}`,
      message: `${entry.module.collection} record ${String(entry.module.records[index]?.id ?? index)} references unknown ${collection.slice(0, -1)} ${String(id)}.`,
    });
  };

  const relationshipModule = byCollection.get("relationships");
  relationshipModule?.module.records.forEach((record, index) => {
    add(relationshipModule, index, "subjectId", "entities", record?.subjectId);
    add(relationshipModule, index, "objectId", "entities", record?.objectId);
    if (record?.placeId) add(relationshipModule, index, "placeId", "places", record.placeId);
  });

  const occurrenceModule = byCollection.get("occurrences");
  occurrenceModule?.module.records.forEach((record, index) => {
    if (record?.placeId) add(occurrenceModule, index, "placeId", "places", record.placeId);
    (record?.relationshipIds ?? []).forEach((id) => {
      add(occurrenceModule, index, "relationshipIds", "relationships", id);
    });
    (record?.trajectoryIds ?? []).forEach((id) => {
      add(occurrenceModule, index, "trajectoryIds", "trajectories", id);
    });
    (record?.participantContexts ?? []).forEach((participant, participantIndex) => {
      add(
        occurrenceModule,
        index,
        `participantContexts/${participantIndex}/entityId`,
        "entities",
        participant?.entityId,
      );
    });
  });

  const storyModule = byCollection.get("stories");
  storyModule?.module.records.forEach((record, index) => {
    (record?.occurrenceIds ?? []).forEach((id) => {
      add(storyModule, index, "occurrenceIds", "occurrences", id);
    });
    (record?.placeIds ?? []).forEach((id) => {
      add(storyModule, index, "placeIds", "places", id);
    });
  });

  const trajectoryModule = byCollection.get("trajectories");
  trajectoryModule?.module.records.forEach((record, index) => {
    (record?.observedEntityIds ?? []).forEach((id) => {
      add(trajectoryModule, index, "observedEntityIds", "entities", id);
    });
  });

  return diagnostics;
}

async function commandCheckModules(args) {
  const targets = positional(args);
  if (targets.length === 0) {
    throw new Error("check-modules requires one or more .module.lum.json paths.");
  }
  const sources = [];
  const modules = [];
  const diagnostics = [];
  for (const target of targets) {
    const source = await readTarget(target);
    const validation = validateProjectModule(source);
    if (!validation.valid) {
      diagnostics.push(
        ...validation.diagnostics.map((finding) => ({
          ...finding,
          file: target,
        })),
      );
    } else {
      modules.push({ file: target, module: validation.module });
    }
    sources.push(source);
  }

  if (diagnostics.length === 0) {
    diagnostics.push(...moduleWorkspaceReferenceDiagnostics(modules));
  }

  if (diagnostics.length === 0) {
    try {
      assembleProjectModules(sources, { savedAt: "1970-01-01T00:00:00.000Z" });
    } catch (error) {
      diagnostics.push({
        severity: "error",
        code: "invalid-module-workspace",
        path: "",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (diagnostics.length > 0) {
    if (args.includes("--json")) {
      process.stdout.write(
        `${JSON.stringify({ valid: false, moduleCount: targets.length, diagnostics }, null, 2)}\n`,
      );
    } else {
      printDiagnostics(diagnostics);
    }
    process.exitCode = 1;
    return;
  }

  if (args.includes("--json")) {
    process.stdout.write(
      `${JSON.stringify({ valid: true, moduleCount: targets.length, diagnostics: [] }, null, 2)}\n`,
    );
  } else {
    process.stdout.write(`Lūm module workspace is valid (${targets.length} modules).\n`);
  }
}

async function commandCheck(args) {
  const target = positional(args)[0];
  if (!target) throw new Error("check requires a .lum.json path or - for stdin.");
  const source = await readTarget(target);
  const result = validateLumDocument(source);
  outputValidation(result.valid, result.diagnostics, args.includes("--json"), source);
  if (!result.valid) process.exitCode = 1;
}

async function commandLint(args) {
  const target = positional(args)[0];
  if (!target) throw new Error("lint requires a .lum.json path or - for stdin.");
  const source = await readTarget(target);
  const result = lintLumDocument(source, { fileName: target });
  outputValidation(result.valid, result.diagnostics, args.includes("--json"), source);
  if (!result.valid) process.exitCode = 1;
}

async function commandFmt(args) {
  const target = positional(args)[0];
  if (!target) throw new Error("fmt requires a .lum.json path or - for stdin.");
  const source = await readTarget(target);
  const formatted = formatLumDocument(source);

  if (args.includes("--check")) {
    if (formatted !== source) {
      process.stderr.write("Lūm document is not canonically formatted.\n");
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
  const json = args.includes("--json");

  if (subcommand === "context") {
    if (!target) {
      throw new Error("agent context requires a project.lum.json path or - for stdin.");
    }
    const source = await readTarget(target);
    let context;
    try {
      context = buildLumAgentContext(source, parseLumAgentSelectors(args));
    } catch (error) {
      if (Array.isArray(error?.diagnostics)) {
        outputValidation(false, error.diagnostics, json, source);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
    process.stdout.write(`${JSON.stringify(context, null, 2)}\n`);
    return;
  }

  if (subcommand === "run") {
    if (!target || target === "-") {
      throw new Error(
        "agent run requires a project.lum.json path; stdin is reserved for adapters.",
      );
    }
    const projectSource = await readTarget(target);
    let context;
    try {
      context = buildLumAgentContext(projectSource, parseLumAgentSelectors(args));
    } catch (error) {
      if (Array.isArray(error?.diagnostics)) {
        outputValidation(false, error.diagnostics, json, projectSource);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    const result = runLumAgentAdapter({
      command: optionValue(args, "--adapter"),
      args: optionValues(args, "--adapter-arg"),
      context,
      projectSource,
      cwd: process.cwd(),
    });
    if (!result.valid) {
      const diagnostics = attachLumDiagnosticRanges(result.proposalSource, result.diagnostics);
      if (json) {
        process.stdout.write(
          `${JSON.stringify({ valid: false, diagnostics, verificationRequired: true }, null, 2)}\n`,
        );
      } else {
        printDiagnostics(diagnostics);
      }
      process.exitCode = 1;
      return;
    }

    const output = optionValue(args, "--output");
    if (output) {
      const outputPath = path.resolve(output);
      const projectPath = path.resolve(target);
      if (outputPath === projectPath) {
        throw new Error("Refusing to overwrite the source project with provider output.");
      }
      await writeFile(outputPath, result.proposalSource, "utf8");
      if (json) {
        process.stdout.write(
          `${JSON.stringify(
            {
              valid: true,
              output: outputPath,
              verificationRequired: true,
              summary: result.summary,
            },
            null,
            2,
          )}\n`,
        );
      } else {
        process.stdout.write(`${outputPath}\n`);
      }
      return;
    }

    if (json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            valid: true,
            verificationRequired: true,
            proposal: JSON.parse(result.proposalSource),
            summary: result.summary,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stdout.write(result.proposalSource);
    }
    return;
  }

  const projectTarget = optionValue(args, "--project");
  if (!projectTarget) {
    throw new Error(`agent ${subcommand || "command"} requires --project <project.lum.json>.`);
  }
  if (projectTarget === "-" && target === "-") {
    throw new Error("Proposal and project cannot both read from stdin.");
  }

  const projectSource = await readTarget(projectTarget);

  if (subcommand === "scaffold-proposal") {
    const projectValidation = validateProjectInterchange(projectSource);
    if (!projectValidation.valid) {
      outputValidation(false, projectValidation.diagnostics, json, projectSource);
      process.exitCode = 1;
      return;
    }
    const scaffold = createLumChangeProposalScaffold({
      projectKey: projectValidation.snapshot.projectKey,
      expectedRevision: projectValidation.snapshot.revision,
      instruction: optionValue(args, "--instruction") ?? undefined,
    });
    const output = optionValue(args, "--output");
    if (output) {
      await writeFile(path.resolve(output), scaffold, "utf8");
      process.stdout.write(`${path.resolve(output)}\n`);
    } else {
      process.stdout.write(scaffold);
    }
    return;
  }

  if (!target) {
    throw new Error(
      `agent ${subcommand || "command"} requires a change proposal path or - for stdin.`,
    );
  }

  const proposalSource = await readTarget(target);

  if (subcommand === "validate-proposal") {
    const validation = validateLumChangeProposal(proposalSource, projectSource, {
      fileName: target,
    });
    if (json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            valid: validation.valid,
            diagnostics: attachLumDiagnosticRanges(proposalSource, validation.diagnostics),
            ...(validation.summary ? { summary: validation.summary } : {}),
            verificationRequired: true,
          },
          null,
          2,
        )}\n`,
      );
    } else if (validation.valid) {
      process.stdout.write("Lūm change proposal is valid and ready for review.\n");
      for (const operation of validation.summary?.operations ?? []) {
        process.stdout.write(`  ${operation.op} ${operation.collection} ${operation.id}\n`);
      }
    } else {
      printDiagnostics(validation.diagnostics);
    }
    if (!validation.valid) process.exitCode = 1;
    return;
  }

  if (subcommand === "apply") {
    const applied = applyLumChangeProposal(proposalSource, projectSource, {
      savedAt: new Date().toISOString(),
      fileName: target,
    });
    if (!applied.valid) {
      outputValidation(false, applied.diagnostics, json, proposalSource);
      process.exitCode = 1;
      return;
    }

    const explicitOutput = optionValue(args, "--output");
    const projectPath = path.resolve(projectTarget);
    const defaultOutput = projectPath.endsWith(LUM_PROJECT_FILE_EXTENSION)
      ? `${projectPath.slice(0, -LUM_PROJECT_FILE_EXTENSION.length)}.candidate${LUM_PROJECT_FILE_EXTENSION}`
      : `${projectPath}.candidate${LUM_PROJECT_FILE_EXTENSION}`;
    const outputPath = path.resolve(explicitOutput ?? defaultOutput);

    if (outputPath === projectPath) {
      throw new Error(
        "Refusing to overwrite the source project. Choose a separate --output candidate path.",
      );
    }

    await writeFile(outputPath, applied.candidate, "utf8");
    if (json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            valid: true,
            output: outputPath,
            verificationRequired: true,
            summary: applied.summary,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stdout.write(`${outputPath}\n`);
    }
    return;
  }

  throw new Error("agent supports: context, scaffold-proposal, validate-proposal, and apply.");
}

function commandSchema(args) {
  const value = {
    id: LUM_PROJECT_SCHEMA_ID,
    path: SCHEMA_PATH,
    interchangeVersion: LUM_PROJECT_INTERCHANGE_VERSION,
    canonicalSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    module: {
      id: LUM_PROJECT_MODULE_SCHEMA_ID,
      path: MODULE_SCHEMA_PATH,
      extension: LUM_PROJECT_MODULE_FILE_EXTENSION,
    },
  };
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${value.id}\n${value.path}\n${value.module.id}\n${value.module.path}\n`);
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
    case "init-module":
      await commandInitModule(args);
      return;
    case "check":
      await commandCheck(args);
      return;
    case "check-modules":
      await commandCheckModules(args);
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
