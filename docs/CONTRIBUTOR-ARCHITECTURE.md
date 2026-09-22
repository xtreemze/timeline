# Architecture contract for contributors

Timeline/Lūm is a canonical temporal knowledge system with multiple coordinated projections. Changes should preserve the dependency direction and domain invariants below, regardless of whether the contributor is human or automated.

## Dependency direction

The intended flow is:

```
sources / adapters
      ↓
candidate claims / reconciliation
      ↓
canonical domain
      ↓
application commands and state
      ↓
projections
      ↓
layout / interaction planning
      ↓
renderer and UI adapters
```

Core code under `src/domain`, `src/application`, `src/projection`, pure `src/layout`, and pure `src/interaction` must not depend on DOM, CSS, browser storage, Leaflet, Orb, Lit, or other renderer/provider state. Explicit GraphSurface adapter files are the bounded exception because they bridge core graph projections to renderers.

Dependencies point inward:
- domain does not import application, projection, layout, interaction, UI, or renderers;
- application does not import projection, layout, or interaction;
- projection does not import layout or interaction;
- renderer/UI adapters may consume core contracts, never the reverse.

## Canonical model invariants

- Entities are durable nouns with independent identity.
- Relationships are directed subject-action-object facts between different entities.
- Relationship predicates are concrete actions. Generic association labels and noun-bearing predicates are invalid.
- Self-relations are invalid.
- Time and place are relationship/occurrence context, not graph nodes.
- Places are reusable spatial records, not semantic graph entities.
- Categories organize chronology only.
- Stories provide narrative membership/order; they are not graph topology.
- Accepted inferred facts retain their source/provenance.
- Canonical IDs are stable and renderer-neutral.

Do not place Orb, Sigma, Leaflet, Lit, DOM nodes, CSS state, camera coordinates, or renderer handles in canonical serialization.

## Mutation ownership

UI handlers do not mutate canonical arrays directly. Canonical changes should pass through application/domain commands that:
1. validate the requested change;
2. return a new state/revision;
3. preserve provenance and stable IDs;
4. leave the input state unchanged.

The architecture linter ratchets existing direct-mutation and ambient-global debt downward. Do not raise a baseline merely to make a PR pass.

## Projection and layout rules

Projections are deterministic functions of canonical state and explicit view state. They must not rewrite canonical data.

Timeline chronology uses retained scene identity:
- semantic zoom may change representation but must not make an intersecting occurrence disappear;
- ranges remain discoverable while their extent intersects the render window;
- stable canonical IDs drive retained scene keys;
- continuous interaction keeps retained material alive; expensive structural reconciliation happens at commit.

Workspace placement uses `src/layout/workspace-layout.ts`. Measure real rectangles at the UI boundary, then pass candidates, protected regions, exclusion zones, safe insets, and anchors to the planner. Do not create a second independent popover-clamping policy.

## Interaction rules

One interaction epoch has one owner: timeline, graph, or map. The shared contract in `src/interaction/interaction-coordinator.ts` owns acquisition, classification, ownership, settling, and completion semantics.

Pointer Events are the primary direct-manipulation model. Any pointer capture path must handle `pointercancel` and `lostpointercapture`. Long-press node acquisition must not become whole-graph pan. Renderer-specific drag/zoom APIs remain behind their adapter.

## Responsive/mobile rules

Mobile is the baseline:
- no primary document scrolling;
- no fixed desktop minimum width;
- no viewport-width breakpoint logic in JavaScript;
- CSS/container queries own responsive composition;
- measured geometry in JavaScript is allowed only for semantic placement;
- top-layer controls must stay inside the visual viewport and outside protected chrome;
- hover behavior requires keyboard/focus equivalence;
- user zoom must remain enabled.

Portrait and landscape are both first-class touch layouts.

## Determinism and scale

Tests and benchmarks should use deterministic fixtures. Avoid randomness, wall-clock time, or unstable iteration order in domain/projection/layout code unless values are explicit injected inputs.

Current certification covers:
- retained chronology at 10k, 50k, and 100k occurrences;
- graph projection at 1k, 10k, and 50k nodes by default;
- sparse/range-heavy chronology;
- focused graph neighborhoods;
- mobile Chrome/Safari portrait and landscape;
- tablet touch;
- reduced motion;
- retained DOM churn and input-to-visual latency.

Only introduce temporal indexes, workers, caches, or renderer complexity when measured evidence shows the existing simpler path is insufficient.

## Migration and compatibility

Compatibility shims are temporary boundaries, not new architecture. New canonical features should be implemented in the typed core first. A migration must surface invalid, unresolved, or lossy records rather than silently dropping them.

When removing a compatibility path:
1. characterize its required behavior;
2. make the typed/core replacement green;
3. migrate consumers;
4. remove the shim and lower any architecture baseline in the same change.

## PR review checklist

A PR touching architecture should answer:

- Which canonical invariant or public contract changes?
- Which RED tests characterize the missing behavior?
- Does the implementation preserve stable canonical identity?
- Are dependencies still inward-only?
- Is canonical state mutated only by commands?
- Are projections/layout deterministic?
- Does interaction have one owner and complete correctly on cancellation?
- Are phone/tablet portrait and landscape still reachable without document scrolling?
- Did any compatibility/global/direct-mutation baseline increase? If so, the architecture is not ready to merge.
- For performance changes, what measured evidence justifies the added complexity?

Prefer small PRs that turn a named failing contract green. Do not weaken tests, broaden suppressions, increase timeouts, or add source-string exceptions to bypass a failing architectural rule.
