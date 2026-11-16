# Legal-case evaluation profile

Status: design contract / implementation guide. This is a jurisdiction-neutral extension of [CASE-ANALYSIS-METHODOLOGY.md](CASE-ANALYSIS-METHODOLOGY.md), not a new canonical collection or a claim of certification.

## Purpose and non-goals

Use the existing Lūm evidence, observation, assertion, hypothesis, analysis, claim, thesis, and reporting workflow to evaluate legal and administrative decisions without conflating an event, the contents of an official record, and the legal correctness of that record.

This profile does **not** decide legal validity, admissibility, factual truth, institutional liability, or damages; it does not implement national law in the domain; and it does not treat AI output or a valid project schema as accepted fact.

## Architecture and ownership

Follow [CONTRIBUTOR-ARCHITECTURE.md](CONTRIBUTOR-ARCHITECTURE.md):

```text
source adapters -> candidate claims/reconciliation
                           |
                           v
           canonical entities / relations / occurrences / places / sources
                           |
                           v
                  application analysis
                           |
                           v
                  immutable projections
                           |
                           v
                     reviewed reports
```

1. An institutional action, communication or issuance of a document can be represented as a canonical occurrence **only when supported at the correct evidentiary granularity**. The proposition that the institution acted lawfully is an analytical question, not an occurrence attribute.
2. Keep reusable evidence references rooted in existing source/evidence ownership; preserve original bytes and acquisition context. Derived text, summaries and translations are separately attributed artifacts. Exact pinpoint citations must resolve against their source/version.
3. Legal authority and applicability profiles belong to the investigation/application layer until a live typed schema and validator explicitly support a durable serialized contract. Do not add illustrative `legalIssues[]` or `remedies[]` fields to canonical project JSON.
4. Reuse the current first-class analytical records and method registry where actually implemented. Proposed additions must preserve existing IDs and migration compatibility.
5. The same source may support competing claims in separate proceedings without duplicating the evidence item. Supporting, contradicting, contextualizing and merely mentioning citations are distinct.
6. Source-backed geographic anchors, occurrence time and uncertainty are canonical only under existing contracts. Camera/layout coordinates, route drawings and visual offsets are not evidence. WorldSurface and Timeline must consume the same logical occurrence selection without editing source material.

## Case scope and issue separation

Each case workspace has an explicit scope, jurisdictions, material periods, participating authorities, known limitations, confidentiality requirements and versioned questions. Distinguish a **case theory** (cross-issue explanatory synthesis) from an **operative filing** (one primary remedy to the competent authority).

For each legal issue record or application-level view, capture:

- issue ID and precise question;
- authority and competence;
- material facts by assertion IDs and pinpoint citations;
- statutory/legal provision and its applicable date/version, hierarchy, exceptions, and controlling status;
- triggering facts and mandatory versus discretionary language;
- decision or omission at issue, author, issue/communication dates, service and operative effect;
- favorable interpretation, strongest opposing interpretation, assumptions and unresolved evidence;
- procedural posture: decision existence, reviewability, appealability, standing, forum, deadline, suspensive effect;
- available primary remedy and required disposition (grant, merits refusal, procedural refusal/dismissal, supplementation, correspondence misclassification, failure to decide);
- analyst, reviewer, methodological limitations and revision history.

Legal rules must be checked against authoritative sources **as effective at the event/decision date** and again before a current filing; later reforms must not be silently applied retrospectively. Specific law takes priority over general procedure where required by the legal system.

## Mandatory review process

```text
QUESTION
  -> SOURCE + PROVENANCE
  -> OBSERVATION (what the source says/shows)
  -> ASSERTION (observed/corroborated/disputed/etc.)
  -> HYPOTHESES + DISCONFIRMING ENQUIRIES
  -> LEGAL RULE + TEMPORAL APPLICABILITY
  -> RULE APPLICATION + OPPOSING POSITION
  -> CAUSATION / COUNTERFACTUAL (if requested)
  -> REMEDY / COMPETENCE / PROCEDURAL GATE
  -> INDEPENDENT REVIEW
  -> READ-ONLY REPORT
```

### Essential gates

**Source gate:** each consequential assertion identifies an immutable source locator, acquisition and known integrity limitations. Missing records are explicitly unknown; a negative finding requires defined search scope.

**Timing gate:** distinguish creation, dispatch, legal service, actual receipt, agency knowledge, operative action and later review. Store time zone/precision; never synthesize an exact time from a date-only source.

**Decision-character gate:** evaluate substance, communication, rights effect and operational consequences; a document label is not decisive. A subsequent formal disposition may be a separate object from an earlier operational assessment.

**Alternative-hypotheses gate:** use ACH/alternative propositions and devil's advocacy. Record relevant disconfirming evidence, including state-friendly records, and a discriminating enquiry when explanations remain open.

**Competence/remedy gate:** do not ask one authority to perform another authority's function. Review limitations on statutory remedies independently from substantive merit. Reasons for a refusal do not substitute for a disposition.

**Causation gate:** distinguish duty breach, exposure, event, harm, foreseeability, alternative cause and counterfactual. A procedural fault is not automatic proof of damages or a different substantive outcome.

**Privacy gate:** make private-by-default evidence storage and access controls a prerequisite for real cases. No medical details, sensitive locations, legal privilege, government identifiers or non-public exhibits in a public repository, issue, PR or demo fixture. Synthetic fixtures are required for shared tests.

## Acceptance tests for a future implementation

The current file is documentation only. Behavior changes require RED -> GREEN -> REFACTOR under `AGENTS.md` and focused executable tests.

1. The same source can be cited for opposing factual assertions, with different typed locators and citation relations; neither assertion is automatically accepted.
2. An official conclusion recorded as an occurrence remains distinct from the legal claim that its conclusion was right or wrong.
3. Missing time precision, time zone or geographical data remains unresolved in all projections and exports.
4. Historical statute versions and current statute versions remain distinguishable; an applicable-date mismatch blocks an unqualified conclusion.
5. A case claim cannot be marked review-complete without exposing material counterclaims, contradictions, limitations and reviewer attribution.
6. An authority-specific report contains only that authority's requested remedy, legal issue, evidentiary references and procedural posture, but does not rewrite source records.
7. A report/report-filter or world/timeline interaction never mutates canonical provenance or occurrence meaning.
8. A revision-bound agent proposal that becomes stale fails closed and cannot silently overwrite canonical data.
9. Shared/exported evidence respects sensitivity classifications and omits protected attachments unless separately authorized and verified.
10. A test fixture must be synthetic, not a copy of a real individual's confidential case file.

## Implementation slicing and existing ownership

- Reuse issue [#28](https://github.com/xtreemze/timeline/issues/28) for staged investigation and legal reasoning; do not create a parallel reasoning schema.
- Reuse [#814](https://github.com/xtreemze/timeline/issues/814) for structured analytical tradecraft, assumptions, quality reviews and disconfirming enquiries.
- Define a separate bounded application-level **legal evaluation profile**, backed by source/pinpoint references and legal-version metadata, only after inspecting existing owners and validators.
- Build a private case adapter over a non-public evidence store; avoid uploading personal case artifacts into this repository.
- Add report projections last, once issue/citation/review contract tests pass.

## Initial synthetic acceptance scenario

An international body issues a stop request during an escorted cross-border operation. Domestic law has (A) a provision deeming a removal order executed on border exit and (B) a separate inhibition provision. A later agency record discontinues the inhibition matter.

The test should represent: separate events for issuance, receipt, ongoing operation, agency determination, continuation and later disposition; imperfect timestamp precision; two competing statutory interpretations; no predetermined legal outcome; explicit authority competence and procedural posture; preserved source locators throughout report export.

This synthetic scenario tests the **reasoning and provenance machinery**, not a legal answer for an actual person.

## Review evidence required before declaring implementation complete

Report the exact repository commit, current typed schema and validators inspected, failing and passing focused tests, broader check results, source-specific provenance controls and remaining unresolved questions. Documentation review is not an executable validator pass.
