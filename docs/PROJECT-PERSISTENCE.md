# Project persistence architecture

Issue: #518  
Parent: #517

Lūm treats local-first persistence as an application boundary around canonical project state. Persistence is not owned by the renderer, timeline, force engine, evidence UI, or browser globals.

## Contract

`src/application/project-repository.ts` defines the storage-neutral contract:

- `ProjectRepository.load` reads one canonical project revision.
- `ProjectRepository.save` performs compare-and-swap replacement against an expected revision.
- `ProjectRepository.recover` exposes the last-known-good checkpoint.
- project snapshots carry a stable project key, monotonically increasing revision, save timestamp, and canonical project.
- serialized envelopes carry an explicit format and schema version.
- migrations are pure, ordered schema transitions applied before canonical validation.

The initial in-memory adapter is a deterministic reference implementation for tests and application-service development. It is not the production persistence adapter.

## Ownership rules

Durable project snapshots may contain only canonical project state.

They must not persist:

- deck.gl/luma.gl devices, layers, buffers, textures, or picking state;
- Orb/Sigma/Cosmos/Leaflet renderer objects;
- force positions or simulation internals;
- DOM references;
- pointer/gesture state;
- transient selection, hover, or focus;
- temporary filters unless promoted to a saved analytical lens;
- PDF.js workers, object URLs, AbortControllers, or other runtime resources.

Derived indexes and projections must be reconstructable from canonical state.

## Revision semantics

Writes use an expected revision. A stale writer fails with `ProjectRevisionConflictError`; it never overwrites the current revision.

The repository owns revision increments. Callers do not invent the next revision.

Before replacing an existing revision, the reference adapter retains the prior revision as the last-known-good checkpoint. The production adapter must preserve the same observable contract with atomic storage semantics.

## Schema evolution

`CURRENT_PROJECT_SCHEMA_VERSION` is the supported canonical project schema.

Historical projects are upgraded through explicit `ProjectMigration` entries. A migration:

1. starts at exactly its declared `fromVersion`;
2. advances to exactly its declared `toVersion`;
3. is deterministic and independent of browser APIs;
4. returns data that is validated before becoming application state.

A project newer than the supported schema fails closed. Missing migration links fail closed.

## Production adapter requirements

The browser adapter under #518 should implement the same contract using IndexedDB unless measurement demonstrates a better browser-local store.

It must additionally provide:

- atomic commit visibility;
- debounced autosave without revision reordering;
- recovery after interrupted writes;
- quota/error reporting without destroying last-known-good state;
- checkpoint/backup handling before destructive migration or import replacement;
- deterministic reload behavior;
- browser tests for persistence across navigation/reload.

Import-as-new, replace, and merge remain separate application commands. The repository must not silently reinterpret one as another.

## Relationship to command history

Persistence revisions and undo/redo history are separate concepts.

#519 owns the transactional command journal. A command transaction may produce a new canonical revision and trigger autosave, but renderer operations never enter either canonical persistence or undo history.

Forensic provenance/audit records under #8 are also distinct from editing undo history and repository revision metadata.
