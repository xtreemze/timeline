# Standards and prior-art register

This register records external models and products that inform Timeline v3. It is not a dependency list and does not imply certification.

## Temporal standards and models

### ISO 8601-1 / ISO 8601-2

Use for machine-readable Gregorian dates/times and extended representations. ISO 8601-2:2019 explicitly covers uncertain or approximate dates, unspecified portions, extended intervals, sets/choices, grouped time-scale units, recurrence, and date/time arithmetic. A second edition is under development in 2026, so implementation should target the published 2019 baseline and isolate any future syntax changes behind adapters.

References:
- https://www.iso.org/standard/70908.html
- https://www.iso.org/standard/91030.html

### W3C OWL-Time

Useful conceptual model for `Instant`, `Interval`, duration, temporal precision, temporal topology, and temporal reference systems. Particularly relevant because Timeline needs both positions on a continuous axis and calendar/clock representations.

Reference:
- https://www.w3.org/TR/owl-time/

### RFC 5545 iCalendar

Useful interchange target for conventional calendar events. Preserve `UID` where available; map `DTSTART` / `DTEND` only when Timeline temporal semantics can be represented without ambiguity.

Reference:
- https://www.rfc-editor.org/rfc/rfc5545.html

## Forensic / evidentiary standards

### ISO 21043 series

Relevant forensic-process targets:
- ISO 21043-2:2018 — recognition, recording, collection, transport, storage.
- ISO 21043-3:2025 — analysis.
- ISO 21043-4:2025 — interpretation.
- ISO 21043-5:2025 — reporting.

References:
- https://www.iso.org/standard/72041.html
- https://www.iso.org/standard/72040.html
- https://www.iso.org/standard/72039.html
- https://www.iso.org/standard/73896.html

### ISO/IEC 27037 / 27041 / 27042 / 27043

Digital-evidence and incident-investigation guidance:
- identification, collection, acquisition, preservation;
- suitability/adequacy of investigative methods;
- analysis/interpretation, including continuity, validity, reproducibility, repeatability;
- incident-investigation principles and processes.

References:
- https://www.iso.org/standard/44381.html
- https://www.iso.org/standard/44405.html
- https://www.iso.org/standard/44406.html
- https://www.iso.org/standard/44407.html

## Investigation ontologies and provenance

### CASE / UCO

CASE is directly relevant to Timeline's evidence mode because it models cyber-investigation information as a structured ontology and explicitly tracks provenance, chain of custody, chain of evidence, people, places, tools, actions, and data sources. UCO provides the broader foundation.

Adopt concepts and interchange mappings where useful; do not force RDF/OWL terminology into the normal authoring UI.

References:
- https://caseontology.org/
- https://caseontology.org/ontology/intro.html
- https://ontology.caseontology.org/documentation/
- https://unifiedcyberontology.org/

### W3C PROV-O

General provenance mapping:
- `prov:Entity`;
- `prov:Activity`;
- `prov:Agent`;
- derivation, attribution, usage, generation, association, and responsibility relationships.

Reference:
- https://www.w3.org/TR/prov-o/

## People and places

### ISO 27729:2024 (ISNI)

Optional identifier for public identities. Do not require it for ordinary/private persons.

Reference:
- https://www.iso.org/standard/87177.html

### RFC 6350 vCard

Optional interchange for person/organization contact records.

Reference:
- https://www.rfc-editor.org/rfc/rfc6350.html

### ISO 19112:2019

Geographic identifiers and gazetteer concepts for place records.

Reference:
- https://www.iso.org/standard/70742.html

### ISO 19111:2019

Coordinate reference-system metadata.

Reference:
- https://www.iso.org/standard/74039.html

### RFC 7946 GeoJSON

Practical geometry interchange using WGS 84 / CRS84 longitude-latitude coordinates.

Reference:
- https://www.rfc-editor.org/rfc/rfc7946.html

## Prior art

### vis-timeline

What to learn:
- direct pan/zoom interaction;
- automatic axis scale selection;
- time scale from milliseconds through years;
- point and range items;
- editable DOM-rendered items;
- explicit minimum/maximum zoom ranges.

What not to inherit blindly:
- internal date assumptions;
- UI styling;
- dependency weight;
- evidence/data semantics.

Reference:
- https://visjs.github.io/vis-timeline/docs/timeline/

### ChronoZoom

What to learn:
- extremely large temporal navigation;
- infinite-canvas mental model;
- zoom as the primary navigation mechanism;
- nested contextual periods.

ChronoZoom is retired, so it is a design precedent rather than a technology dependency.

References:
- https://www.microsoft.com/en-us/research/project/chronozoom/
- https://chronozoom.com/

### Aeon Timeline

What to learn:
- variable date precision;
- uncertain dates;
- infinite zoom;
- reusable people/places/entities;
- event↔entity relationships;
- inspector-driven detail editing;
- minimap/context navigation.

Reference:
- https://www.aeontimeline.com/features/interactive-timeline-software
- https://www.aeontimeline.com/features/structure-templates-and-customization

### TimelineJS

What to learn:
- simple portable JSON;
- event start/end dates down to millisecond precision;
- BCE year representation;
- groups/eras;
- media thumbnail markers and accessible media metadata;
- separation between display date and positioning date.

Reference:
- https://timeline.knightlab.com/docs/json-format.html

### TimeMapper

What to learn:
- timeline + map coordination;
- data-package oriented interchange;
- clear distinction between data and visualization configuration.

Reference:
- https://github.com/okfn/timemapper

## Decisions for Timeline

1. Keep the product dependency-free until a library proves materially better than a small auditable scale/layout kernel.
2. Treat standards as data contracts and export targets, not as visual design constraints.
3. Use CASE/UCO + PROV-O concepts for evidence provenance, but expose plain-language forms.
4. Keep person/place/evidence fields optional and progressively disclosed.
5. Preserve raw source representations alongside normalized values when conversion can lose meaning.
6. Make uncertainty, precision, and interpretation explicit rather than encoding them in free text.
7. Maintain horizontal and vertical views as one renderer with orientation-neutral geometry.
8. Keep semantic icons/images separate from connector/shape styling so presentation can evolve without mutating records.
