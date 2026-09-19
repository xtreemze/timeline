# Forensic case-analysis benchmark and product direction

Status: research-backed product decision record, September 2026.

This document compares Timeline with adjacent legal, forensic, investigative and intelligence-analysis products. It is intentionally based on publicly documented product capabilities. An empty or limited cell means the capability is not a documented core workflow, not that it is impossible to achieve with customization.

Timeline must not claim that software fields make evidence admissible, that a passing validation profile is ISO certification, or that an analytical conclusion is true.

## Comparison matrix

| Product | Primary UX | Chronology / timeline | Pinpoint evidence / source traceability | Entity / relation / map analysis | Hypothesis / proof reasoning | Forensic provenance / custody | Standards / interchange | Formal report / print |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Timeline (target)** | Timeline-first investigative case workspace with synchronized map, relation graph and analytical lenses | **Core:** continuous horizontal/vertical zoom from centuries to milliseconds; ranges and uncertainty | **Target core:** evidence → observation → assertion with pinpoint locators and bidirectional trace | **Core/in progress:** temporal graph, relevant-neighborhood graph, map, reusable people/places/entities | **Target differentiator:** competing hypotheses, alternative propositions, proof graph, legal issue/rule matrix, claims and thesis | **In progress:** evidence identity, digests, acquisition, lineage and timestamped custody actions | **Target core:** CASE/UCO, PROV-O, ISO-aligned validation profiles, calendar/geospatial adapters | **In progress:** deterministic case report plus classic A4/Letter print system |
| CaseFleet | Litigation fact chronology and source review | Strong fact chronology; horizontal timeline and minimap | Strong citations to evidence; facts, entities and issues are linked | Entity/fact relationships; graph is secondary to chronology | Issues/claims help organize facts; no publicly documented forensic proposition/ACH workflow | Not a forensic acquisition/custody platform | Legal workflow rather than forensic interchange standard | Strong Word/PDF/Excel chronology and issue reports |
| LexisNexis CaseMap+ | Litigation case organization and analysis | Fact chronology/timeline | Documents, transcripts, facts and issues linked in one case | Structured facts/people/issues; visualization/dashboard | Claims/issues and fact evaluation support strategy; not a forensic interpretation standard | Not a forensic acquisition/custody platform | Legal ecosystem integrations; not CASE/UCO-centric | Strong litigation reports and presentation-suite integration |
| Everlaw Storybuilder | Collaborative narrative building after discovery | Multiple Fact Timelines with dated/approximate facts and date visualizer | Strong: facts linked to documents, highlights and deposition testimony; drafts cite evidence | People, labels, related facts; relation graph is not the primary UX | Supports argument building and testing theories; no public ISO/ACH/CAI proof ledger | E-discovery evidence controls, but not a forensic acquisition/custody model | E-discovery/legal workflow rather than CASE/UCO | Collaborative drafts, depositions and case work product |
| Timesketch (open source) | Search/explore large forensic timelines, save views, tell investigation stories | Excellent forensic event-timeline analysis across imported data | Events retain raw fields; comments/tags/stars/saved searches preserve analyst context | Limited graph emphasis; timelines/search/stories are primary | Stories and analyzers assist investigation; no legal proof/claims model | Strong forensic-event provenance from imported sources; custody is not the main case model | Plaso/JSON/CSV/OpenSearch ecosystem; not a general legal case ontology | Stories/export are useful, but formal judicial report structure is not the central UX |
| i2 Analyst's Notebook | Visual intelligence/link analysis | Timeline/temporal analysis is a major lens | Source references can be attached, but document pinpoint citation is not the main public workflow | Excellent entities, links, charts and analytical exploration | Explicitly supports forming hypotheses and next actions; proof/legal-rule structure is not its main domain | Not a digital-evidence acquisition/custody platform | Flexible intelligence data integration rather than forensic ISO record profiles | Strong analytical charts/presentations; legal/forensic report controls are separate concerns |
| Magnet AXIOM | Digital evidence recovery, examination and reporting | Excellent artifact/file-system timeline across evidence sources | Strong drill-down to raw/source artifact and metadata | Connections and map/location views complement evidence explorers | Helps reconstruct activity and intent; no public legal claim/thesis reasoning model | Strong digital-forensic acquisition/examination context | Forensic tool ecosystem; interoperability is tool-oriented rather than CASE/UCO-first | Strong forensic reporting/export |
| Maltego | OSINT/cyber investigation and link analysis | Timeline and geographical mapping complement graph investigations | Hunchly/web evidence capture in higher plans; graph entities retain sourced data | Excellent graph/link analysis and OSINT enrichment | Strong investigative exploration; no public formal legal proof-chain workflow | Evidence capture is available, but chain-of-custody is not the graph model's primary focus | Broad connector/data ecosystem; not an ISO 21043 case-record profile | Investigation outputs/graphs; formal judicial report model is not the core UX |
| OpenCTI (open core) | Structured threat-intelligence knowledge graph | Timeline view over structured knowledge | Strong object provenance and report-contained knowledge | Excellent graph and relationship analysis | Analysis reports and relationship suggestions; not a legal proof/forensic proposition workflow | Cyber-intelligence provenance rather than physical/digital custody workflow | Strong structured CTI standards ecosystem | Reports are strong for CTI; judicial case bundles are not the primary target |

## Product conclusion

No single competitor is the template.

The strongest direction for Timeline is to combine four proven interaction models while keeping chronology primary:

1. **CaseFleet / Everlaw:** source-to-fact traceability, issue tagging, and low-friction chronology building.
2. **Timesketch / Magnet AXIOM:** granular forensic chronology, exact source drill-down, and reproducible technical analysis.
3. **i2 / Maltego / OpenCTI:** graph and relationship exploration that exposes people, places, entities and links.
4. **CaseMap / legal writing practice:** issues, rules, applications, claims, counterarguments and durable work product.

Timeline's distinctive layer should be an explicit, inspectable reasoning chain:

**Evidence → Observation → Factual assertion → Competing hypothesis / evaluative proposition → Analysis → Claim → Thesis → Report**

The graph and map are complementary lenses. The timeline remains the dominant interaction and presentation surface.

## Methodology decision

There is no single methodology that is simultaneously a forensic standard, investigative hypothesis method, proof-analysis method and legal-writing structure. The most standards-aligned and understandable workflow is therefore staged.

### 1. Preserve and identify evidence

Use ISO 21043 process concepts and, for digital evidence, ISO/IEC 27037. Preserve stable identity, acquisition context, integrity digests, lineage and custody actions. Do not allow later analysis to rewrite source records.

### 2. Record observations before conclusions

An observation is what was detected or measured. It should record method/tool/version, source evidence, temporal context, operator/analyst and limitations where applicable.

### 3. Form factual assertions with pinpoint citations

A factual assertion is a case statement derived from evidence/observations. It can be alleged, corroborated, disputed, stipulated, adjudicated or withdrawn. Supporting evidence count is not a truth score.

### 4. Use competing hypotheses for open investigative questions

Before the evaluative question is stable, use an ACH-style matrix:
- enumerate reasonable alternatives;
- map relevant evidence against every alternative;
- emphasize inconsistency/disconfirmation;
- retain assumptions and rejected hypotheses;
- keep the reasoning history.

ACH is an analytical aid, not an ISO forensic standard and not a probability engine.

### 5. Use alternative propositions for forensic evaluation

ISO 21043-4:2025 explicitly addresses interpretation against alternative propositions. For evaluative analysis, Timeline should record:
- the question;
- relevant case circumstances / conditioning information;
- mutually exclusive or otherwise appropriately framed alternatives;
- observations considered;
- method/model/data or disclosed expert judgement;
- limitations;
- result and review.

Never convert P(E|H) or a likelihood ratio into P(H|E), a probability of guilt, or a generic confidence score.

### 6. Use a modernized Wigmore proof graph

Expose inferential structure:
- evidence/observation;
- factual assertion;
- intermediate proposition;
- issue/claim;
- ultimate thesis.

Support, contradiction, impeachment, context and assumptions should be explicit edges. Temporal scope remains first-class.

### 7. Apply law only after the factual layer

Use FIRAC/IRAC/CREAC as a legal reasoning/composition lens:
- facts;
- issue;
- rule/authority;
- application and counterargument;
- conclusion.

Legal authorities are a different record class from factual evidence.

### 8. Generate a deterministic report

The report is a projection of canonical records, not a second editable truth store. It should expose unresolved contradictions, limitations, methodology, profile versions, reviewer state, application/schema versions and traceable record IDs.

## Standards baseline

As of September 2026:

- ISO 21043-1:2025 — vocabulary.
- ISO 21043-2:2018 — current published Part 2; a replacement edition is under development.
- ISO 21043-3:2025 — analysis.
- ISO 21043-4:2025 — interpretation.
- ISO 21043-5:2025 — reporting.
- ISO/IEC 27037:2012 — identification, collection, acquisition and preservation of digital evidence.
- ISO/IEC 27041:2015 — suitability and adequacy of investigative methods.
- ISO/IEC 27042:2015 — digital evidence analysis/interpretation with continuity, validity, reproducibility and repeatability.
- ISO/IEC 27043:2015 — incident investigation principles and processes.
- CASE/UCO — interoperable cyber-investigation representation, actions and provenance.
- W3C PROV-O — generic Entity/Activity/Agent provenance mapping.

The project should version its own validation profiles and reference these standards. It must not copy non-public normative ISO text into the repository.

## UX contract

### Presentation

- timeless documentary styling;
- formal reading/report surfaces use a legible serif role;
- controls use a restrained sans role;
- timestamps, hashes and exhibit IDs use tabular or monospaced numerals;
- thin rules and whitespace before decorative cards;
- no gradients, glass, decorative shadow dependence or fashion-driven display type in formal case views;
- monochrome-safe;
- semantic reading order.

### Responsive interaction

The case must remain fully interactive in:
- phone portrait;
- phone landscape;
- tablet portrait;
- tablet landscape;
- desktop;
- fullscreen/presentation.

Touch, mouse, keyboard and D-pad must have equivalent paths. Long-press graph dragging must not interfere with pinch zoom or ordinary tap selection. No critical evidence or analytical state may exist only on hover.

### Print

A4 and US Letter must preserve:
- complete citations;
- exhibit IDs;
- hashes;
- timestamps;
- table headers;
- figure captions;
- analytical status text;
- support/contradiction semantics.

Print can linearize an asymmetric screen layout, but it cannot lose the relationship or provenance semantics.

## Action map

- #42 — canonical analytical records, dependency tracing and provenance validation.
- #43 — responsive case-analysis workbench, proof graph and competing-hypothesis matrix.
- #44 — versioned standards profiles and method-validation ledger.
- #45 — deterministic forensic/legal report bundles and print conformance fixtures.
- #21/#22/#23/#24/#25/#28/#29/#30 remain the broader parent/domain issues.

## Public references

- CaseFleet facts and chronology: https://support.casefleet.com/en/collections/149853-facts
- CaseFleet concepts: https://support.casefleet.com/en/articles/1982995-key-concepts-in-casefleet
- CaseFleet reports: https://support.casefleet.com/en/articles/2013230-exporting-facts-and-running-reports
- CaseMap+: https://www.lexisnexis.com/en-us/products/casemap.page
- Everlaw Storybuilder: https://support.everlaw.com/hc/en-us/articles/206439403-Introduction-to-Storybuilder
- Everlaw Fact Timelines: https://support.everlaw.com/hc/en-us/articles/42469701435803-Storybuilder-Fact-Timelines
- Timesketch basic concepts: https://timesketch.org/guides/user/basic-concepts/
- Timesketch sketch overview: https://timesketch.org/guides/user/sketch-overview/
- i2 Analyst's Notebook getting started: https://docs.i2group.com/anb/10.1.1/anb_get_started.html
- Magnet AXIOM: https://www.magnetforensics.com/products/magnet-axiom/
- Maltego capabilities: https://get.maltego.com/landing-page/maltego-platform-product-capabilities
- OpenCTI analysis: https://docs.opencti.io/latest/usage/exploring-analysis/
- CASE: https://caseontology.org/
- CASE design/specification: https://caseontology.org/resources/case_design_document.html
- W3C PROV-O: https://www.w3.org/TR/prov-o/
- ISO catalogue: https://www.iso.org/committee/4395817/x/catalogue/
- ISO/IEC 27037: https://www.iso.org/standard/44381.html
- ISO/IEC 27041: https://www.iso.org/standard/44405.html
- ISO/IEC 27042: https://www.iso.org/standard/44406.html
- ISO/IEC 27043: https://www.iso.org/standard/44407.html
- CIA, Analysis of Competing Hypotheses: https://www.cia.gov/resources/csi/static/Pyschology-of-Intelligence-Analysis.pdf
- Columbia Law School IRAC/CRAC/CREAC guide: https://www.law.columbia.edu/sites/default/files/2024-10/WC%20Handout%20IRAC%2C%20CRAC%2C%20CREAC.revised%209.24.pdf
