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
