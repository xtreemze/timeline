import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createDeckWorldRuntime } from "../site/world/deck-world-runtime.ts";
import { DECK_WORLD_LAYER_IDS, DeckWorldSurface } from "../site/world/deck-world-surface.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function harness() {
  const setProps = [];
  let pickResult = null;
  const pickOptions = [];
  const runtime = {
    createGlobeView(props) {
      return { type: "globe", props };
    },
    createScatterplotLayer(props) {
      return { type: "scatter", props };
    },
    createPathLayer(props) {
      return { type: "path", props };
    },
    createTextLayer(props) {
      return { type: "text", props };
    },
    createDeck() {
      return {
        setProps(props) {
          setProps.push(props);
        },
        pickObject(options) {
          pickOptions.push(options);
          return pickResult;
        },
        getViewports() {
          return [];
        },
        redraw() {},
        finalize() {},
      };
    },
  };
  return {
    runtime,
    setProps,
    pickOptions,
    setPickResult(value) {
      pickResult = value;
    },
    lastLayers() {
      return setProps.filter((props) => props.layers).at(-1).layers;
    },
  };
}

function layer(layers, id) {
  return layers.find((candidate) => candidate.props.id === id);
}

function instance(index, overrides = {}) {
  const entity = `entity-${index}`;
  const occurrence = `occurrence-${Math.floor(index / 2)}`;
  return createProjectedWorldInstance({
    id: worldInstanceId(entity, occurrence),
    canonicalId: entity,
    label: `Entity ${index}`,
    kind: "person",
    occurrenceId: occurrence,
    geographicAnchors: [
      {
        placeId: `place-${index % 3}`,
        label: `Place ${index % 3}`,
        longitude: 10 + (index % 50) * 0.5,
        latitude: 40 + Math.floor(index / 50) * 0.5,
        influence: 1,
      },
    ],
    temporalWeight: 1,
    visualWeight: 0.1,
    retained: false,
    visualAltitude: 1000,
    ...overrides,
  });
}

function directedProjection() {
  const source = instance(0, { visualWeight: 1 });
  const target = instance(1);
  return createWorldProjection({
    instances: [source, target],
    edges: [
      createProjectedWorldEdge({
        id: "meeting",
        label: "met",
        sourceInstanceId: source.id,
        targetInstanceId: target.id,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });
}

function denseProjection(count) {
  const instances = [];
  for (let index = 0; index < count; index += 1) {
    instances.push(instance(index, index === 0 ? { visualWeight: 1 } : {}));
  }
  return createWorldProjection({ instances, edges: [] });
}

const WORKING_CAMERA = Object.freeze({
  longitude: 12,
  latitude: 41,
  zoom: 5,
  bearing: 0,
  pitch: 20,
});

test("production bindings and runtime expose a real deck.gl TextLayer path", async () => {
  const bindings = await readFile(
    new URL("../site/world/deck-world-bindings.ts", import.meta.url),
    "utf8",
  );
  assert.match(bindings, /import \{[^}]*\bTextLayer\b[^}]*\} from "@deck\.gl\/layers"/);
  assert.match(bindings, /textLayer\(props\)[\s\S]*new TextLayer\(/);

  const created = [];
  const runtime = createDeckWorldRuntime({
    deck: () => ({}),
    globeView: () => ({}),
    scatterplotLayer: () => ({}),
    pathLayer: () => ({}),
    textLayer: (props) => {
      created.push(props);
      return { type: "text", props };
    },
  });
  assert.equal(typeof runtime.createTextLayer, "function");
  runtime.createTextLayer({ id: "labels" });
  assert.deepEqual(created, [{ id: "labels" }]);
});

test("entity and place labels come from renderer-neutral WorldProjection metadata", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  assert.ok(labels, "a semantic label layer is rendered");
  assert.equal(labels.type, "text");

  const entityLabels = labels.props.data.filter((datum) => datum.kind === "entity-label");
  assert.deepEqual(entityLabels.map((datum) => labels.props.getText(datum)).sort(), [
    "Entity 0",
    "Entity 1",
  ]);
  assert.deepEqual(
    entityLabels.map((datum) => datum.worldInstanceId).sort(),
    [worldInstanceId("entity-0", "occurrence-0"), worldInstanceId("entity-1", "occurrence-0")].sort(),
  );

  const placeLabels = labels.props.data.filter((datum) => datum.kind === "place-label");
  assert.deepEqual(placeLabels.map((datum) => labels.props.getText(datum)).sort(), [
    "Place 0",
    "Place 1",
  ]);

  const relationshipLabels = labels.props.data.filter(
    (datum) => datum.kind === "relationship-label",
  );
  assert.deepEqual(
    relationshipLabels.map((datum) => labels.props.getText(datum)),
    ["met"],
  );
  assert.equal(labels.props.pickable, false, "labels never steal picks from world objects");
});

test("each rendered directed relationship has a visible marker preserving source/target identity", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const layers = h.lastLayers();
  const relationships = layer(layers, DECK_WORLD_LAYER_IDS.relationships).props.data;
  const markers = layer(layers, DECK_WORLD_LAYER_IDS.relationshipDirections);
  assert.ok(markers, "a relationship direction layer is rendered");
  assert.equal(markers.props.data.length, relationships.length);

  const [marker] = markers.props.data;
  assert.equal(marker.kind, "relationship-direction");
  assert.equal(marker.relationshipId, "meeting");
  assert.equal(marker.sourceInstanceId, worldInstanceId("entity-0", "occurrence-0"));
  assert.equal(marker.targetInstanceId, worldInstanceId("entity-1", "occurrence-0"));
  assert.equal(marker.sourceEntityId, "entity-0");
  assert.equal(marker.targetEntityId, "entity-1");

  // The arrowhead apex points at the target: it lies closer to the target
  // than to the source, and both wings trail behind it toward the source.
  const [source, target] = relationships[0].path;
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const [wingA, apex, wingB] = markers.props.getPath(marker);
  assert.ok(distance(apex, target) < distance(apex, source));
  assert.ok(distance(wingA, source) < distance(apex, source));
  assert.ok(distance(wingB, source) < distance(apex, source));
  assert.notDeepEqual(wingA, wingB);
});

test("picking a direction marker resolves to its canonical relationship", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());
  const marker = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections).props.data[0];

  h.setPickResult({ object: marker, x: 10, y: 10 });
  assert.deepEqual(surface.pick({ x: 10, y: 10 }), {
    kind: "relationship",
    relationshipId: "meeting",
  });
  assert.ok(h.pickOptions.at(-1).layerIds.includes(DECK_WORLD_LAYER_IDS.relationshipDirections));
});

test("label LOD reduces dense entity text but retains important, selected, and focused labels", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 2 });
  surface.setProjection(denseProjection(1_000));
  surface.setSelection({ kind: "entity", id: "entity-777" });
  surface.focusEntity("entity-555");

  const labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  const entityIds = labels
    .filter((datum) => datum.kind === "entity-label")
    .map((datum) => datum.entityId);
  assert.ok(entityIds.length > 0);
  assert.ok(entityIds.length < 1_000, "dense label load is reduced");
  assert.ok(entityIds.includes("entity-0"), "high-importance label survives LOD");
  assert.ok(entityIds.includes("entity-777"), "selected label survives LOD");
  assert.ok(entityIds.includes("entity-555"), "focused label survives LOD");
});

test("clustered overview hides individual labels except selected/focused ones", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
  surface.setProjection(denseProjection(200));
  surface.setSelection({ kind: "entity", id: "entity-150" });

  const labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  const entityIds = labels
    .filter((datum) => datum.kind === "entity-label")
    .map((datum) => datum.entityId);
  assert.deepEqual(entityIds, ["entity-150"]);
});

test("label and marker datums keep object identity across unrelated re-renders", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());
  const before = h.lastLayers();

  surface.setSelection({ kind: "place", id: "place-0" });
  const after = h.lastLayers();

  const labelsBefore = layer(before, DECK_WORLD_LAYER_IDS.labels).props.data;
  const labelsAfter = layer(after, DECK_WORLD_LAYER_IDS.labels).props.data;
  const entityBefore = labelsBefore.find((datum) => datum.kind === "entity-label");
  const entityAfter = labelsAfter.find(
    (datum) => datum.kind === "entity-label" && datum.worldInstanceId === entityBefore.worldInstanceId,
  );
  assert.equal(entityAfter, entityBefore);

  const markerBefore = layer(before, DECK_WORLD_LAYER_IDS.relationshipDirections).props.data[0];
  const markerAfter = layer(after, DECK_WORLD_LAYER_IDS.relationshipDirections).props.data[0];
  assert.equal(markerAfter, markerBefore);
});

test("the non-WebGL accessibility snapshot carries the same labels and directed endpoints", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const snapshot = surface.getAccessibleSnapshot();
  assert.deepEqual(
    snapshot.entities.map((entity) => entity.label).sort(),
    ["Entity 0", "Entity 1"],
  );
  assert.deepEqual(snapshot.places.map((place) => place.label).sort(), ["Place 0", "Place 1"]);
  assert.deepEqual(snapshot.relationships, [
    {
      relationshipId: "meeting",
      selected: false,
      label: "met",
      sourceEntityId: "entity-0",
      targetEntityId: "entity-1",
    },
  ]);
});

test("labels follow force-displaced render positions rather than a second placement", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  const displaced = createWorldProjection({
    instances: [
      instance(0, { visualWeight: 1, localOffset: { eastMeters: 500, northMeters: 250 } }),
    ],
    edges: [],
  });
  surface.setProjection(displaced);

  const layers = h.lastLayers();
  const entity = layer(layers, DECK_WORLD_LAYER_IDS.entities).props.data[0];
  const label = layer(layers, DECK_WORLD_LAYER_IDS.labels).props.data.find(
    (datum) => datum.kind === "entity-label",
  );
  assert.deepEqual(layer(layers, DECK_WORLD_LAYER_IDS.labels).props.getPosition(label), entity.position);
});

test("a runtime without text support still renders geometry and direction markers", () => {
  const h = harness();
  delete h.runtime.createTextLayer;
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const layers = h.lastLayers();
  assert.equal(layer(layers, DECK_WORLD_LAYER_IDS.labels), undefined);
  assert.ok(layer(layers, DECK_WORLD_LAYER_IDS.relationshipDirections));
});
