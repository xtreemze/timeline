# Lūm documentation

This directory contains the durable product, domain, architecture, interaction, interchange, and presentation contracts for Lūm.

For product copy, use **Lūm**. The repository and some compatibility APIs still use `timeline`/ `Timeline` identifiers; those names are infrastructure or migration contracts, not the current product identity.

## Start here

- [BRAND.md](BRAND.md) — product name, mark, palette, tagline, voice, and brand integration rules.
- [LUM-TERMINOLOGY.md](LUM-TERMINOLOGY.md) — canonical product/domain vocabulary and compatibility naming policy.
- [ARCHITECTURE-BOUNDARIES.md](ARCHITECTURE-BOUNDARIES.md) — ownership boundaries and dependency direction.
- [CONTRIBUTOR-ARCHITECTURE.md](CONTRIBUTOR-ARCHITECTURE.md) — implementation and review contract for human and automated contributors.
- [GRAPH-MODELING-RULES.md](GRAPH-MODELING-RULES.md) — normative entity/relationship/occurrence rules.
- [SPATIOTEMPORAL-PROJECTION.md](SPATIOTEMPORAL-PROJECTION.md) — shared chronology/world activation and projection model.

## Domain, evidence, and analysis

- [EVIDENCE-MODEL.md](EVIDENCE-MODEL.md) — source, evidence, provenance, locators, and trace semantics.
- [CASE-ANALYSIS-METHODOLOGY.md](CASE-ANALYSIS-METHODOLOGY.md) — analytical claims, theses, contradictions, and proof graphs.
- [FORENSIC-CASE-BENCHMARK.md](FORENSIC-CASE-BENCHMARK.md) — case-oriented benchmark and presentation constraints.
- [NARRATIVE-FICTION-MODE.md](NARRATIVE-FICTION-MODE.md) — fiction/narrative use without weakening the canonical model.

## Time, space, and projection

- [TEMPORAL-GRAPH-ARCHITECTURE.md](TEMPORAL-GRAPH-ARCHITECTURE.md) — temporal/topological behavior and graph-facing contracts.
- [TEMPORAL-SPATIAL-INTERCHANGE.md](TEMPORAL-SPATIAL-INTERCHANGE.md) — temporal and geographic interchange semantics.
- [TIMELINE-V3-ARCHITECTURE.md](TIMELINE-V3-ARCHITECTURE.md) — retained chronology architecture and interaction details.
- [RETAINED-TIMELINE-PERFORMANCE.md](RETAINED-TIMELINE-PERFORMANCE.md) — retained scene performance model and certification.
- [STANDARDS-AND-PRIOR-ART.md](STANDARDS-AND-PRIOR-ART.md) — standards and external design/technical references.

## Persistence and interchange

- [PROJECT-PERSISTENCE.md](PROJECT-PERSISTENCE.md) — local-first project repository boundary.
- [INTERCHANGE.md](INTERCHANGE.md) — general import/export contract.
- [TEMPORAL-SPATIAL-INTERCHANGE.md](TEMPORAL-SPATIAL-INTERCHANGE.md) — precise temporal/spatial serialization and browser integration.
- [WEBMCP-MEMGRAPH.md](WEBMCP-MEMGRAPH.md) — WebMCP authoring, standard MCP relay for Codex/Claude/ChatGPT, local Ollama host, and Memgraph round-trip.
- [PUBLIC-MCP-STORY-GENERATION.md](PUBLIC-MCP-STORY-GENERATION.md) — public Streamable HTTP MCP endpoint and source-document-to-story generation/verification workflow.
- [BUILTIN-AI-INFERENCE.md](BUILTIN-AI-INFERENCE.md) — browser-native AI/OCR proposal pipeline and safety boundaries.

## UI and presentation

- [FRONTEND-UI-MOTION.md](FRONTEND-UI-MOTION.md) — responsive UI, motion, framework, and interaction boundaries.
- [FORMAL-PRESENTATION.md](FORMAL-PRESENTATION.md) — formal/export presentation rules.
- [E2E-HIGHLIGHT-REEL.md](E2E-HIGHLIGHT-REEL.md) — deterministic product showcase generation.

## Documentation rules

1. Product-facing prose says **Lūm**, not Timeline, unless discussing a compatibility identifier or the temporal projection.
2. Use **continuum** for canonical project meaning; timeline, world/graph, map, evidence, analysis, and story are projections.
3. Prefer links to canonical contracts over copying long rule sets into multiple documents.
4. Architecture documents describe ownership and invariants before implementation libraries.
5. Compatibility or migration behavior must be labeled as such.
6. Browser/version claims should point to executable configuration or tests whenever possible.
7. If a behavior becomes normative, encode it in tests or lint rules as well as prose.
