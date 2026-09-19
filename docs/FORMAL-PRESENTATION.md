# Formal presentation and print direction

Timeline's formal surfaces should remain visually useful decades from now and translate cleanly to paper, PDF, court bundles, investigation reports, academic appendices, and archival records.

The interface can be contemporary in behavior without looking fashion-driven.

## Visual principle

Prefer the visual language of a well-edited case file, judicial opinion, archival catalogue, or academic monograph over the visual language of a dashboard.

Use hierarchy, alignment, typography, rules, whitespace, and numbering before decoration.

## Typography

Use three functional typographic roles.

### Documentary serif

For:
- reports;
- thesis/case theory;
- legal analysis;
- evidence narratives;
- long-form focused reading;
- printable case records.

Requirements:
- high legibility at 9.5–12 pt print sizes;
- strong italic;
- lining and old-style numeral support where available;
- small caps where available;
- broad language support;
- stable open licensing if a bundled font is chosen.

A system-serif fallback is preferable to a network dependency.

### Interface sans

For:
- controls;
- labels;
- navigation;
- compact metadata;
- editors.

The interface should be restrained enough that switching from screen to print does not feel like switching products.

### Technical mono / tabular numerals

For:
- timestamps;
- hashes;
- exhibit IDs;
- line/page locators;
- schema identifiers;
- machine values.

Use tabular figures for columns of dates/times and evidence identifiers.

## Form

Formal views should use:

- white or near-white paper surface;
- black or near-black text;
- thin neutral rules;
- one restrained accent;
- conventional heading hierarchy;
- square or minimally rounded containers;
- generous outer margins;
- consistent baseline rhythm.

Avoid in formal views:

- gradients;
- glass effects;
- large decorative shadows;
- novelty display typography;
- excessive pills/chips;
- status conveyed by color alone;
- layout whose meaning depends on animation.

## Print structure

A printable case record should be able to produce:

1. case cover;
2. document-control information;
3. scope and questions;
4. methodology and standards profile;
5. chronology;
6. entities: people, organizations, places, devices, tools;
7. evidence inventory;
8. acquisition / provenance / custody;
9. observations;
10. factual assertions;
11. hypotheses / propositions;
12. analyses;
13. legal issues and authorities where applicable;
14. claims and counterclaims;
15. thesis / findings;
16. limitations and unresolved contradictions;
17. review/sign-off record;
18. references and appendices.

## Print CSS requirements

- support A4 and US Letter without content loss;
- use physical print units where appropriate;
- do not truncate hashes, citations, timestamps, or exhibit IDs;
- avoid splitting a short evidence/assertion record across pages;
- use `break-before`, `break-after`, and `break-inside` deliberately;
- repeat semantic table headings through normal table layout;
- remove sticky/fixed positioning;
- hide editors, interactive navigation, animation controls, hover-only affordances, and drag handles;
- convert colored status cues to text/shape/rule distinctions that survive monochrome;
- show full link destination only where it adds evidentiary value;
- preserve source/citation numbering;
- prevent orphan headings where practical;
- make figures and captions stay together;
- use print-safe margins;
- preserve semantic DOM and reading order.

## Page identity

Formal exports should contain stable document metadata:

- case/project title;
- report title/type;
- generated/exported timestamp;
- schema version;
- Timeline build/commit;
- page/document identifier where supported;
- confidentiality/classification marking when explicitly set by the user.

Do not imply a court, government, accreditation, or certification status by visual styling alone.

## Screen-to-print continuity

Focused event/evidence views should share the same content hierarchy as reports.

The screen may use an asymmetric 12-column composition, but print should linearize it into a predictable documentary order.

A visual position must never be the only way to communicate:
- chronology;
- support/contradiction;
- hierarchy;
- relation;
- status.

## Monochrome rule

Every formal view must remain understandable when printed on a monochrome office printer.

Category colors and graph colors can remain useful on screen, but printed output must retain labels, symbols, line styles, or text equivalents.

## Motion

Motion belongs to navigation, not evidence.

Print and reduced-motion modes remove all transitions and motion. Formal reading surfaces should not require animation to understand state changes or relationships.

## Long-term design test

A formal Timeline report should still look appropriate if:
- filed in a court bundle;
- attached to an expert report;
- printed by a public agency;
- included in an academic paper;
- archived as PDF/A after an external conversion step;
- reproduced in black and white.

If the design depends on current visual fashion to look intentional, simplify it.
