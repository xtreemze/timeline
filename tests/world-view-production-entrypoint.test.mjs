import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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


test("production world view defaults to live D3 force rather than the reference oracle", async () => {
  const factory = await readFile(
    new URL("../site/world/world-view-factory.ts", import.meta.url),
    "utf8",
  );
  assert.match(factory, /new D3WorldForceSimulation\(\)/);
  assert.doesNotMatch(factory, /new ReferenceWorldForceSimulation\(\)/);
});

test("cluster lifecycle contains no renderer position interpolation contract", async () => {
  const source = await readFile(
    new URL("../site/world/deck-world-surface.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /worldClusterExpansionProgress/);
  assert.doesNotMatch(source, /interpolateClusterPosition/);
  assert.match(source, /WORLD_CLUSTER_EDGE_RELEASE_MS/);
  assert.match(source, /releasingRelationships/);
  assert.match(source, /setClusteredPlaceIds/);
});
