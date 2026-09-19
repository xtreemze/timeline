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

## Viewport canvas and overlay grid

The timeline owns the application viewport and is not compressed into a page-level column layout. Content surfaces that float above it use a compact six-column internal grid.

- chronology geometry always uses the full available timeline canvas;
- event detail, editor sheets, browser sheets and inspectors use bounded overlays;
- focused Place and Relations sections reuse the canonical map and graph inside that six-column overlay;
- graph, map and text layers never become sibling columns that shrink or crop the timeline;
- timeline-axis coordinates remain continuous and do not snap to overlay columns.


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
- shared temporal filter: the rendered graph is a temporal slice of the timeline viewport; timed relations outside the window leave the rendered topology, while explicitly persistent relations remain;
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

Authoring SHOULD give a relation an instant or interval whenever its temporal extent is known. The editor therefore defaults new relations to a dated instant. “Persistent / no temporal anchor” is an explicit exception for genuinely timeless topology rather than the default way to avoid entering a date.

## Timeline-synchronized graph lens

`site/temporal-graph-view.js` renders the current graph through the bundled Memgraph Orb canvas/WebGL surface.

- explicitly persistent/timeless edges remain visible across timeline windows;
- timed relations are rendered only while their extent intersects the timeline viewport;
- event-driven relation state is replayed against the same viewport and inactive relations are removed from the rendered topology;
- nodes are retained when they participate in a visible relation or are chronology items whose own temporal extent intersects the viewport;
- edge labels display the action/predicate;
- chronology-item nodes focus the corresponding event;
- entity/edge selection opens a read-only inspector only when meaningful detail exists; otherwise the nearest connected chronology event is focused when one can be resolved;
- wheel zoom, pan and node drag manipulate the graph view without changing canonical graph data.

The authoring lens now uses the scale path directly. `@memgraph/orb` is bundled through esbuild, preserving its worker-backed CPU force simulation. Canvas is the default renderer; dense graphs switch to WebGL when WebGL2 is available, and very large graphs can enable Orb's GPU force path.

Temporal navigation does not restart force simulation merely because the viewport coordinate changes. Timeline compares a topology signature (visible node IDs plus visible edge endpoints): movement within the same active temporal topology updates effective edge state without resetting physics, while crossing a relation/event temporal boundary changes the signature and calls Orb data setup for the new visible topology.

Current implementation thresholds are: below 1,200 nodes Canvas + worker CPU force; 1,200–2,999 nodes WebGL + worker CPU force when available; 3,000+ nodes WebGL + GPU force when available. These thresholds are presentation policy, not canonical data.

## Event-driven relation lifecycle

A relation can exist independently of a chronology event, while events can change its state without rewriting prior history.

- `relationships[].initialState` is `active` by default and can be `inactive`.
- `item.relationChanges[]` references an existing relationship.
- `activate` makes that edge active from the event timestamp.
- `deactivate` makes it inactive from the event timestamp.
- `update` can change the effective action label, role, and/or merge a property patch from the event timestamp.
- changes are replayed in canonical event-time order to derive edge state for the current timeline window.

The focused-event graph includes derived event-to-context links labelled **activates**, **deactivates**, or **updates**, while the canonical subject-to-object edge remains the actual relation. This keeps the event that changed the relation visible without incorrectly turning the relation itself into a node.

## Focused graph integration

Each focused chronology event receives a bounded one-hop graph neighborhood. The canonical Orb surface is moved behind the Relations section of the focused six-column overlay rather than receiving separate layout ownership. Chronology-item nodes can navigate to connected events. Entity/edge inspection remains read-only in viewing mode and appears only when the selected record has substantive descriptive, temporal, location, identifier, role, property or lifecycle detail; otherwise the interaction resolves to a connected event when possible without dismissing the graph.

## Presentation graph semantics

When an event is focused, the global graph switches from the full case topology to a bounded one-hop neighborhood rooted at that chronology item. The neighborhood retains:

- the focused event;
- directly relevant entities/items/stories;
- temporally active or timeless relations among those nodes;
- an otherwise-inactive relation when the focused event itself changes it;
- derived event-to-relation-context links for activate/deactivate/update operations.

Inactive unrelated edges are excluded from neighborhood traversal so the presentation graph remains explanatory rather than becoming a miniature version of the entire case graph.

Orb node styling uses the canonical `timelineType` to select semantic shape, color, mass and an embedded SVG icon. Edge styling derives a visual family and glyph from the action/predicate while keeping the action text as the primary semantic label.

### Force execution

The npm/bundled Orb path keeps CPU force simulation in a Web Worker. Timeline enables continuous physics plus centering and position forces, and assigns larger mass to chronology/story nodes so drag release has a weighted physical response.

Orb 1.0.2's GPU force implementation uses WebGL2 on the main thread; upstream documents that its GPU engine cannot use the worker because it requires a WebGL context. Timeline therefore keeps ordinary and presentation neighborhoods on worker CPU and only switches to GPU force for very large graphs. WebGL rendering remains independent from force-engine choice.

### Interaction reheating and spacing

Node interaction is treated as a topology-layout disturbance even when canonical graph data has not changed.

- drag start raises the force alpha target so neighboring nodes respond while the dragged node is moving;
- drag events keep the post-interaction settle timer cancelled;
- drag release explicitly reheats the simulator again;
- release holds an alpha target of `0.065` for `2400 ms`, then returns the target to zero and allows normal cooling;
- the CPU path activates the pinned Orb 1.0.2 simulator directly so a drag release cannot be lost merely because its earlier force run already cooled;
- if Orb changes that internal bridge, Timeline falls back to the public layout-settings path.

The current sparse/default profile uses approximately 168 px link distance, `-460` many-body repulsion, 42 px collision radius and four collision iterations. The dense profile uses approximately 128 px links, `-300` repulsion and a 30 px collision radius. Centering and positional pull are also reduced so the stronger repulsion is not immediately cancelled by attraction toward the origin. Both profiles keep slower alpha cooling and the 2.4-second post-interaction settle window.

These values are presentation policy rather than canonical graph data and may be tuned from performance fixtures without changing nodes or edges.

## Range tracing

A range is visually meaningful for every point in its interval, not just its start/end. If any portion of a range intersects the viewport, Timeline derives a presentation anchor from the midpoint of the visible intersection. The label terminal and connector use that anchor while the displayed date text retains the canonical start/end values. This keeps an on-screen range traceable to its event even when the actual start lies outside the viewport.
