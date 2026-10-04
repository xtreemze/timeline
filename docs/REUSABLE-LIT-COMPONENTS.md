# Reusable Lit components

Status: expanding extraction, 2026-10-01.

Lūm contains interaction patterns that are useful outside its domain. Reuse must not pull the Lūm project model, occurrence grammar, graph projection, evidence model, or timeline physics into another application.

## Composer

`site/components/reusable/composer.ts` is a domain-neutral Lit combobox/composer. It owns:

- accessible combobox/listbox semantics;
- keyboard and wheel suggestion navigation;
- automatic centering of the active suggestion;
- optional multi-selection with inline chips;
- touch-size affordances;
- semantic color hooks and CSS parts;
- project-neutral input, selection, commit, and dismiss events.

The caller owns suggestion generation, grammar, validation, commands, persistence, and any icon system. This lets Lūm keep its occurrence-specific parser and investigative behavior while another project can supply entirely different options.

Register a project-specific subclass so the reusable module does not reserve a global custom-element name.

## Imperative surface host

`site/components/reusable/imperative-surface.ts` centralizes the Lit/light-DOM boundary for renderers that must keep high-frequency scene ownership outside Lit. The retained timeline and Lūm world host both reuse it while retaining their different lifecycle policies.

## Retained timeline

`site/components/reusable/retained-timeline.ts` provides a Lit lifecycle boundary for high-frequency retained timeline renderers. Lit deliberately does not reconcile the scene children. A project supplies an imperative controller for geometry, pan/zoom, inertia, pointer capture, and retained item lifetime.

That boundary is appropriate for Lūm's timeline because reactive rendering every event on every gesture frame would work against the retained-window architecture. Other projects can provide different controllers without importing Lūm.

## Embeddable timeline and relationship graph

`site/components/reusable/embed-timeline.ts` and `embed-graph.ts` provide compact presentation components for other project sites. They consume host-owned projected display records and emit `luum-embed-select` events containing the selected canonical id. They do not import the Lūm project model, occurrence grammar, evidence model, or application state.

Branding is host-controlled through CSS custom properties including `--luum-embed-font`, `--luum-embed-ink`, `--luum-embed-paper`, `--luum-embed-panel`, `--luum-embed-line`, `--luum-embed-accent`, `--luum-embed-focus`, `--luum-embed-radius`, and `--luum-embed-shadow`. Node coordinates supplied to the graph are presentation-only and are never persisted by the component.

The production build publishes a stable ES-module entry at `/timeline/embed/luum-embed.js`. This entry registers `<luum-embed-timeline>` and `<luum-embed-graph>`, allowing a host project to use the components without importing the Lūm application shell.

## Semantic hue

`site/components/reusable/semantic-hue.ts` synchronizes range and numeric hue editing and emits portable input/change events. It intentionally exposes hue only. The consuming design system remains responsible for saturation, lightness/value, contrast, dark/light theme mapping, and interaction-state emphasis.

## Media viewer

`site/components/reusable/media-viewer.ts` owns single-image pan and zoom interaction: pointer drag, pinch, wheel zoom, double-click/double-tap, keyboard panning, zoom steps, reset, caption and accessibility semantics. It has no occurrence, timeline, graph, or persistence dependencies. The Lūm occurrence deck can migrate onto this primitive once its existing slideshow CSS and swipe contract are preserved by an adapter.

## Component lab instead of Storybook

Storybook is not currently a project dependency. The first extraction uses the existing Vite and Playwright stack through `site/component-lab.html`, which provides isolated development without adding a second build system or changing the lockfile.

Storybook remains compatible with these components because they expose normal custom elements, properties, events, slots, CSS custom properties, and CSS parts. Add Storybook when the component catalog needs cross-project documentation, visual regression matrices, or many independently owned stories; it is not required for the component boundary itself.

Run the isolated browser contracts with `pnpm test:reusable-components-browser`. For interactive development, run `pnpm dev` and open `/component-lab.html`.

## Reuse rule

A reusable component must not import from Lūm domain/application modules. Lūm-specific adapters may import a reusable component, never the other way around.
