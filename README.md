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

- Create point **events** with native calendar/clock controls and explicit temporal precision.
- Create **ranges** with independently validated start and end endpoints.
- Preserve ISO 8601 date/time values, certainty, IANA time zone identifiers, and source UTC offsets.
- Assign an optional structured place and WGS 84 point; choose coordinates manually, from the map, or through Chrome's native geolocation control.
- Edit and delete items without manually re-sorting the chronology.
- Deterministic sorting by start, end, and title.
- Search titles and descriptions.
- Filter the visible chronology by category.
- Responsive timeline rendering for desktop, tablet, and narrow mobile layouts.

### Categories

- Create unlimited custom categories.
- Edit category names and accent colors.
- Reclassify chronology visually without changing temporal data.
- Delete categories safely; referenced items are reassigned rather than orphaned.
- See item usage counts for every category.

### Stories

A story is an ordered list of references to chronology items.

- Select any events or ranges for a story.
- Arrange them independently of chronological order.
- Edit and delete stories without altering the referenced items.
- Focus a story to hide unrelated chronology.
- Step through its selected moments with Previous / Next navigation.
- Reuse one chronology item in any number of stories.

This is deliberately a reference model rather than a copy model: stories do not own events.

### Data and portability

- Browser-local persistence with `localStorage`.
- Automatic migration of the original v1 `events[]` browser data to v2.
- Strict JSON validation at import boundaries.
- JSON export preserving categories, chronology items, ranges, stories, structured temporal extents, locations, and namespaced interchange extensions.
- Time.Graphics JSON/XML import for events, periods, and groups, with source-specific media/comments/statistics preserved under `extensions.timeGraphics`.
- Time.Graphics-oriented JSON export with a published JSON Schema and round-trip preservation of imported vendor fields.
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

### Time.Graphics interchange

Time.Graphics interoperability is isolated behind `site/time-graphics-adapter.js`; its vendor data does not become Timeline's canonical schema. Imports map Time.Graphics events → events, periods → ranges, and groups → categories. Unknown source fields are retained under `extensions.timeGraphics` for round-trip safety.

The exported interchange schema is `schemas/time-graphics-interchange-v1.schema.json`. See `docs/TIME-GRAPHICS-INTERCHANGE.md` for recognized field aliases, loss boundaries, and the vendor-schema caveat.

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

Timeline deliberately uses the browser platform directly. The browser target is the **latest Chrome Beta**; as of September 19, 2026 that is Chrome 155 Beta. When a required capability is available in that target, Timeline uses the native platform API instead of shipping a JavaScript substitute. Current examples include native date/time pickers, `HTMLInputElement.showPicker()` where explicit picker invocation is useful, the Temporal API for timezone-aware normalization, the `<geolocation>` element for user-initiated location access, the Popover API, CSS Anchor Positioning, pointer events, ResizeObserver, and native top-layer transitions.

Leaflet is loaded lazily only for the optional interactive map because the browser platform has no native slippy-map control. Standard OpenStreetMap raster tiles are used with visible attribution and no offline/prefetch behavior; the tile provider is replaceable through `globalThis.TimelineMapTileProvider`.


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
