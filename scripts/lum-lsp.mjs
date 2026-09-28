import process from "node:process";

import {
  formatProjectInterchange,
  lintProjectInterchange,
} from "../src/application/project-interchange.ts";
import {
  formatProjectModule,
  lintProjectModule,
} from "../src/application/project-module.ts";
import { attachLumDiagnosticRanges } from "./lib/lum-diagnostics.mjs";
import {
  LUM_SEMANTIC_TOKEN_MODIFIERS,
  LUM_SEMANTIC_TOKEN_TYPES,
  lumCompletions,
  lumDefinition,
  lumDocumentSymbols,
  lumHover,
  lumReferences,
  lumSemanticTokens,
} from "./lib/lum-language-intelligence.mjs";
import { LumWorkspaceIndex } from "./lib/lum-workspace-index.mjs";

function documentFormat(source) {
  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed.format
      : null;
  } catch {
    return null;
  }
}

function isProjectModule(source, uri = "") {
  return documentFormat(source) === "lum-project-module" || uri.endsWith(".module.lum.json");
}

function formatLumDocument(source, uri = "") {
  return isProjectModule(source, uri)
    ? formatProjectModule(source)
    : formatProjectInterchange(source);
}

function lspDiagnostics(source, uri = "") {
  const result = isProjectModule(source, uri)
    ? lintProjectModule(source, { fileName: uri })
    : lintProjectInterchange(source, { fileName: uri });
  return attachLumDiagnosticRanges(source, result.diagnostics).map((diagnostic) => ({
    range: diagnostic.range,
    severity: diagnostic.severity === "error" ? 1 : 2,
    code: diagnostic.code,
    source: "lum",
    message: `${diagnostic.path || "/"}: ${diagnostic.message}`,
  }));
}

function fullDocumentRange(source) {
  const lines = source.split("\n");
  return {
    start: { line: 0, character: 0 },
    end: {
      line: Math.max(0, lines.length - 1),
      character: lines.at(-1)?.length ?? 0,
    },
  };
}

export function createLumLanguageServer(writeMessage) {
  const documents = new Map();
  const workspace = new LumWorkspaceIndex();

  function reply(id, result) {
    writeMessage({ jsonrpc: "2.0", id, result });
  }

  function sourceFor(message) {
    const uri = message.params?.textDocument?.uri;
    return uri
      ? { uri, source: documents.get(uri) ?? workspace.source(uri) }
      : { uri: null, source: undefined };
  }

  function publish(uri, source) {
    writeMessage({
      jsonrpc: "2.0",
      method: "textDocument/publishDiagnostics",
      params: {
        uri,
        diagnostics: lspDiagnostics(source, uri),
      },
    });
  }

  function handle(message) {
    const method = message?.method;

    if (method === "initialize") {
      const folders = message.params?.workspaceFolders?.length
        ? message.params.workspaceFolders
        : message.params?.rootUri
          ? [{ uri: message.params.rootUri, name: "root" }]
          : [];
      workspace.indexWorkspaceFolders(folders);
      reply(message.id, {
        capabilities: {
          textDocumentSync: 1,
          documentFormattingProvider: true,
          completionProvider: {
            triggerCharacters: ['"', ":"],
          },
          hoverProvider: true,
          documentSymbolProvider: true,
          definitionProvider: true,
          referencesProvider: true,
          workspaceSymbolProvider: true,
          renameProvider: { prepareProvider: true },
          semanticTokensProvider: {
            legend: {
              tokenTypes: LUM_SEMANTIC_TOKEN_TYPES,
              tokenModifiers: LUM_SEMANTIC_TOKEN_MODIFIERS,
            },
            full: true,
          },
        },
        serverInfo: {
          name: "lum",
          version: "1",
        },
      });
      return;
    }

    if (method === "shutdown") {
      reply(message.id, null);
      return;
    }

    if (method === "textDocument/didOpen") {
      const document = message.params?.textDocument;
      if (!document?.uri || typeof document.text !== "string") return;
      documents.set(document.uri, document.text);
      workspace.setDocument(document.uri, document.text, { open: true });
      publish(document.uri, document.text);
      return;
    }

    if (method === "textDocument/didChange") {
      const uri = message.params?.textDocument?.uri;
      const text = message.params?.contentChanges?.at(-1)?.text;
      if (!uri || typeof text !== "string") return;
      documents.set(uri, text);
      workspace.setDocument(uri, text, { open: true });
      publish(uri, text);
      return;
    }

    if (method === "textDocument/didSave") {
      const uri = message.params?.textDocument?.uri;
      const source = documents.get(uri);
      if (uri && typeof source === "string") publish(uri, source);
      return;
    }

    if (method === "workspace/didChangeWatchedFiles") {
      for (const change of message.params?.changes ?? []) {
        if (!change?.uri) continue;
        workspace.refreshUri(change.uri, change.type === 3);
      }
      return;
    }

    if (method === "textDocument/didClose") {
      const uri = message.params?.textDocument?.uri;
      if (!uri) return;
      documents.delete(uri);
      workspace.closeDocument(uri);
      writeMessage({
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params: { uri, diagnostics: [] },
      });
      return;
    }

    if (method === "textDocument/formatting") {
      const { uri, source } = sourceFor(message);
      let result = [];
      if (typeof source === "string") {
        try {
          result = [
            {
              range: fullDocumentRange(source),
              newText: formatLumDocument(source, uri),
            },
          ];
        } catch {
          result = [];
        }
      }
      reply(message.id, result);
      return;
    }

    if (method === "textDocument/completion") {
      const { uri, source } = sourceFor(message);
      if (!uri || typeof source !== "string") {
        reply(message.id, []);
        return;
      }
      const workspaceItems = workspace.completionItems(uri, source, message.params?.position);
      reply(
        message.id,
        workspaceItems.length > 0
          ? workspaceItems
          : lumCompletions(source, message.params?.position),
      );
      return;
    }

    if (method === "textDocument/hover") {
      const { uri, source } = sourceFor(message);
      reply(
        message.id,
        uri && typeof source === "string"
          ? workspace.resolvedHover(uri, source, message.params?.position) ??
              lumHover(source, message.params?.position)
          : null,
      );
      return;
    }

    if (method === "textDocument/documentSymbol") {
      const { source } = sourceFor(message);
      reply(message.id, typeof source === "string" ? lumDocumentSymbols(source) : []);
      return;
    }

    if (method === "textDocument/definition") {
      const { uri, source } = sourceFor(message);
      reply(
        message.id,
        uri && typeof source === "string"
          ? workspace.definition(uri, source, message.params?.position) ??
              lumDefinition(source, message.params?.position, uri)
          : null,
      );
      return;
    }

    if (method === "textDocument/references") {
      const { uri, source } = sourceFor(message);
      if (!uri || typeof source !== "string") {
        reply(message.id, []);
        return;
      }
      const workspaceLocations = workspace.referenceLocations(
        uri,
        source,
        message.params?.position,
        message.params?.context?.includeDeclaration !== false,
      );
      reply(
        message.id,
        workspaceLocations.length > 0
          ? workspaceLocations
          : lumReferences(
              source,
              message.params?.position,
              uri,
              message.params?.context?.includeDeclaration !== false,
            ),
      );
      return;
    }

    if (method === "workspace/symbol") {
      reply(message.id, workspace.workspaceSymbols(message.params?.query ?? ""));
      return;
    }

    if (method === "textDocument/prepareRename") {
      const { uri, source } = sourceFor(message);
      reply(
        message.id,
        uri && typeof source === "string"
          ? workspace.prepareRename(uri, source, message.params?.position)
          : null,
      );
      return;
    }

    if (method === "textDocument/rename") {
      const { uri, source } = sourceFor(message);
      reply(
        message.id,
        uri && typeof source === "string"
          ? workspace.rename(
              uri,
              source,
              message.params?.position,
              message.params?.newName,
            )
          : null,
      );
      return;
    }

    if (method === "textDocument/semanticTokens/full") {
      const { source } = sourceFor(message);
      reply(message.id, typeof source === "string" ? lumSemanticTokens(source) : { data: [] });
    }
  }

  return Object.freeze({ handle });
}

function frame(message) {
  const json = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
}

export function runLumLanguageServer() {
  const server = createLumLanguageServer((message) => {
    process.stdout.write(frame(message));
  });
  let buffer = Buffer.alloc(0);

  process.stdin.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) break;
      const header = buffer.subarray(0, headerEnd).toString("ascii");
      const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
      if (!lengthMatch) {
        buffer = buffer.subarray(headerEnd + 4);
        continue;
      }
      const length = Number(lengthMatch[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) break;

      const body = buffer.subarray(bodyStart, bodyStart + length).toString("utf8");
      buffer = buffer.subarray(bodyStart + length);
      try {
        server.handle(JSON.parse(body));
      } catch {
        // Malformed protocol messages are ignored; document JSON errors are diagnostics.
      }
    }
  });
}
