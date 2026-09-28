# Three Little Pigs — pilot migration

Status: **pilot**

This directory is the first classic-tales migration through the canonical Lūm interchange boundary.

Generate the strict fixture with:

```sh
pnpm compile:example-story story-three-little-pigs --modules examples/classic-tales/three-little-pigs
```

`entities.module.lum.json`, `relationships.module.lum.json`, `occurrences.module.lum.json`, `places.module.lum.json`, `sources.module.lum.json`, `categories.module.lum.json`, `stories.module.lum.json`, and assembled `project.lum.json` are generated during the compatibility pilot. Each module owns exactly one canonical collection and carries an explicit module schema/version. `project.lum.json` is always assembled and validated through the production Lūm interchange boundary. Until semantic parity is certified and the bounded modular source replaces the legacy sample records, the final assembled `TimelineSampleCase` remains the migration input.

The compiler must preserve canonical IDs, explicit story occurrence order, source/place references, and validation through the same `.lum.json` contract used by user projects.
