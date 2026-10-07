import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DEFAULT_D3_WORLD_FORCE_TUNING } from "../src/layout/d3-world-force-simulation.ts";
import { createWorldDagLayout } from "../src/layout/world-dag-layout.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function instance(id) {
  return createProjectedWorldInstance({
    id: worldInstanceId(id, `occ-${id}`),
    canonicalId: id,
    occurrenceId: `occ-${id}`,
    geographicAnchors: [{
      placeId: "place",
      longitude: 18,
      latitude: 59,
      influence: 1,
    }],
    temporalWeight: 1,
    visualWeight: 1,
    retained: false,
  });
}

test("default Sugiyama strategy fixes layering to longest path while decross remains bounded", () => {
  const nodes = Array.from({ length: 70 }, (_, index) => instance(`node-${index}`));
  const edges = nodes.slice(1).map((target, index) =>
    createProjectedWorldEdge({
      id: `edge-${index}`,
      sourceInstanceId: nodes[index].id,
      targetInstanceId: target.id,
      temporalWeight: 1,
      visible: true,
      retained: false,
    }),
  );
  const layout = createWorldDagLayout(createWorldProjection({ instances: nodes, edges }), {
    reorganize: true,
  });
  assert.equal(layout.metrics.algorithmCounts["simplex-two-layer-greedy"] ?? 0, 0);
  assert.equal(layout.metrics.algorithmCounts["longest-two-layer-greedy"], 1);
});

test("default force collision is a strict hard-body constraint", () => {
  assert.equal(DEFAULT_D3_WORLD_FORCE_TUNING.collisionStrength, 1);
  assert.ok((DEFAULT_D3_WORLD_FORCE_TUNING.collisionIterations ?? 0) >= 5);
});

test("landscape timeline uses vertical arrows for granular semantic zoom", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");
  const keyboardStart = source.indexOf('this.surface.addEventListener("keydown"');
  const keyboardEnd = source.indexOf('document.addEventListener("graphselectionchange"', keyboardStart);
  const keyboard = source.slice(keyboardStart, keyboardEnd);
  assert.match(keyboard, /orientation === "horizontal"[\s\S]*ArrowUp[\s\S]*zoom/i);
  assert.match(keyboard, /orientation === "horizontal"[\s\S]*ArrowDown[\s\S]*zoom/i);
  assert.match(source, /KEYBOARD_ZOOM_IN_FACTOR\s*=\s*0\.9/);
});

test("world cluster activation scatters members in place without camera focus", async () => {
  const source = await readFile(new URL("../site/world/deck-world-surface.ts", import.meta.url), "utf8");
  const start = source.indexOf("readonly #handleDeckClick");
  const end = source.indexOf("#focusHit(", start);
  const click = source.slice(start, end);
  assert.match(click, /#revealClusterPlaces\(placeIds\)/);
  assert.match(click, /#syncClusterLifecycle\(\)/);
  assert.doesNotMatch(click, /#focusCluster\(/);
  assert.doesNotMatch(click, /#setUserSelection\(/);
});
