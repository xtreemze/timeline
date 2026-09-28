# Lūm Project Interchange

Tracking issue: #925  
Related architecture: #720, #518, #7, #522

Lūm Project Interchange is the portable serialization boundary for canonical projects. It is distinct from renderer state, browser persistence implementation details, external import adapters, and AI proposal/review envelopes.

## Current foundation

The current foundation deliberately builds on the existing persisted project envelope:

```json
{
  "format": "lum-project",
  "interchangeVersion": 1,
  "schemaVersion": 3,
  "projectKey": "example",
  "revision": 1,
  "savedAt": "2026-09-28T07:30:00.000Z",
  "project": {
    "schemaVersion": 3,
    "entities": [],
    "relationships": []
  }
}
```

`interchangeVersion` versions the portable wire contract. `schemaVersion` versions the canonical project model. They are intentionally independent.

The conventional JSON extension is `.lum.json`. The media type used by the application contract is `application/vnd.lum.project+json`.

## Authority boundaries

```
external source / legacy adapter / AI proposal / example fixture
                              |
                              v
                    Lūm Project Interchange
                              |
               structural + strict validation
                              |
               semantic/invariant validation
                              |
                              v
                       CanonicalProject
                              |
                 projections / layout / views
```

Canonical interchange must never persist derived renderer or interaction state such as:
- deck.gl/luma.gl objects or GPU resources;
- DOM references;
- force-simulation positions;
- temporary node altitude;
- camera state unless a future explicit view record owns it;
- clustering/decluttering state;
- pointer/gesture state;
- hover/focus/selection state.

## Strictness

The interchange validator is intentionally stricter than the historical persistence reader.

At the envelope and canonical project root:
- unknown fields are rejected;
- unsupported format/interchange versions are rejected;
- diagnostics use stable codes and JSON Pointer paths;
- validation does not repair or mutate the input.

Historical browser snapshots can continue to use the persistence migration path. A document claiming to be portable interchange must opt into the explicit interchange version.

Nested record schemas and explicit extension namespaces remain follow-up work in #925. Until those land, the domain validators remain authoritative for entity/relationship/occurrence/trajectory semantics.

## Deterministic serialization

`serializeProjectInterchange` recursively sorts object keys while preserving array order. Equivalent canonical state therefore produces stable text independent of object insertion order.

Stable serialization is required for:
- AI-agent patches;
- fixture review;
- content hashing/fingerprinting;
- reproducible tests;
- meaningful diffs;
- import/export round-trip verification.

Semantic arrays are not sorted automatically because their order may be meaningful. Canonical ordering policies, where required, must be defined by the domain rather than guessed by the serializer.

## Compatibility direction

Three project-shaped paths currently coexist and must converge under #925:

- `lum-project`: canonical persistence foundation;
- `timeline.interchange`: legacy/external Timeline-shaped adapter;
- `lum-story-proposal-v1`: AI proposal/review envelope with a legacy v2 project payload.

The target is one canonical project/story contract. External adapters convert into it. Proposal envelopes wrap it. Example data validates through it.

## Next implementation slices

1. Extend canonical ownership per #720 so stories, reusable places, evidence/provenance and other authoritative records no longer require a parallel project shape.
2. Publish JSON Schema 2020-12 documents generated from or mechanically checked against the TypeScript/domain contract.
3. Add nested strict-property and explicit extension-namespace rules.
4. Add semantic diagnostics with stable codes, record IDs and JSON Pointer paths.
5. Add valid/invalid conformance fixtures.
6. Migrate the nine examples through #926.
7. Make MCP authoring target the same contract through #927.
8. Deprecate `timeline.interchange` as a canonical-looking format once external adapters emit Lūm interchange.
