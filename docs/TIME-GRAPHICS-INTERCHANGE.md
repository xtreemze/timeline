# Time.Graphics interchange

Timeline supports importing Time.Graphics-style JSON/XML exports and exporting a conservative JSON interchange structure based on Time.Graphics' public concepts.

## Evidence and boundary

Time.Graphics' current public FAQ documents:

- event grouping with editable group name, colors, and description;
- timeline backgrounds;
- multiple media attachments per event;
- a Download flow with selectable export format;
- Google Calendar import.

Its March 2026 Terms / FERPA documentation also states that machine-readable JSON export is available for school data-return workflows.

Time.Graphics does **not** publish a stable JSON or XML field schema. Timeline therefore treats Time.Graphics as an external, version-unstable adapter rather than making vendor fields canonical.

References:

- https://time.graphics/faq
- https://time.graphics/terms
- https://time.graphics/compliance/ferpa

## Import mapping

| Time.Graphics concept | Timeline v2 |
| --- | --- |
| point event / milestone | `item.kind = "event"` |
| period / range / interval / era | `item.kind = "range"` |
| group / category / tag | category |
| event group membership | `item.categoryId` |
| title/name/label/text | item title |
| description/content/details/notes | item description |
| media/attachments | `extensions.timeGraphics.media` |
| comments | `extensions.timeGraphics.comments` |
| statistics/chart/series | `extensions.timeGraphics.statistics` |
| unrecognized source fields | `extensions.timeGraphics.raw` |

The JSON importer recognizes common container aliases such as `events`, `points`, `milestones`, `periods`, `ranges`, `intervals`, `groups`, `categories`, and `tags`.

The XML importer uses the browser-native `DOMParser` and recognizes equivalent event, period, and group elements.

## Temporal conversion

Timeline v2 currently stores either:

- `YYYY-MM-DD`
- `YYYY-MM-DDTHH:MM`

Time.Graphics values containing timezones, seconds, milliseconds, numeric Unix timestamps, or other parseable date strings are normalized to UTC minute precision. The adapter emits a warning and retains the original vendor record under `extensions.timeGraphics.raw` so a later v3 migration can restore richer semantics.

## Export structure

Timeline exports:

```json
{
  "title": "Example",
  "groups": [],
  "events": [],
  "periods": [],
  "_timeline": {
    "format": "time.graphics-interchange",
    "schemaVersion": 1,
    "generatedBy": "xtreemze/timeline",
    "canonicalVersion": 2,
    "stories": []
  }
}
```

The schema is published at `schemas/time-graphics-interchange-v1.schema.json`.

This is intentionally described as a **Time.Graphics interchange** schema, not the official Time.Graphics JSON schema. If imported source records exist, their vendor-specific fields are merged back into the exported event/period/group objects before Timeline's canonical values are applied.

## Lossy boundaries

Timeline stories have no documented Time.Graphics equivalent, so they are retained in `_timeline.stories`.

Time.Graphics-specific statistics, comments, media, and unrecognized fields are preserved as extensions but are not rendered by Timeline v2 yet.

Binary presentation exports (PNG/JPEG/PDF/PPT/DOC/XLS/ZIP) are outside this data adapter. They are presentation/package formats rather than chronology interchange contracts.
