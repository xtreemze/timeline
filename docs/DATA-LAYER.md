# Data layer architecture

Status: accepted direction, incremental implementation  
Date: 2026-09-25  
Related: #517, #518, #519, #8

Lūm uses a graph-shaped domain, but graph rendering does not determine persistence. The data layer must simultaneously support transactional editing, temporal and spatial filtering, evidence/provenance, local-first operation, bulk analysis, and graph traversal.

## Decision

Use distinct layers for distinct workloads:

1. **Canonical application boundary** — `ProjectRepository` remains the authoritative persistence API. Domain validation and migrations stay above any database implementation.
2. **Browser-local durability** — IndexedDB is the production-local project store. Project replacement uses compare-and-swap revisions and an atomic latest/checkpoint transaction. Evidence binary storage remains separate from canonical JSON.
3. **Hosted canonical store** — when multi-device/server persistence is introduced, prefer PostgreSQL with PostGIS as the system of record. Keep the schema portable across Supabase, AWS, Azure, and self-hosted PostgreSQL.
4. **Binary evidence** — keep large evidence bytes in object/file storage and keep metadata, hashes, provenance, custody, and object keys in canonical records.
5. **Graph querying** — treat dedicated graph databases as optional projections until measured workloads require server-side deep traversal or graph algorithms.
6. **Analytics and interchange** — Arrow/Parquet are columnar interchange formats; DuckDB-Wasm is an optional worker-side analytical engine. They are not the transactional project store.

This is intentionally not a decision to introduce a remote database dependency into the browser bundle.

## Current repository state

The application already has several useful seams:

- `src/application/project-repository.ts` owns the storage-neutral versioned snapshot/revision/recovery contract; browser storage implementations stay outside the application layer.
- `src/application/semantic-graph-index.ts` builds the read-optimized graph projection from canonical entities and relationships.
- `src/domain/geotemporal.ts` preserves GeoJSON geometry, valid time, confidence, uncertainty, and source references.
- `site/evidence-store.ts` keeps PDF/image blobs in IndexedDB while canonical JSON retains metadata and a blob key.
- `src/application/bulk-ingest.ts` already exposes Arrow and Parquet adapter points.

The principal gap is that `CanonicalProject` is narrower than the complete application/interchange state. Server persistence must not be finalized until occurrences, reusable places, evidence, custody actions, stories, analytical lenses, and geotemporal state have one canonical ownership model.

## Why PostgreSQL/PostGIS is the hosted default

The canonical workload has stronger relational and geospatial requirements than a pure graph database provides:

- entity and relationship referential integrity;
- multi-record transactions and revision checks;
- reusable sources/evidence and many-to-many occurrence associations;
- temporal ranges and uncertain temporal metadata;
- GeoJSON points, paths, polygons, spatial indexes, and distance/intersection queries;
- structured columns plus extensible JSON metadata;
- portable hosting and mature operational tooling.

Relationships should remain explicit records with subject, predicate, object, time/place context, confidence, source references, occurrence references, and attributes. PostgreSQL can enforce endpoint integrity while the existing semantic graph index or a future database-side projection provides traversal.

A future relational schema should normalize high-cardinality references rather than persisting arrays solely for database convenience. The conceptual tables are:

```
projects
project_revisions
entities
relationships
occurrences
relationship_occurrences
places
geotemporal_states
sources
evidence
evidence_occurrences
custody_actions
stories
story_occurrences
analytical_lenses
object_blobs
```

Canonical fuzzy/uncertain temporal objects remain lossless JSON/domain values. Exact normalized bounds may be added as indexed derived columns; they must not replace source precision, certainty, timezone, or source wording.

## Provider mapping

### Supabase

Preferred first managed deployment when Lūm needs hosted persistence. It keeps the architecture on ordinary PostgreSQL while providing authentication, row-level security integration, object storage, realtime capabilities, and common PostgreSQL extensions. Provider-specific APIs must remain outside the domain/application layers.

### AWS

Prefer Aurora/RDS PostgreSQL plus S3 for the canonical store and binary evidence. Neptune is an optional graph projection when measured traversal or RDF/property-graph workloads justify operating it.

### Azure

Prefer Azure Database for PostgreSQL plus Blob Storage. PostgreSQL graph extensions such as Apache AGE may be evaluated behind the same projection boundary when supported by the selected service/version. Cosmos DB/Gremlin is not the default canonical store.

## Alternative database evaluation

| Candidate | Role | Decision |
| --- | --- | --- |
| PostgreSQL + PostGIS | transactional + temporal/spatial canonical store | default hosted architecture |
| SurrealDB | graph/document/relational multi-model store | prototype challenger; benchmark before adoption |
| Neo4j | mature property-graph traversal/algorithms | optional derived graph store |
| Memgraph | low-latency graph traversal/analytics | optional derived graph store |
| ArangoDB | multi-model document/graph store | viable alternative, no current advantage over the chosen split |
| MongoDB | document/geospatial store with graph lookup | not preferred for canonical referential model |
| AWS Neptune | managed graph service | optional AWS graph projection |
| Azure Cosmos DB Gremlin | distributed Gremlin graph | optional only for a Gremlin-specific requirement |
| LadybugDB | embedded analytical property graph | research/local graph-analysis candidate |

The existing `@memgraph/orb` package is a visualization/runtime dependency; it does not imply that Memgraph database is part of persistence.

## Browser persistence

IndexedDB remains the browser-local transactional store because it is native, asynchronous, available in the supported Chrome/Edge targets, and suitable for structured values and blobs.

The project adapter must:

- commit latest + checkpoint changes atomically;
- reject stale expected revisions;
- fail closed on invalid/corrupt latest records;
- preserve a last-known-good checkpoint for explicit recovery;
- keep migrations deterministic and outside IndexedDB mechanics;
- surface quota/write failures rather than reporting a save;
- remain replaceable behind `ProjectRepository`.

Large evidence files should remain a separate repository concern. OPFS is worth evaluating for large binary/random-access workloads, with content-addressed identities and integrity verification, rather than expanding canonical project JSON.

PGlite is a later local-first experiment, not the immediate browser store. It should be benchmarked with realistic large projects before replacing the simpler IndexedDB adapter.

## Arrow and DuckDB

Arrow and Parquet should be implemented through the existing `BulkIngestAdapters` seam rather than becoming canonical formats.

DuckDB-Wasm may run in a worker for:

- large CSV/Parquet/Arrow profiling;
- aggregate and anomaly analysis;
- data-quality checks;
- export/report preparation;
- large local analytical lenses.

Results should cross the worker boundary in Arrow/typed columnar form where this materially reduces object allocation. DuckDB must not own editing transactions or project revisions.

## Graph database adoption gate

Do not add a second authoritative database because the domain is a graph.

Benchmark graph engines only when one or more of these become real product workloads:

- arbitrary multi-hop path queries outside the bounded client neighborhood;
- centrality/community/path algorithms over datasets too large for the current projection;
- high-rate shared graph mutation requiring server-side traversal;
- GraphRAG/vector + traversal workloads that cannot be served economically from PostgreSQL plus the application index.

Benchmark Postgres/current indexes against SurrealDB, Neo4j, and Memgraph on the same generated 10x/100x corpus. If a graph engine wins materially, consume canonical change events into a rebuildable graph projection; avoid dual-authoritative writes.

## Implementation sequence

1. Land the IndexedDB `ProjectRepository` adapter and browser recovery tests (#518).
2. Route the composition root through the repository, then remove direct project `localStorage` ownership only after migration/recovery is proven.
3. Expand canonical project ownership to occurrences, places, evidence, stories, custody, lenses, and geotemporal state.
4. Introduce an `EvidenceBlobRepository` boundary and harden content-addressed local evidence storage.
5. Implement Arrow/Parquet adapters; prototype DuckDB-Wasm in a worker without adding it to the startup bundle.
6. Design portable PostgreSQL/PostGIS migrations from the consolidated canonical model.
7. Benchmark SurrealDB/Neo4j/Memgraph only after representative server-side graph queries and scale targets are defined.

## Hosted persistence benchmark spike

The follow-up spike in `experiments/hosted-persistence/` now keeps equivalent PostgreSQL and SurrealDB kernel schemas beside one deterministic workload corpus. It is deliberately limited to the current entity/relationship canonical kernel while #720 consolidates occurrences, places, evidence, stories, custody, lenses, and geotemporal state.

`pnpm test:hosted-persistence` checks the cross-provider invariants that can be certified without external credentials. `pnpm benchmark:hosted-persistence` emits the provider-neutral corpus metadata, workload IDs, and local semantic-index hydration/neighborhood baseline. Live Supabase/PostgreSQL and SurrealDB runners must consume that same corpus and publish database/version, ingest/update latency, p50/p95 workload latency, storage footprint, recovery behavior, and client hydration time before either backend is selected.

The PostgreSQL prototype remains ordinary PostgreSQL rather than a Supabase SDK contract. PostGIS is intentionally deferred until canonical place/geotemporal ownership is available instead of inventing a premature server place model. The SurrealDB prototype uses a schema-full enforced relation table but keeps revision snapshots explicit so it can be judged against the same `ProjectRepository` semantics.

## Non-goals of the current slice

- connecting production Supabase/AWS/Azure credentials;
- introducing a second authoritative graph database;
- persisting renderer, force-layout, camera, hover, focus, or GPU state;
- moving evidence binaries into project JSON;
- claiming browser persistence is tamper-evident evidence custody.
