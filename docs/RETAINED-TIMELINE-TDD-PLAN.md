# Retained timeline TDD plan

Tracking: #282  
Parent architecture: #239, #236, #244  
Implementation lanes: #267, #268, #269, #270, #271

## Purpose

The retained timeline is a rendering architecture, not a collection of visual fixes. Its tests therefore need to protect identity, interaction epochs, projection correctness, commit-time reconciliation, accessibility state, and measurable performance separately.

The implementation sequence is **red -> green -> refactor**. Tests should become green because the architecture satisfies the contract, never because assertions are weakened or moved to source-string matching.

## Baseline already recovered

The TDD work starts after:

- #262: pure temporal-scene window/retention primitives and retained occurrence rendering;
- #263: shared occurrence hover/focus/selection state;
- #273: weighted timeline inertia and focused popover presentation;
- #278: temporal graph window/neighborhood/projection semantics;
- #280: semantic zoom and retained temporal context labels;
- #281: retained pinch, double-tap, and interruption handling.

These behaviors are characterization baselines. New work must build on them rather than reimplement them in parallel.

## Contract layers

### 1. Projection/scene identity

Owned by `src/projection`.

Stable identities:

- occurrence: canonical occurrence/relationship ID;
- tick: semantic unit + canonical temporal value;
- temporal accent: accent kind + canonical temporal value;
- relationship band: canonical relationship ID.

Mutable formatting, translated text, pixel coordinates, lane number, renderer ID, and DOM position are not identity.

### 2. Layout reconciliation

Owned by `src/layout`.

Continuous interaction may project existing geometry and extend buffers. Exact cluster/lane/collision work is a commit concern.

Required properties:

- cluster enter and exit thresholds are different;
- prior lanes are reused while valid;
- terminal measurement is cached by scene identity + content revision;
- two-line headlines are measured geometry;
- fixed inputs produce deterministic committed output;
- rapid reversal inside a hysteresis band cannot flap cluster membership.

### 3. Structural composition

Owned by the timeline interaction/composition boundary.

Focus and orientation are transactions:

1. acquire/protect current and target scene identities;
2. begin retained epoch;
3. animate camera/composition;
4. reconcile final DOM inside the structural View Transition callback when available;
5. commit viewport/scene;
6. prune only after commit.

Reduced motion skips interpolation, not state transitions or final membership.

### 4. Canonical timeline projection

Owned by `src/projection/timeline-projection.ts` and shared application state from #247.

Timed canonical relationships are the default chronology occurrence source. Their canonical relationship ID is also their occurrence identity unless a durable explicit occurrence identity is required by the domain.

The renderer must not parse canonical arrays itself and must not persist renderer/provider data.

### 5. Performance evidence

Owned by `src/performance` plus browser instrumentation.

Report continuous interaction separately from commit work. Measurements must include:

- frame duration distribution and p95;
- created/destroyed DOM nodes;
- retained-node peak;
- buffer expansions;
- commit duration;
- planner/query duration;
- long tasks where observable;
- explicit invariant violations.

## Test matrix

| Gate | Issue | Pure tests | Browser tests | Green means |
| --- | --- | --- | --- | --- |
| A | #267 | scene keys, interval identity | occurrence/tick identity, no blank semantic zoom | temporal context is retained by key |
| B | #268 | hysteresis, stable lanes, measurement identity, deterministic planner | rapid reversal/layout stability | expensive layout is commit-time and stable |
| C | #269 | transaction state where extractable | focus/orientation retention | structural changes preserve scene identity |
| D | #270 | relationship occurrence projection | cross-view selection later | chronology consumes canonical projection |
| E | #271 | metrics/p95/invariant detection | cancellation, DOM churn, performance fixtures | scaling decisions are evidence-based |

## Performance policy

### Hard invariants now

These can fail CI immediately because they are architectural, not machine-speed dependent:

- no wholesale chronology DOM replacement during ordinary interaction;
- no destruction/recreation of a retained keyed record merely because its coordinate changed;
- protected focus/keyboard identities cannot be evicted mid-transaction;
- retained object count must remain bounded by policy;
- pointer cancel/lost capture/orientation interruption must reach committed/pruned state.

### Initial targets, not yet hard CI gates

Until #271 records a stable reference environment:

- desktop p95 interaction frame target: <= 16.7 ms;
- phone/tablet p95 interaction frame target: <= 33.3 ms;
- ordinary interaction should produce no >50 ms long task attributable to chronology rendering;
- commit cost is measured independently and may exceed one frame, but must remain bounded and visible.

After baselines exist, #251 owns promotion of stable thresholds into CI/release gates.

## Temporal indexing decision

Do not add an interval tree or worker because the architecture permits it.

Measure first:

1. linear scan;
2. sorted points + binary search;
3. interval-aware range index;
4. worker-hosted planner, including serialization/transfer cost.

Adopt a more complex strategy only when #271 shows a material improvement at the fixture sizes that fail the simpler approach.

## Browser harness

`playwright.config.mjs` currently discovers `tests/browser`. Existing `tests/playwright/*` files are therefore not part of the configured suite.

New retained-timeline browser tests live under `tests/browser`.

A separate cleanup should either migrate valuable older specs into the configured directory or explicitly expand `testMatch` after repairing stale assertions. Test files must never be counted as coverage merely because they exist in the repository.

## Delivery topology

#286 is a red specification branch, not a prerequisite branch that every implementation lane must stack on.

Preferred parallel workflow:

1. each #267-#271 implementation PR branches from current `main`;
2. it copies/absorbs the test file(s) owned by that issue from #286;
3. the PR makes those tests green without weakening them;
4. the tests merge with the implementation that satisfies them;
5. #286 is periodically rebased/reconciled only as a specification audit;
6. once every gate has landed on `main`, #286 is closed or reduced to any still-unmerged contract.

This avoids serializing independent agents behind an intentionally failing umbrella branch and keeps every merged test executable on the same commit as the behavior it protects.

A child PR may target #286 only when it truly depends on another unmerged child lane; that should be the exception and the dependency must be stated explicitly.

## PR sequence

1. **TDD contract PR** — this document plus intentionally red tests; keep as a draft specification branch while gates are red.
2. **#267 scene identity/context PR** — make Gate A green without touching Gate B-D expectations.
3. **#268 layout planner PR** — make Gate B green; keep DOM reconciliation thin.
4. **#269 structural composition PR** — make Gate C green in normal and reduced-motion modes.
5. **#270 projection PR** — make Gate D green using #245/#247 contracts.
6. **#271 instrumentation PR** — make Gate E green, publish baselines.
7. **Index/worker PR only if measured** — no speculative scaling subsystem.
8. **Cleanup PR** — delete obsolete rebuild/clipping compatibility paths only after equivalent green coverage exists.

## Implementation PR checklist

Every PR in this lane records:

- red tests turned green;
- intentionally red tests left for another issue;
- canonical/domain changes;
- projection changes;
- layout changes;
- renderer changes;
- continuous-interaction work added;
- commit-time work added;
- memory/node budget effect;
- reduced-motion behavior;
- migration/compatibility behavior;
- benchmark before/after when performance-sensitive.

## Red / green / refactor exit criteria

For every gate:

### Red

- the test is executable and discovered by the intended runner;
- the failure reason is recorded and maps to the missing behavior, not syntax/setup debt;
- existing characterization and architecture gates remain green up to the new red gate;
- the test asserts observable behavior or a stable renderer-neutral contract.

### Green

- the owning implementation makes the test pass without skip/TODO/timeout inflation;
- related existing tests remain green;
- no new renderer/provider state leaks into canonical/projection contracts;
- browser behavior is verified in every applicable project from #287;
- cancellation/reduced-motion behavior reaches the same committed semantic state.

### Refactor

- duplicate compatibility paths are removed only after equivalent coverage exists;
- deterministic pure logic is moved inward to domain/projection/layout layers where appropriate;
- performance instrumentation shows no hot-path regression;
- architecture/type/lint gates remain green;
- test names and issue traceability remain accurate after implementation changes.

## Risks and guardrails

### Over-specifying APIs

Tests should freeze semantics, not arbitrary class/function decomposition. The named seams in #286 are appropriate where ownership is already clear. Upstream-dependent #248 placement and #245/#247 migration contracts get their red tests only after those public contracts exist.

### Animation flakiness

Prefer state/event/geometry assertions over fixed sleeps. Use animation completion, View Transition completion, retained-scene state, or double-`requestAnimationFrame` only when the assertion genuinely concerns rendered frames. Reduced-motion projects verify final semantics independently of interpolation.

### Performance noise

Machine-speed timing is not an immediate hard gate. Structural invariants—DOM churn, retained identity, bounded scene size, committed cleanup—are fatal now. p95/long-task thresholds become fatal only after #271 publishes a stable reference baseline and variance.

### False browser coverage

A browser test is not coverage merely because it exists. CI must prove discovery. #287 generalizes the discovery assertion and device matrix.

### Unrealistic fixtures

Performance and collision tests need deterministic fixtures for sparse, dense, coincident, range-heavy, long-range-spanning, rapid-reversal, BCE/extended-year, and 10k/50k/100k cases. Large fixtures should be generated from seeded deterministic builders rather than checked-in enormous JSON blobs.

### Parallel-agent drift

Implementation lanes normally branch from current `main` and absorb their owned tests. They do not claim exclusive ownership of shared files. When two lanes touch the same projection/layout contract, the canonical issue hierarchy (#244/#247/#248/#249) decides the shared boundary; tests should be reconciled around that boundary instead of duplicating state.

### Recovery regressions

Recovered behavior in #262/#263/#273/#278/#280/#281 is characterization baseline. A redesign PR that accidentally replaces it with a simpler fallback is a regression even if its newly added unit tests pass.

## Definition of done

#239 is complete only when:

- #267-#270 behavior gates are green;
- #271 instrumentation is green and baseline results are published;
- an explicit evidence-based temporal-index decision is recorded;
- browser coverage proves retained identity through direct and structural interaction;
- no fallback destructive chronology renderer remains on an ordinary interaction path.
