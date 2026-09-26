# Investigative unknowns and competing hypotheses

Lūm separates an **unresolved actor** from hypotheses about who that actor may be.

## Unknown entity

An unresolved person is still a canonical Person entity so source-backed occurrences can refer to the same unknown actor across time, place and evidence.

```text
Entity
  id: unknown-person-a
  type: person
  name: Unidentified person A
  identityResolution: unresolved
```

The placeholder name is a stable working label, not an asserted legal identity.

## Candidate identity is analytical, not canonical

A candidate identity belongs in case reasoning:

```text
Hypothesis
  hypothesisKind: identity
  unknownEntityId: unknown-person-a
  candidateEntityId: alice
  alternativeGroupId: unknown-person-a-identity
```

This does not merge the entities, rewrite occurrences, or state that Alice committed an offense.

A group should normally include multiple plausible candidates and an explicit `candidateScope: none-known` alternative so analysis does not force a choice among the people already in the case.

## Competing-hypothesis matrix

`competingHypothesisMatrix()` produces an inspectable matrix with hypotheses across columns and observations/assertions/citations down rows.

Cells are:
- supports;
- contradicts;
- contextual;
- mixed;
- unknown.

The matrix intentionally has no aggregate suspect score, truth score, winner, or automated guilt ranking. Investigators can inspect disconfirming evidence and sensitivity directly.

This is compatible with Analysis of Competing Hypotheses (ACH): enumerate reasonable alternatives, compare the same evidence across all alternatives, emphasize disconfirming evidence, and preserve the audit trail.

## Example workflow

1. Create `unknown-person-a` from a source-backed sighting or occurrence.
2. Record observations/assertions about the unknown actor without copying them onto candidate people.
3. Add identity hypotheses for Alice, Bob, Carol, and none of the known candidates.
4. Link evidence to each hypothesis with explicit supports/contradicts/contextualizes/impeaches edges.
5. Add alibi or trajectory-derived observations as evidence, not as automatic conclusions.
6. Examine the competing-hypothesis matrix and gaps.
7. Retain rejected/superseded hypotheses and rationale.
8. Only resolve/merge identity through an explicit reviewed command when the evidentiary standard used by the project is met.

## Trajectory and alibi analysis

Dense trajectories can support factual observations such as:
- a device/person was observed elsewhere during an interval;
- two trajectories overlapped or did not overlap within a tolerance;
- an unknown track passed through an occurrence area;
- an asserted alibi conflicts with another source.

Those observations can support or contradict identity hypotheses. Geometry alone must never declare identity or culpability.

## Guardrails

- identity hypothesis and offense/guilt proposition are separate questions;
- no protected/sensitive trait should produce an automated candidate rank;
- preserve exculpatory and contradictory evidence;
- missing evidence remains unknown rather than negative evidence by default;
- no automatic entity merge from a hypothesis;
- every analytical judgment remains traceable to observations, assertions, sources, assumptions and review history.
