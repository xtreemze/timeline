import assert from "node:assert/strict";
import test from "node:test";

import { realDeckWorldBindings } from "../site/world/deck-world-bindings.ts";
import { registerTimelineWorldView } from "../site/world/world-view-registration.ts";
import { selectPrimarySpatialViewFactory } from "../site/world/world-view-selection.ts";

test("production deck bindings include the semantic TextLayer constructor", () => {
  assert.equal(typeof realDeckWorldBindings.textLayer, "function");
});

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
