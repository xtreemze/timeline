import assert from "node:assert/strict";
import test from "node:test";

import { createWorldDagLayout } from "../src/layout/world-dag-layout.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

const place = {
  placeId: "place",
  longitude: 18,
  latitude: 59,
  influence: 1,
};

function instance(name, visualWeight = 0.5) {
  return createProjectedWorldInstance({
    id: worldInstanceId(name, `occ-${name}`),
    canonicalId: name,
    occurrenceId: `occ-${name}`,
    geographicAnchors: [place],
    temporalWeight: 1,
    visualWeight,
    retained: false,
  });
}

function edge(id, source, target, temporalWeight = 1, retained = false) {
  return createProjectedWorldEdge({
    id,
    sourceInstanceId: source.id,
    targetInstanceId: target.id,
    temporalWeight,
    visible: true,
    retained,
  });
}

test("size-aware DAG layout separates large node footprints", () => {
  const root = instance("root");
  const left = instance("left");
  const right = instance("right");
  const projection = createWorldProjection({
    instances: [root, left, right],
    edges: [edge("root-left", root, left), edge("root-right", root, right)],
  });
  const nodeSizes = new Map(
    projection.instances.map((item) => [item.id, { widthMeters: 1_200, heightMeters: 1_200 }]),
  );

  const layout = createWorldDagLayout(projection, { nodeSizes });
  const leftTarget = layout.targets.find((target) => target.instanceId === left.id);
  const rightTarget = layout.targets.find((target) => target.instanceId === right.id);

  assert.ok(leftTarget);
  assert.ok(rightTarget);
  assert.ok(
    Math.hypot(
      rightTarget.eastMeters - leftTarget.eastMeters,
      rightTarget.northMeters - leftTarget.northMeters,
    ) > 1_200,
    "siblings should preserve more than one large-node diameter of center separation",
  );
  assert.ok((layout.metrics.minSeparationMeters ?? 0) > 1_200);
});

test("d3-dag routed control points are retained for local semantic edges", () => {
  const a = instance("a");
  const b = instance("b");
  const c = instance("c");
  const projection = createWorldProjection({
    instances: [a, b, c],
    edges: [edge("ab", a, b), edge("bc", b, c)],
  });

  const layout = createWorldDagLayout(projection);

  assert.deepEqual(
    layout.routes.map((route) => route.relationshipId),
    ["ab", "bc"],
  );
  for (const route of layout.routes) {
    assert.ok(route.points.length >= 2);
    assert.ok(
      route.points.every(
        (point) => Number.isFinite(point.eastMeters) && Number.isFinite(point.northMeters),
      ),
    );
  }
  assert.equal(layout.metrics.routedEdgeCount, 2);
});

test("cycle breaking preserves higher-temporal-weight relationships for hierarchy", () => {
  const a = instance("cycle-a");
  const b = instance("cycle-b");
  const c = instance("cycle-c");
  const projection = createWorldProjection({
    instances: [a, b, c],
    edges: [
      edge("ab-important", a, b, 1, true),
      edge("bc-important", b, c, 0.9),
      edge("ca-weak", c, a, 0.1),
    ],
  });

  const layout = createWorldDagLayout(projection);
  const routeIds = layout.routes.map((route) => String(route.relationshipId));

  assert.ok(routeIds.includes("ab-important"));
  assert.ok(routeIds.includes("bc-important"));
  assert.ok(!routeIds.includes("ca-weak"));
  assert.equal(layout.metrics.localEdgeCount, 2);
});

test("layout quality adapts operators to neighborhood size", () => {
  const smallInstances = Array.from({ length: 6 }, (_, index) => instance(`small-${index}`));
  const small = createWorldProjection({
    instances: smallInstances,
    edges: smallInstances
      .slice(1)
      .map((item, index) => edge(`small-edge-${index}`, smallInstances[index], item)),
  });
  const smallLayout = createWorldDagLayout(small);
  assert.equal(smallLayout.metrics.algorithmCounts["longest-opt-simplex"], 1);

  const largeInstances = Array.from({ length: 70 }, (_, index) => instance(`large-${index}`));
  const large = createWorldProjection({
    instances: largeInstances,
    edges: largeInstances
      .slice(1)
      .map((item, index) => edge(`large-edge-${index}`, largeInstances[index], item)),
  });
  const largeLayout = createWorldDagLayout(large);
  assert.equal(largeLayout.metrics.algorithmCounts["simplex-two-layer-greedy"], 1);
});

test("topology updates choose the stable horizontal orientation", () => {
  const a = instance("stable-a");
  const b = instance("stable-b");
  const c = instance("stable-c");
  const initial = createWorldProjection({
    instances: [a, b, c],
    edges: [edge("stable-ab", a, b), edge("stable-ac", a, c)],
  });
  const before = createWorldDagLayout(initial);
  const d = instance("stable-d");
  const updated = createWorldProjection({
    instances: [a, b, c, d],
    edges: [edge("stable-ab", a, b), edge("stable-ac", a, c), edge("stable-ad", a, d, 0.4)],
  });
  const after = createWorldDagLayout(updated);

  const previous = new Map(before.targets.map((target) => [target.instanceId, target]));
  let direct = 0;
  let mirrored = 0;
  for (const target of after.targets) {
    const prior = previous.get(target.instanceId);
    if (!prior) continue;
    direct += (target.eastMeters - prior.eastMeters) ** 2;
    mirrored += (-target.eastMeters - prior.eastMeters) ** 2;
  }

  assert.ok(direct <= mirrored, "incremental layout should not choose a needless mirror flip");
  assert.ok(Number.isFinite(after.metrics.meanStableDisplacementMeters));
});

test("quality metrics report crossings, edge length and separation", () => {
  const nodes = ["qa", "qb", "qc", "qd"].map((name) => instance(name));
  const layout = createWorldDagLayout(
    createWorldProjection({
      instances: nodes,
      edges: [
        edge("qa-qc", nodes[0], nodes[2]),
        edge("qa-qd", nodes[0], nodes[3]),
        edge("qb-qc", nodes[1], nodes[2]),
        edge("qb-qd", nodes[1], nodes[3]),
      ],
    }),
  );

  assert.equal(typeof layout.metrics.crossingCount, "number");
  assert.ok(layout.metrics.meanEdgeLengthMeters > 0);
  assert.ok((layout.metrics.minSeparationMeters ?? 0) > 0);
});
