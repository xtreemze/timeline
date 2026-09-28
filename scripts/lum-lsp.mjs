import process from "node:process";

import {
  formatProjectInterchange,
  lintProjectInterchange,
} from "../src/application/project-interchange.ts";

function diagnosticRange() {
  return {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 1 },
  };
}

function lspDiagnostics(source) {
  const result = lintProjectInterchange(source);
  return result.diagnostics.map((diagnostic) => ({
    range: diagnosticRange(),
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
      writeMessage({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          capabilities: {
            textDocumentSync: 1,
            documentFormattingProvider: true,
          },
          serverInfo: {
            name: "lum",
            version: "1",
          },
        },
      });
      return;
    }

    if (method === "shutdown") {
      writeMessage({ jsonrpc: "2.0", id: message.id, result: null });
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
      const uri = message.params?.textDocument?.uri;
      const source = documents.get(uri);
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
      writeMessage({ jsonrpc: "2.0", id: message.id, result });
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
