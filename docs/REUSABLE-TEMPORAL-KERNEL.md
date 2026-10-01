# Reusable temporal kernel

Status: contract extraction for #1106.

## Purpose

Lūm's retained chronology contains deterministic temporal mechanics that are useful outside the Lūm ontology. This extraction defines the smallest framework- and domain-neutral boundary that can be reused by another project without importing entities, occurrences, relationships, places, evidence, stories, renderer state, or Lūm interaction semantics.

The first intended external consumer is Slipmat. Slipmat may project releases, editions, provider observations, acquisitions, or other facts with genuine temporal evidence into this contract, while retaining its own media identity, provenance, ambiguity, availability, playback, and presentation semantics.

## Dependency boundary

```text
canonical project domain
        |
        v
project temporal projection
        |
        v
@xtreemze/temporal-kernel
  TemporalWindow
  TemporalItem
  inclusive overlap
  predictive render windows
  retained interaction windows
  deterministic querying
  stable namespaced scene keys
        |
        v
project presenter / renderer
```

The kernel must not import Lit, React, DOM APIs, storage, renderers, Lūm domain/application/projection modules, or Slipmat code.

## Contract

The kernel owns only:

- `TemporalWindow { start, end }`;
- `TemporalItem { id, start, end? }`;
- deterministic window normalization/span/union;
- inclusive point/range intersection;
- a visible anchor for an intersecting interval;
- predictive overscan based on explicit pan/zoom velocity inputs;
- begin/extend/commit retained-window state;
- deterministic query ordering by temporal start then stable ID;
- namespaced stable scene keys.

A caller may carry additional fields on a temporal item. The kernel must preserve object identity/content and never mutate caller records.

## Temporal evidence rule

The axis represents known temporal evidence. An item with no finite temporal start does not enter the retained temporal scene. A project projection must keep unknown/ambiguous dates explicit in its own domain rather than inventing epoch zero, current time, or another sentinel.

Open-ended future intervals require an explicit project policy before entering the kernel. The initial contract preserves the existing Lūm point-or-finite-range behavior.

Presentation calendars, timezone formatting, BCE/proleptic handling, semantic zoom levels, labels, geometry, selection state, and accessibility narration remain outside this kernel.

## Lūm compatibility

`src/projection/temporal-scene.ts` remains the Lūm compatibility facade. Lūm-specific names such as `TemporalOccurrence`, `queryOccurrences`, `occurrenceSceneKey`, `relationshipBandSceneKey`, tick identities, and temporal accent identities stay in that facade and delegate only generic mechanics to the kernel.

Existing Lūm consumers therefore do not need to adopt project-neutral vocabulary in one migration.

## Slipmat boundary

A future Slipmat adapter should map canonical media facts into temporal items only where a meaningful date exists:

- release / edition date -> point or evidence-backed interval;
- remaster / reissue -> additional temporal item;
- provider observation -> provenance observation when timestamped;
- acquisition/import -> optional factual event;
- availability -> interval only when actual begin/end evidence exists.

Concept/work identity remains context, not a forced event. Playback availability is status unless it has real temporal interval evidence. Playback history is a separate projection. The Playback Rail remains the sole playback-time/scalar authority.

The accepted Atlas-removal decision remains authoritative: this kernel must not reintroduce Atlas world/camera/basin state, semantic-depth state, bespoke playback inspection, or route ownership.

## Distribution

This repository hosts the initial package-shaped source at `packages/temporal-kernel`. Publication/registry ownership is deliberately separate from the semantic extraction. Consumers must not import Lūm application or presentation files as a substitute for a stable package boundary.

## First acceptance tests

The first extraction is complete when tests prove:

1. inclusive point/range overlap;
2. predictive but bounded overscan;
3. bounded retained-window accumulation and commit;
4. deterministic ordering without source mutation;
5. non-finite/unknown temporal items are not fabricated into the scene;
6. stable namespaced scene identity;
7. the existing Lūm temporal-scene contract remains behaviorally compatible.
