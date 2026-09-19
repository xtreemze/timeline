# Graph performance fixtures

This directory contains repeatable, deterministic large-graph fixtures for the canonical Timeline graph projection layer.

Run the default 1k / 5k / 10k-node fixture set:

```sh
pnpm benchmark:graph-data
```

Pass explicit node counts when comparing a change:

```sh
pnpm benchmark:graph-data -- 2000 12000
```

The fixture creates two persistent relationships per node with deterministic endpoints and measures:

- `TimelineGraph.graphForWindow()` for the complete canonical projection.
- `TimelineGraph.neighborhoodGraph()` for a focused two-hop neighborhood capped at 36 nodes.

The script performs one warm-up call before each sample set and reports median, p95, minimum, and maximum wall-clock time. It verifies projected node/edge counts so a faster result cannot silently come from dropped topology.

This is intentionally not an Orb rendering benchmark. Worker-CPU force duration, main-thread GPU force, frame time, and pointer/input latency depend on Chromium, WebGL/GPU capability, viewport size, and hardware. Those must be measured separately in Chrome against the same generated scale classes before production thresholds are tightened. See issues #16 and #41.

Do not turn these Node timings into a release gate until representative CI/hardware baselines have been collected. Their immediate purpose is to make data-layer regressions reproducible and comparable.
