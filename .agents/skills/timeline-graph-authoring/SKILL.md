---
name: timeline-graph-authoring
description: Author, import, repair, or review Lūm continuum data through the legacy timeline.* WebMCP compatibility surface. Use whenever a task creates or edits occurrence/event context, entities, relationships, places, graph-linked evidence, stories, or Memgraph round-trips. Do not use for visual/layout-only work.
---

# Lūm continuum authoring

Use Lūm's runtime contract as the authority. The public product vocabulary is defined in `docs/LUM-TERMINOLOGY.md`; the `timeline.*` tool prefix remains a compatibility namespace. Do not rely on remembered graph rules.

## Required workflow

1. Call `timeline.get_graph_contract` before any graph-capable mutation and retain the returned `version`.
2. Call `timeline.get_project` and inspect the existing canonical entities, aliases, places, relationships, stories, and event context before creating records.
3. Extract every durable named entity from event narrative context:
   - include event title and description;
   - include descriptive image alt text;
   - include attached evidence `note` text;
   - exclude image credit/provenance captions and evidence source/title/URL/file/forensic metadata.
4. Resolve mentions to existing canonical entities first. When an event has `extensions.narrative.storyId`, prefer entities scoped to that story over same-named entities from another story.
5. If a durable named entity is not canonical yet, create/reuse exactly one entity node for it in the same atomic transaction. Never create nodes for actions, events, meetings, transactions, decisions, places, dates, times, coordinates, geometry, categories, or stories.
6. Model each relationship as one directed subject–action–object fact. A relationship with canonical time is an occurrence in the continuum:
   - source and target must be two different entity nodes;
   - predicate is one concrete action verb, optionally followed by one grammatical particle;
   - never put an entity/object name, role, instrument, cause, place, date, or time into the predicate;
   - store time in `relationship.time`;
   - store place as `relationship.placeId`;
   - link event context through `relationship.itemIds[]` or a valid `relationChanges[]` reference.
7. Every canonical entity named in an event's narrative context must be an endpoint of at least one meaningful action edge linked to that event. Never invent a relation merely to satisfy coverage. If the source does not establish a meaningful action, leave the mutation unresolved and report what relationship evidence is missing.
8. Keep categories on current v2 chronology items only. Do not attach category/group taxonomy to entities, relationships, or places. Stories remain authored traversals/membership and never graph topology. As #236 lands, prefer occurrence identity over duplicate manually-authored chronology identity.
9. Reuse one edge for one directed action fact. Merge item/source/context metadata onto it instead of creating duplicate edges. Do not create a same-action reverse edge to fake bidirectionality. Distinct reverse actions and genuine cycles are allowed.
10. Batch dependent item + entity + relationship + place changes into one `timeline.apply_transaction` call and pass the exact `graphContractVersion` from step 1.
11. Call `timeline.audit_graph` after mutation. Resolve every error, including self-loops, invalid predicates, category leakage, duplicate/mirrored facts, orphan nodes, unknown references, and uncovered named entities.
12. Call `timeline.validate_project` last. Do not consider the task complete unless both audit and full validation are clean.

## Modeling examples

Valid:
- `wolf --attacks--> brick-house`
- `queen --poisons--> apple`
- `prince --dancesWith--> cinderella`

Invalid:
- self-loop: `wolf --attacks--> wolf`
- entity embedded in predicate: `wolf --attacksBrickHouse--> brick-house`
- generic relation: `person --relatedTo--> person`
- place as node: `alice --visits--> stockholm-place-node`
- taxonomy on graph record: `entity.attributes.categoryId = "people"`

## Final checks

Before finishing, confirm:
- every named contextual entity resolves to the intended canonical entity;
- every named contextual entity participates in an event-linked action edge;
- all edge endpoints differ;
- predicates contain action semantics only;
- no action fact is duplicated or mirrored;
- no canonical entity is orphaned;
- time/place/category/story data are in their canonical domains;
- MCP graph contract version still matches;
- `timeline.audit_graph` and `timeline.validate_project` both pass.
