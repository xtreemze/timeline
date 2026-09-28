# Classic tales example corpus

Tracking issue: #926  
Interchange contract: #925

This directory is the migration boundary for Lūm's nine built-in example stories.

The current source of truth is still split across:
- `site/sample-case.ts`;
- `site/sample-case-additions.ts`.

`manifest.json` makes that legacy arrangement explicit and assigns each story a stable target directory for migration to modular Lūm fixtures.

## Rules

1. Story IDs are canonical and must not change during modularization.
2. A story moves through `legacy-source → pilot → modular → canonical`.
3. New story-specific data should be placed in the story's target directory once that story enters `pilot`.
4. Generated combined fixtures must never become the hand-edited source of truth.
5. Shared records must be declared deliberately under a future `shared/` module rather than copied between stories.
6. Every modular story will ultimately validate independently and as part of the complete project.
7. Runtime sample loading must eventually use the same Lūm import/validation path as user projects.

## Intended per-story structure

```
<story>/
  story.json
  entities.json
  places.json
  occurrences.json
  relationships.json
  evidence.json
```

The exact collection split may evolve with #925/#720, but modules should remain semantic editing units rather than arbitrary file-size shards.

## AI-agent maintenance

Agents should inspect `manifest.json` first, work only in the relevant story directory when possible, and avoid changing unrelated stories. Cross-story/shared records must be explicit.

The manifest test keeps this index synchronized with the currently shipped sample until the legacy TypeScript objects are fully removed.


## Pilot compiler

Three Little Pigs is the first `pilot` story. Its canonical fixture is compiled from the final assembled legacy sample through the production Lūm interchange boundary:

```sh
pnpm compile:example-story story-three-little-pigs --out examples/classic-tales/three-little-pigs/project.lum.json
```

The generated `project.lum.json` is not a hand-edited source. The pilot compiler preserves the story's explicit occurrence order, collects only reference-closed canonical records, and fails if the result does not pass strict Lūm validation. Once parity is proven and modular source files replace the legacy source, the manifest can advance this story from `pilot` to `modular` and later `canonical`.


### Collection modules

A modular story uses one `*.module.lum.json` file per canonical collection. Module envelopes are strict and versioned, while record semantics are referenced from the canonical Lūm project schema. Cross-record and cross-module semantics are validated only after assembly into a full project, preventing module/editor validators from becoming competing authorities.


## Complete corpus compiler

All nine shipped stories can now be compiled in one deterministic pass through the same production compiler, module envelopes, module assembler, and strict Lūm validator:

```sh
pnpm compile:example-corpus
```

The command reads `manifest.json` and writes each story only to its declared `targetDirectory`. It refuses to run when the manifest and shipped story IDs drift.

This remains a migration compiler: until the generated per-story modules become the hand-maintained source and runtime loading consumes them directly, `site/sample-case.ts` / `site/sample-case-additions.ts` remain compatibility inputs. CI nevertheless certifies all nine stories through the canonical boundary on every compiler test run.
