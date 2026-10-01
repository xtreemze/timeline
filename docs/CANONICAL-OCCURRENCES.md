# Canonical standalone occurrences

Most Lūm occurrences remain direct projections of one timed relationship. No wrapper record is created for those facts.

A standalone `CanonicalOccurrence` is reserved for history that has independent occurrence identity: multi-participant or multi-fact events, unary occurrences that would otherwise require fake self-loops, named durable events, or evidence belonging to an event as a whole.

Occurrences never become semantic graph nodes.

## Identity and grouping

A standalone occurrence has a branded `OccurrenceId`, and occurrence IDs may not collide with relationship IDs. Any API that addresses canonical chronology uses `CanonicalOccurrenceId = OccurrenceId | RelationshipId`: the first form addresses an independently identified standalone occurrence, while the second addresses a relationship-derived occurrence without manufacturing a wrapper record.

`projectCanonicalOccurrences()` defines default chronology identity: ungrouped timed relationships project directly; grouped child relationships are suppressed as duplicate top-level chronology records; the standalone occurrence projects once; fact-level views may still expand its `relationshipIds[]`.

Stories use the same canonical occurrence-reference identity. A story can therefore include an ordinary relationship-derived occurrence directly or a standalone occurrence when independent event identity is warranted.

## Participants

`participantContexts[]` reuses contextual capacity semantics: entity, role, represented entity, organization, authority sources, and external mappings. Child relationships continue to express directed noun-to-noun actions when those facts exist.

## Time and place

The occurrence owns shared time/place when known. During migration, projection may inherit time, place, or type from grouped child relationships only when all resolvable children agree exactly.

`TemporalOccurrenceIndex`, Timeline activation, and World activation consume the same projected canonical occurrence set. `SpatialAnchorIndex` may anchor every participant of a standalone occurrence at its occurrence place while child relationships remain semantic edges. A unary occurrence can therefore appear in time/world context without inventing a self-loop.

## Semantic graph boundary

`SemanticGraphIndex` continues to index only durable entities and directed relationships. Standalone occurrences belong to temporal, spatial, evidentiary, accessibility, narrative, and analytical projections rather than entity topology.
