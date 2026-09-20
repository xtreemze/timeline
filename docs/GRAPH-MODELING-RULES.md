# Canonical graph modeling rules

Timeline uses a deliberately strict labelled-property-graph profile. The underlying graph ecosystem can represent broader structures, but Timeline optimizes for explanatory chronology: durable entities are nodes, concrete actions are directed edges, and time/place/evidence context stays on those edges.

This guide is normative for canonical Timeline data. `site/timeline-graph.js` is the executable contract.

## External guidance reviewed

Reviewed 2026-09-20:

- Memgraph, **From Raw to Graph: 3 Essential Steps to Load Your Data into Memgraph**: not everything needs to be a node; use direct descriptive relationships; minimize duplication; use constraints/indexes deliberately. https://memgraph.com/blog/preprocess-model-import-graph-data
- Memgraph, **Graph Database Best Practices**: model around the label-property-graph components and decide explicitly what belongs as a node, property, or relationship. https://memgraph.com/academy/graph-database-best-practices
- Memgraph, **Cypher Best Practices**: keep graph naming conventions explicit and consistent; Cypher relationship types conventionally export as uppercase underscore names. https://memgraph.com/blog/cypher-best-practices
- Neo4j, **Create a graph data model**: dominant nouns become entities/nodes; connections are verbs; relationship types should be specific; unique identifiers should be enforced. https://neo4j.com/docs/getting-started/data-modeling/tutorial-data-modeling/
- Neo4j, **Graph database concepts**: relationships have one source, one target, one direction and one type; relationship properties describe the connection. A duplicate opposite-direction edge is unnecessary unless it represents different domain meaning. https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/
- Amazon Neptune, **openCypher best practices**: use granular edge labels, specify relationship types, and prefer deterministic custom IDs where supported. https://docs.aws.amazon.com/neptune/latest/userguide/best-practices-opencypher.html
- Amazon Neptune, **openCypher data model**: a relationship has exactly one type and forms a unidirectional connection between two nodes; nodes and relationships may carry properties. https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-opencypher-data-model.html

These sources inform the profile; they do not replace Timeline-specific constraints. For example, general property graphs may allow self-relations and isolated nodes. Timeline deliberately rejects self-loops and canonical orphan/container nodes because they obscure action semantics in a chronology-oriented graph.

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
2. The node represents exactly one durable entity: person, organization, group, device, account, document, physical/digital object, or another domain object with independent identity.
3. The name is a noun/entity label, not an event or action phrase.
4. Events, meetings, transactions, decisions, processes, activities, stories, categories, roles, places, dates, times, geometry, coordinates, and navigation containers are not entity nodes.
5. Node attributes describe the entity itself. Spatiotemporal context belongs on an action edge.
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
6. `time` is the canonical temporal extent. `placeId` references one reusable place record. `itemIds[]` links chronology/presentation records without making them graph nodes. Provenance/confidence/action metadata remain relationship properties.
7. One directed action fact gets one edge. When additional chronology items, sources, confidence, role, place, or attributes describe the same source–action–target fact at the same temporal extent, merge them onto that edge instead of creating a parallel edge.
8. Do not create the same action in the opposite direction merely to make traversal appear bidirectional. Direction is queryable; a reverse edge is valid only when it records a genuinely distinct reverse action.
9. Graph cycles are allowed. A path such as `A --attacks--> B --evades--> A` is valid because the edges describe distinct facts. “Circular reference” is a problem only when it is a self-loop, mirrored duplicate, fabricated relation, or redundant fact.
10. A unary chronology action does not justify a self-loop or dummy target. If no meaningful second durable entity exists, keep the action on the chronology rather than fabricating graph topology.

## Identity and deduplication

Timeline treats the semantic identity of an action edge as:

```
(subject entity, canonical action predicate, object entity, temporal extent)
```

`placeId`, `itemIds[]`, `sourceIds[]`, confidence, role, and other properties describe that fact; they do not create another copy of it.

This mirrors database `MERGE`/constraint thinking: resolve identity first, then enrich the existing fact. The runtime exposes `TimelineGraph.relationshipFactKey()`, `findDuplicateRelationship()`, `findMirroredRelationship()`, and `auditGraphStructure()` so import validation and editor authoring use the same identity rules.

Display names are not identity. Two different entities may have the same name if their stable IDs distinguish them.

## N-ary actions and compound events

General graph models sometimes introduce intermediate event/action nodes to reify a relationship with many participants. Timeline does not do that in its canonical relation graph because the chronology already owns event identity.

For a multi-party chronology item:

- keep the event in `items[]`;
- create only the meaningful binary action facts among durable entities;
- give those edges the same `itemIds[]`, `time`, and `placeId` when they share chronology context;
- do not create an Event/Meeting/Transaction node merely to connect participants.

If no meaningful binary action can be stated, the chronology record may legitimately have no graph edge.

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
- dangling/non-entity endpoints;
- self-loops;
- generic, spatial/temporal, or compound-context predicates;
- unknown place references;
- duplicate directed action facts;
- mirrored same-action copies;
- orphan canonical entity nodes;
- invalid predicates introduced by relation-change updates.

`TimelineGraph.auditGraphStructure()` also reports reciprocal entity pairs without treating them as errors. This is intentional: reciprocal topology is useful when the two directions represent different real actions.
