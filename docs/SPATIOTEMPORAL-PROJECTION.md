# Occurrence-centered spatiotemporal projection

Status: architectural contract  
Parents: #236, #244, #247  
Execution: #386, #438, #436/#439, #437, #390, #431, #433, #41

## Decision

Lūm is occurrence-centered.

- **Entities persist.**
- **Occurrences activate/deactivate.**
- **Places remain globally anchored canonical records.**
- **Views are projections.**

An occurrence is the domain junction for relationship + time + place + evidence. The application coordination center is a shared spatiotemporal viewport and projection layer, not Sigma, cosmos.gl, D3, Leaflet, or the timeline renderer.

```
CanonicalProject
  ├─ entities
  ├─ occurrences / relationship facts
  ├─ places
  ├─ evidence
  └─ stories
        ↓
Runtime indexes
  ├─ SemanticGraphIndex
  ├─ TemporalOccurrenceIndex
  └─ SpatialAnchorIndex
        ↓
SpatiotemporalViewport
        ↓
SpatiotemporalProjection
  ├─ TimelineProjection
  ├─ GraphProjection
  ├─ MapProjection
  └─ AccessibilityProjection
        ↓
Replaceable adapters
  ├─ Sigma + external layout
  ├─ cosmos.gl integrated GPU simulation/rendering
  └─ Leaflet
```

## Occurrence activation

For a temporal viewport `[w0,w1]`, an occurrence is logically active when:

```
occurrence.start <= w1
AND
effectiveEnd(occurrence) >= w0
```

An instantaneous occurrence has `effectiveEnd = start`.

Rendering may retain entering/leaving material for continuity and may ramp physical influence across several ticks, but this must not alter logical activation.

## Semantic versus layout state

Canonical entity records do not gain date, geographic coordinates, graph x/y, camera coordinates, renderer handles, or physics-engine identifiers merely to satisfy a view.

Graph-space x/y is transient layout state.

Dragging/pinning a graph node changes layout state only. It must never rewrite:
- place latitude/longitude/geometry;
- occurrence time;
- occurrence place association;
- evidence/provenance.

## Spatial anchors

Canonical places remain WGS84/source-backed records. Leaflet pixels are derived display coordinates, not geographic truth.

`SpatialAnchorIndex` derives layout constraints from active occurrence/place associations. One entity may be influenced by multiple places simultaneously.

Physics backends may implement these constraints as invisible/pinned simulation points, but those points must never enter semantic topology, canonical serialization, or Graphology degree/centrality.

## Graph execution backends

`GraphSurface` is an execution boundary, not the application architecture.

It must support both:

### External-layout renderer

```
GraphProjection
  -> LayoutEngine
  -> positions
  -> Sigma
```

Useful when custom layout control, renderer modularity, or worker/WASM solving is preferable.

### Integrated GPU backend

```
GraphProjection + LayoutConstraints
  -> cosmos.gl
       GPU simulation
       GPU rendering
```

Do not force per-frame GPU position readback merely to preserve an artificial external-layout abstraction.

The backend decision is governed by #41 using semantic parity, touch behavior, styling flexibility, frame time, input latency, picking latency, topology-update cost, and sustained mobile behavior.

## Index policy

Use the simplest index that meets measured needs.

- `SemanticGraphIndex`: topology/traversal.
- `TemporalOccurrenceIndex`: exact ordered interval/window queries.
- `SpatialAnchorIndex`: geographic/layout constraints.
- Arrow/DuckDB: optional analytical backend only when #434 measurements justify initialization, memory, and synchronization complexity.

## Projection ownership

Timeline, graph, map, and accessibility views must consume the same active occurrence result for a given canonical project revision and `SpatiotemporalViewport`.

A graph projection must not independently redefine temporal activation.
A map projection must not independently redefine temporal activation.
A renderer must not redefine canonical occurrence meaning.

## Interaction

Timeline owns gesture semantics through the shared interaction coordinator.

A renderer backend may expose native picking/drag/zoom primitives, but the application contract remains:
- tap selects;
- double-tap zooms;
- empty-space drag pans;
- pinch zooms/pans;
- long-press + drag manipulates nodes;
- weighted/inertial release;
- deterministic cancellation/lost-capture handling.

## Non-goals

- 3D as the default graph representation;
- Cosmograph's histogram/range timeline replacing Lūm's retained semantic timeline;
- Rapier or another rigid-body engine as the default graph solver;
- making DuckDB canonical persistence;
- storing layout-only anchors as semantic nodes.
