# Lūm developer tooling

Tracking: #931, #932

The `lum` command is the single developer-facing authority for Lūm project formatting, linting, validation, scaffolding, editor diagnostics, and bounded AI-agent context.

Run from the repository:

```sh
pnpm lum --help
```

The package also declares a `lum` binary for future installation/distribution.

## Commands

### Start a project

```sh
lum init my-project
lum init my-project --project-key investigation-2026
```

This creates `my-project/project.lum.json`, already self-described, canonically formatted, and strict-valid.

### Start modular sources

```sh
lum init-module entities.module.lum.json \
  --project-key investigation-2026 \
  --story-id story-main \
  --collection entities
```

Modules use `.module.lum.json`, remain ordinary JSON, and own exactly one canonical collection. `lum check`, `lum lint`, and `lum fmt` auto-detect project vs module documents from the format discriminator.

Validate a complete module set with:

```sh
lum check-modules *.module.lum.json --json
```

This assembles the modules through the ordinary canonical project validator. Cross-module reference failures are reported against the originating module path and JSON pointer where the owning record is identifiable.

### Validate

```sh
lum check project.lum.json
lum check project.lum.json --json
```

`check` verifies the portable envelope and canonical model. It fails closed.

### Lint

```sh
lum lint project.lum.json
lum lint project.lum.json --json
```

Lint includes validation plus canonical filename/formatting rules. It reports problems but does not repair them.

### Format

```sh
lum fmt project.lum.json
lum fmt --check project.lum.json
cat project.lum.json | lum fmt -
```

stdin/stdout support exists for editor integration.

### Composer

```sh
lum compose '"Alice Example" warns Bob on 2026-09-28T08:00:00Z' --json
```

This calls the same occurrence-sentence parser used by the application. It emits a proposal/draft; it does not bypass canonical validation or commit a guessed fact.

### Agent context

```sh
lum agent context project.lum.json --json
```

This emits a bounded canonical summary rather than dumping every project attribute into an agent context window. It includes stable IDs, entity names/types, relationship endpoints/actions, occurrence membership, schema identity, composer syntax, and the required format/lint workflow.

The current command deliberately stops before autonomous mutation. Full propose/apply/review workflows should preserve the application's verification boundary and are tracked separately through #927.

Agent mutation remains proposal-based rather than autonomous. Use the strict review workflow documented in [LUM-AGENT-PROPOSALS.md](LUM-AGENT-PROPOSALS.md):

```sh
lum agent scaffold-proposal --project project.lum.json --output change.lum-proposal.json
lum agent validate-proposal change.lum-proposal.json --project project.lum.json --json
lum agent apply change.lum-proposal.json --project project.lum.json --json
```

`apply` writes a separate candidate by default, revalidates it as an ordinary Lūm project, and preserves the application's explicit verification boundary.

### Bounded agent context

`lum agent context` can limit an agent's view without changing canonical semantics:

```sh
lum agent context project.lum.json --story story-id --json
lum agent context project.lum.json --occurrence occurrence-id --json
lum agent context project.lum.json --entity entity-id --depth 2 --json
lum agent context project.lum.json --ids entity-id,occurrence-id --json
```

The context contains selected records plus deterministic direct dependencies, a compact whole-project manifest, schema/proposal identifiers, and explicit unresolved references. Arbitrary `attributes` and full source notes are intentionally excluded from bounded context.

Entity neighborhood depth is limited to 0–3. One selector mode may be used at a time.

### Provider-neutral agent run

Core Lūm can invoke an explicitly selected stdin/stdout adapter without embedding a provider SDK:

```sh
lum agent run project.lum.json \
  --entity entity-id \
  --adapter /path/to/agent-adapter \
  --output change.lum-proposal.json \
  --json
```

The adapter receives one JSON context document on stdin and must emit exactly one `lum-change-proposal-v1` JSON document on stdout. Core Lūm treats stdout as untrusted input and runs the ordinary proposal validator before returning or writing it. `agent run` never applies the proposal and never replaces the source project. Candidate creation remains the separate `lum agent apply` step and still requires user verification before canonical replacement.

Core Lūm performs no implicit network access. Credentials belong to an explicitly invoked adapter's process environment or provider configuration; they are never copied into project, context, proposal, or candidate documents.

### Schema

```sh
lum schema
lum schema --json
```

This is the discovery mechanism editors and agents should use instead of hard-coding schema metadata independently.

### Language Server

```sh
lum lsp
```

The zero-dependency stdio LSP supports:
- full-document synchronization;
- strict diagnostics;
- deterministic document formatting;
- semantic tokens for Lūm envelope, collection, ID declaration, and reference roles;
- completion of compatible canonical IDs already declared in the document;
- hover documentation for canonical fields and resolved references;
- document symbols for canonical collections and records;
- go-to-definition from canonical references to their ID declarations;
- find-references for canonical IDs.

The language-intelligence layer is deliberately document-local and deterministic. It can keep highlighting and navigation useful while JSON is temporarily incomplete, but it never repairs semantics or invents IDs.

VS Code and Helix integrations should consume the shared schema/CLI/LSP contracts rather than reimplement Lūm validation.

## CI

Focused contract:

```sh
pnpm test:lum-tooling
pnpm test:lum-language-intelligence
pnpm test:lum-modules
```

The broader architecture suite also includes the tooling contract.

For project repositories containing Lūm files, a useful gate is:

```sh
lum lint project.lum.json
lum fmt --check project.lum.json
```

## Design rule

JSON Schema is structural. The executable validator owns semantic invariants. The formatter owns text normalization. Editors are adapters. AI agents are clients.

No editor, extension, or agent is allowed to weaken those layers.


## Editor integrations

VS Code and Helix adapters are documented in [../editors/README.md](../editors/README.md).

They consume the same CLI/schema/LSP contracts defined here. Editor-specific behavior must not redefine validation or formatting semantics.

### Workspace language intelligence

`lum lsp` maintains one compact canonical index for project/module files in configured workspace folders. VS Code and Helix consume the same server behavior.

For files sharing the same `projectKey`, the server provides:

- type-compatible canonical ID completion;
- compact reference hover;
- definition navigation across project modules;
- typed reference search across modules;
- document and workspace symbols using canonical IDs;
- canonical-ID rename preview that edits only declarations and typed references.

Workspace discovery ignores generated/dependency directories and `*.lum-proposal.json`. Open documents override their on-disk copy; watched-file changes refresh the compact index without reparsing unrelated files on every keystroke.

Canonical ID rename is not text replacement. The server rejects ambiguous declarations and validates the resulting complete project or assembled module workspace before returning edits. Matching text in notes, source metadata, provenance, or arbitrary attributes is not renamed.
