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
- deterministic document formatting.

VS Code and Helix integrations should consume this server rather than reimplement Lūm validation.

## CI

Focused contract:

```sh
pnpm test:lum-tooling
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
