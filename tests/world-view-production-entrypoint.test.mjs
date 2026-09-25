import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { realDeckWorldBindings } from "../site/world/deck-world-bindings.ts";
import { registerTimelineWorldView } from "../site/world/world-view-registration.ts";
import {
  selectPrimarySpatialViewFactory,
  unavailableSpatialViewFactory,
} from "../site/world/world-view-selection.ts";

test("registering the real deck.gl bindings produces a usable WorldView factory", () => {
  const target = {};
  const factory = registerTimelineWorldView(realDeckWorldBindings, {}, target);

  assert.equal(typeof factory.create, "function");
  assert.equal(target.TimelineWorldView, factory);
});

test("app startup selects TimelineWorldView once registered", () => {
  const target = {};
  registerTimelineWorldView(realDeckWorldBindings, {}, target);

  const selected = selectPrimarySpatialViewFactory(target.TimelineWorldView);

  assert.equal(selected, target.TimelineWorldView);
});

test("an unregistered world view selects the explicit unavailable surface", () => {
  assert.equal(selectPrimarySpatialViewFactory(undefined), unavailableSpatialViewFactory);
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
  assert.match(source, /detachedLinkPlaceIds/);
  assert.match(source, /#clusterPhase = "releasing"/);
  assert.match(source, /#clusterPhase = "collapsing"/);
  assert.match(source, /#clusterPhase = "expanding"/);
});

test("production footer exposes separate DAG reorganization and force relaxation controls", async () => {
  const factory = await readFile(
    new URL("../site/world/world-view-factory.ts", import.meta.url),
    "utf8",
  );

  assert.match(factory, /aria-label", "Graph layout controls"/);
  assert.match(factory, /Reorganize relationship layout \(D3 DAG\)/);
  assert.match(factory, /Relax graph forces \(D3 force\)/);
  assert.match(factory, /scheduledView\.reorganizeDag\(\)/);
  assert.match(factory, /scheduledView\.relaxForce\(\)/);
});
