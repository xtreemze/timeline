# Canonical graph modeling rules

Lūm uses a deliberately strict labelled-property-graph profile. The underlying graph ecosystem can represent broader structures, but Lūm optimizes for an explanatory continuum: durable entities are nodes, concrete actions are directed relationships, and time/place/evidence context stays on those relationships. A timed relationship is an occurrence and can project directly into chronology without becoming an event node.

This guide is normative for Lūm's canonical relational data. `site/timeline-graph.ts` is the current executable compatibility contract. The occurrence-first migration is tracked by #236; where the v2 runtime still requires `items[]` context, this document calls that compatibility behavior out explicitly.

## External guidance reviewed

Reviewed and refreshed 2026-09-24:

- Memgraph, **From Raw to Graph: 3 Essential Steps to Load Your Data into Memgraph**: not everything needs to be a node; use direct descriptive relationships; minimize duplication; use constraints/indexes deliberately. https://memgraph.com/blog/preprocess-model-import-graph-data
- Memgraph, **Graph Database Best Practices**: model around the label-property-graph components and decide explicitly what belongs as a node, property, or relationship. https://memgraph.com/academy/graph-database-best-practices
- Memgraph, **Cypher Best Practices**: keep graph naming conventions explicit and consistent; Cypher relationship types conventionally export as uppercase underscore names. https://memgraph.com/blog/cypher-best-practices
- Neo4j, **Cypher style guide / naming rules**: property keys use lower camel case; exported node labels conventionally use PascalCase and relationship types SCREAMING_SNAKE_CASE. Lūm keeps lower-camel domain types and predicates in canonical JSON, then maps them at the Cypher boundary. https://neo4j.com/docs/cypher-manual/25/styleguide/ and https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/
- Neo4j, **Create a graph data model**: dominant nouns become entities/nodes; connections are verbs; relationship types should be specific; unique identifiers should be enforced. https://neo4j.com/docs/getting-started/data-modeling/tutorial-data-modeling/
- Neo4j, **Graph database concepts**: relationships have one source, one target, one direction and one type; relationship properties describe the connection. A duplicate opposite-direction edge is unnecessary unless it represents different domain meaning. https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/
- Amazon Neptune, **openCypher best practices**: use granular edge labels, specify relationship types, and prefer deterministic custom IDs where supported. https://docs.aws.amazon.com/neptune/latest/userguide/best-practices-opencypher.html
- Amazon Neptune, **openCypher data model**: a relationship has exactly one type and forms a unidirectional connection between two nodes; nodes and relationships may carry properties. https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-opencypher-data-model.html

- W3C, **PROV-O**: provenance distinguishes entities, activities and agents, and supports qualified relation context such as time, role and location. Lūm follows the same separation by keeping occurrence time/place/provenance on relationships rather than manufacturing event/place nodes. https://www.w3.org/TR/prov-o/
- Wikidata, **Statements**: subject–predicate–object claims can be enriched with qualifiers and references; referenceable sources make statements verifiable. Lūm treats time/place as qualifiers/context and `sourceIds[]` as claim provenance. https://www.wikidata.org/wiki/Help:Statements
These sources inform the profile; they do not replace Lūm-specific constraints. For example, general property graphs may allow self-relations and isolated nodes. Lūm deliberately rejects self-loops and canonical orphan/container nodes because they obscure action semantics in a chronology-oriented graph.

## Canonical type contract

### Entity node

A canonical entity is one durable thing with independent identity.

```js
{
  id: "person-a",
  type: "person",
  name: "Alice",
  alternateNames: [],
  identifiers: [],
  sourceIds: [],
  attributes: {}
}
```

Rules:

1. `id` is explicit, stable, and unique across the canonical project namespace.
2. The node represents exactly one durable entity and uses the narrowest defensible domain type. `person`, `organization`, `dwelling`, `vehicle`, `garment`, `food`, `document`, and `buildingMaterial` are acceptable examples; placeholder types such as `entity`, `object`, `thing`, `item`, `resource`, and `agent` are rejected.
3. The name is a noun/entity label, not an event or action phrase.
4. Events, meetings, transactions, decisions, processes, activities, stories, categories, roles, places, dates, times, geometry, coordinates, and navigation containers are not entity nodes.
5. Node attributes describe the entity itself. Spatiotemporal context belongs on an action edge. Canonical attribute/property keys use lowerCamelCase.
6. A canonical entity must participate in at least one meaningful action edge. A temporarily orphaned node may exist while authoring, but canonical import/demo/export data must not contain orphan/container-only topology.
7. A group node is appropriate only when the collective itself is a durable actor or target. Do not manufacture membership edges such as `memberOf` or `joinsSiblingGroup` merely to connect individuals to a grouping construct.

### Directed action edge

A canonical relationship is one directed action fact between two different durable entities.

```js
{
  id: "edge-a",
  subjectId: "person-a",
  predicate: "calls",
  objectId: "person-b",
  time: { /* canonical instant or interval */ },
  placeId: "place-a",
  itemIds: ["event-a"],
  sourceIds: ["source-a"],
  confidence: 0.9,
  attributes: {}
}
```

Rules:

1. `id` is explicit, stable, and unique.
2. `subjectId` and `objectId` both reference entity nodes and must be different.
3. `predicate` contains only the action: one verb, optionally followed by one grammatical particle such as `searchesFor`, `dancesWith`, or `transferredTo`.
4. Do not put another entity, instrument, role, cause, event, story, place, date, or time into the predicate. `revivesAfterLaces`, `usesToAttack`, `carriesForTest`, and `keepsVigilBeside` are invalid because they conflate action with context.
5. Generic topology labels such as `relatedTo`, `associatedWith`, `connectedTo`, `partOf`, `memberOf`, `presentAt`, or `locatedAt` are not canonical action facts.
6. `time` is the canonical temporal extent. When present, the relationship is an occurrence in the continuum and is eligible for temporal projection. `placeId` references one reusable place record. During the v2 transition, `itemIds[]` may still link legacy chronology/presentation records without making them graph nodes. Provenance/confidence/action metadata remain relationship properties.
7. One directed action fact gets one edge. When additional chronology items, sources, confidence, role, place, or attributes describe the same source–action–target fact at the same temporal extent, merge them onto that edge instead of creating a parallel edge.
8. Do not create the same action in the opposite direction merely to make traversal appear bidirectional. Direction is queryable; a reverse edge is valid only when it records a genuinely distinct reverse action.
9. Graph cycles are allowed. A path such as `A --attacks--> B --evades--> A` is valid because the edges describe distinct facts. “Circular reference” is a problem only when it is a self-loop, mirrored duplicate, fabricated relation, or redundant fact.
10. A unary occurrence does not justify a self-loop or dummy target. If no meaningful second durable entity exists, preserve it as an explicit occurrence record rather than fabricating graph topology.
11. Every non-empty `placeId`, `itemIds[]`, and `sourceIds[]` reference must resolve. Relationship attributes use lowerCamelCase and must not duplicate time/place fields.
12. Bundled examples use direct primary-source provenance on every edge. Production projects may represent uncertainty or unresolved claims, but a demo fact without a source is a quality failure, not a harmless omission.

## Identity and deduplication

Lūm treats the semantic identity of an action edge as:

```
(subject entity, canonical action predicate, object entity, temporal extent)
```

`placeId`, `itemIds[]`, `sourceIds[]`, confidence, role, and other properties describe that fact; they do not create another copy of it.

This mirrors database `MERGE`/constraint thinking: resolve identity first, then enrich the existing fact. The runtime exposes `TimelineGraph.relationshipFactKey()`, `findDuplicateRelationship()`, `findMirroredRelationship()`, and `auditGraphStructure()` so import validation and editor authoring use the same identity rules.

Display names are not identity. Two different entities may have the same name if their stable IDs distinguish them.

## Naming and semantic presentation

Canonical JSON uses lowerCamelCase for node `type`, relationship `predicate`, and property keys. This keeps the authoring/interchange representation readable and stable. Export adapters are responsible for database-specific spelling such as Neo4j `:VehicleOwner` labels and `:SEARCHES_FOR` relationship types.

Semantic presentation is derived from meaning rather than record identity:

- entity type selects a semantic icon, color family, and node shape;
- action predicate selects edge glyph/color/line semantics;
- canonical places carry an explicit semantic icon, marker shape, and style color;
- chronology items carry semantic category/tag presentation plus public-domain media where a defensible illustration exists;
- visual style never substitutes for ontology: changing a color or icon must not change graph identity.

The bundled sample is a certification fixture for this rule. Generic fallback object/place styling is not accepted when the subject can be represented more specifically.

## Provenance quality profile

The sample anthology separates **source claims** from **synthetic presentation coordinates**. Primary texts are stored as evidence records with resolvable URLs and publication/release metadata. Nodes and directed action facts cite the relevant source through `sourceIds[]`; chronology items cite evidence through `evidenceIds[]`. Fictional ISO dates and Storybook Realm coordinates are explicitly marked as inferred ordering/staging anchors and must never be presented as facts asserted by the source.

## Narrative entity coverage

Event prose is not allowed to drift away from graph topology.

Narrative context includes:

- chronology item `title`;
- chronology item `description`;
- descriptive media `alt` text;
- attached evidence `note` text.

Media credit/provenance captions and evidence title/source/URL/file/forensic metadata are excluded because those fields identify the source or artifact rather than event participants.

Rules:

1. If a canonical entity name or alias is named in narrative context, that entity must be the subject or object of at least one meaningful action edge linked to the same chronology item through `relationship.itemIds[]` or `relationChanges[]`.
2. Same-named entities are resolved within `item.extensions.narrative.storyId` when story scope is available. An entity from another story must never satisfy the mention merely because its display name matches.
3. Authors and agents must extract newly named durable entities before committing narrative text. Create/reuse the entity and the relevant action edge in the same atomic operation.
4. Validation never authorizes invention. If the source names an entity but does not establish a meaningful action involving it, do not fabricate an edge merely to satisfy coverage; leave the authoring operation unresolved and identify the missing relation/evidence.
5. Categories classify chronology items only. Category/group taxonomy must not appear on entity nodes, relationships, or place records.

The runtime can deterministically enforce references to already canonical names/aliases. Recognition of a previously uncatalogued entity in free text is an authoring/extraction responsibility, which is why the WebMCP workflow and repository skill require entity extraction before mutation.

## N-ary actions and compound events

General graph models sometimes introduce intermediate event/action nodes to reify a relationship with many participants. Lūm does not reify ordinary actions as semantic entity nodes. In the occurrence-first model, the relationship itself carries occurrence identity through its time/place/evidence/context.

For a multi-party occurrence:

- create the meaningful binary action facts among durable entities;
- share time, place, evidence/context, and occurrence grouping where the facts genuinely belong to one real-world occurrence;
- do not create an Event/Meeting/Transaction entity node merely to connect participants;
- retain a named durable event as its own domain record only when it has independent identity and relationships genuinely target it;
- preserve a unary occurrence explicitly when no meaningful binary action exists rather than fabricating a self-loop or dummy entity.

During v2 compatibility, `items[]` and `relationship.itemIds[]` may still carry presentation/narrative context. They are migration inputs, not the long-term owner of occurrence identity.

## Cypher/export naming

Timeline stores action predicates as readable lower-camel verbs because they are also UI labels. A Cypher adapter may map these to the conventional relationship-type style used by Memgraph/Neo4j, for example:

- `searchesFor` → `SEARCHES_FOR`
- `dancesWith` → `DANCES_WITH`
- `transferredTo` → `TRANSFERRED_TO`

The adapter spelling is not canonical meaning; IDs, direction, predicate semantics, and properties are.

## Memgraph interchange boundary

The Memgraph adapter may persist non-topology Timeline records under dedicated labels such as `:TimelinePlace`, `:TimelineItem`, or `:TimelineStory` so Memgraph MCP can round-trip the complete application state. These labelled records are interchange/storage envelopes only. They do not become canonical Timeline entity nodes and must not be interpreted as permission to introduce place/event/story nodes into `entities[]`.

Only `:TimelineEntity` records participate in the exported canonical action topology. Directed Memgraph relationship types are derived from Timeline action predicates while the original predicate and complete canonical relationship remain preserved as properties. See [WEBMCP-MEMGRAPH.md](WEBMCP-MEMGRAPH.md).

## Validation layers

`TimelineGraph.validateGraphInput()` rejects:

- missing or reused canonical IDs;
- invalid node kinds or event/action-like names;
- spatiotemporal node attributes;
- category/group taxonomy on entities, relationships, or places;
- canonical entity names/aliases mentioned in event narrative context without an event-linked action edge;
- dangling/non-entity endpoints;
- self-loops;
- generic, spatial/temporal, or compound-context predicates;
- dangling place, chronology-item, evidence/source, or entity references;
- non-lowerCamelCase canonical attribute/property keys;
- generic placeholder entity types;
- unknown place references;
- duplicate directed action facts;
- mirrored same-action copies;
- orphan canonical entity nodes;
- invalid predicates introduced by relation-change updates.

`TimelineGraph.auditGraphStructure()` also reports reciprocal entity pairs without treating them as errors. This is intentional: reciprocal topology is useful when the two directions represent different real actions.
