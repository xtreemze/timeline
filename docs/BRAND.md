# Lūm brand

This document is the source of truth for Lūm product identity, copy, and visual integration. Domain meaning remains governed by [LUM-TERMINOLOGY.md](LUM-TERMINOLOGY.md).

## Identity

**Product name:** Lūm  
**ASCII fallback:** Lum  
**Compact tagline:** **Weave the threads. Explore the continuum.**

Preferred short description:

> **Lūm is the loom that weaves loose threads of people, places, actions, evidence, and stories into a navigable continuum.**

Preferred product description:

> Lūm is a local-first relational knowledge environment for work where time, place, relationship, evidence, and provenance must stay connected. It reconciles loose facts, entities, occurrences, places, evidence, claims, and narrative fragments into one canonical continuum that can be explored through synchronized temporal, topological, spatial, evidentiary, analytical, and narrative projections.

The metaphor should clarify the product, not replace precise technical language.

## Naming

Use **Lūm** in:

- the README and documentation;
- page titles, metadata, application labels, and accessibility text;
- screenshots, showcase media, release notes, and product descriptions;
- human-facing contributor and architecture prose.

Use **Lum** only where Unicode is impractical or an ASCII identifier is required.

Keep `timeline` / `Timeline` when it is part of an existing compatibility contract, including repository paths, deployed URLs, storage namespaces, schema/migration identifiers, and public APIs that have not gone through a versioned rename.

Do not introduce new mixed branding such as “Timeline/Lūm” in product prose. State the product name as Lūm and describe legacy identifiers explicitly when needed.

## Mark

Canonical product mark: [`site/icon.svg`](../site/icon.svg).

The same mark is used as the application favicon and project/action mark. It should retain its own dark field, warm accent, and light strokes; do not recolor individual parts opportunistically per surface.

When the wordmark is needed, use text **Lūm** next to the mark rather than rasterizing the name into a new image. This preserves text rendering, accessibility, localization, and resolution independence.

Accessibility:

- standalone use should identify the image as “Lūm”;
- when the mark sits beside visible “Lūm” text or inside an already-labeled control, use empty alternative text so the name is not announced twice;
- decorative uses remain non-semantic.

## Palette

The application tokens in `site/styles.css` are the canonical implementation reference.

| Role | Token / value | Usage |
| --- | --- | --- |
| Ink | `#171717` | Primary text, dark mark field, strong rules |
| Paper | `#fffdf9` | Primary elevated surface |
| Canvas | `#f7f3ec` | Application background |
| Panel | `#f1ece3` | Secondary surfaces |
| Muted | `#6b6965` | Secondary text |
| Line | `#d9d2c7` | Dividers and quiet structure |
| Accent | `#b7472a` | Brand emphasis and editorial accent |
| Focus | `#1d64d8` | Keyboard/focus semantics, not general branding |
| Story | `#5b4ab8` | Story/narrative semantic state |

Semantic colors retain their meaning. The brand accent must not replace focus, danger, category, evidence, confidence, or other domain colors.

## Typography

The application currently uses Inter with a system sans-serif fallback. Brand documentation should follow the product UI rather than introduce a separate display-font dependency.

Use monospaced/tabular typography only where the content benefits from it: code, identifiers, timestamps, hashes, evidence locators, and tightly aligned quantitative data.

Typography should remain editorial and restrained. Avoid decorative treatment that competes with evidence or chronology.

## Voice and copy

Lūm copy is precise, concise, and evidence-aware.

Prefer:

- concrete nouns and verbs;
- “occurrence”, “relationship”, “place”, “evidence”, “trace”, and “continuum” when those terms are technically correct;
- short labels that describe the user's action;
- explicit statements of provenance, uncertainty, and compatibility.

Avoid:

- calling every view a “timeline”;
- using “graph” as a synonym for the canonical domain;
- poetic textile language inside low-level APIs or standards contracts;
- implying that inference is truth rather than a proposal requiring validation;
- marketing superlatives that cannot be inspected or measured.

## Product metaphor

The textile model maps to the product as follows:

```text
loose threads       source facts, entities, occurrences, places, evidence
loom                Lūm: reconciliation, validation, relation, interaction
fabric / continuum  canonical project information space
weave               relational structure and the act of connecting context
thread              traversable continuity of meaning
locus               conceptual spatial anchor
trace               provenance path back to evidence
projection          a way of reading the continuum
```

Do not create new persisted record types solely to satisfy the metaphor.

## Integration checklist

When adding a new human-facing surface:

1. name the product **Lūm**;
2. use the canonical mark rather than a copied or redrawn variant;
3. keep the short description/tagline consistent with this guide;
4. inherit palette tokens from the application design system;
5. preserve semantic colors and accessibility states;
6. use continuum/projection language consistently;
7. treat `timeline` identifiers as compatibility details, not current branding;
8. ensure metadata, image alt text, and accessibility labels use Lūm consistently.

Current integration points include:

- `site/index.html` title, description, Open Graph metadata, skip link, and app label;
- `site/icon.svg` favicon/project mark;
- `README.md`;
- generated showcase media and descriptions;
- architecture/contributor documentation.

## Repository and compatibility boundary

The repository remains `xtreemze/timeline` and GitHub Pages remains under `/timeline/` until a separately planned migration changes those infrastructure identifiers.

Branding changes must not silently rename storage keys, WebMCP tools, schema fields, migration namespaces, or stable APIs. Those require explicit compatibility/version planning.
