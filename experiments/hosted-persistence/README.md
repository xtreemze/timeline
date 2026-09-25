# Hosted persistence spike

Status: experimental follow-up to #719 / #720.

This directory compares the two hosted persistence directions that currently deserve implementation evidence for Lūm:

- portable PostgreSQL as the canonical server store, with Supabase as the first managed deployment target;
- SurrealDB as the multi-model challenger.

The spike deliberately does **not** wire either database into rendering, interaction, or browser startup. `ProjectRepository` remains the application boundary; Graphology/Sigma/D3-style graph projections remain local and rebuildable.

## Scope

The current canonical kernel contains entities and relationships only. Occurrences, reusable places, evidence, custody, stories, analytical lenses, and geotemporal state are still being consolidated under #720. The schemas here therefore model the current kernel plus project revision semantics and are intentionally marked provisional.

Do not treat the JSON/array columns in these prototypes as the final server normalization. Once the canonical continuum document is complete, high-cardinality references should move to dedicated relational/link tables.

## Shared workload

`benchmarks/hosted-persistence.mjs` generates the same deterministic graph corpus used to evaluate both candidates and records a local semantic-index baseline. The provider runs should use the same corpus and the same workload IDs:

1. optimistic save with compare-and-swap revision;
2. load current project revision;
3. recover previous revision/checkpoint;
4. hydrate the local semantic graph index;
5. bounded 1–5 hop neighborhood lookup;
6. time/place-constrained relationship lookup;
7. connected-component or equivalent graph analysis;
8. update/replace latency and storage footprint.

The benchmark is intentionally provider-neutral and has no database SDK dependency. Live provider runners can be added behind environment variables without entering the production bundle.

## PostgreSQL / Supabase

`postgres/kernel-v0.sql` is ordinary PostgreSQL and avoids Supabase-specific types or APIs. Supabase is therefore a deployment choice rather than an application dependency. PostGIS should be enabled when canonical place/geotemporal ownership lands; the current kernel-v0 schema does not invent a place table before that work is complete.

The schema enforces:

- project-scoped entity identity;
- project-scoped relationship endpoint foreign keys;
- no self-edge;
- confidence bounds;
- atomic revision compare-and-swap through a transaction-safe function;
- immutable revision snapshots suitable for recovery.

## SurrealDB

`surrealdb/kernel-v0.surql` uses schema-full normal records plus an enforced relation table. It keeps project revision snapshots separate from the graph relation records so the repository contract can still expose revision/load/recover semantics.

The graph-native shape is a useful benchmark advantage, but it must beat PostgreSQL on real Lūm workloads enough to justify the younger operational ecosystem and a second persistence model.

## Adoption gate

No candidate becomes authoritative from this spike alone. The follow-up live benchmark must publish:

- corpus size and generated seed;
- database/server version;
- ingest and update latency;
- p50/p95 query latency for each shared workload;
- storage footprint;
- client hydration time;
- operational notes, including backup/recovery and migration behavior.

A graph database should remain a rebuildable projection unless measurements show a clear product requirement for authoritative graph semantics.
