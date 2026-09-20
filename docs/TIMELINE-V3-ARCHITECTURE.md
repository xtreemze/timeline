# Timeline v3 architecture: continuous time, entities, and evidence

Status: proposed architecture for implementation.

This document defines the contracts required to evolve Timeline from a responsive chronology list into a zoomable temporal workspace suitable for research, incident reconstruction, historical analysis, and evidence review.

It is deliberately conservative about standards claims: the product can implement fields and workflows that align with standards, but it must not claim certification or conformance until the applicable licensed standards have been reviewed clause-by-clause and the implementation has been independently assessed where required.

## Product invariants

1. **Chronology remains canonical.** Stories, views, reports, and exports reference canonical records.
2. **Time is modeled before it is rendered.** Horizontal and vertical layouts are projections of the same temporal coordinate system.
3. **The timeline is continuous.** The primary axis is linear and zoomable from century-scale overview to millisecond-scale inspection.
4. **Precision is not certainty.** A value can be precise to a millisecond and still be uncertain; a year-only value can be exact at year precision.
5. **Evidence is never silently rewritten.** Source facts, derived observations, analyst interpretations, and presentation annotations are distinct.
6. **Graph nodes are entity-only records.** People, organizations, software, devices and other domain entities may be nodes; places are reusable spatial records referenced by edges, never nodes.
7. **Local-first remains a product property.** Evidence-grade metadata does not imply a backend, cloud custody, or remote processing.
8. **Rendering is not the source of truth.** Marker position, connector style, terminal shape, icon, image, and expanded presentation are view metadata or derived state.
9. **Interchange is explicit.** Internal records may be richer than any one export format; lossy exports must report what cannot be represented.
10. **Accessibility is part of the data model.** Every semantic icon, image terminal, relationship, and visual state must have a non-visual representation.

## Temporal model

The v2 `start` / `end` strings are insufficient for:
- seconds and milliseconds;
- explicit timezone/UTC offsets;
- year/month/day precision independent of uncertainty;
- approximate, uncertain, open, or bounded dates;
- BCE / extended years;
- non-Gregorian or ordinal reference systems in future;
- preservation of source wording;
- interoperable provenance.

v3 should represent an event's temporal extent as a first-class object.

```json
{
  "time": {
    "type": "instant",
    "start": {
      "value": "2026-09-18T11:35:42.183+08:00",
      "precision": "millisecond",
      "certainty": "exact",
      "calendar": "gregorian",
      "timeZone": "Asia/Manila",
      "sourceText": null
    },
    "end": null
  }
}
```

For uncertain or approximate time:

```json
{
  "time": {
    "type": "interval",
    "start": {
      "value": "1944-06",
      "precision": "month",
      "certainty": "approximate",
      "earliest": "1944-05-15",
      "latest": "1944-07-15",
      "calendar": "gregorian",
      "sourceText": "around June 1944"
    },
    "end": {
      "value": "1944-08",
      "precision": "month",
      "certainty": "uncertain",
      "earliest": "1944-07",
      "latest": "1944-09",
      "calendar": "gregorian",
      "sourceText": "before autumn 1944"
    }
  }
}
```

### Required temporal fields

A temporal endpoint SHOULD support:

- `value`: normalized machine-readable value when known;
- `precision`: `millennium | century | decade | year | month | day | hour | minute | second | millisecond`;
- `certainty`: `exact | approximate | uncertain | inferred | unknown`;
- `earliest` and `latest`: optional bounded uncertainty;
- `calendar`: initially `gregorian`, later extensible;
- `timeZone`: IANA zone identifier when known and meaningful;
- `utcOffset`: preserved source offset when supplied;
- `sourceText`: verbatim human date wording where normalization could lose meaning;
- `referenceSystem`: optional URI/identifier for non-default temporal reference systems.

The persisted object is canonical. Numeric epoch coordinates are derived for rendering and indexing. Do not make epoch milliseconds the only stored representation because they erase precision, uncertainty, timezone semantics, source wording, and alternative reference systems.

### Standards alignment

- ISO 8601-1: basic date/time representation.
- ISO 8601-2: uncertain, approximate, unspecified, interval, and recurring extensions. The 2019 edition remains the published baseline while a second edition is under development in 2026; do not depend on draft-only syntax.
- W3C OWL-Time: explicit `Instant`, `Interval`, temporal precision, duration, and temporal reference systems.
- RFC 5545 iCalendar: optional import/export for `VEVENT`, including persistent `UID`, `DTSTART`, and `DTEND`.

## Continuous axis and viewport

The renderer operates on a `TemporalViewport`:

```ts
interface TemporalViewport {
  start: number;       // derived UTC/proleptic-Gregorian coordinate
  end: number;
  orientation: "horizontal" | "vertical";
  pixelLength: number;
}
```

The initial implementation can use millisecond coordinates for the current supported historical range. If the product later expands to geological/cosmological spans, introduce a wider coordinate abstraction rather than changing event records.

### Scale behavior

- Adaptive ticks MUST support at least:
  - 1/2/5/10/20/50/100/200/500 ms
  - seconds
  - minutes
  - hours
  - days/weeks
  - months/quarters
  - years/decades/centuries
- Tick selection is based on viewport span and target pixel spacing, not hard-coded screen breakpoints.
- Month/year/century ticks are calendar-aware rather than fixed-duration approximations.
- Zoom is anchored at the pointer/focus position.
- Drag pans the viewport.
- Trackpad, wheel, pinch, keyboard, and explicit zoom controls must map to the same viewport operations.
- Horizontal and vertical modes use the same geometry with a primary-axis transform.
- A "fit all" command computes the smallest useful viewport containing all visible temporal envelopes.
- The viewport state is presentation state and MUST NOT mutate event time values.

## Event rendering

Each event projects onto the axis with a connector from its temporal coordinate to a terminal.

A terminal can be:
- semantic icon (default);
- geometric shape;
- image thumbnail;
- evidence/media preview;
- user-selected custom glyph.

Suggested default semantic mapping:
- generic event: circle + calendar/event icon;
- decision: diamond + decision icon;
- evidence: square + evidence/fingerprint/file icon;
- communication: rounded terminal + message icon;
- person-related event: person icon;
- place-related event: map-pin icon;
- alert/incident: triangle + warning icon.

The icon is semantic; terminal shape and connector style can provide redundant visual channels but MUST NOT be the only way category or status is communicated.

### Connector model

```json
{
  "presentation": {
    "terminal": {
      "kind": "icon",
      "shape": "circle",
      "icon": "calendar-event",
      "imageAssetId": null
    },
    "connector": {
      "style": "solid",
      "weight": "normal",
      "elbow": "orthogonal",
      "lane": "auto"
    }
  }
}
```

The layout engine should:
- assign deterministic lanes;
- keep records with identical temporal coordinates as separate terminals and stack them perpendicular to the time axis rather than clustering them;
- minimize connector crossings;
- keep labels from obscuring ticks;
- preserve a stable event position while zooming;
- cluster or summarize when density exceeds available space;
- expand a clicked/focused item without shifting the temporal coordinate;
- preserve keyboard focus through re-layout.

## Entity model

Do not make "person", "place", or "evidence" special text fields on events. Introduce reusable entities and typed relationships.

```json
{
  "entities": [
    {
      "id": "person-1",
      "type": "person",
      "name": "Example Person",
      "identifiers": [{ "scheme": "isni", "value": "..." }],
      "attributes": {}
    },
    {
      "id": "person-2",
      "type": "person",
      "name": "Example Witness",
      "identifiers": [],
      "attributes": {}
    }
  ],
  "places": [
    {
      "id": "place-1",
      "name": "Example Place",
      "geographicIdentifier": "Example Place, Example Region",
      "geometry": { "type": "Point", "coordinates": [18.0686, 59.3293] },
      "crs": "OGC:CRS84",
      "icon": "place",
      "markerShape": "pin"
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "subjectId": "person-1",
      "predicate": "witnessed",
      "objectId": "person-2",
      "placeId": "place-1",
      "itemIds": ["event-1"]
    }
  ]
```

### Person/entity alignment

- ISO 27729:2024 (ISNI) can be stored as an optional identifier for public identities. It is not a universal identifier for every private person and must not be required.
- RFC 6350 vCard is useful as an optional interchange target for contact-oriented person/organization records.
- W3C PROV-O distinguishes `Person`, `Organization`, and `SoftwareAgent` and is suitable for provenance mappings.

### Place alignment

- ISO 19112:2019: geographic identifiers and gazetteer concepts.
- ISO 19111:2019: coordinate reference systems.
- RFC 7946 GeoJSON: practical geometry interchange in WGS 84 / CRS84.

The UI creates places in a dedicated reusable registry rather than as graph nodes. A canonical place requires a name plus point or area geometry, may add a Point radius, and carries a semantic icon and marker shape for Leaflet. Edges reference the place by ID; geometry is never copied into nodes or edge labels.

## Evidence and provenance model

Evidence mode is optional per timeline/item. Ordinary historical or project timelines should not require forensic metadata.

A canonical evidence record SHOULD be able to capture:

```json
{
  "id": "evidence-1",
  "type": "evidence",
  "title": "Example image",
  "source": {
    "originalName": "IMG_0001.jpg",
    "mediaType": "image/jpeg",
    "sizeBytes": 4213376,
    "sourceLocator": "device://example/DCIM/IMG_0001.jpg"
  },
  "integrity": {
    "digests": [
      { "algorithm": "SHA-256", "value": "..." }
    ]
  },
  "acquisition": {
    "acquiredAt": "2026-09-18T03:35:42.183Z",
    "acquiredByEntityId": "person-investigator",
    "method": "logical-export",
    "tool": {
      "name": "Example Tool",
      "version": "1.2.3"
    }
  },
  "provenance": {
    "rootExhibitNumber": null,
    "exhibitNumber": null,
    "derivedFromIds": [],
    "custodyEventIds": []
  }
}
```

Evidence/provenance requirements must distinguish:
- source item;
- acquired copy;
- derived artifact;
- observation;
- analytical result;
- interpretation/opinion;
- report/presentation annotation.

Do not collapse these into one mutable record.

### Forensic standards alignment targets

- ISO 21043-2: recognition, recording, collection, transport, and storage of items of potential forensic value.
- ISO 21043-3: analysis.
- ISO 21043-4: interpretation.
- ISO 21043-5: reporting.
- ISO/IEC 27037: identification, collection, acquisition, and preservation of digital evidence.
- ISO/IEC 27041: suitability and adequacy of investigative methods.
- ISO/IEC 27042: analysis and interpretation with continuity, validity, reproducibility, and repeatability.
- ISO/IEC 27043: incident investigation principles and processes.
- CASE/UCO: practical investigation ontology for people, places, tools, actions, evidence objects, chain of custody, and chain of evidence.
- W3C PROV-O: generic provenance graph of Entities, Activities, and Agents.

A standards traceability matrix should be maintained separately. Public UI text should say "supports metadata aligned with..." until formal conformance has been established.

## Chain of custody

Represent custody as events/actions, not a single "current custodian" field.

```json
{
  "id": "custody-1",
  "type": "custody-action",
  "time": { "...": "same TemporalPosition contract" },
  "evidenceIds": ["evidence-1"],
  "fromEntityId": "person-a",
  "toEntityId": "person-b",
  "placeId": "place-1",
  "action": "transfer",
  "reason": "laboratory analysis",
  "recordedByEntityId": "person-c",
  "notes": ""
}
```

For tamper-evident workflows, an audit/hash-chain layer is required. Browser localStorage alone cannot provide evidentiary integrity guarantees.

## Event focus and expansion

Collapsed chronology state:
- terminal with semantic tag icon;
- short label;
- minimal temporal label;
- optional category/status affordance.

Selecting one item is a deliberate viewing operation. The timeline remains the full viewport canvas and the event enters a bounded six-column top-layer composition. The editor is not part of this state. A horizontal timeline shifts toward the lower edge so detail can occupy the upper/opposite region; a vertical timeline shifts toward the right edge so detail can occupy the left/opposite region.

Focus also owns a viewport contract. Opening focused detail zooms the chronology inward around the selected event instead of preserving a broad overview. The nearest preceding/following chronology items may remain as relative context when they fit inside that local frame, but distant neighbours never cause focus to zoom out. If the selected event is inside a collision cluster, the viewport zooms further until its projected terminal is unique when temporal separation permits it. Equal timestamps are a degenerate case: zoom may tighten their surrounding context, but coincident records remain lane-separated rather than pretending equal temporal coordinates can diverge. Previous/Next focus navigation carries the established local scale forward unless the next target needs additional collision separation.

Focused composition should be asymmetric and may include:
- a dominant hero title representing the selected timeline event;
- up to three photographs with slideshow controls and accessible alternative text;
- the event's compact time/range label, while the timeline itself remains the chronology;
- semantic tags using icon + text + hue;
- description/context;
- place/location;
- people/entities and relationship roles;
- linked evidence and provenance;
- integrity/custody/analysis data where relevant;
- story memberships;
- an explicit Edit action that is the only transition from focused viewing into mutation mode;
- return-to-timeline navigation.

The focused item must not mutate its temporal coordinate or chronology order. Escape, an explicit return control, or clicking the exposed timeline background outside the detail composition restores the chronology. Entering browser fullscreen can reorder the browser top layer, so a focused event's popover is explicitly restored after the fullscreen transition; fullscreen must never silently discard focused detail.

## Stories and analytical layers

Stories remain ordered references and must not alter chronology.

Timed relationships are first-class temporal graph edges. A relationship MAY carry the same `time` extent as an event so the renderer can answer both “who/what is related?” and “during which temporal interval did that relationship hold?”. The timeline reserves a relation band separate from event terminals; full graph exploration is a distinct linked surface.

Timeline exposes entity-node, reusable-place and edge authoring only in explicit Edit mode. Each node is exactly one durable entity. Actions, events, activities, meetings, transactions, decisions, processes, places/locations, dates/times and geometry are categorically not nodes. Directed edges connect entity endpoints and require a specific action verb or verb phrase. The predicate is action-only; `relationship.time` contains when it occurred and `relationship.placeId` references where it occurred. Generic association predicates such as `participatesIn`, `partOf`, `memberOf`, `relatedTo`, `associatedWith` or `connectedTo` are invalid. An edge may carry `itemIds[]` to identify chronology records that contextualize the action without promoting those records into graph nodes. Stories remain narrative references through `story.itemIds[]`, not graph topology. Persistent/no-anchor relations remain supported only when the action relation genuinely lacks a temporal extent and are intentionally not the authoring default.

The graph lens consumes the same canonical data as a temporal slice: timed relations and orphaned topology outside the visible timeline window are removed from the rendered graph, while explicitly persistent relations remain. Timeline bundles Memgraph Orb through npm so force simulation uses its worker-backed path rather than the direct-link main-thread fallback. Dense graphs can switch to WebGL rendering and GPU force without changing canonical records.

Add optional analytical overlays as separate records:
- hypothesis;
- contradiction;
- causality assertion;
- dependency;
- confidence assessment;
- annotation;
- citation;
- cluster;
- alternative interpretation.

These are analytical claims and should be attributable to an agent/source when evidence mode is enabled.

## Migration

v2 → v3 migration:
- `kind: event` becomes an `instant`;
- `kind: range` becomes an `interval`;
- existing `YYYY-MM-DD` becomes precision `day`;
- existing `YYYY-MM-DDTHH:MM` becomes precision `minute`;
- timezone remains unknown rather than assuming local time;
- original strings are preserved during migration;
- categories and story references remain stable;
- new entities/evidence/relationships arrays start empty.

Migration must be deterministic and reversible by export of the original v2 payload until v3 is proven stable.

## Implementation sequence

1. Pure time-scale kernel with adaptive ticks, pan, zoom, fit, and orientation-neutral geometry.
2. v3 temporal schema + v2 migration + validation.
3. Axis renderer integrated with current chronology.
4. Marker terminals, semantic icons/images, connectors, deterministic lane packing, click expansion.
5. Entity/relationship model and editors.
6. Evidence/provenance model, chain-of-custody actions, digests, and source records.
7. CASE/UCO + PROV-O JSON-LD import/export adapters; iCalendar and TimelineJS interchange.
8. Tamper-evident audit/export bundle and reporting.
9. Scale/performance/accessibility certification with large datasets.

## Non-goals for the first implementation

- claiming forensic certification;
- replacing dedicated evidence-container formats;
- embedding binary evidence directly in the chronology JSON;
- requiring ontology knowledge from ordinary users;
- forcing forensic forms on non-forensic timelines;
- geological/cosmological time before the human-history scale is correct and tested.


## Evidence support model

Evidence is reusable top-level data. Chronology items reference evidence by ID rather than embedding the same source repeatedly.

A record can represent:
- article/news source;
- PDF/document exhibit;
- analyst or witness note;
- generic document/record.

The relationship is intentionally phrased as *supports* rather than *proves*. Evidence records carry metadata and explanatory notes; separate provenance, chain-of-custody, authenticity, conflict, and evidentiary-weight models can extend them later.

Uploaded binary documents belong in browser file storage (currently IndexedDB), while canonical JSON keeps stable metadata and a blob key. Exporters must never silently inline large PDF binaries.

## Focus layout variants

Focused-event presentation is canonical-content / derived-layout:

- `hero-split`: large hero field with a supporting information rail;
- `evidence-dossier`: evidence dominates the right-hand reading field while media/context remain on the left;
- `editorial-mosaic`: narrative copy leads and media occupies an asymmetric opposite field.

The variant is stored under `item.presentation.variant`. The content and evidence model do not change between variants.

## Focus composition grid

Focused event presentation uses the 12-column system as a composition constraint rather than a generic equal-column dashboard.

- common lower row: Place and Relations remain explicit semantic sections, with their interactive map/graph reused as subdued section backdrops;
- focused overlays use a compact six-column grid; the timeline stage itself has no column grid;
- following row: evidence spans all six overlay columns;
- hero split: four-column visual field with a two-column context rail;
- evidence dossier: balanced three-column hero and three-column reading field;
- editorial mosaic: two-column context field opposite a four-column media field.
- there is no separate Chronology section: the fullscreen timeline is the chronology, and the hero is the focused event selected from it.

Hero titles use container-relative `cqi` sizing rather than viewport width and deliberately become larger on focus because they are the primary identity of the selected timeline event. Cap/alphabetic `text-box` trimming is not used on the hero heading because display-face glyph bounds can be clipped. The heading retains block padding, balanced wrapping, and break-word protection for unusually long identifiers.

## Responsive presentation stage

The timeline is the persistent application and presentation canvas. The temporal relation graph retains an independent interaction model, but appears as an explicit overlay exploration surface in normal application mode and as a contextual backdrop inside focused Relations.

Presentation state records two independent dimensions:

1. **timeline orientation** — horizontal or vertical time axis;
2. **available stage shape** — wide, stacked/balanced, or tall.

Physical screen orientation never rewrites the timeline orientation.

### Composition rules

- The timeline owns the entire fullscreen stage at all times; selecting an event never gives a sibling surface layout ownership.
- With no focused event, the timeline axis remains centered.
- With a focused event, the timeline surface still fills the viewport while its axis shifts toward the lower edge for a horizontal timeline or the right edge for a vertical timeline.
- Event detail is promoted to the browser top layer as one responsive overlay. Desktop placement is chosen opposite the active timeline edge: upper/centered for a horizontal timeline and left/centered for a vertical timeline. Constrained mobile layouts progressively become a sheet while leaving timeline context visible.
- Place and relation sections remain part of the event-detail six-column composition. Their existing map and Orb graph renderers are moved behind their respective text as subdued interactive backdrops instead of consuming timeline geometry.
- The detail overlay is intentionally bounded and density-aware: desktop uses a wider but shallower compact composition (up to roughly 900 px for horizontal time or 720 px for vertical time) with clipped/condensed secondary copy so normal desktop cases do not require an internal scroll. Mobile remains a scrollable sheet capped to preserve visible timeline context.
- All visual surfaces use `min-width: 0` / `min-height: 0` contracts so maps, canvases and media can shrink without causing overflow.

### Application-shell ownership

Normal application mode follows the same ownership principle as fullscreen: the timeline remains viewport-sized and utility UI never participates in its layout geometry.

- Mobile is the baseline. The editor and Browse experience are compact bottom sheets above the timeline, capped below full-screen height and using safe-area insets and touch-sized controls.
- At wider viewports those sheets progressively become narrow bounded sidebars without changing timeline dimensions; editor forms use a six-column internal grid, typically expressed as two three-column fields or one six-column field.
- Browse owns search, category filtering, empty-state explanation and the chronology list. Those are not repeated on the primary canvas.
- Active Story navigation is a compact contextual mode overlay outside Browse, so story position/previous/next/exit remain available while the timeline is being read.
- Item, Story, Category and Graph forms reuse the existing data model inside one editor surface with internal tabs; the global tool dock therefore exposes one Edit entry rather than duplicating editor tabs.
- Viewing is the default application paradigm. Browse, Relations, View, event focus, graph inspection and fullscreen presentation are non-mutating.
- Edit is the only supported transition into mutation mode. Entering it closes event focus and other large viewing surfaces; the dock collapses to the Edit/Done control until editing ends. Graph clicks cannot enter an editor while viewing.
- The global viewing dock is limited to Edit, Browse, Relations and View, using semantic icon + text pairs for recognition at touch and desktop distances.
- Relation-graph exploration is opened explicitly as the Relations overlay rather than occupying a permanent sibling column.
- Timeline orientation, zoom, auto-advance and presentation controls are progressively disclosed in a compact View surface.
- Project actions live in a native, grouped Project popover from the floating command bar. Export and source navigation remain available while viewing; import, load-example, clear-project and project-title mutation are disabled until Edit mode is explicitly entered. Import actions remain explicit buttons wired to hidden file inputs so every visible enabled menu command is keyboard-operable.
- Exactly one major viewing/authoring surface is shown at a time. Opening Edit, Browse, Relations, View controls, or an event focus automatically closes the other major surfaces. Contextual Story controls yield while a utility surface is open. The timeline stays visually present beneath overlays.
- With no events the timeline still renders its neutral axis; guidance for the empty project lives in Browse rather than replacing the workspace.

Fullscreen targets `#presentation-stage`, not editor/browser/project surfaces. Browser fullscreen therefore naturally excludes application chrome and preserves the timeline-plus-focused-event presentation.

Focus/unfocus changes use named Web View Transitions for the timeline and detail overlay. Reduced-motion preferences bypass animated transitions.

### Focused event presentation

Focused event mode does not duplicate chronology in the detail overlay: the fullscreen timeline is the chronology, and the enlarged hero heading is the selected event's identity. It reuses the existing Place and Relations sections rather than creating independent fullscreen lenses. The canonical temporal graph remains one renderer: its Orb canvas moves into the Relations section while focused and returns to the ordinary graph lens afterward. The presentation map follows the same ownership pattern, moving into the Place section and retaining pan/zoom/touch interaction.

Text remains the foreground information layer. Map and graph backdrops use reduced opacity/saturation plus a directional paper scrim, keeping labels readable while leaving exposed portions of each visualization directly interactive. The relation graph is a direct-manipulation surface: selecting a node or edge only changes graph selection styling and never opens an inspector, JSON panel, navigation target, or editor.

### Resize synchronization

A `ResizeObserver` measures the presentation stage and updates its shape class. Timeline geometry rerenders after any stage resize. Graph topology is not recomputed merely because presentation dimensions change; Orb is recentered against its existing node positions. Fullscreen changes receive a two-frame geometry refresh so layout, canvas size and graph camera settle after the browser finishes resizing the fullscreen element.


## Fullscreen evidence presentation surfaces

A focused fullscreen event has two compositional layers:

1. the timeline, which permanently owns the full viewport and shifts its axis toward an edge when focus is active;
2. the event-detail top layer, which contains the selected event hero, context, evidence, Place and Relations sections; it does not repeat chronology as a separate section.

The Place section renders stored GeoJSON context behind its foreground text. Semantic-icon markers identify points; LineString/MultiLineString geometries provide tracks or trails; Polygon/MultiPolygon geometries provide areas; GeometryCollection/Feature/FeatureCollection inputs and optional `mapFeatures[]` overlays are supported. Recorded point accuracy may appear as an uncertainty circle. The presentation map is interactive: panning, wheel/pinch zoom, double-click zoom, box zoom and keyboard navigation are enabled.

The Relations section reuses the focused event's one-hop Orb neighborhood behind the foreground relation text. The graph remains interactive for node/edge selection, long-press/touch drag, pan/zoom and force-mediated repositioning. Selection has no interface side effect; mutation is unavailable until the user explicitly enters Edit mode.

Physical screen orientation never mutates the selected timeline-axis orientation; it only influences whether event detail behaves as a bounded popover or a sheet.
