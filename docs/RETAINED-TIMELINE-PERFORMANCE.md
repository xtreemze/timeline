# Retained timeline performance certification

Tracking: #271, #239, #251.

The retained chronology is measured in two separate phases:

- **interaction** — direct pan, pinch, wheel zoom, inertia and other continuous camera updates;
- **commit** — exact reconciliation, dirty geometry measurement, cluster/lane planning and pruning.

The renderer must never trade a smooth interaction frame for hidden destructive DOM churn. Structural violations are CI-fatal independently of wall-clock timing.

## Machine-independent invariants

The metrics recorder reports:

- interaction and commit frame counts/durations separately;
- nodes created and destroyed by phase;
- retained-scene peak;
- render-buffer expansions;
- planner/query time;
- dirty geometry measurements;
- long-task observations when supplied;
- machine-readable invariant violations.

During ordinary interaction, retained chronology nodes must not be destroyed. A large simultaneous create/destroy event is additionally reported as `wholesale-interaction-replacement`.

## Temporal query benchmark

Run:

```sh
pnpm benchmark:retained-timeline
```

The benchmark generates deterministic seeded 10k, 50k and 100k occurrence fixtures spanning 1800–2200, with every fifth occurrence represented as a temporal interval. It then measures the current linear interval-intersection query across a moving five-year viewport.

Capture with every indexing decision:

- commit SHA;
- Node version;
- OS/architecture;
- CPU model when publishing human benchmark results;
- average, p95 and maximum query duration;
- fixture size.

Do **not** add an interval tree or worker merely because 100k is large. Compare the current linear scan against sorted/binary-search and interval-aware alternatives only when these measurements show that query/planner time materially affects the interaction or commit budgets.

## Timing policy

Initial observational targets from #286 remain non-fatal until a stable reference environment has enough samples:

- desktop interaction p95: <= 16.7 ms;
- phone/tablet interaction p95: <= 33.3 ms;
- no ordinary chronology-rendering long task > 50 ms.

Commit duration is reported independently and may exceed one frame, but must remain bounded and visible.

Once #251 establishes stable hardware/browser baselines and variance, those values can be promoted to release gates without changing the structural invariants above.


## Recorded baseline — 2026-09-21

Reference CI environment:

- GitHub-hosted Linux x64 runner;
- Node v24.20.0;
- deterministic sparse/range-heavy 1800–2200 fixture;
- 120 moving five-year interval-intersection queries per fixture.

| Projected occurrences | Average query | p95 query | Maximum query | Average matches |
| ---: | ---: | ---: | ---: | ---: |
| 10,000 | 0.193 ms | 0.406 ms | 1.607 ms | 127.5 |
| 50,000 | 0.831 ms | 1.070 ms | 7.031 ms | 638.5 |
| 100,000 | 1.673 ms | 2.194 ms | 10.717 ms | 1,274.7 |

These are query-only measurements, not total frame timings. The live renderer instrumentation separately records interaction/commit frame duration and query/planner attribution.

### Indexing decision

**Keep the current linear interval-intersection query for now.**

At the largest current fixture, p95 query cost is about 2.2 ms, materially below both the provisional 16.7 ms desktop interaction budget and 33.3 ms phone/tablet budget. An interval tree, sorted secondary index, or worker-hosted planner would add synchronization, mutation, serialization, and maintenance complexity without benchmark evidence that the existing query is the limiting stage.

Revisit this decision when one of these becomes true:

1. live renderer metrics show query cost consuming a material fraction of interaction or commit p95;
2. representative fixture sizes materially exceed 100k projected occurrences;
3. range density or filtering semantics change enough that this benchmark ceases to represent production use;
4. a simpler sorted/binary-search implementation demonstrates a meaningful end-to-end improvement rather than a microbenchmark-only gain.
