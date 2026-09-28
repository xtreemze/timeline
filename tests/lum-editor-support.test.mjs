import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("VS Code extension associates .lum.json with the canonical schema and CLI commands", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../editors/vscode-lum/package.json", import.meta.url), "utf8"),
  );

  assert.equal(manifest.name, "lum-language-tools");
  assert.ok(
    manifest.contributes.jsonValidation.some((entry) =>
      entry.fileMatch.includes("*.lum.json"),
    ),
  );
  assert.ok(
    manifest.contributes.jsonValidation.some(
      (entry) =>
        entry.url ===
        "https://xtreemze.github.io/timeline/schemas/lum-project-v1.schema.json",
    ),
  );

  assert.ok(
    manifest.contributes.jsonValidation.some(
      (entry) =>
        entry.fileMatch.includes("*.lum-proposal.json") &&
        entry.url ===
          "https://xtreemze.github.io/timeline/schemas/lum-change-proposal-v1.schema.json",
    ),
  );

  const commands = new Set(manifest.contributes.commands.map((command) => command.command));
  for (const command of ["lum.checkCurrentFile", "lum.lintCurrentFile", "lum.initProject"]) {
    assert.ok(commands.has(command), `Missing VS Code command ${command}`);
  }

  assert.ok(manifest.contributes.configuration.properties["lum.cliPath"]);
});

test("VS Code integration delegates diagnostics and formatting to the lum CLI", async () => {
  const source = await readFile(
    new URL("../editors/vscode-lum/extension.cjs", import.meta.url),
    "utf8",
  );

  assert.match(source, /lint/);
  assert.match(source, /fmt/);
  assert.match(source, /--json/);
  assert.match(source, /registerDocumentFormattingEditProvider/);
  assert.match(source, /createDiagnosticCollection/);\n  assert.match(source, /finding\\?\\.range|finding\\.range/);
  assert.doesNotMatch(source, /validateProjectInterchange|formatProjectInterchange/);
  for (const collection of ["places", "sources", "categories", "stories"]) {
    assert.match(source, new RegExp(`"${collection}"`));
  }
  for (const reference of ["categoryId", "storyId"]) {
    assert.match(source, new RegExp(`"${reference}"`));
  }
});

test("VS Code snippets scaffold strict current-format records", async () => {
  const snippets = JSON.parse(
    await readFile(
      new URL("../editors/vscode-lum/snippets/lum.code-snippets", import.meta.url),
      "utf8",
    ),
  );

  assert.equal(snippets["Lūm project"].prefix, "lum-project");
  assert.ok(snippets["Lūm project"].body.some((line) => line.includes('"format": "lum-project"')));
  assert.ok(
    snippets["Lūm project"].body.some((line) =>
      line.includes("lum-project-v1.schema.json"),
    ),
  );
  assert.equal(snippets["Lūm entity"].prefix, "lum-entity");
  assert.equal(snippets["Lūm relationship"].prefix, "lum-relationship");
  assert.equal(snippets["Lūm occurrence"].prefix, "lum-occurrence");
  assert.equal(snippets["Lūm project module"].prefix, "lum-module");
  assert.ok(
    snippets["Lūm project module"].body.some((line) =>
      line.includes('"format": "lum-project-module"'),
    ),
  );
  assert.equal(snippets["Lūm change proposal"].prefix, "lum-proposal");
  assert.ok(
    snippets["Lūm change proposal"].body.some((line) =>
      line.includes('"verificationRequired": true'),
    ),
  );
});

test("Helix integration uses JSON grammar with lum LSP and formatter", async () => {
  const source = await readFile(
    new URL("../editors/helix/languages.toml", import.meta.url),
    "utf8",
  );

  assert.match(source, /name\s*=\s*"lum"/);
  assert.match(source, /glob\s*=\s*"\*\.lum\.json"/);
  assert.match(source, /grammar\s*=\s*"json"/);
  assert.match(source, /command\s*=\s*"lum"/);
  assert.match(source, /args\s*=\s*\["lsp"\]/);
  assert.match(source, /args\s*=\s*\["fmt",\s*"-"\]/);
  assert.match(source, /auto-format\s*=\s*false/);
});

test("editor documentation keeps the CLI/LSP authoritative", async () => {
  const source = await readFile(new URL("../editors/README.md", import.meta.url), "utf8");
  assert.match(source, /CLI.*authoritative/i);
  assert.match(source, /JSON grammar/i);
  assert.match(source, /lum lsp/);
  assert.match(source, /lum fmt -/);
});
