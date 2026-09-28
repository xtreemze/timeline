const { spawn } = require("node:child_process");
const process = require("node:process");
const vscode = require("vscode");

const SEMANTIC_TOKEN_TYPES = ["keyword", "property", "variable", "type"];
const SEMANTIC_TOKEN_MODIFIERS = ["declaration", "readonly"];

function toProtocolPosition(position) {
  return { line: position.line, character: position.character };
}

function toProtocolRange(range) {
  return { start: toProtocolPosition(range.start), end: toProtocolPosition(range.end) };
}

function fromPosition(position) {
  return new vscode.Position(position.line, position.character);
}

function fromRange(range) {
  return new vscode.Range(fromPosition(range.start), fromPosition(range.end));
}

function fromLocation(location) {
  if (!location?.uri || !location.range) return undefined;
  return new vscode.Location(vscode.Uri.parse(location.uri), fromRange(location.range));
}

function completionKind(kind) {
  return typeof kind === "number" ? Math.max(0, kind - 1) : vscode.CompletionItemKind.Text;
}

function symbolKind(kind) {
  return typeof kind === "number" ? Math.max(0, kind - 1) : vscode.SymbolKind.Object;
}

function fromDocumentSymbol(symbol) {
  const result = new vscode.DocumentSymbol(
    symbol.name,
    symbol.detail ?? "",
    symbolKind(symbol.kind),
    fromRange(symbol.range),
    fromRange(symbol.selectionRange),
  );
  result.children = (symbol.children ?? []).map(fromDocumentSymbol);
  return result;
}

function fromWorkspaceEdit(value) {
  if (!value?.changes) return undefined;
  const edit = new vscode.WorkspaceEdit();
  for (const [uri, changes] of Object.entries(value.changes)) {
    for (const change of changes ?? []) {
      edit.replace(vscode.Uri.parse(uri), fromRange(change.range), change.newText);
    }
  }
  return edit;
}

class LumLspTransport {
  constructor(invocation) {
    this.invocation = invocation;
    this.process = null;
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
  }

  async start() {
    const { command, prefix = [], cwd } = this.invocation();
    this.process = spawn(command, [...prefix, "lsp"], {
      cwd,
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.process.stdout.on("data", (chunk) => this.onData(chunk));
    this.process.stderr.on("data", () => {
      // The CLI diagnostics provider remains the user-facing error surface.
    });
    this.process.on("error", (error) => {
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
      this.process = null;
    });
    this.process.on("exit", () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error("The Lūm language server exited."));
      }
      this.pending.clear();
      this.process = null;
    });

    const workspaceFolders = (vscode.workspace.workspaceFolders ?? []).map((folder) => ({
      uri: folder.uri.toString(),
      name: folder.name,
    }));
    await this.request("initialize", {
      processId: process.pid,
      clientInfo: { name: "lum-language-tools", version: "0.1.0" },
      rootUri: workspaceFolders[0]?.uri ?? null,
      workspaceFolders,
      capabilities: {},
    });
    this.notify("initialized", {});
  }

  stop() {
    if (!this.process) return;
    try {
      this.notify("exit", {});
      this.process.kill();
    } catch {
      // Best-effort extension shutdown.
    }
    this.process = null;
  }

  frame(message) {
    const json = JSON.stringify(message);
    return `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
  }

  write(message) {
    if (!this.process?.stdin?.writable) throw new Error("Lūm language server is not running.");
    this.process.stdin.write(this.frame(message));
  }

  request(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.write({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  notify(method, params) {
    if (!this.process?.stdin?.writable) return;
    this.write({ jsonrpc: "2.0", method, params });
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = this.buffer.subarray(0, headerEnd).toString("ascii");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        this.buffer = this.buffer.subarray(headerEnd + 4);
        continue;
      }
      const length = Number(match[1]);
      const start = headerEnd + 4;
      if (this.buffer.length < start + length) return;
      const body = this.buffer.subarray(start, start + length).toString("utf8");
      this.buffer = this.buffer.subarray(start + length);
      let message;
      try {
        message = JSON.parse(body);
      } catch {
        continue;
      }
      if (message.id == null) continue;
      const pending = this.pending.get(message.id);
      if (!pending) continue;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message ?? "LSP request failed."));
      else pending.resolve(message.result);
    }
  }
}

function textDocumentParams(document) {
  return { uri: document.uri.toString() };
}

function registerProviders(context, transport, selector) {
  const subscriptions = [];

  subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      {
        async provideCompletionItems(document, position) {
          const result = await transport.request("textDocument/completion", {
            textDocument: textDocumentParams(document),
            position: toProtocolPosition(position),
          });
          return (result ?? []).map((item) => {
            const completion = new vscode.CompletionItem(item.label, completionKind(item.kind));
            completion.detail = item.detail;
            completion.insertText = item.insertText ?? item.label;
            completion.sortText = item.sortText;
            return completion;
          });
        },
      },
      '"',
      ":",
    ),
  );

  subscriptions.push(
    vscode.languages.registerHoverProvider(selector, {
      async provideHover(document, position) {
        const result = await transport.request("textDocument/hover", {
          textDocument: textDocumentParams(document),
          position: toProtocolPosition(position),
        });
        if (!result?.contents) return undefined;
        const value =
          typeof result.contents === "string"
            ? result.contents
            : (result.contents.value ?? String(result.contents));
        return new vscode.Hover(new vscode.MarkdownString(value));
      },
    }),
  );

  subscriptions.push(
    vscode.languages.registerDefinitionProvider(selector, {
      async provideDefinition(document, position) {
        const result = await transport.request("textDocument/definition", {
          textDocument: textDocumentParams(document),
          position: toProtocolPosition(position),
        });
        if (Array.isArray(result)) return result.map(fromLocation).filter(Boolean);
        return fromLocation(result);
      },
    }),
  );

  subscriptions.push(
    vscode.languages.registerReferenceProvider(selector, {
      async provideReferences(document, position, referenceContext) {
        const result = await transport.request("textDocument/references", {
          textDocument: textDocumentParams(document),
          position: toProtocolPosition(position),
          context: { includeDeclaration: referenceContext.includeDeclaration },
        });
        return (result ?? []).map(fromLocation).filter(Boolean);
      },
    }),
  );

  subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(selector, {
      async provideDocumentSymbols(document) {
        const result = await transport.request("textDocument/documentSymbol", {
          textDocument: textDocumentParams(document),
        });
        return (result ?? []).map(fromDocumentSymbol);
      },
    }),
  );

  subscriptions.push(
    vscode.languages.registerWorkspaceSymbolProvider({
      async provideWorkspaceSymbols(query) {
        const result = await transport.request("workspace/symbol", { query });
        return (result ?? [])
          .map((symbol) => {
            const location = fromLocation(symbol.location);
            if (!location) return null;
            return new vscode.SymbolInformation(
              symbol.name,
              symbolKind(symbol.kind),
              symbol.containerName ?? "",
              location,
            );
          })
          .filter(Boolean);
      },
    }),
  );

  subscriptions.push(
    vscode.languages.registerRenameProvider(selector, {
      async prepareRename(document, position) {
        const result = await transport.request("textDocument/prepareRename", {
          textDocument: textDocumentParams(document),
          position: toProtocolPosition(position),
        });
        if (!result?.range) return undefined;
        return {
          range: fromRange(result.range),
          placeholder: result.placeholder,
        };
      },
      async provideRenameEdits(document, position, newName) {
        const result = await transport.request("textDocument/rename", {
          textDocument: textDocumentParams(document),
          position: toProtocolPosition(position),
          newName,
        });
        return fromWorkspaceEdit(result);
      },
    }),
  );

  const legend = new vscode.SemanticTokensLegend(SEMANTIC_TOKEN_TYPES, SEMANTIC_TOKEN_MODIFIERS);
  subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      selector,
      {
        async provideDocumentSemanticTokens(document) {
          const result = await transport.request("textDocument/semanticTokens/full", {
            textDocument: textDocumentParams(document),
          });
          return new vscode.SemanticTokens(Uint32Array.from(result?.data ?? []));
        },
      },
      legend,
    ),
  );

  context.subscriptions.push(...subscriptions);
}

function notifyOpen(transport, document) {
  transport.notify("textDocument/didOpen", {
    textDocument: {
      uri: document.uri.toString(),
      languageId: document.languageId,
      version: document.version,
      text: document.getText(),
    },
  });
}

function createLumLspClient(context, options) {
  const transport = new LumLspTransport(options.invocation);

  async function start() {
    await transport.start();
    registerProviders(context, transport, options.selector);

    for (const document of vscode.workspace.textDocuments) {
      if (options.isLumDocument(document)) notifyOpen(transport, document);
    }

    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        if (options.isLumDocument(document)) notifyOpen(transport, document);
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (!options.isLumDocument(event.document)) return;
        transport.notify("textDocument/didChange", {
          textDocument: {
            uri: event.document.uri.toString(),
            version: event.document.version,
          },
          contentChanges: [{ text: event.document.getText() }],
        });
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (!options.isLumDocument(document)) return;
        transport.notify("textDocument/didSave", {
          textDocument: textDocumentParams(document),
        });
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        if (!options.isLumDocument(document)) return;
        transport.notify("textDocument/didClose", {
          textDocument: textDocumentParams(document),
        });
      }),
    );

    const watcher = vscode.workspace.createFileSystemWatcher("**/*.lum.json");
    const watched = (uri, type) =>
      transport.notify("workspace/didChangeWatchedFiles", {
        changes: [{ uri: uri.toString(), type }],
      });
    context.subscriptions.push(
      watcher,
      watcher.onDidCreate((uri) => watched(uri, 1)),
      watcher.onDidChange((uri) => watched(uri, 2)),
      watcher.onDidDelete((uri) => watched(uri, 3)),
    );
  }

  return {
    start,
    stop() {
      transport.stop();
    },
  };
}

module.exports = { createLumLspClient };
