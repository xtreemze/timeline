import assert from "node:assert/strict";
import test from "node:test";

import { realDeckWorldBindings } from "../site/world/deck-world-bindings.ts";
import { registerTimelineWorldView } from "../site/world/world-view-registration.ts";
import { selectPrimarySpatialViewFactory } from "../site/world/world-view-selection.ts";

test("registering the real deck.gl bindings produces a usable WorldView factory", () => {
  const target = {};
  const factory = registerTimelineWorldView(realDeckWorldBindings, {}, target);

  assert.equal(typeof factory.create, "function");
  assert.equal(target.TimelineWorldView, factory);
});

test("app startup selects TimelineWorldView over the legacy Orb factory once registered", () => {
  const target = {};
  registerTimelineWorldView(realDeckWorldBindings, {}, target);

  const legacyOrbFactory = Object.freeze({
    create() {
      throw new Error(
        "Orb fallback should not be selected when the real world view is registered.",
      );
    },
  });

  const selected = selectPrimarySpatialViewFactory(target.TimelineWorldView, legacyOrbFactory);

  assert.equal(selected, target.TimelineWorldView);
});

test("Orb remains the fallback when no world view has been registered", () => {
  const legacyOrbFactory = Object.freeze({
    create() {
      return null;
    },
  });

  const selected = selectPrimarySpatialViewFactory(undefined, legacyOrbFactory);

  assert.equal(selected, legacyOrbFactory);
});

test("registerTimelineWorldView wires real deck.gl constructors without invoking WebGL at registration time", () => {
  // Registration must be safe to run during module evaluation (before any
  // canvas/WebGL context exists), since it happens at app-startup script
  // load time, not at first render.
  const target = {};
  assert.doesNotThrow(() => {
    registerTimelineWorldView(realDeckWorldBindings, {}, target);
  });
});


test("production world surface uses a Lit lifecycle boundary while deck remains imperative", async () => {
  const [html, factory, element] = await Promise.all([
    import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    ),
    import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../site/world/world-view-factory.ts", import.meta.url), "utf8"),
    ),
    import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../site/world/world-surface-element.ts", import.meta.url), "utf8"),
    ),
  ]);

  assert.match(html, /<luum-world-surface id="temporal-graph-view"/);
  assert.match(html, /<\/luum-world-surface>/);
  assert.match(element, /class LuumWorldSurfaceElement extends LitElement/);
  assert.match(element, /render\(\)[\s\S]*return noChange/);
  assert.match(element, /attachView/);
  assert.match(element, /disconnectedCallback/);
  assert.match(factory, /root instanceof LuumWorldSurfaceElement/);
  assert.match(factory, /owner\?\.attachView\(scheduledView\)/);
  assert.doesNotMatch(element, /DeckWorldSurface|createScatterplotLayer|createPathLayer/);
});
