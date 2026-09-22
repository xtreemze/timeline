# Architecture boundaries: domain, projections, ingestion, interaction, and spatial layout

Status: architectural contract  
Parent: #244  
Related: #236, #243, #245–#251

## Purpose

Lūm is an evidence-to-structured-relational-knowledge system. Its canonical project model is the continuum. Temporal, topological, spatial, narrative, evidentiary, analytical, reporting, and future surfaces are synchronized projections over that shared continuum.

This document defines dependency direction and ownership boundaries so new features do not re-couple canonical knowledge to rendering, framework, provider, or layout implementation details. Product/domain terminology follows [LUM-TERMINOLOGY.md](LUM-TERMINOLOGY.md); legacy `Timeline*` identifiers remain compatibility names.

## Architectural laws

1. Canonical knowledge never depends on its visualization.
2. Visualization never independently invents canonical knowledge.
3. AI, OCR, importers, and external adapters propose data; deterministic Lūm validation governs canonical commit.
4. Canonical IDs are the only identities allowed to cross view boundaries.
5. Renderer/framework/provider-private state is never canonical domain meaning.
6. Derived layout, clustering, camera state, graph metrics, force positions, and label placement are disposable.
7. UI event handlers issue application commands rather than mutating canonical arrays directly.
8. Migration is explicit and loss-accounted; unresolved records survive for review.
9. Mobile/touch is the baseline capability model; larger screens progressively enhance composition.
10. Recurring failures become executable invariants or characterization fixtures.

## Required dependency direction

```text
External sources / adapters
        |
        v
Extraction / candidate claims
        |
        v
+--------------------------+
|     Canonical domain     |
+--------------------------+
        |
        v
+--------------------------+
| Application commands     |
| and shared view state    |
+--------------------------+
        |
        v
+--------------------------+
| Projection engines       |
+--------------------------+
        |
        v
+--------------------------+
| Layout + interaction     |
+--------------------------+
        |
        v
Renderer adapters / UI
```

Dependencies point inward. Lower layers must not import higher layers.

## 1. Canonical domain kernel

Target location: `src/domain/`.

The domain kernel owns stable meaning and executable invariants for:

- project/schema/version;
- entity;
- relationship/occurrence;
- temporal extent;
- place;
- evidence/source/provenance;
- candidate claim and accepted-fact linkage;
- story;
- category;
- validation/audit.

The domain kernel must run without DOM, CSS, renderer, framework, map, graph, or storage globals.

### Canonical versus derived

Canonical examples:

- entity identity and aliases;
- relationship subject/action/object;
- temporal precision/certainty/source wording;
- place identity and source-backed geometry;
- evidence/provenance;
- story membership/order;
- explicit author significance override.

Derived examples:

- timeline lanes;
- collision clusters;
- graph centrality;
- Graphology indexes;
- Sigma/Orb node IDs;
- force positions;
- geographic attraction vectors;
- Leaflet camera state;
- layout rectangles;
- semantic zoom thresholds;
- transient hover/drag state.

Derived state must be reproducible or disposable and must never be required to recover canonical meaning.

## 2. Application commands

Target location: `src/application/`.

Application code owns mutation workflows and transactions. UI surfaces do not mutate domain arrays directly.

Representative command API:

- `addEntity`;
- `recordOccurrence`;
- `mergeRelationshipFact`;
- `attachEvidence`;
- `resolvePlace`;
- `reviewCandidateClaim`;
- `addStoryOccurrence`.

A command:

1. validates input shape;
2. resolves references;
3. applies domain invariants;
4. commits atomically;
5. emits an explicit result/revision;
6. never performs presentation placement.

## 3. Evidence and claim ingestion

Adapters feed a common pipeline:

```text
SourceArtifact
  -> ExtractedFragment
  -> CandidateClaim
  -> Entity/Place Resolution
  -> ProposedFact
  -> Domain Validation
  -> ReviewDecision
  -> Canonical Commit
```

OCR, PDF text extraction, pasted text, importers, and LLM inference are adapters to this pipeline.

A candidate claim retains source locator/provenance, extraction method/provider/model where applicable, confidence, rationale, temporal/spatial assertions, reconciliation state, and review status.

Contradictory claims may coexist. The ingestion system must not collapse disagreement merely to produce one graph edge.

## 4. Shared application/view state

Target location: `src/application/` or a dedicated renderer-neutral state package.

Shared state may include:

- current project revision;
- canonical selection/focus ID;
- active story;
- temporal viewport;
- semantic zoom;
- graph neighborhood;
- spatial context;
- edit transaction;
- workspace/orientation state;
- transient interaction state.

Selection always references canonical IDs. Renderer IDs are local implementation details.

## 5. Projection engines

Target location: `src/projection/`.

Projection code is pure/deterministic where practical and does not mutate canonical input.

Expected projections:

- `TimelineProjection`;
- `GraphProjection`;
- `SpatialProjection`;
- `AccessibilityProjection`;
- analysis/proof projections where required.

Projection responsibilities may include significance filtering, timeline clustering, graph neighborhoods, spatial anchor derivation, accessibility summaries, and compatibility records for existing renderers.

Renderer-specific enums or objects must not leak back into projection inputs or canonical state.

## 6. Spatial layout is two systems

Lūm uses two related but separate spatial systems.

### Semantic geography

Owned by #236 and spatial projection/layout services.

Responsibilities:

- canonical `places[]`;
- GeoJSON/source-backed coordinates;
- map projection;
- `SpatialAnchorIndex`;
- relationship-to-place association;
- bounded geographic influence on graph layout;
- map/graph camera coordination.

Places remain anchors and records, not graph entity nodes.

### Workspace placement

Owned by #248 and coordinated with #243.

Responsibilities:

- timeline protected regions;
- year/tick/event readable areas;
- toolbar exclusion zones;
- top-layer/popover reachability;
- focused-detail placement;
- fullscreen/orientation/safe-area geometry;
- lane/label placement constraints.

Core geometry concepts:

- `LayoutViewport`;
- `ProtectedRegion`;
- `ExclusionZone`;
- `Anchor`;
- `PlacementCandidate`;
- `LayoutConstraint`;
- `LayoutSnapshot`.

CSS remains authoritative for ordinary intrinsic layout. Prefer Grid/Flexbox, logical properties, container queries, safe areas, and progressive `min-width` enhancement. JavaScript geometry exists only for semantic placement constraints CSS cannot infer.

## 7. Interaction ownership

Lūm owns gesture semantics across timeline, graph, and map.

Required state model:

```text
idle
 -> acquisition
 -> classification
 -> owned interaction
 -> settling
 -> committed state
```

Required vocabulary:

- tap/select;
- double-tap zoom;
- empty-space pan;
- pinch zoom/pan;
- long-press + drag direct manipulation;
- weighted/inertial release;
- keyboard/D-pad equivalents where applicable.

Continuous direct manipulation uses Pointer Events, coalesced samples when available, and requestAnimationFrame.

WAAPI is appropriate for cancelable local/discrete animation. View Transitions are appropriate for structural state transitions. Neither owns continuous gesture physics.

## 8. Adapter boundaries

External technology must sit behind Lūm-owned interfaces.

Examples:

- `GraphSurface` -> Orb/Sigma;
- `GraphIndex` -> Graphology;
- `MapSurface` / spatial coordinator -> Leaflet/possible future renderer;
- `InferenceProvider` -> built-in/browser/remote models;
- `ExtractionProvider` -> PDF/OCR/text;
- `ProjectRepository` -> browser/local/future persistence;
- `InterchangeAdapter` -> Timeline JSON/Memgraph/other formats;
- Lit -> bounded UI rendering implementation.

Changing an adapter implementation must not require a canonical schema migration unless product meaning itself changes.

## 9. Composition root and global compatibility

`site/app.ts` should evolve toward a composition/bootstrap root.

Extract cohesive services incrementally. Do not perform a big-bang rewrite.

No new ambient `globalThis.Timeline*` dependencies should be introduced. Existing globals may remain behind typed compatibility facades while ESM migration proceeds. Domain and application layers must not depend on ambient globals.

## 10. Architectural CI gates

The repository should progressively enforce:

- domain cannot import UI/framework/renderer/provider code;
- application depends inward on domain contracts;
- projections do not mutate canonical state;
- canonical serialization rejects implementation-private state;
- UI handlers do not introduce new direct canonical-array mutation;
- new ambient Timeline globals are blocked/ratcheted;
- migrations report unresolved/lossy conversion;
- fixed project + fixed view state yields deterministic projections/layout snapshots.

Product-level regression fixtures should include:

- no self-relations;
- no invalid/generic action predicates;
- no event disappearing merely because zoom/LOD changes;
- ranged occurrences remain discoverable while intersecting the viewport;
- no clipped year/tick labels;
- no unreachable popovers/toolbars;
- graph camera remains bounded;
- long-press node acquisition cannot pan the whole graph;
- accepted inferred facts retain provenance;
- temporal interval ordering remains valid.

## 11. PR method

Every substantial PR should identify:

1. canonical/domain impact;
2. command/shared-state impact;
3. projection/layout impact;
4. adapter/UI impact;
5. migration/compatibility impact;
6. invariants and regression fixtures.

Prefer a small vertical migration that crosses the necessary layers over a horizontal rewrite of an entire subsystem.

When fixing a recurring failure, add the invariant/characterization test before or with the implementation fix.

## Delivery map

- #245 — domain kernel and command API;
- #246 — provenance-preserving ingestion/claim pipeline;
- #247 — shared application state and projections;
- #248 — workspace spatial constraints;
- #249 — interaction coordinator;
- #250 — `app.ts` decomposition and ambient-global reduction;
- #251 — architectural CI gates;
- #236 — graph-first chronology, Graphology/Sigma, integrated geography;
- #243 — intrinsic/mobile-first responsive architecture.

Recommended dependency order:

`#245 -> #246/#247 -> #248/#249 -> #250 -> #251`

#236 and #243 may advance in parallel, provided they consume the shared contracts as those contracts land.
