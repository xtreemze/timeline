# Lūm terminology and conceptual model

Lūm is the product identity for the project historically named Timeline.

The name is written **Lūm** in human-facing product copy. Use **Lum** only where a plain-ASCII identifier is required. Existing `timeline:*` storage keys, `Timeline*` compatibility globals, WebMCP tool names, repository paths, migration namespaces, and schema identifiers remain compatibility contracts until a separately versioned migration changes them.

## Core metaphor

**Lūm is the instrument. The continuum is the world it reveals.**

Lūm does not treat timeline, graph, map, evidence, and story as independent applications that must be synchronized. They are coordinated projections of one canonical continuum of entities, occurrences, places, sources, and authored narrative paths.

The vocabulary is intended to clarify ownership and meaning. It must never force metaphor into code where a precise domain or standards term is clearer.

## Normative vocabulary

### Lūm

The product and interaction environment.

Use “Lūm” when referring to the application, user experience, project, or product philosophy.

Do not rename stable compatibility APIs merely to match the brand.

### Continuum

The canonical information space.

The continuum contains the durable records from which views are derived: entities, relationships/occurrences, places, evidence/provenance, analytical records, stories, and presentation metadata where appropriate.

A timeline is not the continuum. A graph is not the continuum. A map is not the continuum. Each is a projection over it.

### Occurrence

A concrete fact situated in context.

A timed relationship is an occurrence. It may also carry place, evidence, confidence, significance, and presentation context. Ordinary occurrences should not require a second manually-authored chronology record merely to appear on a temporal projection.

Explicit unary occurrences or named durable events remain valid where the domain requires them.

### Thread

A traversable continuity through the continuum.

A thread may follow one entity, relationship family, place, evidentiary trail, theme, or authored narrative through multiple occurrences. “Thread” is primarily a navigation and explanatory concept, not necessarily a persisted record type.

### Weave

The relational structure formed by intersecting threads.

The weave is the topology exposed by relationships between entities and occurrences. The graph projection reveals the weave, but the weave is not owned by a graph renderer.

### Locus

A reusable spatial anchor.

A locus corresponds to canonical place/spatial context. Places may influence layout and projection without becoming semantic graph nodes. Use “place” in schemas and standards-facing code where that is clearer; “locus” is the conceptual/UI vocabulary.

### Trace

The provenance path supporting a fact or claim.

A trace links an occurrence, assertion, or analytical conclusion back through evidence, source locators, extraction provenance, custody, and transformations. A trace must remain inspectable; it is not a confidence score or truth declaration.

### Story

An authored traversal through the continuum.

A story selects and orders occurrences or other canonical references to make an explanation. It does not own or duplicate the facts it presents.

### Projection

A view derived from the continuum for a particular way of reasoning.

The principal projections are:

- **temporal projection** — chronology/timeline;
- **topological projection** — relational graph/weave;
- **spatial projection** — map/geographic context;
- **narrative projection** — story-guided traversal;
- **evidentiary projection** — source/provenance trace;
- **analytical projection** — hypotheses, contradictions, claims, and reasoning.

Selection and identity must survive projection changes because the underlying canonical record does not change.

### Confluence

A visually or narratively important meeting of threads.

“Confluence” is useful presentation language for occurrences where several entities, places, stories, or causal threads converge. It is not a substitute for the precise persisted occurrence/relationship type.

### Stratum

A bounded layer or slice of the continuum.

A stratum may refer to a temporal period, evidence layer, geographic layer, or analytical layer when that metaphor improves comprehension. Prefer precise terms such as temporal window, evidence set, or layer in implementation APIs.

## Product description

Preferred short description:

> **Lūm explores the continuum of people, places, actions, evidence, and stories across time.**

Preferred conceptual description:

> Lūm is a local-first relational knowledge environment. It models a shared continuum of entities, occurrences, places, evidence, and stories, then lets people move between temporal, topological, spatial, evidentiary, and narrative projections without losing identity or context.

Preferred compact tagline:

> **Explore the continuum. Follow the threads.**

Alternative expressive line:

> **Weave through time, place, and relationship.**

## Architectural language

Use the following ownership model in new architecture documents:

```text
Continuum
  ├─ entities
  ├─ occurrences / relationships
  ├─ loci / places
  ├─ evidence + traces
  ├─ stories
  └─ analytical records
       ↓
Projection engine
  ├─ temporal projection
  ├─ topological projection
  ├─ spatial projection
  ├─ narrative projection
  ├─ evidentiary projection
  └─ analytical projection
       ↓
Interaction + layout
       ↓
Presentation surfaces
```

Renderers, frameworks, maps, and force engines never own the continuum.

## Writing rules

1. Use **Lūm** for the product in human-facing prose.
2. Use **continuum** for the shared canonical information space.
3. Use **timeline** only for the temporal projection or existing compatibility identifiers.
4. Use **graph** for a graph projection/runtime representation, not as a synonym for the canonical domain.
5. Use **map** for the spatial projection or map renderer, not as the owner of place semantics.
6. Use **occurrence** for a concrete situated fact, especially a timed relationship.
7. Use **thread** and **weave** as explanatory/navigation metaphors; do not create persistence types solely to satisfy the metaphor.
8. Preserve precise standards vocabulary in interchange, legal/forensic, temporal, and spatial contracts.
9. Never hide provenance or uncertainty behind poetic terminology.
10. Do not rename compatibility identifiers without an explicit migration plan and version boundary.

## Compatibility

The repository remains `xtreemze/timeline` for now and the deployed URL remains `/timeline/`. Those addresses are infrastructure identifiers, not the product name.

Current `timeline:*` storage keys and `Timeline*` APIs remain valid. New code should not duplicate them with `lum:*` aliases until a compatibility strategy exists. A later repository/package/API rename should be treated as a migration, not a search-and-replace exercise.
