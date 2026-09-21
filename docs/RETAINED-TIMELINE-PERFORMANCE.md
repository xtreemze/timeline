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
