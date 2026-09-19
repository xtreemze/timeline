# Timeline

**Build a chronology, then tell the story inside it.**

[![GitHub Pages](https://img.shields.io/github/actions/workflow/status/xtreemze/timeline/pages.yml?branch=main&label=GitHub%20Pages)](https://xtreemze.github.io/timeline/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-2ea44f)](#architecture)

Timeline is a local-first visual chronology workspace for research, incident reconstruction, project histories, evidence review, biographies, historical analysis, and other work where sequence and context matter.

It models two different questions separately:

1. **What happened, and when?** — the canonical chronology contains point events and date ranges.
2. **Which moments matter to this explanation?** — stories reference selected chronology items in an intentional narrative order.

That distinction lets one event participate in several stories without duplicating or rewriting the underlying timeline.

## Live application

**https://xtreemze.github.io/timeline/**

The application is static and runs entirely in the browser. Timeline data is stored locally unless you explicitly export it.

> GitHub Pages must be enabled for the repository with **Settings → Pages → Source → GitHub Actions** before the deployment workflow can publish the site.

## Current capabilities

### Chronology

- Create point **events** or **ranges** through one calendar field: events select one date; ranges select two dates in the same calendar, with an explicit year control.
- Add native clock inputs independently to either range boundary while retaining explicit temporal precision.
- Preserve ISO 8601 date/time values, certainty, IANA time zone identifiers, and source UTC offsets.
- Assign an optional structured place and WGS 84 point; choose coordinates manually, from the map, or through Chrome's native geolocation control.
- Attach up to three photographs to an event and browse them as a hero slideshow in focused view.
- Add semantic tags with selectable icons and hue-only theming; lightness/chroma and foreground contrast stay under design-system control and meaning never depends on color alone.
- Select an event to give it the full 12-column chronology workspace; the editor yields the screen, the event becomes an asymmetric composition, and the timeline docks to an edge for context.
- Choose among three focused-event grid compositions: **Hero split**, **Evidence dossier**, and **Editorial mosaic**.
- Move explicitly to the previous or next focused event without leaving the composition.
- Run a configurable auto-advance presentation timer; any manual interaction pauses it until explicitly resumed.
- Navigate focused events and stories with keyboard, TV-remote D-pad/media keys, or standard-mapped gamepads using one shared command model.
- Edit and delete items without manually re-sorting the chronology.
- Deterministic sorting by start, end, and title.
- Search titles and descriptions.
- Filter the visible chronology by category.
- Expand or collapse case-oriented category groups in the detailed chronology while story focus preserves authored narrative order.
- Responsive timeline rendering for desktop, tablet, and narrow mobile layouts.
- Pixel-collision clustering: overlapping event terminals temporarily fuse into interactive clusters while zoomed out, then separate as zoom creates room.
- Weighted zoom and inertial pointer panning using frame-aligned/coalesced pointer samples where Chrome exposes them.
- Capability-gated haptics for cluster fusion/splitting, selection, and inertial release through gamepad actuators or mobile vibration hardware when available.
- Focused presentation controls: Left/Right move between events, Up/Down move between event photographs, Space or media Play/Pause toggles auto advance, and Escape/Browser Back exits focus. Standard gamepad D-pad/shoulders, A/B and Start map to the same presentation commands.
- Ambient month/year accents for months containing up to three visible segments, with compact tick numbering underneath.
- A 12-column application/stage grid that reserves predictable space for chronology, detail and temporal relationship layers.

### Categories

The defaults use case-oriented classifications: Incident, Witness / Interview, Communication, Evidence, Document / Record, Decision / Action, Transaction, and Observation.

- Create unlimited custom categories.
- Edit category names and accent colors.
- Reclassify chronology visually without changing temporal data.
- Delete categories safely; referenced items are reassigned rather than orphaned.
- See item usage counts for every category.

### Stories

A story is an ordered list of references to chronology items. The bundled case fixture contains five concurrent stories at different temporal scales: one within a day, others spanning months, and long-range narratives spanning multiple years. Three recurring people-groups and three recurring locations connect the stories through the relation graph.


- Select any events or ranges for a story.
- Arrange them independently of chronological order.
- Edit and delete stories without altering the referenced items.
- Focus a story to hide unrelated chronology.
- Step through its selected moments with Previous / Next navigation.
- Reuse one chronology item in any number of stories.

This is deliberately a reference model rather than a copy model: stories do not own events.

### Evidence and claims

Events can reference reusable evidence records through `evidenceIds[]`. Supported source types include news/articles, PDF exhibits, text notes, and generic documents/records.

Evidence metadata—title, source, URL, date, explanatory note, file metadata—is part of the portable timeline document. Uploaded PDF bytes are stored separately in IndexedDB under the evidence ID and are intentionally **not** embedded in JSON or interchange exports. This avoids turning local chronology files into large binary containers.

Evidence records can optionally preserve forensic identity and integrity metadata: source/original filename and locator, exhibit/root-exhibit identifiers, source/acquired-copy/derived-artifact class, explicit digest values, acquisition time/person/method/place/tool, source-item identity, and derived-artifact lineage. The canonical document also preserves separate timestamped `custodyActions[]`; custody history is not represented by overwriting a single current-custodian field.

The focused event composition includes a dedicated Evidence section and surfaces available forensic class, exhibit and digest metadata. An attachment means “this source is offered in support of this event/claim”; Timeline does not automatically infer truth, evidentiary weight, authenticity, admissibility, or causation from attachment alone.

See `docs/EVIDENCE-MODEL.md`.

### Data and portability

- Browser-local persistence with `localStorage`.
- Automatic migration of the original v1 `events[]` browser data to v2.
- Strict JSON validation at import boundaries.
- JSON export preserving categories, chronology items, ranges, stories, structured temporal extents, locations, entities, temporal relationships, evidence metadata, focus-layout preferences, and namespaced interchange extensions.
- Vendor-neutral JSON/XML interchange import for events, periods, groups, and common external field aliases, with unrecognized source records preserved under `extensions.externalInterchange`.
- Vendor-neutral interchange JSON export with a published JSON Schema and round-trip preservation of imported extension fields.
- Markdown export containing the canonical chronology plus each narrative story.
- Imported text is rendered through DOM text nodes, never injected as HTML.
- No runtime packages, telemetry, account system, database, or backend.

## Data format

Version 2 uses four top-level concepts:

```json
{
  "version": 2,
  "title": "Launch chronology",
  "categories": [
    {
      "id": "project",
      "name": "Project",
      "color": "#c4320a"
    }
  ],
  "items": [
    {
      "id": "evt-created",
      "kind": "event",
      "start": "2026-09-11T09:30",
      "end": null,
      "title": "Repository created",
      "description": "Initial public repository established.",
      "categoryId": "project"
    },
    {
      "id": "range-build",
      "kind": "range",
      "start": "2026-09-12",
      "end": "2026-09-14",
      "title": "Prototype implementation",
      "description": "Implementation and review period.",
      "categoryId": "project"
    }
  ],
  "stories": [
    {
      "id": "story-launch",
      "title": "Path to launch",
      "description": "The decisions and work that produced the first release.",
      "itemIds": ["evt-created", "range-build"]
    }
  ]
}
```

### External interchange

External interoperability is isolated behind `site/interchange-adapter.js`; source-specific data does not become Timeline's canonical schema. Common event/period/group aliases are normalized while unknown source records remain under `extensions.externalInterchange` for round-trip safety.

The exported interchange schema is `schemas/interchange-v1.schema.json`. See `docs/INTERCHANGE.md` for the adapter boundary and loss-preservation rules.

### Temporal graph values

Timeline now preserves optional reusable `entities[]` and `relationships[]` alongside chronology items. Relationships use `subjectId`, `objectId`, a semantic `predicate`, optional `role`, attributes, and the same structured temporal extent used by events. A relationship with an interval is projected into a reserved relation band on the timeline so the viewer can see *when the relationship itself was active*.

The graph adapter can emit Memgraph Orb-compatible `{ nodes, edges }` data without making Orb a canonical dependency. Full large-scale Orb/WebGL integration is intentionally deferred until it can use the npm/bundled path with workers rather than the direct browser bundle, which Memgraph documents as running simulation on the main thread.

See `docs/TEMPORAL-GRAPH-ARCHITECTURE.md`.

### Temporal and spatial values

`start` / `end` remain compatibility projections, while normalized records now also carry a structured `time` extent. Date-only values use ISO 8601 calendar dates. Clock values can preserve minute, second, or millisecond precision and, when an IANA time zone is selected, include the resolved UTC offset.

```json
{
  "start": "2026-09-19T12:06:31.125+08:00",
  "time": {
    "type": "instant",
    "start": {
      "value": "2026-09-19T12:06:31.125+08:00",
      "precision": "millisecond",
      "certainty": "exact",
      "calendar": "gregorian",
      "timeZone": "Asia/Manila",
      "utcOffset": "+08:00",
      "sourceText": null
    },
    "end": null
  },
  "location": {
    "name": "Stockholm",
    "geographicIdentifier": "Stockholm, Sweden",
    "address": "",
    "geometry": {
      "type": "Point",
      "coordinates": [18.0686, 59.3293]
    },
    "crs": "OGC:CRS84",
    "source": "manual"
  }
}
```

Ranges require both endpoints and the normalized end instant cannot precede the start. GeoJSON/CRS84 point coordinates are stored in longitude-latitude order. See `docs/TEMPORAL-SPATIAL-INTERCHANGE.md`.

### Referential rules

- `item.categoryId` references `categories[].id`.
- `story.itemIds[]` references `items[].id`.
- Story item IDs are unique within each story.
- Import normalization removes story references to missing items.
- Unknown imported category IDs are preserved by creating a matching category rather than silently discarding classification.

## Interaction model

The application has three editing surfaces and one canonical viewer:

```text
┌──────────────── Editor ───────────────┐  ┌──────── Chronology ────────┐
│ Items | Stories | Categories         │  │ Search + category filter   │
│                                       │  │                            │
│ Event/range editor                   │  │ chronological items        │
│ Story sequence builder               │  │          or                │
│ Category manager                     │  │ focused story sequence     │
└───────────────────────────────────────┘  └────────────────────────────┘
```

On smaller screens the editor stacks above the chronology. The information architecture and data model remain identical rather than switching to a reduced mobile feature set.

## Story design

Stories are intentionally orthogonal to chronological order.

For example, a research timeline might contain 300 events sorted by date. A story called **Decision failures before launch** can select eight of those events and arrange them in the order that best explains the argument. A second story can reuse four of the same events to explain a different causal thread.

The canonical items remain unchanged in both cases.

This permits future extensions such as:

- presentations and guided walkthroughs;
- saved analytical lenses;
- branching stories;
- citations or evidence trails attached to individual moments;
- shareable read-only story URLs;
- story-specific annotations without mutating source chronology.

## Architecture

Timeline deliberately uses the browser platform directly. The browser target is the **latest Chrome Beta**; as of September 19, 2026 that is Chrome 155 Beta. When a required capability is available in that target, Timeline uses the native platform API instead of shipping a JavaScript substitute. Native `time` controls, the Temporal API, the `<geolocation>` element, Pointer Events, ResizeObserver, and the Popover API are examples. HTML does not expose a two-date range input, so Timeline's small range-calendar component uses a single readonly field plus a native top-layer popover while keeping ISO date values separate from clock/time-zone semantics.

Leaflet is loaded lazily only for the optional interactive map because the browser platform has no native slippy-map control. Standard OpenStreetMap raster tiles are used with visible attribution and no offline/prefetch behavior; the tile provider is replaceable through `globalThis.TimelineMapTileProvider`.

The ambient timeline numeral face is pinned to Monaspace Krypton v1.400 with a local-font first lookup and web fallback. Its `calt` feature enables Monaspace texture healing. Chrome's `font-size-adjust: ex-height from-font` and `text-box: trim-both ex alphabetic` align accent typography to actual font metrics rather than hand-tuned line boxes.

Event tags expose hue as the only user-controlled color dimension. Their lightness/chroma remain fixed in OKLCH, and Chrome's `contrast-color()` is used when available to derive a readable text/icon foreground. Labels and semantic icons remain present so classification never relies on hue alone.


```text
GitHub Pages
└── site/
    ├── index.html       semantic application shell
    ├── styles.css       responsive visual system
    ├── app.js           model, migration, validation, state, rendering
    └── icon.svg         application mark
```

There is no framework, bundler, backend, telemetry SDK, or runtime dependency tree. The deployment workflow performs a JavaScript syntax check before uploading the static Pages artifact.

This makes the current implementation easy to audit and keeps architectural complexity proportional to the product.

## Run locally

No build step is required.

```bash
git clone https://github.com/xtreemze/timeline.git
cd timeline
python3 -m http.server 8080 --directory site
```

Open `http://localhost:8080`.

For a fast JavaScript syntax check:

```bash
node --check site/app.js
```

## Backward compatibility

The initial public prototype stored this shape under `timeline:v1`:

```json
{
  "version": 1,
  "title": "Example",
  "events": []
}
```

v2 checks for `timeline:v2` first. If none exists but v1 data does, the application migrates each legacy event to a v2 point item and writes the normalized result under `timeline:v2`.

The migration leaves the old browser-storage key untouched as a conservative fallback.

## Development principles

1. **Chronology is canonical.** Stories and presentation layers reference it rather than owning copies.
2. **Temporal invariants are validated.** Invalid calendar dates and inverted ranges are rejected at boundaries.
3. **Imported data is untrusted.** Normalize before state entry; never render imported HTML.
4. **Deletion preserves referential integrity.** Removing an item removes its story references; removing a category reassigns its items.
5. **Local-first is a product property.** Static hosting must not imply custody of user timeline content.
6. **Mobile is not a reduced product.** Responsive layout changes presentation, not capability.
7. **Complexity must earn its place.** Add dependencies only when the web platform stops being the simpler reliable solution.

## Next directions

The v2 model provides a stable base for richer chronology work. Strong next additions include approximate/uncertain dates, provenance and citations, tags, attachments, spatial locations, scalable navigation for very large timelines, printable layouts, image/PDF export, story annotations, presentation mode, and shareable read-only artifacts.

## Licensing boundary

Timeline's MIT license covers this project's software. It does **not** relicense timelines, evidence, user data, imported documents, media, or third-party material processed with the application.

## License

Timeline is released under the [MIT License](LICENSE).

Copyright © 2026 Carlos Eduardo Velasco Romero.
