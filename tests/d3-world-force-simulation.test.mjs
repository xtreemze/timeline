import assert from "node:assert/strict";
import test from "node:test";

import { D3WorldForceSimulation } from "../src/layout/d3-world-force-simulation.ts";

function node(id, east, collisionRadiusMeters = 300, overrides = {}) {
  return {
    id,
    canonicalId: id,
    mass: 1,
    collisionRadiusPx: 22,
    collisionRadiusMeters,
    initialEastMeters: east,
    initialNorthMeters: east === 0 ? 1 : 0,
    targetVisualAltitudeMeters: 1_000,
    ...overrides,
  };
}

function anchor(instanceId, placeId, influence = 1, overrides = {}) {
  return {
    instanceId,
    placeId,
    longitude: placeId === "stockholm" ? 18.0686 : 12.5683,
    latitude: placeId === "stockholm" ? 59.3293 : 55.6761,
    sourceAltitudeMeters: 0,
    influence,
    precisionRadiusMeters: 0,
    ...overrides,
  };
}

function topologyRequest() {
  return { reason: "topology", excitation: 0.14, reheat: true };
}

function distance(snapshot, leftId, rightId) {
  const left = snapshot.find((entry) => entry.instanceId === leftId);
  const right = snapshot.find((entry) => entry.instanceId === rightId);
  return Math.hypot(left.eastMeters - right.eastMeters, left.northMeters - right.northMeters);
}

test("D3 collision and rejection reserve the full visible force-node footprint", () => {
  const simulation = new D3WorldForceSimulation();
  const alice = '["alice",null]';
  const bob = '["bob",null]';
  simulation.setScene({
    nodes: [node(alice, -20, 360), node(bob, 20, 360)],
    edges: [],
    anchors: [anchor(alice, "stockholm", 0), anchor(bob, "stockholm", 0)],
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);

  assert.ok(
    distance(simulation.getSnapshot(), alice, bob) >= 700,
    "D3 must not settle visibly overlapping nodes inside their combined collision radii",
  );
});

test("D3 gives high-connectivity nodes additional soft spacing beyond hard collision", () => {
  const settleDistance = (clearanceMeters) => {
    const simulation = new D3WorldForceSimulation();
    const hub = `["hub-${clearanceMeters}",null]`;
    const peer = `["peer-${clearanceMeters}",null]`;
    simulation.setScene({
      nodes: [
        node(hub, -20, 180, { connectivityClearanceMeters: clearanceMeters }),
        node(peer, 20, 180),
      ],
      edges: [],
      anchors: [anchor(hub, "stockholm", 1), anchor(peer, "stockholm", 1)],
    });
    simulation.apply(topologyRequest());
    for (let index = 0; index < 240; index += 1) simulation.step(1000 / 60);
    return distance(simulation.getSnapshot(), hub, peer);
  };

  const ordinary = settleDistance(0);
  const hub = settleDistance(720);
  assert.ok(hub > ordinary + 150, `hub spacing ${hub} must exceed ordinary spacing ${ordinary}`);
});

test(
  "place-scoped force tuning changes connected-node clearance without changing hard collision radius",
  () => {
    const simulation = new D3WorldForceSimulation();
    const stockholmHub = '["stockholm-hub",null]';
    const stockholmPeer = '["stockholm-peer",null]';
    const copenhagenHub = '["copenhagen-hub",null]';
    const copenhagenPeer = '["copenhagen-peer",null]';
    simulation.setScene({
      nodes: [
        node(stockholmHub, -20, 180, { connectivityClearanceMeters: 720 }),
        node(stockholmPeer, 20, 180),
        node(copenhagenHub, -20, 180, { connectivityClearanceMeters: 720 }),
        node(copenhagenPeer, 20, 180),
      ],
      edges: [],
      anchors: [
        anchor(stockholmHub, "stockholm", 0),
        anchor(stockholmPeer, "stockholm", 0),
        anchor(copenhagenHub, "copenhagen", 0),
        anchor(copenhagenPeer, "copenhagen", 0),
      ],
    });
    simulation.setTuning(
      {
        collisionStrength: 0.82,
        collisionIterations: 3,
        connectivityClearanceScale: 0,
        manyBodyStrength: -2600,
        linkStrengthScale: 1,
        anchorStrengthScale: 1,
        dagStrengthScale: 1,
      },
      { placeId: "stockholm" },
    );
    simulation.apply(topologyRequest());
    for (let index = 0; index < 240; index += 1) simulation.step(1000 / 60);

    const snapshot = simulation.getSnapshot();
    const stockholmDistance = distance(snapshot, stockholmHub, stockholmPeer);
    const copenhagenDistance = distance(snapshot, copenhagenHub, copenhagenPeer);
    assert.ok(
      stockholmDistance >= 350,
      "turning off soft hub clearance must still preserve the 360m combined rendered collision body",
    );
    assert.ok(
      copenhagenDistance > stockholmDistance + 150,
      "place-scoped tuning must not erase the default connectivity clearance at other places",
    );
  },
);

test("force tuning rejects collision settings that would violate the solver contract", () => {
  const simulation = new D3WorldForceSimulation();
  assert.throws(
    () =>
      simulation.setTuning({
        collisionStrength: 1.2,
        collisionIterations: 3,
        connectivityClearanceScale: 1,
        manyBodyStrength: -2600,
        linkStrengthScale: 1,
        anchorStrengthScale: 1,
        dagStrengthScale: 1,
      }),
    /Collision strength must not exceed 1/,
  );
  assert.throws(
    () =>
      simulation.setTuning({
        collisionStrength: 0.82,
        collisionIterations: 0,
        connectivityClearanceScale: 1,
        manyBodyStrength: -2600,
        linkStrengthScale: 1,
        anchorStrengthScale: 1,
        dagStrengthScale: 1,
      }),
    /Collision iterations must be an integer from 1 to 12/,
  );
});

test("cross-place D3 spacing honors hub connectivity clearance", () => {
  const simulation = new D3WorldForceSimulation();
  const hub = '["hub","place-a"]';
  const peer = '["peer","place-b"]';
  simulation.setScene({
    nodes: [node(hub, -10, 180, { connectivityClearanceMeters: 720 }), node(peer, 10, 180)],
    edges: [],
    anchors: [
      anchor(hub, "place-a", 0, { longitude: 18, latitude: 59 }),
      anchor(peer, "place-b", 0, { longitude: 18, latitude: 59 }),
    ],
  });

  simulation.apply(topologyRequest());
  for (let index = 0; index < 240; index += 1) simulation.step(1000 / 60);

  assert.ok(
    distance(simulation.getSnapshot(), hub, peer) > 650,
    "hub clearance must participate in the world-space cross-place collision island",
  );
});

test("selected-place tuning participates in cross-place collision islands", () => {
  const settle = (clearanceScale) => {
    const simulation = new D3WorldForceSimulation();
    const hub = `["cross-tuned-hub-${clearanceScale}","place-a"]`;
    const peer = `["cross-tuned-peer-${clearanceScale}","place-b"]`;
    simulation.setScene({
      nodes: [
        node(hub, -10, 180, { connectivityClearanceMeters: 720 }),
        node(peer, 10, 180),
      ],
      edges: [],
      anchors: [
        anchor(hub, "place-a", 0, { longitude: 18, latitude: 59 }),
        anchor(peer, "place-b", 0, { longitude: 18, latitude: 59 }),
      ],
    });
    simulation.setTuning(
      {
        collisionStrength: 0.82,
        collisionIterations: 3,
        connectivityClearanceScale: clearanceScale,
        manyBodyStrength: -2600,
        linkStrengthScale: 1,
        anchorStrengthScale: 1,
        dagStrengthScale: 1,
      },
      { placeId: "place-a" },
    );
    simulation.apply(topologyRequest());
    for (let index = 0; index < 240; index += 1) simulation.step(1000 / 60);
    return distance(simulation.getSnapshot(), hub, peer);
  };

  const hardBodyOnly = settle(0);
  const hubClearance = settle(1);
  assert.ok(hardBodyOnly >= 350, "cross-place tuning must retain the rendered hard body");
  assert.ok(
    hubClearance > hardBodyOnly + 100,
    "selected-place connectivity clearance must affect nearby foreign-place rejection",
  );
});

test("same-place D3 rejection is not truncated by a fixed kilometre cutoff", () => {
  const simulation = new D3WorldForceSimulation();
  const left = '["wide-left",null]';
  const right = '["wide-right",null]';
  simulation.setScene({
    nodes: [node(left, -4_500, 180), node(right, 4_500, 180)],
    edges: [],
    anchors: [anchor(left, "stockholm", 0), anchor(right, "stockholm", 0)],
  });

  const before = distance(simulation.getSnapshot(), left, right);
  assert.ok(before > 7_200);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);
  const after = distance(simulation.getSnapshot(), left, right);

  assert.ok(
    after > before,
    `nodes ${before.toFixed(1)}m apart should still repel; settled at ${after.toFixed(1)}m`,
  );
});

test("cluster lifecycle detaches links, gathers with D3, then scatters from the gathered state", () => {
  const simulation = new D3WorldForceSimulation();
  const alice = '["alice",null]';
  const bob = '["bob",null]';
  simulation.setScene({
    nodes: [node(alice, -900, 180), node(bob, 900, 180)],
    edges: [
      {
        id: "meeting",
        sourceId: alice,
        targetId: bob,
        strength: 0.08,
        restLengthMeters: 1_800,
      },
    ],
    anchors: [anchor(alice, "stockholm", 1), anchor(bob, "stockholm", 1)],
  });
  simulation.apply(topologyRequest());
  for (let index = 0; index < 60; index += 1) simulation.step(1000 / 60);
  const expandedBefore = distance(simulation.getSnapshot(), alice, bob);

  simulation.setClusteredPlaceIds(["stockholm"]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);
  const collapsed = distance(simulation.getSnapshot(), alice, bob);
  assert.ok(collapsed < expandedBefore, "D3 gathers the detached place group");

  simulation.setClusteredPlaceIds([], ["stockholm"]);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);
  const expandedDetached = distance(simulation.getSnapshot(), alice, bob);
  assert.ok(
    expandedDetached > collapsed,
    "D3 rejection scatters retained members while relationship links remain detached",
  );

  simulation.setClusteredPlaceIds([], []);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 60; index += 1) simulation.step(1000 / 60);
  assert.ok(
    distance(simulation.getSnapshot(), alice, bob) > collapsed,
    "restoring links happens only after the free scatter phase",
  );
});

test("D3 center force translates a local place group without changing relative spacing", () => {
  const simulation = new D3WorldForceSimulation();
  const left = '["center-left",null]';
  const right = '["center-right",null]';
  simulation.setScene({
    nodes: [node(left, -100, 100), node(right, 100, 100)],
    edges: [],
    anchors: [anchor(left, "stockholm", 0), anchor(right, "stockholm", 0)],
  });
  simulation.setTuning({
    centerStrength: 1,
    centerEastMeters: 1_200,
    centerNorthMeters: -600,
    collisionStrength: 0,
    collisionIterations: 1,
    connectivityClearanceScale: 0,
    manyBodyStrength: 0,
    linkStrengthScale: 0,
    linkDistanceScale: 1,
    anchorStrengthScale: 0,
    dagStrengthScale: 0,
  });

  const beforeDistance = distance(simulation.getSnapshot(), left, right);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 8; index += 1) simulation.step(1000 / 60);
  const snapshot = simulation.getSnapshot();
  const meanEast = snapshot.reduce((sum, entry) => sum + entry.eastMeters, 0) / snapshot.length;
  const meanNorth = snapshot.reduce((sum, entry) => sum + entry.northMeters, 0) / snapshot.length;

  assert.ok(Math.abs(meanEast - 1_200) < 1);
  assert.ok(Math.abs(meanNorth + 600) < 1);
  assert.ok(
    Math.abs(distance(snapshot, left, right) - beforeDistance) < 1,
    "forceCenter should translate the group without distorting its relative positions",
  );
});

test("D3 link force exposes desired distance independently from link strength", () => {
  const settle = (linkDistanceScale) => {
    const simulation = new D3WorldForceSimulation();
    const left = `["link-left-${linkDistanceScale}",null]`;
    const right = `["link-right-${linkDistanceScale}",null]`;
    simulation.setScene({
      nodes: [node(left, -50, 100), node(right, 50, 100)],
      edges: [
        {
          id: `link-${linkDistanceScale}`,
          sourceId: left,
          targetId: right,
          strength: 1,
          restLengthMeters: 1_000,
        },
      ],
      anchors: [anchor(left, "stockholm", 0), anchor(right, "stockholm", 0)],
    });
    simulation.setTuning({
      centerStrength: 0,
      centerEastMeters: 0,
      centerNorthMeters: 0,
      collisionStrength: 0.82,
      collisionIterations: 3,
      connectivityClearanceScale: 0,
      manyBodyStrength: 0,
      linkStrengthScale: 1,
      linkDistanceScale,
      anchorStrengthScale: 0,
      dagStrengthScale: 0,
    });
    simulation.apply(topologyRequest());
    for (let index = 0; index < 240; index += 1) simulation.step(1000 / 60);
    return distance(simulation.getSnapshot(), left, right);
  };

  const compact = settle(0.5);
  const expanded = settle(2);
  assert.ok(compact > 400 && compact < 700, `expected compact link near 500m, got ${compact}`);
  assert.ok(expanded > 1_600, `expected expanded link near 2000m, got ${expanded}`);
  assert.ok(expanded > compact * 2.5);
});

test("D3 DAG targets remain soft guidance outside collapsed clusters", () => {
  const simulation = new D3WorldForceSimulation();
  const id = '["alice",null]';
  simulation.setScene({
    nodes: [
      node(id, 0, 100, {
        layoutTargetEastMeters: 1_000,
        layoutTargetNorthMeters: 0,
        layoutTargetStrength: 0.08,
      }),
    ],
    edges: [],
    anchors: [anchor(id, "stockholm", 0)],
  });
  const before = simulation.getSnapshot()[0].eastMeters;
  simulation.apply(topologyRequest());
  for (let index = 0; index < 120; index += 1) simulation.step(1000 / 60);
  assert.ok(simulation.getSnapshot()[0].eastMeters > before);
});

test("changed-place temporal handoffs converge without a first-frame teleport", () => {
  const simulation = new D3WorldForceSimulation();
  const id = '["alice",null]';

  simulation.setScene({
    nodes: [node(id, 0, 180)],
    edges: [],
    anchors: [anchor(id, "stockholm", 1)],
  });
  simulation.apply({ reason: "projection-update", excitation: 0.08, reheat: true });
  for (let index = 0; index < 30; index += 1) simulation.step(1000 / 60);

  const rebasedEastMeters = 20_000_000;
  simulation.setScene({
    nodes: [
      node(id, rebasedEastMeters, 180, {
        initialNorthMeters: 0,
        initialVisualAltitudeMeters: 8_000,
        targetVisualAltitudeMeters: 1_000,
      }),
    ],
    edges: [],
    anchors: [anchor(id, "copenhagen", 1)],
  });
  simulation.apply({ reason: "projection-update", excitation: 0.08, reheat: true });

  simulation.step(1000 / 60);
  const firstFrame = simulation.getSnapshot()[0];
  assert.ok(
    firstFrame.eastMeters > rebasedEastMeters * 0.95,
    "the first physics frame must advance continuously rather than teleport to the new anchor",
  );
  assert.ok(
    firstFrame.visualAltitudeMeters > 7_000,
    "continuity altitude must begin from the visible seed instead of snapping to its target",
  );

  for (let index = 1; index < 240; index += 1) simulation.step(1000 / 60);
  const settled = simulation.getSnapshot()[0];
  assert.ok(
    Math.hypot(settled.eastMeters, settled.northMeters) < 2_000,
    "an intercontinental handoff must return to local-graph scale within the four-second run budget",
  );
  assert.ok(
    Math.abs(settled.visualAltitudeMeters - 1_000) < 1,
    "continuity altitude must relax to the committed projection target",
  );
});

test("D3 drag and post-drop stay local and publish sparse changed positions", () => {
  const simulation = new D3WorldForceSimulation();
  const dragged = '["alice","stockholm"]';
  const peer = '["bob","stockholm"]';
  const remoteA = '["carol","copenhagen"]';
  const remoteB = '["dave","copenhagen"]';

  simulation.setScene({
    nodes: [
      node(dragged, -600, 180),
      node(peer, 600, 180),
      node(remoteA, -500, 180),
      node(remoteB, 500, 180),
    ],
    edges: [
      {
        id: "stockholm-link",
        sourceId: dragged,
        targetId: peer,
        strength: 0.08,
        restLengthMeters: 1_200,
      },
      {
        id: "copenhagen-link",
        sourceId: remoteA,
        targetId: remoteB,
        strength: 0.08,
        restLengthMeters: 1_000,
      },
    ],
    anchors: [
      anchor(dragged, "stockholm", 1),
      anchor(peer, "stockholm", 1),
      anchor(remoteA, "copenhagen", 1),
      anchor(remoteB, "copenhagen", 1),
    ],
  });

  assert.equal(simulation.getChangedSnapshot().length, 4);
  const remoteBefore = simulation
    .getSnapshot()
    .filter((entry) => entry.instanceId === remoteA || entry.instanceId === remoteB);

  simulation.setPin({
    instanceId: dragged,
    eastMeters: 2_000_000,
    northMeters: 0,
    visualAltitudeMeters: 1_000,
  });
  simulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  simulation.step(1000 / 60);
  assert.deepEqual(
    simulation
      .getChangedSnapshot()
      .map((entry) => entry.instanceId)
      .sort(),
    [dragged, peer].sort(),
    "direct manipulation should publish only the affected place group",
  );

  simulation.setPin(null);
  simulation.apply({ reason: "post-drop", excitation: 0.035, reheat: true });
  simulation.step(1000 / 60);
  assert.deepEqual(
    simulation
      .getChangedSnapshot()
      .map((entry) => entry.instanceId)
      .sort(),
    [dragged, peer].sort(),
    "post-drop settling should keep unrelated places asleep",
  );

  const remoteAfter = simulation
    .getSnapshot()
    .filter((entry) => entry.instanceId === remoteA || entry.instanceId === remoteB);
  assert.deepEqual(remoteAfter, remoteBefore);
});

test("D3 topology collision spans distinct place groups regardless of relationship", () => {
  for (const related of [false, true]) {
    const simulation = new D3WorldForceSimulation();
    const left = `["left-${related}","place-a"]`;
    const right = `["right-${related}","place-b"]`;

    simulation.setScene({
      nodes: [node(left, -20, 260), node(right, 20, 260)],
      edges: related
        ? [
            {
              id: `cross-place-${related}`,
              sourceId: left,
              targetId: right,
              strength: 0.08,
              restLengthMeters: 1_000,
            },
          ]
        : [],
      anchors: [
        anchor(left, "place-a", 0, { longitude: 18, latitude: 59 }),
        anchor(right, "place-b", 0, { longitude: 18, latitude: 59 }),
      ],
    });

    simulation.apply(topologyRequest());
    for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);

    assert.ok(
      distance(simulation.getSnapshot(), left, right) >= 500,
      `cross-place topology collision must reserve marker footprints when related=${related}`,
    );
  }
});

test("D3 topology cross-place collision cools to a settled state", () => {
  const simulation = new D3WorldForceSimulation();
  const left = '["settle-left","place-a"]';
  const right = '["settle-right","place-b"]';

  simulation.setScene({
    nodes: [node(left, -20, 260), node(right, 20, 260)],
    edges: [],
    anchors: [
      anchor(left, "place-a", 1, { longitude: 18, latitude: 59 }),
      anchor(right, "place-b", 1, { longitude: 18, latitude: 59 }),
    ],
  });

  simulation.apply(topologyRequest());
  for (let index = 0; index < 480 && !simulation.getDiagnostics().settled; index += 1) {
    simulation.step(1000 / 60);
  }

  assert.equal(
    simulation.getDiagnostics().settled,
    true,
    "cross-place collision must cool with the owning place groups instead of reheating forever",
  );
  assert.ok(
    distance(simulation.getSnapshot(), left, right) >= 500,
    "settling must preserve the combined collision footprint",
  );
});

test("D3 topology collision resolves multiple nearby places without waking remote geography", () => {
  const simulation = new D3WorldForceSimulation();
  const first = '["first","place-a"]';
  const second = '["second","place-b"]';
  const third = '["third","place-c"]';
  const remote = '["remote","copenhagen"]';

  simulation.setScene({
    nodes: [
      node(first, -10, 180),
      node(second, 0, 180),
      node(third, 10, 180),
      node(remote, 123, 180),
    ],
    edges: [],
    anchors: [
      anchor(first, "place-a", 0, { longitude: 18, latitude: 59 }),
      anchor(second, "place-b", 0, { longitude: 18, latitude: 59 }),
      anchor(third, "place-c", 0, { longitude: 18, latitude: 59 }),
      anchor(remote, "copenhagen", 0),
    ],
  });

  const remoteBefore = simulation.getSnapshot().find((entry) => entry.instanceId === remote);
  simulation.apply(topologyRequest());
  for (let index = 0; index < 180; index += 1) simulation.step(1000 / 60);
  const snapshot = simulation.getSnapshot();
  const minimumNearDistance = Math.min(
    distance(snapshot, first, second),
    distance(snapshot, first, third),
    distance(snapshot, second, third),
  );
  const remoteAfter = snapshot.find((entry) => entry.instanceId === remote);

  assert.ok(
    minimumNearDistance >= 330,
    `three distinct place groups must resolve their shared collision island; minimum=${minimumNearDistance}`,
  );
  assert.deepEqual(
    remoteAfter,
    remoteBefore,
    "remote unrelated geography must remain outside the cross-place collision broad phase",
  );
});

test("D3 drag rejects nearby nodes across different geographic anchors before collision", () => {
  const simulation = new D3WorldForceSimulation();
  const dragged = '["dragged","origin"]';
  const nearbyA = '["nearby-a","place-a"]';
  const nearbyB = '["nearby-b","place-b"]';

  simulation.setScene({
    nodes: [node(dragged, 0, 180), node(nearbyA, 0, 180), node(nearbyB, 0, 180)],
    edges: [],
    anchors: [
      anchor(dragged, "origin", 0, { longitude: 18, latitude: 59 }),
      anchor(nearbyA, "place-a", 0, { longitude: 18.01, latitude: 59 }),
      anchor(nearbyB, "place-b", 0, { longitude: 18.02, latitude: 59 }),
    ],
  });
  simulation.getChangedSnapshot();
  const before = new Map(simulation.getSnapshot().map((entry) => [entry.instanceId, entry]));

  simulation.setPin({
    instanceId: dragged,
    eastMeters: 0,
    northMeters: 0,
    visualAltitudeMeters: 1_000,
  });
  simulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  simulation.step(1000 / 60);

  const after = new Map(simulation.getSnapshot().map((entry) => [entry.instanceId, entry]));
  const changed = new Set(simulation.getChangedSnapshot().map((entry) => entry.instanceId));

  for (const id of [nearbyA, nearbyB]) {
    const start = before.get(id);
    const end = after.get(id);
    assert.ok(start && end);
    assert.ok(
      Math.hypot(end.eastMeters - start.eastMeters, end.northMeters - start.northMeters) > 0,
      `${id} should participate in cross-place rejection before marker footprints overlap`,
    );
    assert.ok(changed.has(id), `${id} should publish its cross-place force displacement`);
  }
  assert.equal(
    after.get(dragged)?.eastMeters,
    0,
    "the directly manipulated node remains pointer-owned while foreign nodes reject it",
  );
});

test("D3 drag collides with nodes registered to a different place", () => {
  const simulation = new D3WorldForceSimulation();
  const dragged = '["alice","stockholm"]';
  const foreign = '["bob","nearby-place"]';

  simulation.setScene({
    nodes: [node(dragged, -500, 240), node(foreign, 1, 240)],
    edges: [],
    anchors: [
      anchor(dragged, "stockholm", 0, { longitude: 18, latitude: 59 }),
      anchor(foreign, "nearby-place", 0, { longitude: 18.001, latitude: 59 }),
    ],
  });
  simulation.getChangedSnapshot();

  simulation.setPin({
    instanceId: dragged,
    eastMeters: 58,
    northMeters: 0,
    visualAltitudeMeters: 1_000,
  });
  simulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  for (let index = 0; index < 4; index += 1) simulation.step(1000 / 60);

  const snapshot = simulation.getSnapshot();
  const draggedPosition = snapshot.find((entry) => entry.instanceId === dragged);
  const foreignPosition = snapshot.find((entry) => entry.instanceId === foreign);
  assert.ok(draggedPosition && foreignPosition);
  assert.equal(draggedPosition.eastMeters, 58, "the pointer-owned node must remain pinned");
  assert.ok(
    Math.hypot(foreignPosition.eastMeters - 1, foreignPosition.northMeters) > 100,
    "cross-place collision must displace the foreign node instead of allowing overlap",
  );
  assert.ok(
    simulation.getChangedSnapshot().some((entry) => entry.instanceId === foreign),
    "the collided foreign place must be published as changed",
  );
});

test("D3 long-distance release bounds the first post-drop force step", () => {
  const simulation = new D3WorldForceSimulation();
  const dragged = '["alice","long-release"]';
  const peer = '["bob","long-release"]';

  simulation.setScene({
    nodes: [node(dragged, 0, 120), node(peer, 1_000, 120)],
    edges: [
      {
        id: "long-release-link",
        sourceId: dragged,
        targetId: peer,
        strength: 1,
        restLengthMeters: 1_000,
      },
    ],
    anchors: [anchor(dragged, "stockholm", 1), anchor(peer, "stockholm", 1)],
  });

  simulation.setPin({
    instanceId: dragged,
    eastMeters: 10_000_000,
    northMeters: 0,
    visualAltitudeMeters: 1_000,
  });
  simulation.apply({ reason: "drag", excitation: 0.2, reheat: true });
  simulation.step(1000 / 60);

  simulation.setPin(null);
  simulation.apply({ reason: "post-drop", excitation: 0.035, reheat: true });
  const before = simulation.getSnapshot();
  simulation.step(1000 / 60);
  const after = simulation.getSnapshot();

  const beforeDragged = before.find((entry) => entry.instanceId === dragged);
  const afterDragged = after.find((entry) => entry.instanceId === dragged);
  const beforePeer = before.find((entry) => entry.instanceId === peer);
  const afterPeer = after.find((entry) => entry.instanceId === peer);

  assert.ok(beforeDragged && afterDragged && beforePeer && afterPeer);
  const draggedStep = Math.hypot(
    afterDragged.eastMeters - beforeDragged.eastMeters,
    afterDragged.northMeters - beforeDragged.northMeters,
  );
  const peerStep = Math.hypot(
    afterPeer.eastMeters - beforePeer.eastMeters,
    afterPeer.northMeters - beforePeer.northMeters,
  );

  assert.ok(Number.isFinite(draggedStep));
  assert.ok(Number.isFinite(peerStep));
  assert.ok(draggedStep < 10_000, `released node jumped ${draggedStep.toFixed(1)}m in one step`);
  assert.ok(peerStep < 10_000, `connected peer jumped ${peerStep.toFixed(1)}m in one step`);
  assert.ok(
    Math.abs(afterDragged.eastMeters) < Math.abs(beforeDragged.eastMeters),
    "released node should return toward its authored place without a distance-amplified snap",
  );
});
