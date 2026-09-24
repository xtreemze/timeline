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
  const smallAlgorithm = Object.keys(smallLayout.metrics.algorithmCounts)[0];
  assert.ok(
    [
      "longest-opt-simplex",
      "longest-two-layer-simplex",
      "simplex-two-layer-simplex",
    ].includes(smallAlgorithm),
    `unexpected small-neighborhood algorithm: ${smallAlgorithm}`,
  );

  const largeInstances = Array.from({ length: 70 }, (_, index) => instance(`large-${index}`));
  const large = createWorldProjection({
    instances: largeInstances,
    edges: largeInstances
      .slice(1)
      .map((item, index) => edge(`large-edge-${index}`, largeInstances[index], item)),
  });
  const largeLayout = createWorldDagLayout(large);
  assert.equal(largeLayout.metrics.algorithmCounts["simplex-two-layer-greedy"], 1);

  const hugeInstances = Array.from({ length: 160 }, (_, index) => instance(`huge-${index}`));
  const huge = createWorldProjection({
    instances: hugeInstances,
    edges: hugeInstances
      .slice(1)
      .map((item, index) => edge(`huge-edge-${index}`, hugeInstances[index], item)),
  });
  const hugeLayout = createWorldDagLayout(huge);
  assert.equal(hugeLayout.metrics.algorithmCounts["longest-two-layer-greedy"], 1);
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

test("deep size-aware DAGs fall back instead of compressing nodes into overlap", () => {
  const nodes = Array.from({ length: 80 }, (_, index) => instance(`deep-${index}`));
  const projection = createWorldProjection({
    instances: nodes,
    edges: nodes.slice(1).map((item, index) => edge(`deep-edge-${index}`, nodes[index], item)),
  });
  const nodeSizes = new Map(
    nodes.map((item) => [item.id, { widthMeters: 1_200, heightMeters: 1_200 }]),
  );

  const layout = createWorldDagLayout(projection, { nodeSizes });

  assert.equal(layout.targets.length, 0);
  assert.equal(layout.routes.length, 0);
  assert.equal(layout.metrics.nodeCount, 80);
  assert.equal(
    Object.entries(layout.metrics.algorithmCounts).some(
      ([name, count]) => name.endsWith("-force-only") && count === 1,
    ),
    true,
  );
});

test("weight-only temporal changes reuse the accepted DAG layout", () => {
  const a = instance("cache-a");
  const b = instance("cache-b");
  const c = instance("cache-c");
  const firstProjection = createWorldProjection({
    instances: [a, b, c],
    edges: [edge("cache-ab", a, b, 1), edge("cache-bc", b, c, 0.8), edge("cache-ca", c, a, 0.1)],
  });
  const secondProjection = createWorldProjection({
    instances: [a, b, c],
    edges: [
      edge("cache-ab", a, b, 0.72),
      edge("cache-bc", b, c, 0.98),
      edge("cache-ca", c, a, 0.08),
    ],
  });

  const first = createWorldDagLayout(firstProjection);
  const second = createWorldDagLayout(secondProjection);

  assert.deepEqual(
    first.routes.map((route) => route.relationshipId),
    second.routes.map((route) => route.relationshipId),
  );
  assert.equal(first.targets.length, second.targets.length);
  for (let index = 0; index < first.targets.length; index += 1) {
    assert.equal(
      first.targets[index],
      second.targets[index],
      "unchanged accepted topology should reuse cached target objects",
    );
  }
});

test("dense neighborhoods avoid simplex operators even below node-count thresholds", () => {
  const nodes = Array.from({ length: 32 }, (_, index) => instance(`dense-${index}`));
  const edges = [];
  for (let source = 0; source < nodes.length; source += 1) {
    for (let target = source + 1; target < nodes.length; target += 1) {
      edges.push(edge(`dense-${source}-${target}`, nodes[source], nodes[target]));
    }
  }

  const layout = createWorldDagLayout(createWorldProjection({ instances: nodes, edges }));

  assert.equal(
    Object.entries(layout.metrics.algorithmCounts).some(
      ([name, count]) => name.startsWith("longest-two-layer-greedy") && count === 1,
    ),
    true,
  );
});

function testSegmentIntersection(a, b, c, d) {
  const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}

function crossingCountFor(edges, positions) {
  let crossings = 0;
  for (let left = 0; left < edges.length; left += 1) {
    for (let right = left + 1; right < edges.length; right += 1) {
      const a = edges[left];
      const b = edges[right];
      if (
        a.sourceInstanceId === b.sourceInstanceId ||
        a.sourceInstanceId === b.targetInstanceId ||
        a.targetInstanceId === b.sourceInstanceId ||
        a.targetInstanceId === b.targetInstanceId
      ) {
        continue;
      }
      const a0 = positions.get(a.sourceInstanceId);
      const a1 = positions.get(a.targetInstanceId);
      const b0 = positions.get(b.sourceInstanceId);
      const b1 = positions.get(b.targetInstanceId);
      if (a0 && a1 && b0 && b1 && testSegmentIntersection(a0, a1, b0, b1)) crossings += 1;
    }
  }
  return crossings;
}

test("Sugiyama reduces crossings versus the former circular baseline", () => {
  const a = instance("compare-a");
  const b = instance("compare-b");
  const c = instance("compare-c");
  const x = instance("compare-x");
  const y = instance("compare-y");
  const z = instance("compare-z");
  const nodes = [a, b, c, x, y, z];
  const edges = [edge("compare-ax", a, x), edge("compare-by", b, y), edge("compare-cz", c, z)];
  const projection = createWorldProjection({ instances: nodes, edges });
  const radius = 2_000;
  const circular = new Map(
    nodes.map((item, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;
      return [item.id, [Math.cos(angle) * radius, Math.sin(angle) * radius]];
    }),
  );
  const circularCrossings = crossingCountFor(projection.edges, circular);

  const dag = createWorldDagLayout(projection);
  assert.equal(dag.targets.length, nodes.length, "comparison fixture must produce DAG targets");
  const dagPositions = new Map(
    dag.targets.map((target) => [target.instanceId, [target.eastMeters, target.northMeters]]),
  );
  const dagCrossings = crossingCountFor(projection.edges, dagPositions);

  assert.ok(circularCrossings > 0);
  assert.ok(
    dagCrossings < circularCrossings,
    `expected Sugiyama crossings ${dagCrossings} to beat circular baseline ${circularCrossings}`,
  );
});

test("isolated entities stay force-owned while connected entities receive DAG targets", () => {
  const localPlace = {
    placeId: "sparse-place",
    longitude: 18,
    latitude: 59,
    influence: 1,
  };
  const make = (name) =>
    createProjectedWorldInstance({
      id: worldInstanceId(name, `occ-${name}`),
      canonicalId: name,
      occurrenceId: `occ-${name}`,
      geographicAnchors: [localPlace],
      temporalWeight: 1,
      visualWeight: 0.5,
      retained: false,
    });
  const a = make("sparse-a");
  const b = make("sparse-b");
  const c = make("sparse-c");
  const d = make("sparse-d");

  const layout = createWorldDagLayout(
    createWorldProjection({
      instances: [a, b, c, d],
      edges: [edge("sparse-ab", a, b)],
    }),
  );

  assert.deepEqual(
    layout.targets.map((target) => target.instanceId).sort(),
    [a.id, b.id].sort(),
  );
  assert.deepEqual(layout.routes.map((route) => route.relationshipId), ["sparse-ab"]);
  assert.equal(layout.metrics.nodeCount, 4);
});

test("route quality metrics measure the routed polyline rather than endpoint distance", () => {
  const localPlace = {
    placeId: "route-metric-place",
    longitude: 18,
    latitude: 59,
    influence: 1,
  };
  const make = (name) =>
    createProjectedWorldInstance({
      id: worldInstanceId(name, `occ-${name}`),
      canonicalId: name,
      occurrenceId: `occ-${name}`,
      geographicAnchors: [localPlace],
      temporalWeight: 1,
      visualWeight: 0.5,
      retained: false,
    });
  const a = make("route-a");
  const b = make("route-b");
  const c = make("route-c");
  const projection = createWorldProjection({
    instances: [a, b, c],
    edges: [edge("route-ab", a, b), edge("route-bc", b, c), edge("route-ac", a, c)],
  });
  const layout = createWorldDagLayout(projection);

  const routedLengths = layout.routes.map((route) => {
    let length = 0;
    for (let index = 1; index < route.points.length; index += 1) {
      const source = route.points[index - 1];
      const target = route.points[index];
      length += Math.hypot(
        target.eastMeters - source.eastMeters,
        target.northMeters - source.northMeters,
      );
    }
    return length;
  });
  const expectedMean =
    routedLengths.reduce((total, length) => total + length, 0) / routedLengths.length;

  assert.ok(layout.routes.some((route) => route.points.length > 2));
  assert.ok(Math.abs(layout.metrics.meanEdgeLengthMeters - expectedMean) < 1e-6);
});

test("SCC cycle breaking cannot discard a bridge to another component", () => {
  const localPlace = {
    placeId: "scc-place",
    longitude: 18,
    latitude: 59,
    influence: 1,
  };
  const make = (name) =>
    createProjectedWorldInstance({
      id: worldInstanceId(name, `occ-${name}`),
      canonicalId: name,
      occurrenceId: `occ-${name}`,
      geographicAnchors: [localPlace],
      temporalWeight: 1,
      visualWeight: 0.5,
      retained: false,
    });
  const a = make("scc-a");
  const b = make("scc-b");
  const c = make("scc-c");
  const d = make("scc-d");
  const layout = createWorldDagLayout(
    createWorldProjection({
      instances: [a, b, c, d],
      edges: [
        edge("scc-ab", a, b, 1),
        edge("scc-bc", b, c, 0.9),
        edge("scc-ca", c, a, 0.8),
        edge("scc-bridge", c, d, 0.01),
      ],
    }),
  );

  const routeIds = layout.routes.map((route) => String(route.relationshipId));
  assert.ok(routeIds.includes("scc-bridge"));
  assert.equal(routeIds.filter((id) => id.startsWith("scc-") && id !== "scc-bridge").length, 2);
});

test("operator hysteresis keeps a stable family across the 24-node boundary", () => {
  const localPlace = {
    placeId: "hysteresis-place",
    longitude: 18,
    latitude: 59,
    influence: 1,
  };
  const make = (name) =>
    createProjectedWorldInstance({
      id: worldInstanceId(name, `occ-${name}`),
      canonicalId: name,
      occurrenceId: `occ-${name}`,
      geographicAnchors: [localPlace],
      temporalWeight: 1,
      visualWeight: 0.5,
      retained: false,
    });
  const initialNodes = Array.from({ length: 24 }, (_, index) => make(`hysteresis-${index}`));
  const initial = createWorldDagLayout(
    createWorldProjection({
      instances: initialNodes,
      edges: initialNodes
        .slice(1)
        .map((item, index) => edge(`hysteresis-edge-${index}`, initialNodes[index], item)),
    }),
  );
  const previousAlgorithm = Object.keys(initial.metrics.algorithmCounts)[0];
  assert.ok(previousAlgorithm);

  const added = make("hysteresis-24");
  const updatedNodes = [...initialNodes, added];
  const updated = createWorldDagLayout(
    createWorldProjection({
      instances: updatedNodes,
      edges: updatedNodes
        .slice(1)
        .map((item, index) => edge(`hysteresis-edge-${index}`, updatedNodes[index], item)),
    }),
  );
  const updatedAlgorithm = Object.keys(updated.metrics.algorithmCounts)[0];

  assert.equal(updatedAlgorithm, previousAlgorithm);
});

