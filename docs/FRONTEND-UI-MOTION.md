# Frontend UI, interaction, and motion architecture

Status: accepted pilot, 2026-09-21.

Timeline remains browser-first. Vite and TypeScript provide build/type infrastructure; Lit is adopted selectively as a declarative rendering layer for bounded UI where manual DOM construction, replacement, event wiring, or lifecycle coordination has become costly.

Lit is not the owner of the chronology engine, graph engine, map engine, input physics, canonical data model, evidence/inference pipeline, or WebMCP surface.

## Lit adoption boundary

Use Lit where it materially reduces imperative UI complexity. The first pilot is the date/range calendar in `site/date-range-picker.ts`: its public `TimelineDateRangePicker` contract and native Popover/keyboard behavior remain intact while its calendar cell rendering becomes declarative and keyed.

Current bounded Lit surfaces now include the date/range calendar, the timeline host lifecycle, retained event-card semantic content, and the world/graph host lifecycle. Event-card geometry stays imperative and graph topology stays GPU-rendered.

Good follow-up candidates include editor/property forms, focused-event detail/evidence tabs, story/category browsing controls, view/presentation toolbars, project/action menus, and read-only map host lifecycle.

Keep framework-independent:

- canonical entities, occurrences, relationships, places, evidence, stories, indexes and persistence;
- spatiotemporal, timeline and world projections;
- temporal geometry, semantic zoom, clustering, retained-scene behavior, force simulation and viewport calculations;
- Pointer Events, pointer capture, weighted drag, pinch, inertia, haptics and other continuous interaction physics;
- deck.gl/luma.gl graph/world drawing, picking, camera motion and GPU resource state;
- Leaflet/map camera and gesture integration;
- validation, interchange, evidence extraction/inference, analytics and WebMCP.

A migration is useful only when it removes meaningful imperative DOM/lifecycle complexity. Wrapping an existing imperative controller in `LitElement` without simplifying ownership is not a goal.

Existing layout-bearing surfaces depend on global CSS, subgrid, top-layer popovers, fullscreen composition, and View Transition participants. Do not introduce Shadow DOM merely because Lit supports it. Use light-DOM rendering or Lit's `render()` primitive when global layout/styling relationships are intentional.

Do not make `@lit-labs/motion` foundational. Prefer stable browser primitives.

## Mobile-first responsive contract

Mobile/touch is the baseline product, not a reduced breakpoint variant. Base styles must work at the narrowest supported viewport; progressively larger containers/screens add space, simultaneous surfaces, density, and richer composition without unlocking otherwise-missing capability.

Responsive implementation rules:

- Prefer intrinsic layout first: Grid/Flex wrapping, `minmax()`, `clamp()`, logical properties, and explicit `min-width: 0` / `min-height: 0` shrink contracts.
- Prefer container queries when behavior depends on the actual component or presentation-surface width.
- When viewport breakpoints are appropriate, prefer `min-width` progressive enhancements.
- Existing `max-width` media queries are responsive-architecture debt tracked by #243. Each case must be inverted, replaced by intrinsic/container-responsive behavior, or retained with a concrete rationale.
- Do not add narrow-screen repair rules merely to preserve a desktop-default composition.
- Touch/coarse-pointer capability must not be inferred from viewport width. Use Pointer Events and capability/media queries when input modality itself matters.
- No essential action may depend on hover. Hover/fine-pointer states may enhance previews or emphasis only.
- Touch targets, pointer capture/cancellation, pinch/drag arbitration, safe-area insets, browser chrome, virtual keyboards, portrait/landscape rotation, fullscreen, and top-layer UI are first-class concerns.
- Timeline, graph, and map should share equivalent gesture semantics wherever possible.
- Mobile keeps full capability; larger screens progressively expose more simultaneous context.

The current ratchet verified after the retained-scene and map-resilience work is:

- `site/styles.css`: 15 `max-width`, 6 `min-width`, 1 container query.
- `site/timeline-view.css`: 28 `max-width`, 8 `min-width`, 0 container queries.

The responsive architecture test prevents those `max-width` counts from increasing while #243 reduces or explicitly justifies legacy cases. The architecture linter remains the stronger enforcement layer for newly introduced antipatterns.

## Motion hierarchy

Use the smallest native primitive that fits the interaction:

1. Pointer Events + `requestAnimationFrame` for continuous user-driven simulations such as timeline pan/zoom inertia and graph/map camera motion.
2. Web Animations API (`Element.animate()`) for discrete, cancelable/reversible local motion where an explicit `Animation` handle is useful.
3. View Transition API for structural state-to-state changes, shared-element continuity, focus/open/close transitions, and layout morphs.

Timeline already uses typed document View Transitions and reduced-motion gating. Because the project targets modern Chromium, capability-gated `Element.startViewTransition()` is encouraged for localized transitions so unrelated surfaces can remain interactive. Document-level transitions remain appropriate for genuinely whole-workspace changes.

Reduced-motion preferences are authoritative across all motion layers. Correct state changes never depend on animation support.

## Framework comparison snapshot

Reviewed 2026-09-21:

- **Lit 3.3.3** — selected for incremental browser-native adoption and Vite/TypeScript integration without replacing existing engines.
- **Svelte 5** — strong clean-slate alternative with compiler-driven animation ergonomics, but a broader application-ownership migration than Timeline needs.
- **React 19** — strong framework-level transition orchestration, but would replace more of Timeline's existing update model than it simplifies.
- **Vue 3** — mature component/transition model, but no Timeline-specific advantage sufficient to justify migration.

## Follow-up

1. Measure the Lit calendar bundle/runtime delta and browser regressions.
2. Complete responsive audit #243 and continue reducing the `max-width` baseline.
3. Convert the editor/property surface next, preserving canonical validation and commands outside Lit.
4. Move focused-event detail/evidence rendering out of the timeline engine into a bounded component.
5. Convert story/category browser lists and presentation/view controls where declarative keyed rendering removes manual DOM assembly.
6. Consider a Lit lifecycle host for read-only Leaflet views, while keeping map camera/gesture state inside the map adapter.
7. Add a shared scoped/document View Transition helper only once at least two surfaces require identical lifecycle handling.
8. Add WAAPI only where cancellation/reversal provides concrete value.
9. Re-evaluate Lit after these bounded migrations; do not set a target percentage of framework-owned UI.
