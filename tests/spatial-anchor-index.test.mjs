import assert from "node:assert/strict";
import test from "node:test";

import {
  SpatialAnchorIndex,
  representativeGeographicPosition,
} from "../src/projection/spatial-anchor-index.ts";

function relationship(overrides) {
  return {
    id: "rel-1",
    subjectId: "alice",
    objectId: "bob",
    predicate: "met",
    itemIds: [],
    sourceIds: [],
    confidence: 0.9,
    time: null,
    attributes: {},
    ...overrides,
  };
}

test("representative geography remains stable across the international date line", () => {
  const [longitude, latitude] = representativeGeographicPosition({
    type: "LineString",
    coordinates: [
      [179, 10],
      [-179, 10],
    ],
  });

  assert.ok(Math.abs(Math.abs(longitude) - 180) < 0.01);
  assert.ok(latitude > 9 && latitude < 11);
});

test("SpatialAnchorIndex derives occurrence and endpoint constraints without place nodes", () => {
  const index = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
        certainty: 1,
        precisionRadiusMeters: 10,
      },
    ],
    [
      relationship({
        id: "meeting",
        placeId: "stockholm",
      }),
    ],
  );

  const anchor = index.anchorForOccurrence("meeting");
  assert.ok(anchor);
  assert.equal(anchor.placeId, "stockholm");
  assert.equal(anchor.longitude, 18.0686);
  assert.equal(anchor.latitude, 59.3293);

  assert.deepEqual(
    index.anchorsForEntity("alice").map(({ occurrenceId, role }) => [occurrenceId, role]),
    [["meeting", "subject"]],
  );
  assert.deepEqual(
    index.anchorsForEntity("bob").map(({ occurrenceId, role }) => [occurrenceId, role]),
    [["meeting", "object"]],
  );

  assert.deepEqual(
    index.constraintsForOccurrences(["meeting"]).map(({ canonicalId, occurrenceId }) => [
      canonicalId,
      occurrenceId,
    ]),
    [
      ["alice", "meeting"],
      ["bob", "meeting"],
    ],
  );
});

test("one entity can retain distinct anchors from multiple placed occurrences", () => {
  const index = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
      {
        id: "copenhagen",
        geometry: { type: "Point", coordinates: [12.5683, 55.6761] },
      },
    ],
    [
      relationship({
        id: "stockholm-meeting",
        subjectId: "alice",
        objectId: "bob",
        placeId: "stockholm",
      }),
      relationship({
        id: "copenhagen-meeting",
        subjectId: "alice",
        objectId: "charlie",
        placeId: "copenhagen",
      }),
    ],
  );

  const anchors = index.anchorsForEntity("alice");

  assert.deepEqual(
    anchors.map(({ occurrenceId, anchor }) => [occurrenceId, anchor.placeId]),
    [
      ["copenhagen-meeting", "copenhagen"],
      ["stockholm-meeting", "stockholm"],
    ],
  );

  const constraints = index.constraintsForOccurrences([
    "stockholm-meeting",
    "copenhagen-meeting",
  ]);

  assert.equal(
    constraints.filter(({ canonicalId }) => canonicalId === "alice").length,
    2,
  );
});

test("unplaced occurrences do not acquire invented geographic anchors", () => {
  const index = new SpatialAnchorIndex(
    [],
    [
      relationship({
        id: "unplaced",
        subjectId: "alice",
        objectId: "bob",
      }),
    ],
  );

  assert.equal(index.anchorForOccurrence("unplaced"), undefined);
  assert.deepEqual(index.anchorsForEntity("alice"), []);
  assert.deepEqual(index.constraintsForOccurrences(["unplaced"]), []);
});

test("SpatialAnchorIndex rejects unresolved place references and unknown occurrence queries", () => {
  assert.throws(
    () =>
      new SpatialAnchorIndex(
        [],
        [
          relationship({
            id: "bad-place",
            placeId: "missing-place",
          }),
        ],
      ),
    /unknown place/,
  );

  const index = new SpatialAnchorIndex([], []);
  assert.throws(() => index.constraintsForOccurrences(["missing"]), /Unknown occurrence ID/);
});

test("polygon representative position is derived without mutating canonical geometry", () => {
  const geometry = Object.freeze({
    type: "Polygon",
    coordinates: Object.freeze([
      Object.freeze([
        Object.freeze([17.9, 59.2]),
        Object.freeze([18.2, 59.2]),
        Object.freeze([18.2, 59.4]),
        Object.freeze([17.9, 59.4]),
        Object.freeze([17.9, 59.2]),
      ]),
    ]),
  });

  const before = JSON.stringify(geometry);
  const [longitude, latitude] = representativeGeographicPosition(geometry);

  assert.ok(longitude > 17.9 && longitude < 18.2);
  assert.ok(latitude > 59.2 && latitude < 59.4);
  assert.equal(JSON.stringify(geometry), before);
});

test("place presentation labels follow anchors without becoming topology", () => {
  const index = new SpatialAnchorIndex(
    [
      {
        id: "stockholm",
        label: "Stockholm",
        geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      },
    ],
    [relationship({ id: "meeting", placeId: "stockholm" })],
  );

  assert.equal(index.anchorForOccurrence("meeting")?.label, "Stockholm");
  assert.equal(index.place("stockholm")?.label, "Stockholm");
});
