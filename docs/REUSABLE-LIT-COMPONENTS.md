# Reusable Lit components

Status: initial extraction, 2026-09-30.

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

## Retained timeline

`site/components/reusable/retained-timeline.ts` provides a Lit lifecycle boundary for high-frequency retained timeline renderers. Lit deliberately does not reconcile the scene children. A project supplies an imperative controller for geometry, pan/zoom, inertia, pointer capture, and retained item lifetime.

That boundary is appropriate for Lūm's timeline because reactive rendering every event on every gesture frame would work against the retained-window architecture. Other projects can provide different controllers without importing Lūm.

## Component lab instead of Storybook

Storybook is not currently a project dependency. The first extraction uses the existing Vite and Playwright stack through `site/component-lab.html`, which provides isolated development without adding a second build system or changing the lockfile.

Storybook remains compatible with these components because they expose normal custom elements, properties, events, slots, CSS custom properties, and CSS parts. Add Storybook when the component catalog needs cross-project documentation, visual regression matrices, or many independently owned stories; it is not required for the component boundary itself.

Run the isolated browser contracts with `pnpm test:reusable-components-browser`. For interactive development, run `pnpm dev` and open `/component-lab.html`.

## Reuse rule

A reusable component must not import from Lūm domain/application modules. Lūm-specific adapters may import a reusable component, never the other way around.
