# Structured case analysis methodology

Timeline uses a staged case-analysis method so evidence, observations, factual assertions, hypotheses, propositions, legal analysis, claims, and thesis are never collapsed into one undifferentiated narrative.

The method is designed for investigative, forensic, historical, regulatory, civil, criminal, and other case-based work. It provides a common workflow while keeping jurisdiction-specific legal rules and discipline-specific forensic procedures outside the generic core.

Timeline does **not** determine truth, admissibility, guilt, liability, or legal sufficiency. It records the material and reasoning needed for a human decision-maker to assess those questions.

## The reasoning chain

```text
SCOPE / QUESTIONS
       ↓
EVIDENCE + PROVENANCE
       ↓
OBSERVATIONS
       ↓
FACTUAL ASSERTIONS
       ↓
COMPETING HYPOTHESES / EXPLANATIONS
       ↓
EVALUATIVE PROPOSITIONS
       ↓
ANALYSIS
       ↓
LEGAL ISSUES + AUTHORITIES (when applicable)
       ↓
CLAIMS + COUNTERCLAIMS
       ↓
THESIS / CASE THEORY
       ↓
REPORT + REVIEW
```

The arrows mean “may be derived from or informed by.” They do not mean that every later record is necessarily true merely because earlier records exist.

## 1. Scope and questions

Begin by defining what is being investigated and what questions the work is intended to answer.

Record:

- case/project identifier;
- mandate or instruction;
- jurisdiction when relevant;
- material time period;
- people, places, systems, organizations, or events within scope;
- known limitations;
- initial investigative questions;
- legal issues already known, if any;
- applicable standards profile.

Questions should be explicit records rather than prose hidden inside a report. They may remain open throughout the investigation.

This stage prevents an investigation from silently changing its purpose after evidence is collected.

## 2. Evidence and provenance

Evidence is a source or item that may inform the investigation. Preserve the source separately from later interpretation.

For each evidence item, record where applicable:

- source identity;
- original/source filename or locator;
- exhibit identifier;
- integrity digests;
- acquisition time, method, person, place, and tool;
- source, acquired-copy, or derived-artifact status;
- lineage;
- custody actions;
- access limitations;
- known authenticity or integrity limitations.

This aligns with the forensic-process separation represented by ISO 21043 and the digital-evidence handling principles in ISO/IEC 27037 and ISO/IEC 27043.

CASE/UCO `InvestigativeAction` and `ProvenanceRecord` concepts are useful interoperability targets because they keep who/what/when/where/tool/input/output relationships explicit.

### Rule

Never replace a source record because a later analyst reaches a different interpretation.

## 3. Observations

An observation records what an examination, measurement, review, or scene inspection produced.

Examples:

- “File metadata reports a modification time of 14:32:11 UTC.”
- “Camera 3 shows a vehicle entering the frame at 21:17:04.”
- “The signed page contains the name X.”
- “No corresponding transaction appears in the supplied ledger.”

Observations should distinguish:

- the object examined;
- method used;
- analyst/tool;
- time of examination;
- result;
- uncertainty or measurement limitation;
- provenance to the evidence item;
- whether the observation is direct, derived, or tool-generated.

Avoid causal language at this stage unless causation itself was directly measured by a validated method.

ISO 21043-3:2025 is the main forensic-analysis reference for the safeguards around analytical methods, controls, personnel, and analytical strategy.

## 4. Factual assertions

A factual assertion is a proposition about the case record that a person may accept, dispute, stipulate, or adjudicate.

Timeline should avoid treating the word **fact** as a hidden truth flag. Use explicit status instead.

Suggested status values:

- `observed`;
- `corroborated`;
- `disputed`;
- `stipulated`;
- `adjudicated`;
- `withdrawn`;
- `unassessed`.

Examples:

- “The account authenticated at 09:15.”
- “Person A was in Stockholm on 19 September.”
- “The payment preceded the approval.”
- “Document B is the same document referenced by message C.”

Each assertion should link to precise citations. Citations may support, contradict, contextualize, impeach, or merely mention the assertion.

A number of supporting citations is not a truth score.

## 5. Competing hypotheses and investigative explanations

When the question is open-ended, work from observations toward multiple reasonable explanations.

Examples:

- What sequence of events could account for the observations?
- How could the material have arrived at the location?
- Which process could have produced the observed records?

The 2026 England and Wales Forensic Science Regulator guidance distinguishes this **investigative interpretation** from evaluative interpretation: investigative interpretation is findings-driven and generates possible explanations without claiming the probative weight of the findings.

For complex questions, Timeline should provide an Analysis of Competing Hypotheses (ACH)-style matrix:

- enumerate reasonable hypotheses;
- map each relevant observation/assertion to every hypothesis;
- mark consistency, inconsistency, neutrality, or unknown;
- identify evidence that is especially diagnostic;
- actively seek disconfirming evidence;
- record assumptions;
- retain rejected or superseded hypotheses and the reason.

ACH is an analytical technique, not an ISO standard. Its value in Timeline is reducing confirmation bias and leaving an inspectable reasoning trail.

### Rule

Do not select a preferred hypothesis first and then collect only supporting evidence.

## 6. Evaluative propositions

A forensic **evaluative** question is different from an open investigative hypothesis.

ISO 21043-4:2025 specifies requirements and recommendations for interpreting observations to reach opinions relevant to investigative or legal decision-making and explicitly addresses alternative propositions.

The Forensic Science Regulator's 2026 guidance uses Casework Assessment and Interpretation (CAI) concepts for evaluative work. Where appropriate:

1. identify the issue to be addressed;
2. identify relevant case circumstances;
3. formulate propositions at the appropriate level;
4. compare mutually exclusive proposition pairs;
5. identify possible observations before examination where the methodology requires pre-assessment;
6. evaluate the observations under each proposition using appropriate data, models, or explicitly disclosed expert judgement;
7. state limitations and the basis of the opinion;
8. review the result.

A typical pair might be:

- P1: the questioned activity occurred as alleged;
- P2: a specified alternative activity occurred.

The wording must be case-specific and suitable for the level of issue being evaluated.

### Critical probability rule

The probability of observing evidence **given** a proposition is not the probability that the proposition itself is true.

Timeline must not transform a likelihood ratio or evidential-support assessment into a “probability of guilt,” “probability this hypothesis is true,” or generic confidence score.

Likelihood ratios or other quantitative evaluative outputs should only be available where a validated discipline-specific method and adequate data justify them.

## 7. Analysis

An analysis record explains how observations, assertions, methods, assumptions, data, and propositions were considered.

Record:

- question addressed;
- inputs;
- methodology;
- conditioning information;
- assumptions;
- calculations or models, if any;
- alternative explanations considered;
- limitations;
- conclusion/opinion;
- analyst;
- review status;
- provenance to the records used.

Separate:

- **observation** — what was found;
- **analysis** — what was done with the findings;
- **interpretation/opinion** — what the findings mean under a stated question or proposition framework.

This separation should survive export and print.

## 8. Legal issues and authorities

Legal analysis is a separate layer over the evidentiary/factual record.

Use a FIRAC/CREAC-compatible structure:

- **Facts** — selected factual assertions relevant to the legal question;
- **Issue** — the legal question;
- **Rule** — governing law/authority;
- **Application/Analysis** — application of the rule to the factual assertions, including counterarguments;
- **Conclusion** — the resulting legal position.

IRAC/FIRAC/CREAC are reasoning and writing structures, not forensic standards. They belong after the evidentiary layer rather than replacing it.

Legal authority records should distinguish:

- jurisdiction;
- issuing court/body;
- authority type;
- citation;
- effective/decision date;
- controlling/persuasive/superseded status where known;
- pinpoint citation;
- derived rule or test;
- later history.

A statute or precedent is not the same record type as factual evidence about what happened.

## 9. Claims and counterclaims

A claim is an analytical conclusion asserted in the case.

A claim should identify:

- what is asserted;
- relevant issue/question;
- factual assertions relied on;
- authorities/rules relied on where legal;
- analyses relied on;
- supporting citations;
- contradictory material;
- counterclaims;
- assumptions and limitations;
- author;
- status.

Suggested statuses:

- `draft`;
- `supported`;
- `disputed`;
- `qualified`;
- `withdrawn`;
- `adjudicated`.

“Supported” means the author has identified support; it does not mean Timeline declares the claim true.

## 10. Thesis or case theory

A thesis is the highest-level explanatory or argumentative synthesis.

It should be constructed from claims, not directly from raw evidence.

A thesis should make visible:

- central proposition;
- supporting claims;
- material counterclaims;
- unresolved contradictions;
- critical evidence;
- critical assumptions;
- scope;
- limitations;
- author and revision history.

Different parties or analysts may create competing theses over the same canonical chronology and evidence. They must not duplicate or rewrite the underlying records.

The thesis is therefore analogous to a Story in narrative function, but it has an explicit analytical support graph.

## 11. Proof graph

Timeline should use a modernized Wigmore-style proof graph to make reasoning visible.

Typical edges:

- evidence `producedObservation` observation;
- citation `supports` assertion;
- citation `contradicts` assertion;
- assertion `supports` hypothesis/proposition;
- assertion `contradicts` hypothesis/proposition;
- hypothesis `explains` observation;
- analysis `evaluates` proposition;
- authority `definesRule` rule;
- rule `governs` issue;
- claim `appliesRule` rule;
- claim `reliesOn` assertion;
- counterclaim `opposes` claim;
- thesis `reliesOn` claim.

Unlike a traditional static proof chart, Timeline must preserve temporal scope on nodes and edges where relevant.

## 12. Review and reporting

ISO 21043-5:2025 requires/recommends forensic reporting that is accurate, clear, transparent, complete, unambiguous, impartial, and suitable for intended use, together with case-record/report review and report control.

A formal report should therefore expose, rather than hide:

- scope and questions;
- methods;
- evidence and provenance;
- observations;
- factual assertions and status;
- alternative hypotheses/propositions;
- analysis and interpretation;
- legal authorities where applicable;
- claims/counterclaims;
- thesis/findings;
- unresolved contradictions;
- limitations;
- reviewer and review state;
- software/schema/method versions.

The report is a deterministic view over canonical records. Editing the report must not silently mutate underlying evidence or observations.

## Recommended user-facing workflow

Keep the UI vocabulary simple:

**Evidence → Observations → Facts → Hypotheses → Analysis → Claims → Thesis → Report**

“Facts” in the navigation is a plain-language label for factual assertions whose detailed status remains visible.

Legal cases can enable an additional layer:

**Issues → Rules → Application → Conclusions**

The application should allow investigators to move backward as new evidence appears while preserving the history of superseded reasoning.

## Standards and methodological references

Primary standards/alignment targets:

- ISO 21043-1:2025 — Forensic sciences — Vocabulary.
- ISO 21043-2:2018 — recognition, recording, collection, transport, and storage of items; replacement edition is still under development as of September 2026.
- ISO 21043-3:2025 — Analysis.
- ISO 21043-4:2025 — Interpretation.
- ISO 21043-5:2025 — Reporting.
- ISO/IEC 27037:2012 — digital evidence identification, collection, acquisition, and preservation.
- ISO/IEC 27043:2015 — incident investigation principles and processes.
- CASE/UCO — investigative actions, provenance, chain of evidence/custody, interoperable cyber-investigation records.
- W3C PROV-O — generic Entity / Activity / Agent provenance model.

Methodological references:

- UK Forensic Science Regulator, *Forensic science activities: interpretation and communication (FSR-GUI-0004)*, 2026.
- Casework Assessment and Interpretation (CAI) as described by the Forensic Science Regulator and related forensic literature.
- Richards J. Heuer Jr., *Psychology of Intelligence Analysis*, chapter on Analysis of Competing Hypotheses.
- Wigmorean proof analysis and later work by Anderson, Schum, Twining, Tillers, and others.
- FIRAC / IRAC / CREAC legal-analysis structures.

## Product rule

Timeline should help a user show **how** a conclusion was reached and **what** supports or contradicts it.

It should not make the conclusion for them.
