# Occurrence-centered spatiotemporal world projection

Status: architectural contract  
Parents: #236, #244, #247  
Execution: #386, #438, #436/#439, #437, #445, #433, #249, #41

## Decision

Lūm is occurrence-centered and world-surface based.

- **Entities persist.**
- **Occurrences activate/deactivate.**
- **Places remain globally anchored canonical records.**
- **Earth is the default spatial reference frame when geography exists.**
- **Topology is rendered above geography, not beside it in a separately synchronized graph.**
- **The retained timeline remains the complementary temporal surface.**
- **Renderer, physics, camera, altitude and graph positions remain derived.**

An occurrence is the domain junction for relationship + time + place + evidence. The application coordination center is a shared spatiotemporal viewport and projection layer, not deck.gl, luma.gl, cosmos.gl, Sigma, Orb, Leaflet, D3, or the timeline renderer.

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
  ├─ WorldProjection
  └─ AccessibilityProjection
        ↓
Replaceable execution adapters
  ├─ WorldSurface
  │    └─ deck.gl/luma.gl globe-first reference implementation
  ├─ ForceSimulation
  │    ├─ cosmos.gl-derived/shared-GPU experiment
  │    ├─ worker/reference solver
  │    └─ future custom GPU/WASM solver if measured
  └─ compatibility/reference surfaces
       ├─ Sigma topology-only reference
       └─ Orb temporary migration adapter
```

The previous long-term split into `GraphProjection + MapProjection` is superseded. Geography and graph topology are two coordinate/constraint systems over the same `WorldProjection`.

## Occurrence activation

For a temporal viewport `[w0,w1]`, an occurrence is logically active when:

```
occurrence.start <= w1
AND
effectiveEnd(occurrence) >= w0
```

An instantaneous occurrence has `effectiveEnd = start`.

Rendering may retain entering/leaving material for continuity and may ramp physical influence across several ticks, but this must not alter logical activation.

## Canonical identity versus rendered instances

Canonical entities do not acquire one permanent location merely because their occurrences happen at places.

Each active canonical entity has exactly one rendered world node. If its active occurrences reference several places, that one node carries several geographic anchors:

```
canonical entity Alice ●
  ├─ anchor → Stockholm
  ├─ anchor → Copenhagen
  └─ anchor → Malmö
```

The node carries the canonical entity ID plus the active occurrence IDs and spatial anchors that currently constrain it. Selection, evidence, neighborhood queries and editing resolve through that single canonical identity.

Spatial multiplicity belongs to anchors and occurrence context, never to replicated entity nodes.

## Coordinate model

`WorldProjection` may provide several derived coordinate channels for one rendered instance:

```ts
interface WorldInstance {
  canonicalId: string;
  occurrenceId?: string;

  geographicAnchor?: {
    longitude: number;
    latitude: number;
    sourceAltitude?: number;
    certainty?: number;
  };

  localOffset?: readonly [number, number];
  visualAltitude?: number;
  topologyPosition?: readonly [number, number, number?];
}
```

Rules:

- WGS84/source-backed place geometry is canonical when supported by evidence.
- topology coordinates are disposable;
- local tangent offsets around a geographic anchor are disposable;
- visual altitude is presentation state, not evidence of physical elevation;
- derived geographic offsets for unlocated nodes are never written back as place evidence;
- renderer coordinates, globe Cartesian coordinates, ECEF values, GPU buffers and camera transforms are runtime state only.

## Globe-first world surface

The default spatial presentation is a 3D globe/world surface when spatial context is available.

Geographic anchors lie on or near the Earth surface. Relational topology is elevated so nodes and edges remain legible and directly interactable.

Conceptually:

```
      entity ●────● entity
              \  /
               \/
          occurrence anchor
                 │
                 ◎ place
          ─────────────
             Earth
```

Visual altitude may depend on semantic zoom, density and interaction state. It must remain deterministic for fixed projection inputs and must not masquerade as canonical altitude.

At local/high zoom, a planar/tangent representation may be used when it materially improves precision or interaction, while retaining the same `WorldProjection` identities and anchors.

## Spatial anchors and forces

`SpatialAnchorIndex` maps occurrence/place evidence into renderer-neutral geographic constraints.

One entity may be influenced by multiple places. No entity receives a canonical location merely because it participates in a placed occurrence.

Anchors carry at least:

- place/occurrence identity;
- geographic geometry or representative coordinate;
- certainty/precision;
- influence strength;
- whether the anchor is direct or inherited through an incident occurrence.

Force/layout behavior is conceptually:

```
F(instance) =
  F_topology
+ F_repulsion
+ F_collision
+ F_cluster
+ F_geographic
+ F_altitude
+ F_user
```

Exact/direct place evidence may strongly constrain the entity node. When several placed occurrences are active for the same entity, their anchors jointly constrain that one node. Approximate evidence may use a softer radius/influence. Unlocated material has no invented canonical coordinates and may be positioned by topology around related anchored nodes.

Places remain anchors/records, not semantic graph nodes.

## WorldProjection

`WorldProjection` is the derived scene contract shared by geography and graph rendering. It should include renderer-neutral records for:

- active occurrence instances;
- canonical entity identity;
- relationship/edge identity;
- place anchors and geometry;
- local graph/topology constraints;
- visual altitude policy inputs;
- selection/focus state;
- temporal/filter weights;
- significance/LOD;
- provenance needed for accessible/contextual presentation.

It must not contain deck.gl classes, luma resources, Sigma objects, Cosmos objects, WebGL/WebGPU handles, DOM state or mutable camera objects.

## WorldSurface

The strategic renderer boundary is `WorldSurface`, not separate long-term `GraphSurface` and `MapSurface` APIs.

Representative contract:

```ts
interface WorldSurface {
  setProjection(projection: WorldProjection): void;
  setTemporalWindow(range: TemporalRange): void;
  setSelection(selection: CanonicalSelection | null): void;

  focusEntity(id: EntityId): void;
  focusOccurrence(id: OccurrenceId): void;
  focusPlace(id: PlaceId): void;

  getCamera(): WorldCameraState;
  setCamera(camera: WorldCameraState): void;

  pick(point: ScreenPoint): WorldHit | null;
  refresh(): void;
  destroy(): void;
}
```

Legacy `GraphSurface` and map adapters may remain during migration but should converge on this world-surface boundary rather than become permanent sibling architectures.

## Technology roles

### deck.gl / luma.gl

The reference world-surface direction is deck.gl on luma.gl because it natively addresses geographic coordinates, globe projection, altitude, GPU picking, geospatial layers, binary attributes and a shared GPU device abstraction.

deck.gl is an execution technology, not a domain dependency. Globe-specific limitations must be measured and isolated behind `WorldSurface`.

### cosmos.gl / Cosmograph engine

Cosmos is primarily evaluated as a GPU force/simulation technology, not as the owner of geography.

Do not require per-frame GPU → CPU → GPU position round-trips merely to combine Cosmos simulation with deck rendering. Evaluate:

1. shared-device/shared-buffer integration where public APIs permit;
2. controlled-cadence readback only for prototypes;
3. extracting/replicating the needed GPU force techniques in a Lūm-owned luma module if direct integration is insufficient.

### Sigma

Sigma becomes a topology-only reference/fallback surface useful for parity, diagnostics and modular-renderer comparisons. It is not the strategic world renderer because its primary coordinate/camera model is 2D.

### Orb / Leaflet

Orb remains temporary compatibility only. Leaflet may remain for editing/reference or fallback paths while the world renderer matures, but the target product architecture does not require a separately synchronized Leaflet map beneath a graph.

## Timeline relationship

The retained semantic timeline remains a separate first-class surface.

```
TemporalOccurrenceIndex
         │
         ├────────────→ TimelineProjection → TimelineSurface
         │
         └────────────→ WorldProjection → WorldSurface
```

Both consume the same logical occurrence activation.

Timeline movement should preferentially update retained projection/filter state rather than reconstruct the world scene. GPU filtering/binary attribute updates may be used when they preserve exact canonical semantics.

## Interaction ownership

Lūm owns gesture meaning through the shared interaction coordinator.

The input implementation may use Pointer Events directly or an adapter such as mjolnir.js, but renderer-native gesture semantics must not become application semantics.

Required vocabulary:

- tap/select;
- double-tap zoom/focus;
- globe rotate/orbit;
- empty-space pan where applicable;
- pinch zoom/rotate/pan;
- long-press + drag direct node manipulation;
- depth-aware picking;
- weighted/inertial release;
- deterministic cancellation/lost-capture handling;
- keyboard/D-pad equivalents.

A drag of an elevated node changes derived layout state only. It cannot rewrite occurrence place evidence.

## Data and GPU path

At scale, projection output should be able to materialize into typed/columnar buffers without changing canonical persistence.

Preferred direction:

```
CanonicalProject
      ↓
indexes / projection
      ↓
renderer-neutral columnar scene data
      ↓
GPU buffers
      ↓
WorldSurface
```

Arrow/DuckDB remains optional and benchmark-gated by #434. Graphology remains semantic topology/query infrastructure, not the render buffer.

## Migration rules

1. Keep occurrence activation and temporal-index work independent of renderer migration.
2. Introduce `WorldProjection` and `WorldSurface` alongside current graph/map compatibility contracts.
3. Prototype deck globe + elevated node/edge picking before deleting Leaflet/Orb/Sigma paths.
4. Move spatial-anchor consumers from Leaflet pixel anchors to world/geographic constraints.
5. Prove mobile touch, depth picking, long-press dragging, camera behavior and reduced-motion semantics.
6. Evaluate Cosmos/shared-GPU force integration only after the world-scene contract is stable.
7. Retire separate map/graph synchronization once world-surface parity is certified.

## Non-goals

- turning places into semantic graph entities merely for rendering;
- storing visual altitude or graph position as physical geography;
- forcing every occurrence/entity to have a geographic location;
- replacing Lūm's retained semantic timeline with a histogram timeline;
- making deck.gl, Cosmos, Graphology, Arrow or DuckDB canonical persistence;
- adopting a generic rigid-body engine without a measured graph-layout requirement;
- preserving a permanent multi-renderer architecture when one certified world surface is sufficient.
