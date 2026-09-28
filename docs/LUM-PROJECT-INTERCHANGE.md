# Lūm Project Interchange

Tracking: #925, #931  
Related: #720, #518, #7, #522, #927

Lūm Project Interchange is the strict portable serialization boundary for canonical projects. It is distinct from browser persistence implementation details, renderer state, external import adapters, and AI proposal/review envelopes.

## Identity

- Human name: **Lūm Project Interchange**
- Format token: `lum-project`
- Interchange version: `1`
- Canonical project schema version: currently `3`
- File suffix: `.lum.json`
- Media type: `application/vnd.lum.project+json`
- JSON Schema: `schemas/lum-project-v1.schema.json`

Interchange and canonical schema versions are independent. A future canonical model revision does not automatically require a new wire-format version, and a wire-format revision does not silently redefine canonical domain meaning.

## Self-description

New files include `$schema`:

```json
{
  "$schema": "https://xtreemze.github.io/timeline/schemas/lum-project-v1.schema.json",
  "format": "lum-project",
  "interchangeVersion": 1,
  "schemaVersion": 3,
  "projectKey": "example",
  "revision": 1,
  "savedAt": "2026-09-28T08:00:00.000Z",
  "project": {
    "schemaVersion": 3,
    "entities": [],
    "relationships": []
  }
}
```

The schema gives editors and agents structural validation. The executable validator remains authoritative for reference resolution and semantic invariants that JSON Schema cannot express reliably.

## Authority boundary

```
external adapter / AI proposal / example fixture
                    ↓
         Lūm Project Interchange
                    ↓
       strict structural validation
                    ↓
        canonical semantic validation
                    ↓
             CanonicalProject
                    ↓
       projections / runtime / layout
```

Renderer and interaction state is never canonical interchange data. This includes camera position, GPU objects, force coordinates, temporary altitude, clustering state, pointer/gesture state, hover, and selection.

## Strict records

Closed records reject unknown properties. This includes the envelope, canonical project root, entities, relationships, occurrences, trajectories, actor participation context, semantic mappings, trajectory manifests, and temporal-extent envelopes.

`attributes` is intentionally extensible. Extensibility must be explicit; an agent cannot invent a plausible top-level field and have it silently preserved.

Validation returns stable diagnostics with JSON Pointer paths. Validation never repairs input.

## Formatting

`lum fmt` is the canonical formatter.

Rules:
- JSON encoding;
- two-space indentation;
- LF final newline;
- deterministic object-key ordering;
- array order preserved;
- no semantic repair.

`lum fmt --check` is appropriate for CI.

## Linting

`lum check` validates syntax, format/version identity, strict shape, canonical references, and domain invariants.

`lum lint` additionally enforces developer hygiene such as canonical `.lum.json` naming and canonical formatting.

Machine-readable diagnostics are available with `--json`.

## Compatibility

Historical persistence snapshots remain supported by the persistence migration path. Portable interchange is deliberately stricter.

Legacy `.luum` handling is tracked by #930. New format work must use `lum`, never introduce additional `luum` identifiers.

`timeline.interchange` is an external/legacy adapter format. `lum-story-proposal-v1` remains a proposal/review envelope. Both should converge on the same canonical Lūm project representation rather than remain peer project schemas.

## Current model scope

The current canonical project owns entities, relationships, occurrences, and trajectory manifests. #720 expands canonical ownership for stories, reusable places, evidence/provenance, custody, analysis, and other authoritative records.

The interchange schema must evolve with that canonical ownership. It must not independently invent those records first.
