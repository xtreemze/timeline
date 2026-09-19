# External interchange

Timeline keeps external import/export compatibility behind a vendor-neutral adapter so third-party field names do not become part of the canonical chronology model.

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

Stories, entities, temporal relationships, and evidence metadata are retained in the `_timeline` envelope when the target structure does not have an equivalent first-class concept. Uploaded PDF bytes remain local and are never embedded in interchange JSON.

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