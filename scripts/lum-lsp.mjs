import process from "node:process";

import {
  formatProjectInterchange,
  lintProjectInterchange,
} from "../src/application/project-interchange.ts";
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

function lspDiagnostics(source) {
  const result = lintProjectInterchange(source);
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

  function reply(id, result) {
    writeMessage({ jsonrpc: "2.0", id, result });
  }

  function sourceFor(message) {
    const uri = message.params?.textDocument?.uri;
    return uri ? { uri, source: documents.get(uri) } : { uri: null, source: undefined };
  }

  function publish(uri, source) {
    writeMessage({
      jsonrpc: "2.0",
      method: "textDocument/publishDiagnostics",
      params: {
        uri,
        diagnostics: lspDiagnostics(source),
      },
    });
  }

  function handle(message) {
    const method = message?.method;

    if (method === "initialize") {
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
      publish(document.uri, document.text);
      return;
    }

    if (method === "textDocument/didChange") {
      const uri = message.params?.textDocument?.uri;
      const text = message.params?.contentChanges?.at(-1)?.text;
      if (!uri || typeof text !== "string") return;
      documents.set(uri, text);
      publish(uri, text);
      return;
    }

    if (method === "textDocument/didSave") {
      const uri = message.params?.textDocument?.uri;
      const source = documents.get(uri);
      if (uri && typeof source === "string") publish(uri, source);
      return;
    }

    if (method === "textDocument/didClose") {
      const uri = message.params?.textDocument?.uri;
      if (!uri) return;
      documents.delete(uri);
      writeMessage({
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params: { uri, diagnostics: [] },
      });
      return;
    }

    if (method === "textDocument/formatting") {
      const { source } = sourceFor(message);
      let result = [];
      if (typeof source === "string") {
        try {
          result = [
            {
              range: fullDocumentRange(source),
              newText: formatProjectInterchange(source),
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
      const { source } = sourceFor(message);
      reply(
        message.id,
        typeof source === "string" ? lumCompletions(source, message.params?.position) : [],
      );
      return;
    }

    if (method === "textDocument/hover") {
      const { source } = sourceFor(message);
      reply(
        message.id,
        typeof source === "string" ? lumHover(source, message.params?.position) : null,
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
          ? lumDefinition(source, message.params?.position, uri)
          : null,
      );
      return;
    }

    if (method === "textDocument/references") {
      const { uri, source } = sourceFor(message);
      reply(
        message.id,
        uri && typeof source === "string"
          ? lumReferences(
              source,
              message.params?.position,
              uri,
              message.params?.context?.includeDeclaration !== false,
            )
          : [],
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
