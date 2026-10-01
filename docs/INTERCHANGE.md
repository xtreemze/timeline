# External interchange

Lūm keeps the legacy `timeline.interchange` import/export shape as an external compatibility adapter. It is not a peer canonical project format; portable canonical projects use `lum-project` / `.lum.json`.

## Canonical Lūm bridge

`TimelineInterchangeAdapter.toLumInterchange(input, { projectKey, savedAt })` converts a graph-rich legacy interchange document into the normative Lūm Project Interchange. `timelineToLumInterchange` provides the same bridge for an already-normalized legacy Timeline document.

The bridge is deliberately fail-closed. It does not invent actors, relationships, places, or story membership to make generic chronology fit the canonical model. Conversion is rejected when legacy records would otherwise be silently dropped, including:

- timeline items that are not owned by a story;
- relationships not associated with a canonical story occurrence;
- orphan legacy entities or places;
- legacy trajectories that have not passed through the canonical trajectory importer.

Legacy `start/end` chronology is promoted to canonical occurrence temporal extents before the production compiler/validator runs. Stable IDs are preserved.

Generic event/period import remains available as a compatibility/runtime path, but such data is not called canonical Lūm until the explicit bridge succeeds.

## Import mapping

The adapter recognizes common chronology concepts and aliases:

| External concept | Timeline |
| --- | --- |
| point / event / milestone | `item.kind = "event"` |
| period / range / interval / era | `item.kind = "range"` |
| group / category / tag | category |
| group membership | `item.categoryId` |
| title / name / label / text | item title |
| description / content / details / notes | item description |
| media / attachments | preserved external extension data |
| comments / statistics / unrecognized fields | preserved external extension data |

JSON containers such as `events`, `points`, `milestones`, `periods`, `ranges`, `intervals`, `groups`, `categories`, and `tags` are recognized. XML interchange uses the browser-native `DOMParser`.

## Preservation boundary

Unknown source records are preserved under `extensions.externalInterchange` and can be merged back during export. Canonical Timeline fields always override preserved vendor values.

Stories, entities, temporal relationships, and evidence metadata are retained in the `_timeline` envelope when the target structure does not have an equivalent first-class concept. Uploaded PDF/image/audio/video bytes remain local and are never embedded in interchange JSON. Their file metadata, including the locally computed SHA-256 fingerprint when present, remains portable. Derived PDF/OCR text segments remain ordinary evidence metadata and round-trip with page/image locator and extraction-method provenance.

## Export envelope

```json
{
  "title": "Example",
  "groups": [],
  "events": [],
  "periods": [],
  "_timeline": {
    "format": "timeline-interchange",
    "schemaVersion": 1,
    "generatedBy": "xtreemze/timeline",
    "canonicalVersion": 2,
    "stories": [],
    "entities": [],
    "relationships": []
  }
}
```

The schema is published at `schemas/interchange-v1.schema.json`.

This contract is intentionally vendor-neutral. Individual source adapters may recognize additional aliases, but the rest of Timeline should work only with canonical chronology, temporal, spatial, media, tag, entity, relationship, story, and extension structures.

## Relation lifecycle preservation

Event-level `relationChanges[]` are preserved on exported event/period records. Relationship `initialState` and other edge metadata are preserved under the `_timeline.relationships` envelope. This allows activate/deactivate/update history to round-trip without flattening the graph to its latest visible state.