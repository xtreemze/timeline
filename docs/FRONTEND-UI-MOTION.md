# Frontend UI, interaction, and motion architecture

Status: accepted pilot, 2026-09-21.

Timeline remains browser-first. Vite and TypeScript provide build/type infrastructure; Lit is adopted selectively as a declarative rendering layer for bounded UI where manual DOM construction, replacement, event wiring, or lifecycle coordination has become costly.

Lit is not the owner of the chronology engine, graph engine, map engine, input physics, canonical data model, evidence/inference pipeline, or WebMCP surface.

## Lit adoption boundary

Use Lit where it materially reduces imperative UI complexity. The first pilot is the date/range calendar in `site/date-range-picker.ts`: its public `TimelineDateRangePicker` contract and native Popover/keyboard behavior remain intact while its calendar cell rendering becomes declarative and keyed.

Good follow-up candidates include editor/property forms, evidence cards/tabs, story/category controls, view/presentation toolbars, and focused-event controls.

Keep framework-independent:

- temporal geometry, semantic zoom, clustering, and viewport calculations;
- Pointer Events, pointer capture, weighted drag, pinch, inertia, haptics, and other continuous interaction physics;
- Orb graph simulation/rendering;
- Leaflet/map camera and gesture integration;
- canonical model, validation, interchange, evidence extraction/inference, and WebMCP.

A migration is useful only when it removes meaningful imperative DOM/lifecycle complexity. Wrapping an existing imperative controller in `LitElement` without simplifying ownership is not a goal.

Existing layout-bearing surfaces depend on global CSS, subgrid, top-layer popovers, fullscreen composition, and View Transition participants. Do not introduce Shadow DOM merely because Lit supports it. Use light-DOM rendering or Lit's `render()` primitive when global layout/styling relationships are intentional.

Do not make `@lit-labs/motion` foundational. Prefer stable browser primitives.

## Mobile-first responsive contract

Mobile/touch is the baseline product, not a reduced breakpoint variant. Base styles must work at the narrowest supported viewport; progressively larger containers/screens add space, simultaneous surfaces, density, and richer composition without unlocking otherwise-missing capability.

Responsive implementation rules:

- Prefer intrinsic layout first: Grid/Flex wrapping, `minmax()`, `clamp()`, logical properties, and explicit `min-width: 0` / `min-height: 0` shrink contracts.
- Prefer container queries when behavior depends on the actual component or presentation-surface width.
- When viewport breakpoints are appropriate, prefer `min-width` progressive enhancements.
- Existing `max-width` media queries are responsive-architecture debt tracked by #243. A `max-width` condition is not automatically invalid, but each case must be classified and either inverted, replaced by intrinsic/container-responsive behavior, or retained with a concrete rationale.
- Do not add narrow-screen repair rules merely to preserve a desktop-default composition.
- Touch/coarse-pointer capability must not be inferred from viewport width. Use Pointer Events and capability/media queries when input modality itself matters.
- No essential action may depend on hover. Hover/fine-pointer states may enhance previews or emphasis only.
- Touch targets, pointer capture/cancellation, pinch/drag arbitration, safe-area insets, browser chrome, virtual keyboards, portrait/landscape rotation, fullscreen, and top-layer UI are first-class concerns.
- Timeline, graph, and map should share equivalent gesture semantics wherever possible.
- Mobile keeps full capability; larger screens progressively expose more simultaneous context.

The audit baseline verified against current `main` is:

- `site/styles.css`: 16 `max-width`, 5 `min-width`, 1 container query.
- `site/timeline-view.css`: 28 `max-width`, 8 `min-width`, 0 container queries.

A temporary test ratchet prevents those `max-width` counts from increasing while #243 reduces or explicitly justifies the legacy cases.

## Motion hierarchy

Use the smallest native primitive that fits the interaction:

1. Pointer Events + `requestAnimationFrame` for continuous user-driven simulations such as timeline pan/zoom inertia and graph/map camera motion.
2. Web Animations API (`Element.animate()`) for discrete, cancelable/reversible local motion where an explicit `Animation` handle is useful.
3. View Transition API for structural state-to-state changes, shared-element continuity, focus/open/close transitions, and layout morphs.

Timeline already uses typed document View Transitions and reduced-motion gating. Because the project targets Chrome 155 Beta, capability-gated `Element.startViewTransition()` is encouraged for localized transitions so unrelated surfaces can remain interactive. Document-level transitions remain appropriate for genuinely whole-workspace changes.

Reduced-motion preferences are authoritative across all motion layers. Correct state changes never depend on animation support.

## Framework comparison snapshot

Reviewed 2026-09-21:

- **Lit 3.3.3** — selected. Best fit for incremental browser-native adoption and Vite/TypeScript integration without replacing existing engines.
- **Svelte 5.57.1** — strongest clean-slate alternative, with strong compiler-driven animation ergonomics, but a broader application-ownership migration than Timeline needs.
- **React 19.3.0** — strong first-class framework View Transition orchestration, but would replace more of Timeline's existing update model than it simplifies.
- **Vue 3.5.43 stable** — mature component/transition model, but no Timeline-specific advantage sufficient to justify migration.

## Follow-up

1. Measure the Lit calendar bundle/runtime delta and browser regressions.
2. Complete responsive audit #243 and reduce the `max-width` baseline.
3. Convert one additional bounded DOM-heavy surface.
4. Add a shared scoped/document View Transition helper only once at least two surfaces require identical lifecycle handling.
5. Add WAAPI only where cancellation/reversal provides concrete value.
6. Re-evaluate Lit after two or three migrations; do not set a target percentage of framework-owned UI.
