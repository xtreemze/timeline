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

The first cross-browser retained-renderer baseline was certified on 2026-09-22 and is now a release gate:

- interaction render p95: <= 16.7 ms;
- commit render p95: <= 16.7 ms;
- interaction input-to-visual p95: <= 50 ms;
- no ordinary chronology-rendering long task > 50 ms where the browser exposes Long Tasks.

Heap and Long Animation Frame evidence remain observational because browser support is incomplete. These gates are intentionally conservative: they freeze the current verified performance envelope without pretending unsupported telemetry is portable.


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

## Live retained-renderer baseline — 2026-09-22

Reference CI used Playwright's certified desktop, phone portrait/landscape, tablet-touch and reduced-motion projects against a deterministic 1,000-occurrence retained scene.

| Project | Interaction p95 | Commit p95 | Input-to-visual p95 | Retained peak |
| --- | ---: | ---: | ---: | ---: |
| Desktop Chrome | 3.2 ms | 2.5 ms | 13.3 ms | 38 |
| Mobile Chrome | 5.0 ms | 1.8 ms | 15.5 ms | 24 |
| Mobile Chrome Landscape | 3.5 ms | 2.1 ms | 15.7 ms | 45 |
| Mobile Safari | 12.0 ms | 6.0 ms | 44.0 ms | 25 |
| Mobile Safari Landscape | 12.0 ms | 8.0 ms | 38.0 ms | 45 |
| Tablet Touch | 3.8 ms | 2.5 ms | 14.6 ms | 38 |
| Reduced Motion | 4.4 ms | 2.9 ms | 15.6 ms | 38 |

Chromium reported no long tasks above 50 ms and no Long Animation Frame samples for this interaction fixture. WebKit did not expose those observer types, so absence of observations there is not treated as evidence of absence.

### Release decision

The retained scene meets the current interaction budget across the certified matrix. Keep the linear temporal query and current commit-time planner architecture. Do not introduce an interval tree, worker, or renderer replacement for chronology performance on the basis of current measurements.
