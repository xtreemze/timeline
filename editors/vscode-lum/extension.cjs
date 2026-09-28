const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const vscode = require("vscode");
const { createLumLspClient } = require("./lsp-client.cjs");

const selector = { language: "json", pattern: "**/*.lum.json" };

function isLumDocument(document) {
  return document.languageId === "json" && document.fileName.endsWith(".lum.json");
}

function invocation() {
  const configured = vscode.workspace.getConfiguration("lum").get("cliPath", "lum");
  if (configured !== "lum") return { command: configured, prefix: [] };

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const local = path.join(folder.uri.fsPath, "scripts", "lum.mjs");
    if (existsSync(local)) return { command: process.execPath, prefix: [local] };
  }
  return { command: "lum", prefix: [] };
}

function runLum(args, input = "") {
  return new Promise((resolve, reject) => {
    const { command, prefix } = invocation();
    const child = spawn(command, [...prefix, ...args], {
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.end(input);
  });
}

function diagnosticRange(document, finding) {
  const range = finding?.range;
  if (range?.start && range?.end) {
    return new vscode.Range(
      range.start.line,
      range.start.character,
      range.end.line,
      range.end.character,
    );
  }
  if (document.lineCount === 0) return new vscode.Range(0, 0, 0, 0);
  return new vscode.Range(0, 0, 0, Math.min(1, document.lineAt(0).text.length));
}

function toDiagnostics(document, payload) {
  return (payload?.diagnostics ?? []).map((finding) => {
    const diagnostic = new vscode.Diagnostic(
      diagnosticRange(document, finding),
      (finding.path || "/") + ": " + finding.message,
      finding.severity === "warning"
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = "lum";
    diagnostic.code = finding.code;
    return diagnostic;
  });
}

async function lintDocument(document, collection, command = "lint") {
  if (!isLumDocument(document)) return true;
  const result = await runLum([command, "-", "--json"], document.getText());
  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    collection.set(document.uri, [
      new vscode.Diagnostic(
        diagnosticRange(document),
        result.stderr.trim() || "The Lūm CLI did not return machine-readable diagnostics.",
        vscode.DiagnosticSeverity.Error,
      ),
    ]);
    return false;
  }
  collection.set(document.uri, toDiagnostics(document, payload));
  return Boolean(payload.valid);
}

async function initializeProject() {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    vscode.window.showErrorMessage("Open a workspace folder before initializing a Lūm project.");
    return;
  }
  const folder =
    folders.length === 1
      ? folders[0]
      : await vscode.window.showWorkspaceFolderPick({
          placeHolder: "Choose the folder for project.lum.json",
        });
  if (!folder) return;

  const projectKey = await vscode.window.showInputBox({
    title: "Lūm project key",
    prompt: "Stable ASCII identifier for the new project",
    value: path.basename(folder.uri.fsPath)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  });
  if (!projectKey) return;

  const result = await runLum(["init", folder.uri.fsPath, "--project-key", projectKey]);
  if (result.code !== 0) {
    vscode.window.showErrorMessage(result.stderr.trim() || "Lūm project initialization failed.");
    return;
  }
  const filePath = result.stdout.trim();
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);
}

async function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection("lum");
  context.subscriptions.push(diagnostics);

  const refresh = (document) => {
    if (!vscode.workspace.getConfiguration("lum").get("validateOnChange", true)) return;
    void lintDocument(document, diagnostics);
  };

  for (const document of vscode.workspace.textDocuments) refresh(document);
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidSaveTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((event) => refresh(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(selector, {
      async provideDocumentFormattingEdits(document) {
        const result = await runLum(["fmt", "-"], document.getText());
        if (result.code !== 0) {
          vscode.window.showErrorMessage(result.stderr.trim() || "Lūm formatting failed.");
          return [];
        }
        const lastLine = Math.max(0, document.lineCount - 1);
        const end = new vscode.Position(lastLine, document.lineAt(lastLine).text.length);
        return [
          vscode.TextEdit.replace(
            new vscode.Range(new vscode.Position(0, 0), end),
            result.stdout,
          ),
        ];
      },
    }),
  );

  const lspClient = createLumLspClient(context, {
    selector,
    isLumDocument,
    invocation: () => ({
      ...invocation(),
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    }),
  });
  try {
    await lspClient.start();
    context.subscriptions.push({ dispose: () => lspClient.stop() });
  } catch (error) {
    vscode.window.showWarningMessage(
      `Lūm language intelligence is unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("lum.checkCurrentFile", async () => {
      const document = vscode.window.activeTextEditor?.document;
      if (!document || !isLumDocument(document)) return;
      const valid = await lintDocument(document, diagnostics, "check");
      vscode.window.showInformationMessage(
        valid ? "Lūm project is valid." : "Lūm project check failed.",
      );
    }),
    vscode.commands.registerCommand("lum.lintCurrentFile", async () => {
      const document = vscode.window.activeTextEditor?.document;
      if (!document || !isLumDocument(document)) return;
      const valid = await lintDocument(document, diagnostics, "lint");
      vscode.window.showInformationMessage(
        valid ? "Lūm project lint passed." : "Lūm project lint failed.",
      );
    }),
    vscode.commands.registerCommand("lum.initProject", initializeProject),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
