import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assembleProjectModules,
  validateProjectModule,
} from "../../src/application/project-module.ts";
import { validateProjectInterchange } from "../../src/application/project-interchange.ts";
import {
  lumDocumentIndex,
  lumDocumentMetadata,
  lumReferenceTargetAt,
  lumSymbolAt,
  positionToOffset,
} from "./lum-language-intelligence.mjs";

const SKIP_DIRECTORIES = new Set([
  ".git",
  ".pnpm",
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);

function filePathFromUri(uri) {
  try {
    const url = new URL(uri);
    return url.protocol === "file:" ? fileURLToPath(url) : null;
  } catch {
    return null;
  }
}

function isLumSourcePath(filePath) {
  return filePath.endsWith(".lum.json") && !filePath.endsWith(".lum-proposal.json");
}

function readLumFile(uri) {
  const filePath = filePathFromUri(uri);
  if (!filePath || !isLumSourcePath(filePath)) return null;
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function walkLumFiles(rootPath) {
  const files = [];
  const stack = [rootPath];
  while (stack.length > 0) {
    const directory = stack.pop();
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) stack.push(path.join(directory, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      const filePath = path.join(directory, entry.name);
      if (isLumSourcePath(filePath)) files.push(filePath);
    }
  }
  return files.sort();
}

function normalizeQuery(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function applyTextEdits(source, edits) {
  const ordered = [...edits].sort(
    (left, right) =>
      positionToOffset(source, right.range.start) - positionToOffset(source, left.range.start),
  );
  let result = source;
  for (const edit of ordered) {
    const start = positionToOffset(result, edit.range.start);
    const end = positionToOffset(result, edit.range.end);
    result = result.slice(0, start) + edit.newText + result.slice(end);
  }
  return result;
}

function symbolKind(kind) {
  switch (kind) {
    case "entity":
      return 5;
    case "relationship":
      return 12;
    case "occurrence":
      return 23;
    case "place":
      return 13;
    case "source":
      return 14;
    case "story":
      return 2;
    default:
      return 19;
  }
}

export class LumWorkspaceIndex {
  constructor() {
    this.documents = new Map();
    this.openDocuments = new Set();
  }

  setDocument(uri, source, options = {}) {
    const metadata = lumDocumentMetadata(source);
    if (metadata.format !== "lum-project" && metadata.format !== "lum-project-module") {
      this.documents.delete(uri);
      return;
    }
    this.documents.set(uri, {
      uri,
      source,
      index: lumDocumentIndex(source, uri),
    });
    if (options.open) this.openDocuments.add(uri);
  }

  source(uri) {
    return this.documents.get(uri)?.source;
  }

  indexWorkspaceFolders(folders = []) {
    for (const folder of folders) {
      const rootPath = filePathFromUri(folder?.uri);
      if (!rootPath) continue;
      let stat;
      try {
        stat = statSync(rootPath);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      for (const filePath of walkLumFiles(rootPath)) {
        const uri = pathToFileURL(filePath).href;
        if (this.openDocuments.has(uri)) continue;
        const source = readLumFile(uri);
        if (source !== null) this.setDocument(uri, source);
      }
    }
  }

  refreshUri(uri, deleted = false) {
    if (deleted) {
      if (!this.openDocuments.has(uri)) this.documents.delete(uri);
      return;
    }
    if (this.openDocuments.has(uri)) return;
    const source = readLumFile(uri);
    if (source === null) this.documents.delete(uri);
    else this.setDocument(uri, source);
  }

  closeDocument(uri) {
    this.openDocuments.delete(uri);
    const source = readLumFile(uri);
    if (source === null) this.documents.delete(uri);
    else this.setDocument(uri, source);
  }

  projectKeyFor(uri, source = null) {
    return lumDocumentMetadata(source ?? this.source(uri) ?? "").projectKey;
  }

  authoritativeDocuments(projectKey, currentUri = null) {
    if (!projectKey) {
      const current = currentUri ? this.documents.get(currentUri) : null;
      return current ? [current] : [];
    }
    const matching = [...this.documents.values()].filter(
      (document) => document.index.metadata.projectKey === projectKey,
    );
    const modules = matching.filter(
      (document) => document.index.metadata.format === "lum-project-module",
    );
    return modules.length > 0 ? modules : matching;
  }

  declarations(projectKey, collection, id = null, currentUri = null) {
    const result = [];
    for (const document of this.authoritativeDocuments(projectKey, currentUri)) {
      for (const declaration of document.index.declarations) {
        if (declaration.collection !== collection) continue;
        if (id !== null && declaration.id !== id) continue;
        result.push(declaration);
      }
    }
    return result;
  }

  references(projectKey, collection, id, currentUri = null) {
    const result = [];
    for (const document of this.authoritativeDocuments(projectKey, currentUri)) {
      for (const reference of document.index.references) {
        if (reference.collection === collection && reference.id === id) result.push(reference);
      }
    }
    return result;
  }

  completionItems(uri, source, position) {
    const collection = lumReferenceTargetAt(source, position);
    if (!collection) return [];
    const projectKey = this.projectKeyFor(uri, source);
    const declarations = this.declarations(projectKey, collection, null, uri);
    const seen = new Set();
    return declarations
      .filter((declaration) => {
        if (seen.has(declaration.id)) return false;
        seen.add(declaration.id);
        return true;
      })
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((declaration) => ({
        label: declaration.id,
        kind: 18,
        detail: `Lūm ${declaration.kind} · workspace`,
        insertText: declaration.id,
        sortText: declaration.id,
      }));
  }

  definition(uri, source, position) {
    const symbol = lumSymbolAt(source, position);
    if (!symbol || symbol.role !== "reference") return null;
    const projectKey = this.projectKeyFor(uri, source);
    const matches = this.declarations(projectKey, symbol.collection, symbol.id, uri);
    if (matches.length !== 1) return null;
    return { uri: matches[0].uri, range: matches[0].range };
  }

  referenceLocations(uri, source, position, includeDeclaration = true) {
    const symbol = lumSymbolAt(source, position);
    if (!symbol) return [];
    const projectKey = this.projectKeyFor(uri, source);
    const locations = this.references(projectKey, symbol.collection, symbol.id, uri).map(
      (reference) => ({ uri: reference.uri, range: reference.range }),
    );
    if (includeDeclaration) {
      locations.unshift(
        ...this.declarations(projectKey, symbol.collection, symbol.id, uri).map(
          (declaration) => ({ uri: declaration.uri, range: declaration.range }),
        ),
      );
    }
    return locations;
  }

  resolvedHover(uri, source, position) {
    const symbol = lumSymbolAt(source, position);
    if (!symbol || symbol.role !== "reference") return null;
    const projectKey = this.projectKeyFor(uri, source);
    const matches = this.declarations(projectKey, symbol.collection, symbol.id, uri);
    if (matches.length !== 1) return null;
    const declaration = matches[0];
    return {
      contents: {
        kind: "markdown",
        value:
          `**Lūm ${declaration.kind} reference** \`${symbol.id}\`\n\n` +
          `Resolves to ${declaration.label}.`,
      },
    };
  }

  workspaceSymbols(query = "") {
    const normalized = normalizeQuery(query);
    const result = [];
    const seen = new Set();
    for (const document of this.documents.values()) {
      const projectKey = document.index.metadata.projectKey;
      const authoritative = new Set(
        this.authoritativeDocuments(projectKey, document.uri).map((candidate) => candidate.uri),
      );
      if (!authoritative.has(document.uri)) continue;
      for (const declaration of document.index.declarations) {
        const token = `${projectKey ?? ""}:${declaration.collection}:${declaration.id}:${document.uri}`;
        if (seen.has(token)) continue;
        seen.add(token);
        const haystack = `${declaration.id} ${declaration.label} ${declaration.collection}`.toLocaleLowerCase();
        if (normalized && !haystack.includes(normalized)) continue;
        result.push({
          name: declaration.label,
          kind: symbolKind(declaration.kind),
          location: {
            uri: declaration.uri,
            range: declaration.range,
          },
          containerName: declaration.collection,
        });
      }
    }
    return result.sort((left, right) => left.name.localeCompare(right.name));
  }

  prepareRename(uri, source, position) {
    const symbol = lumSymbolAt(source, position);
    if (!symbol) return null;
    const projectKey = this.projectKeyFor(uri, source);
    const declarations = this.declarations(projectKey, symbol.collection, symbol.id, uri);
    if (declarations.length !== 1) return null;
    return {
      range: symbol.range,
      placeholder: symbol.id,
    };
  }

  rename(uri, source, position, newName) {
    const replacement = String(newName ?? "").trim();
    if (!replacement || /\s/.test(replacement)) return null;
    const symbol = lumSymbolAt(source, position);
    if (!symbol) return null;
    const projectKey = this.projectKeyFor(uri, source);
    const declarations = this.declarations(projectKey, symbol.collection, symbol.id, uri);
    if (declarations.length !== 1) return null;

    const editsByUri = new Map();
    const addEdit = (targetUri, range) => {
      const edits = editsByUri.get(targetUri) ?? [];
      edits.push({ range, newText: replacement });
      editsByUri.set(targetUri, edits);
    };
    addEdit(declarations[0].uri, declarations[0].range);
    for (const reference of this.references(projectKey, symbol.collection, symbol.id, uri)) {
      addEdit(reference.uri, reference.range);
    }

    const changedSources = new Map();
    for (const document of this.authoritativeDocuments(projectKey, uri)) {
      const edits = editsByUri.get(document.uri) ?? [];
      changedSources.set(
        document.uri,
        edits.length > 0 ? applyTextEdits(document.source, edits) : document.source,
      );
    }

    const moduleGroups = new Map();
    for (const [targetUri, changedSource] of changedSources) {
      const metadata = lumDocumentMetadata(changedSource);
      if (metadata.format === "lum-project") {
        if (!validateProjectInterchange(changedSource).valid) return null;
        continue;
      }
      if (metadata.format !== "lum-project-module") continue;
      const validation = validateProjectModule(changedSource);
      if (!validation.valid) return null;
      const key = `${metadata.projectKey ?? ""}\0${metadata.storyId ?? ""}`;
      const group = moduleGroups.get(key) ?? [];
      group.push(changedSource);
      moduleGroups.set(key, group);
    }

    for (const modules of moduleGroups.values()) {
      try {
        assembleProjectModules(modules, { savedAt: "1970-01-01T00:00:00.000Z" });
      } catch {
        return null;
      }
    }

    return {
      changes: Object.fromEntries(
        [...editsByUri.entries()].map(([targetUri, edits]) => [targetUri, edits]),
      ),
    };
  }
}
