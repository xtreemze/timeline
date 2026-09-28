# Three Little Pigs — pilot migration

Status: **pilot**

This directory is the first classic-tales migration through the canonical Lūm interchange boundary.

Generate the strict fixture with:

```sh
pnpm compile:example-story story-three-little-pigs --out examples/classic-tales/three-little-pigs/project.lum.json
```

`project.lum.json` is generated output during the pilot. Do not hand-edit it. Until semantic parity is certified and the bounded modular source replaces the legacy sample records, the final assembled `TimelineSampleCase` remains the migration input.

The compiler must preserve canonical IDs, explicit story occurrence order, source/place references, and validation through the same `.lum.json` contract used by user projects.
