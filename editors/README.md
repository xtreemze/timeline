# Lūm editor support

Tracking: #932  
Requires the `lum` toolchain from #931 / #933.

The **CLI and executable validator are authoritative**. Editor integrations only adapt those tools to editor protocols and presentation.

Lūm Project Interchange v1 remains JSON. Both integrations intentionally use a **JSON grammar** rather than inventing a second parser.

## VS Code

`editors/vscode-lum` contains a dependency-free extension.

It provides:
- schema association for `*.lum.json`, `*.module.lum.json`, and strict `*.lum-proposal.json` agent proposals;
- the built-in JSON syntax grammar plus Lūm-specific semantic key highlighting;
- strict diagnostics delegated to `lum check/lint`;
- document formatting delegated to `lum fmt -`;
- project/module/entity/relationship/occurrence/proposal snippets;
- commands for check, lint, and project initialization.

The extension first looks for `scripts/lum.mjs` in the current Lūm repository. Otherwise it runs the configured `lum.cliPath`, which defaults to `lum`.

The extension does not implement a second validator.

## Helix

Merge `editors/helix/languages.toml` into your Helix language configuration.

It registers `*.lum.json` as a Lūm file type—including `*.module.lum.json`—while using Helix's JSON tree-sitter grammar:

```toml
grammar = "json"
```

Diagnostics and language intelligence come from:

```sh
lum lsp
```

The LSP supplies strict diagnostics, semantic tokens, canonical-ID completion, field/reference hover, document symbols, go-to-definition, and find-references. Helix continues to use the JSON tree-sitter grammar for syntax; the semantic layer only adds Lūm meaning.

Formatting comes from:

```sh
lum fmt -
```

Auto-format is disabled in the supplied configuration so adoption is explicit. Set `auto-format = true` locally if desired.

## Why no custom tree-sitter grammar?

A custom grammar would imply Lūm has syntax that differs from JSON. Version 1 does not. The strictness belongs to JSON Schema plus the executable Lūm semantic validator.

If a future Lūm version introduces a real textual DSL, its grammar should be versioned as a different encoding rather than retroactively changing what `.lum.json` means.

## Agent proposals

VS Code associates `*.lum-proposal.json` with the proposal schema and includes a `lum-proposal` snippet. Proposal validation itself remains a CLI operation because it must compare the proposal with the exact source project revision. Helix should edit proposal documents as ordinary JSON and run `lum agent validate-proposal ... --project ...` from a shell/task until project-aware multi-document LSP support is introduced.


## Project modules

Project modules use the same JSON grammar, `lum lsp`, and `lum fmt -` path as complete projects. VS Code associates `*.module.lum.json` with the strict module schema and excludes those files from the complete-project schema association. Use `lum check-modules` when cross-module reference validation is required.
