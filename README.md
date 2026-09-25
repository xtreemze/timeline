<p align="center">
  <img src="site/icon.svg" alt="Lūm" width="96" height="96">
</p>

<h1 align="center">Lūm</h1>

<p align="center"><strong>Weave the threads. Explore the continuum.</strong></p>

<p align="center">
  <a href="https://xtreemze.github.io/timeline/"><img alt="GitHub Pages" src="https://img.shields.io/github/actions/workflow/status/xtreemze/timeline/pages.yml?branch=main&label=GitHub%20Pages"></a>
  <a href="LICENSE"><img alt="Proprietary license" src="https://img.shields.io/badge/license-proprietary-171717"></a>
  <img alt="Local-first" src="https://img.shields.io/badge/data-local--first-b7472a">
</p>

Lūm is a local-first relational knowledge environment for work where **time, place, relationship, evidence, and provenance** must stay connected.

Loose facts, entities, occurrences, places, evidence, claims, and narrative fragments begin as threads. Lūm reconciles and relates them into one canonical **continuum**. Timeline, world/graph, map, evidence, analysis, and story are projections over that same continuum rather than separate data silos.

**Live application:** https://xtreemze.github.io/timeline/

## Product model

Lūm deliberately separates durable meaning from the surfaces used to inspect it.

- **Entity** — a durable noun with independent identity.
- **Relationship** — a directed subject–action–object fact between different entities.
- **Occurrence** — a concrete situated fact; a timed relationship is an occurrence.
- **Place / locus** — reusable spatial context owned outside graph topology.
- **Trace** — inspectable provenance from a fact or claim back to evidence and source locators.
- **Story** — an authored traversal through canonical records, never a copy of them.
- **Projection** — a temporal, topological, spatial, evidentiary, analytical, or narrative reading of the continuum.

The textile language is explanatory, not a persistence model. Precise domain and standards vocabulary wins whenever metaphor would obscure meaning.

```text
source material / loose threads
            ↓
     reconcile + validate
            ↓
     canonical continuum
  ┌─────────┼──────────┐
entities  occurrences  places
evidence   stories     analysis
            ↓
        projections
  ┌─────────┼──────────┐
timeline   world      evidence
map        story      analysis
```

## What Lūm does

Lūm combines a retained chronology with synchronized relational and spatial context. The current application supports:

- point and ranged chronology with temporal precision, certainty, zones, clustering, semantic zoom, and retained interaction;
- entity/relationship modeling with action-only predicates and occurrence-centered time/place context;
- a world surface that combines geography and relational topology without making renderer state canonical;
- reusable places, evidence/source provenance, analytical records, stories, and categories;
- focused occurrence context, evidence inspection, narrative traversal, search, filtering, and responsive presentation;
- local-first project persistence, import/export, validation, and migration;
- WebMCP tools for agent-driven reads and validated mutations;
- optional browser-native AI/OCR inference that proposes structured data without bypassing deterministic validation;
- keyboard, touch, pointer, gamepad, reduced-motion, and mobile-first interaction paths.

The product is browser-first and backend-free. Hosting the application does not imply custody of project data.

## Product showcase

The showcase media is generated from the real application in Chromium CI. Static states use source-resolution PNG screenshots. Motion is captured from browser-presented frames at the source viewport dimensions; CI requires the raw decoded source to sustain at least 59 actual frames per second before publishing verified 60 fps animated WebP and highlight reels.

| Flow | Desktop | Mobile |
| --- | --- | --- |
| Navigate the continuum | <img src="https://xtreemze.github.io/timeline/showcase/desktop/01-timeline-navigation.webp" alt="Lūm desktop chronology navigation" width="360"> | <img src="https://xtreemze.github.io/timeline/showcase/mobile/01-timeline-navigation.webp" alt="Lūm mobile chronology navigation" width="180"> |
| Read an occurrence in context | <img src="https://xtreemze.github.io/timeline/showcase/desktop/02-focused-context.png" alt="Lūm desktop focused occurrence context" width="360"> | <img src="https://xtreemze.github.io/timeline/showcase/mobile/02-focused-context.png" alt="Lūm mobile focused occurrence context" width="180"> |
| Inspect evidence | <img src="https://xtreemze.github.io/timeline/showcase/desktop/03-evidence.png" alt="Lūm desktop evidence dossier" width="360"> | <img src="https://xtreemze.github.io/timeline/showcase/mobile/03-evidence.png" alt="Lūm mobile evidence dossier" width="180"> |
| Explore relationships | <img src="https://xtreemze.github.io/timeline/showcase/desktop/04-relation-graph.webp" alt="Lūm desktop relational world view" width="360"> | <img src="https://xtreemze.github.io/timeline/showcase/mobile/04-relation-graph.webp" alt="Lūm mobile relational world view" width="180"> |
| Browse narrative threads | <img src="https://xtreemze.github.io/timeline/showcase/desktop/05-story-browser.png" alt="Lūm desktop story browser" width="360"> | <img src="https://xtreemze.github.io/timeline/showcase/mobile/05-story-browser.png" alt="Lūm mobile story browser" width="180"> |

See [docs/E2E-HIGHLIGHT-REEL.md](docs/E2E-HIGHLIGHT-REEL.md) for how CI records and assembles these assets.

## Architecture

The architectural rule is simple: **canonical knowledge never depends on visualization**.

```text
external sources / adapters
          ↓
candidate claims / reconciliation
          ↓
     canonical domain
          ↓
application commands + view state
          ↓
       projections
          ↓
 layout + interaction planning
          ↓
    renderer / UI adapters
```

Derived layout, force positions, camera state, clustering, GPU resources, DOM state, and renderer-specific IDs are disposable. Stable canonical IDs and validated domain records cross projection boundaries.

The current implementation is TypeScript/Vite based, with Lit for bounded UI, deck.gl/luma.gl for the world surface, Leaflet for map compatibility surfaces, d3-dag for organizational layout support, and Playwright/Node tests for interaction, architecture, and performance contracts. The production browser target is encoded in `vite.config.ts`; CI certification is Chromium-based.

See [Architecture boundaries](docs/ARCHITECTURE-BOUNDARIES.md) and the [Contributor architecture contract](docs/CONTRIBUTOR-ARCHITECTURE.md).

## Run locally

Requirements are defined in `package.json` (currently Node 24+ and pnpm 12+).

```bash
git clone https://github.com/xtreemze/timeline.git
cd timeline
corepack enable
pnpm install
pnpm dev
```

For a production build:

```bash
pnpm build
pnpm preview
```

Core verification:

```bash
pnpm lint
pnpm types
pnpm test
pnpm check
```

Browser and focused test commands are available through the scripts in `package.json`.

## Documentation

Start with the [documentation index](docs/README.md).

| Area | Canonical document |
| --- | --- |
| Brand identity and usage | [docs/BRAND.md](docs/BRAND.md) |
| Product terminology | [docs/LUM-TERMINOLOGY.md](docs/LUM-TERMINOLOGY.md) |
| Architecture boundaries | [docs/ARCHITECTURE-BOUNDARIES.md](docs/ARCHITECTURE-BOUNDARIES.md) |
| Contributor contract | [docs/CONTRIBUTOR-ARCHITECTURE.md](docs/CONTRIBUTOR-ARCHITECTURE.md) |
| Graph/domain modeling | [docs/GRAPH-MODELING-RULES.md](docs/GRAPH-MODELING-RULES.md) |
| Spatiotemporal projection | [docs/SPATIOTEMPORAL-PROJECTION.md](docs/SPATIOTEMPORAL-PROJECTION.md) |
| Evidence and provenance | [docs/EVIDENCE-MODEL.md](docs/EVIDENCE-MODEL.md) |
| Local persistence | [docs/PROJECT-PERSISTENCE.md](docs/PROJECT-PERSISTENCE.md) |
| Browser AI/OCR | [docs/BUILTIN-AI-INFERENCE.md](docs/BUILTIN-AI-INFERENCE.md) |
| WebMCP / Memgraph | [docs/WEBMCP-MEMGRAPH.md](docs/WEBMCP-MEMGRAPH.md) |
| UI, responsiveness, motion | [docs/FRONTEND-UI-MOTION.md](docs/FRONTEND-UI-MOTION.md) |
| Showcase generation | [docs/E2E-HIGHLIGHT-REEL.md](docs/E2E-HIGHLIGHT-REEL.md) |

## Branding and naming

The product name is **Lūm**. Use **Lum** only where a plain-ASCII identifier is required.

The repository remains `xtreemze/timeline`, the deployed path remains `/timeline/`, and existing `timeline:*`, `Timeline*`, and `timeline.*` compatibility identifiers remain valid until an explicit versioned migration changes them. Infrastructure compatibility names are not the product name.

The product mark is `site/icon.svg`; the canonical short tagline is:

> **Weave the threads. Explore the continuum.**

See [docs/BRAND.md](docs/BRAND.md) for mark, palette, naming, copy, and integration rules.

## Engineering principles

1. **The continuum is canonical.** Projections do not own meaning.
2. **Occurrence identity survives every view.** Time, topology, place, evidence, and story resolve back to the same canonical records.
3. **Projection is not persistence.** Layout and renderer state are disposable.
4. **Validation owns canonical commit.** UI, AI, OCR, importers, and adapters may propose; deterministic domain rules decide what enters project state.
5. **Local-first is a product property.** No backend is required to use the core application.
6. **Mobile is not a reduced product.** Responsive composition changes layout, not capability.
7. **Interaction must remain deterministic and cancel-safe.**
8. **Complexity must earn its place through measured need.**

## License

**Proprietary — all rights reserved.** See [LICENSE](LICENSE).

Copyright © 2026 Carlos Eduardo Velasco Romero.
