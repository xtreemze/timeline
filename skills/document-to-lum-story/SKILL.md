---
name: document-to-lum-story
description: Generate a new Lūm continuum/story from uploaded documents or user-supplied text, then stage it for user verification. Use when starting from source documents/text rather than editing an existing project.
---

# Generate a Lūm story from source documents

Treat the user's uploaded documents and supplied text as the source authority for this workflow. Build a complete Lūm project proposal from those sources, then hand it back for user verification.

## Required workflow

1. Read all user-provided documents and text before authoring canonical records.
2. Call `lum.get_story_authoring_guide` before constructing a new project.
3. Create a compact source manifest. Preserve source IDs, titles, media types, and useful locators such as page, section, paragraph, timestamp, message ID, or exhibit number when available.
4. Frame the source material into one or more coherent stories. Stories are authored traversals over chronology items; they are never graph topology.
5. Extract chronology items from source-supported occurrences. Prefer meaningful events and ranges over sentence-by-sentence fragmentation.
6. Preserve temporal uncertainty:
   - use exact dates/times only when supported by the source;
   - use ranges for sustained periods;
   - do not invent an absolute date merely to position an event;
   - when only relative order is known, leave the absolute time unresolved unless the user explicitly permits synthetic ordering coordinates for fictional/demo material.
7. Extract durable entities as nouns with independent identity. Do not create entity nodes for actions, occurrences, dates, times, places, categories, or stories.
8. Create one directed subject-action-object relationship for each supported action fact:
   - endpoints are two different canonical entities;
   - predicate is a concrete action verb, optionally followed by one grammatical particle;
   - time belongs on `relationship.time`;
   - place belongs on `relationship.placeId`;
   - chronology linkage belongs in `relationship.itemIds`.
9. Create a canonical place only when source/user material provides explicit usable geometry. Do not geocode from model memory.
10. Link chronology items to the evidence that supports them with `evidenceIds`, and relationships to supporting evidence with `sourceIds`.
11. If a named canonical entity appears in an item's semantic narrative, connect it through a meaningful action edge linked to that item. Never invent a relationship merely to satisfy validation; record the gap as unresolved instead.
12. Keep categories on chronology items only. Keep stories outside graph topology.
13. Use stable human-readable IDs and keep IDs unique across items, stories, entities, relationships, and places.
14. Call `lum.stage_story_project` with the complete project, source manifest, unresolved facts, and short generation notes.
15. Repair every structural/preflight error and stage again until the response is `ready-for-user-verification`.

## Source discipline

Do not add facts from model memory, external search, or general world knowledge unless the user explicitly asks to combine those sources with the uploaded material.

Do not send entire raw documents or binaries to `lum.stage_story_project`. Read them in the host and send the structured Lūm proposal plus source metadata.

Do not suppress contradictions. Preserve competing statements in evidence and surface unresolved conflicts to the user.

Do not convert uncertainty into false precision. An unknown coordinate, date, identity, or relationship remains unresolved.

## Deliverable

Return the complete Lūm project JSON together with:
- the source manifest;
- unresolved or ambiguous facts;
- a short note describing source coverage and any assumptions;
- the staging preflight status.

State clearly that the generated project is a source-derived proposal and has not yet been factually verified by the user.

The next step is user verification in the live Lūm application:
1. import/open the generated project;
2. run `timeline.audit_graph`;
3. run `timeline.validate_project`;
4. inspect evidence locators, chronology, entities, action relationships, dates, and places;
5. accept, edit, or reject generated content.

A successful public MCP preflight is not equivalent to factual verification.
