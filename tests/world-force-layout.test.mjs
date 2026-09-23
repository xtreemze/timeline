import assert from "node:assert/strict";
import test from "node:test";

import { applyWorldForceLayout } from "../src/layout/world-force-layout.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function projection() {
  const alice = worldInstanceId("alice", "meeting");
  const bob = worldInstanceId("bob", "meeting");

  return createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id: alice,
        canonicalId: "alice",
        occurrenceId: "meeting",
        geographicAnchors: [
          {
            placeId: "stockholm",
            longitude: 18.0686,
            latitude: 59.3293,
            influence: 1,
          },
        ],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
        localOffset: { eastMeters: 0, northMeters: 0 },
        visualAltitude: 1000,
      }),
      createProjectedWorldInstance({
        id: bob,
        canonicalId: "bob",
        occurrenceId: "meeting",
        geographicAnchors: [
          {
            placeId: "stockholm",
            longitude: 18.0686,
            latitude: 59.3293,
            influence: 1,
          },
        ],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
    ],
    edges: [
      createProjectedWorldEdge({
        id: "meeting",
        sourceInstanceId: alice,
        targetInstanceId: bob,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });
}

test("force layout samples update only derived local offset and visual altitude", () => {
  const input = projection();
  const before = JSON.stringify(input);
  const alice = input.instances.find((instance) => instance.canonicalId === "alice");

  const output = applyWorldForceLayout(input, [
    {
      instanceId: alice.id,
      eastMeters: 250,
      northMeters: -125,
      visualAltitudeMeters: 1750,
    },
  ]);

  const updatedAlice = output.instances.find((instance) => instance.canonicalId === "alice");
  const bob = output.instances.find((instance) => instance.canonicalId === "bob");

  assert.deepEqual(updatedAlice.localOffset, {
    eastMeters: 250,
    northMeters: -125,
  });
  assert.equal(updatedAlice.visualAltitude, 1750);
  assert.deepEqual(updatedAlice.geographicAnchors, alice.geographicAnchors);
  assert.equal(updatedAlice.canonicalId, "alice");
  assert.equal(updatedAlice.occurrenceId, "meeting");
  assert.equal(bob.localOffset, undefined);
  assert.equal(JSON.stringify(input), before);
});

test("partial force snapshots preserve untouched world instances and edges", () => {
  const input = projection();
  const alice = input.instances.find((instance) => instance.canonicalId === "alice");

  const output = applyWorldForceLayout(input, [
    {
      instanceId: alice.id,
      eastMeters: 10,
      northMeters: 20,
      visualAltitudeMeters: 900,
    },
  ]);

  const originalBob = input.instances.find((instance) => instance.canonicalId === "bob");
  const outputBob = output.instances.find((instance) => instance.canonicalId === "bob");

  assert.deepEqual(outputBob, originalBob);
  assert.deepEqual(output.edges, input.edges);
});

test("layout output remains deterministic independent of sample input order", () => {
  const input = projection();
  const alice = input.instances.find((instance) => instance.canonicalId === "alice");
  const bob = input.instances.find((instance) => instance.canonicalId === "bob");
  const samples = [
    {
      instanceId: bob.id,
      eastMeters: -20,
      northMeters: 30,
      visualAltitudeMeters: 800,
    },
    {
      instanceId: alice.id,
      eastMeters: 40,
      northMeters: -50,
      visualAltitudeMeters: 1200,
    },
  ];

  assert.deepEqual(
    applyWorldForceLayout(input, samples),
    applyWorldForceLayout(input, [...samples].reverse()),
  );
});

test("unknown and duplicate layout sample IDs fail before projection mutation", () => {
  const input = projection();
  const alice = input.instances.find((instance) => instance.canonicalId === "alice");

  assert.throws(
    () =>
      applyWorldForceLayout(input, [
        {
          instanceId: "missing",
          eastMeters: 0,
          northMeters: 0,
          visualAltitudeMeters: 0,
        },
      ]),
    /unknown instance/,
  );

  assert.throws(
    () =>
      applyWorldForceLayout(input, [
        {
          instanceId: alice.id,
          eastMeters: 0,
          northMeters: 0,
          visualAltitudeMeters: 0,
        },
        {
          instanceId: alice.id,
          eastMeters: 1,
          northMeters: 1,
          visualAltitudeMeters: 1,
        },
      ]),
    /Duplicate/,
  );
});

test("layout samples reject non-finite offsets and negative visual altitude", () => {
  const input = projection();
  const alice = input.instances.find((instance) => instance.canonicalId === "alice");

  assert.throws(
    () =>
      applyWorldForceLayout(input, [
        {
          instanceId: alice.id,
          eastMeters: Number.NaN,
          northMeters: 0,
          visualAltitudeMeters: 0,
        },
      ]),
    /east offset/,
  );

  assert.throws(
    () =>
      applyWorldForceLayout(input, [
        {
          instanceId: alice.id,
          eastMeters: 0,
          northMeters: 0,
          visualAltitudeMeters: -1,
        },
      ]),
    /visual altitude/,
  );
});
