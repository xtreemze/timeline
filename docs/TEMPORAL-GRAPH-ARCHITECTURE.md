# Temporal graph and interaction architecture

This document defines the rendering and interchange foundation for dense chronology, temporal relationships and future large-scale relation exploration.

## Collision-driven event clustering

Clustering is view state, never canonical data.

1. Each visible item is projected from time into its current pixel position.
2. Adjacent projected terminals are fused only when their positions would collide at the current zoom.
3. A cluster stores references to the underlying items plus the earliest/latest temporal coordinates.
4. Clicking a cluster uses the same weighted viewport interpolation as ordinary zoom, expanding the local interval until the underlying events have enough visual room to separate.
5. Zooming out can fuse the same events again without changing any event record.

This makes clustering reversible and deterministic from the current viewport.

## Weighted motion

Zoom already converges toward a target viewport. Panning now follows the same physical language:

- pointer movement is sampled with Pointer Events;
- when available, `PointerEvent.getCoalescedEvents()` contributes higher-resolution motion samples;
- live panning follows the pointer through an exponential response rather than jumping directly to every sample;
- release velocity is estimated from recent samples;
- viewport velocity decays exponentially after release to create inertial continuation;
- keyboard pan targets use the same weighted viewport interpolation;
- `prefers-reduced-motion` disables inertial continuation.

The motion primitives live in `site/timeline-motion.js` so future node drag/drop and graph-surface manipulation can use the same response constants.

## Haptics

Haptics are optional progressive enhancement.

Timeline attempts short, low-intensity feedback for:

- event-cluster fusion/splitting;
- event/cluster selection;
- release into inertial motion.

Capability order:

1. connected Gamepad haptic/vibration actuator;
2. `navigator.vibrate()` on supporting devices;
3. no physical feedback.

Haptics never block interaction and unsupported/rejected effects are ignored.

## Ambient temporal typography

Months containing one to three visible chronology segments may be promoted into an ambient `MMM YYYY` accent. The accent is:

- bottom-aligned in landscape;
- edge-aligned with vertical writing in portrait;
- visually behind events and range segments;
- paired with compact day/time tick labels to avoid repeating month/year on every mark.

Monaspace Krypton v1.400 is used for this numeric/time display layer because Monaspace supports texture healing through the `calt` OpenType feature. The CSS also uses:

- `font-variant-numeric: tabular-nums slashed-zero`;
- `font-size-adjust: ex-height from-font`;
- `text-box: trim-both ex alphabetic`;
- the Monaspace stylistic-set features enabled for the ambient accent.

References:

- https://github.com/githubnext/monaspace
- https://developer.chrome.com/blog/css-text-box-trim

## Twelve-column placement grid

The application shell and interactive timeline stage both expose 12 equal logical columns.

Desktop default:

- editor: 4 columns;
- chronology: 8 columns.

Intermediate width:

- editor: 5 columns;
- chronology: 7 columns.

Narrow layout:

- both surfaces span all 12 columns and stack.

The timeline's 12-column stage is also the placement contract for future graph inspectors, side lenses, minimaps and entity clusters. Timeline-axis coordinates remain continuous and do not snap time to grid columns.

## Temporal graph contract

Top-level data may include:

```json
{
  "entities": [
    {
      "id": "person-a",
      "type": "person",
      "name": "Example Person",
      "identifiers": [],
      "attributes": {}
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "subjectId": "person-a",
      "objectId": "event-1",
      "predicate": "participant",
      "role": "witness",
      "time": {
        "type": "interval",
        "start": {
          "value": "2026-09-01",
          "precision": "day",
          "certainty": "exact",
          "calendar": "gregorian"
        },
        "end": {
          "value": "2026-09-30",
          "precision": "day",
          "certainty": "exact",
          "calendar": "gregorian"
        }
      },
      "attributes": {}
    }
  ]
}
```

A temporal relationship is projected into the timeline relation band using its own start/end coordinates. Untimed relationships remain valid graph edges but do not appear in that temporal band.

## Memgraph Orb compatibility

Memgraph Orb's public data contract requires:

- node: unique `id`;
- edge: unique `id`, `start`, and `end`.

`TimelineGraph.toOrbGraph()` emits those structures and retains Timeline type, temporal extent, location and attributes inside properties.

Orb currently supports interactive Canvas/WebGL rendering plus force, GPU, grid, circular and hierarchical layouts. That makes it a suitable future graph surface. However, Memgraph explicitly notes that its direct browser-link build cannot use simulation web workers and therefore runs graph simulation on the main thread.

For the large-scale target, integrate Orb through a bundled/npm path with worker support rather than adding its direct CDN runtime to the current static page.

References:

- https://github.com/memgraph/orb
- https://memgraph.github.io/orb/

## Large-scale direction

The timeline and relation graph should remain coordinated but independently renderable:

- timeline: temporal projection, clustering, month/year context and relation activity bands;
- graph: entity topology, relation density, neighborhoods and graph algorithms;
- shared selection: selecting an event/entity/edge highlights its counterpart on the other surface;
- shared temporal filter: the graph can restrict or fade edges outside the timeline viewport;
- GPU/WebGL should be preferred for graph density, while the chronology remains semantic DOM where practical;
- graph clustering/level-of-detail must be based on viewport density rather than mutating graph records.

This separation prevents the force layout from becoming the source of truth for chronological position.


## Authoring surface

The Graph editor now exposes the canonical graph directly.

### Node contract

Nodes are nouns/subjects. The minimum authoring shape is:

```json
{
  "id": "person-a",
  "type": "person",
  "name": "Example Person",
  "attributes": {
    "role": "investigator",
    "caseId": "A-42"
  }
}
```

The UI labels `attributes` as **Properties** because graph-database users typically reason about node properties rather than implementation field names. Import normalization accepts either `properties` or `attributes`.

### Edge contract

Edges are directed subject–action–object statements:

```json
{
  "id": "rel-1",
  "subjectId": "person-a",
  "predicate": "called",
  "objectId": "person-b",
  "role": "caller",
  "attributes": {
    "channel": "phone"
  },
  "time": {
    "type": "interval",
    "start": { "value": "2026-09-01", "precision": "day", "certainty": "exact", "calendar": "gregorian" },
    "end": { "value": "2026-09-30", "precision": "day", "certainty": "exact", "calendar": "gregorian" }
  }
}
```

The action label is stored in `predicate`. Endpoints can reference reusable entities, chronology items, or stories. Referential normalization drops imported edges whose endpoints do not exist, and deletion of a node/item/story removes edges that would otherwise become orphaned.

## Timeline-synchronized graph lens

`site/temporal-graph-view.js` renders the current graph as an interactive SVG node-link diagram.

- all canonical nodes remain structurally visible;
- timeless edges remain visible as persistent topology;
- timed edges whose extent intersects the timeline viewport are emphasized;
- timed edges outside the viewport fade;
- edge labels display the action/predicate;
- selecting a node or edge exposes its properties;
- selecting a chronology-item node can focus the corresponding timeline event;
- wheel zoom and background drag manipulate the graph view without changing graph data.

This lens is deliberately not the scale endpoint. It exists to make the model authorable and to validate timeline↔graph synchronization while the app remains static and dependency-free.

For high node/edge counts, issue #16 remains the performance path: consume the same canonical graph through `TimelineGraph.toOrbGraph()`, use a bundled worker-backed simulation, and move dense rendering to Canvas/WebGL. Memgraph's published Orb architecture separates data, simulation/view, and events and supports worker-backed force simulation in bundled integrations, which matches this division of responsibilities.
