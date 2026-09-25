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
  let deckProps = null;
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
    createIconLayer(props) {
      return { type: "icon", props };
    },
    createDeck(props) {
      deckProps = props;
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
    getDeckProps() {
      return deckProps;
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

function parallelProjection() {
  const source = instance(0, { visualWeight: 1 });
  const target = instance(1);
  return createWorldProjection({
    instances: [source, target],
    edges: [
      createProjectedWorldEdge({
        id: "alpha",
        label: "knows",
        sourceInstanceId: source.id,
        targetInstanceId: target.id,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
      createProjectedWorldEdge({
        id: "beta",
        label: "supports",
        sourceInstanceId: source.id,
        targetInstanceId: target.id,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
      createProjectedWorldEdge({
        id: "gamma",
        label: "reports to",
        sourceInstanceId: target.id,
        targetInstanceId: source.id,
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

test("empty world skips the deck.gl text atlas", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(createWorldProjection({ instances: [], edges: [] }));

  assert.equal(
    layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels),
    undefined,
    "an empty visible label set must not instantiate TextLayer with a zero-sized auto atlas",
  );
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

test("place anchors render through the node marker path", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const placeIcons = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.placeIcons);
  assert.ok(placeIcons, "place icon layer is rendered when IconLayer is available");
  assert.equal(placeIcons.type, "icon");
  assert.ok(placeIcons.props.data.length > 0);

  const datum = placeIcons.props.data[0];
  const marker = placeIcons.props.getIcon(datum);
  const renderedPosition = placeIcons.props.getPosition(datum);
  assert.ok(marker.id.includes("pin"));
  assert.ok(marker.id.includes("place"));
  // Visual marker size respects authored geometry (default pin radius 12 + border 2 = 30px).
  // The separate >=44px hit target is handled by the scatter layer, not the icon size.
  assert.equal(placeIcons.props.getSize(datum), 30);
  assert.equal(
    placeIcons.props.parameters.depthCompare,
    "always",
    "near-side place markers share the entity marker depth behavior",
  );
  assert.equal(renderedPosition[0], datum.position[0]);
  assert.equal(renderedPosition[1], datum.position[1]);
  assert.ok(
    renderedPosition[2] > datum.position[2],
    "place icon is lifted slightly above the canonical globe surface",
  );
  assert.ok(
    renderedPosition[2] - datum.position[2] < 20_000,
    "place icon lift stays presentation-small at the working zoom",
  );
});

test("place marker rendering uses the authored icon, fill, border, width, and shape", () => {
  const h = harness();
  const styled = instance(0, {
    geographicAnchors: [
      {
        placeId: "styled-place",
        label: "Styled place",
        longitude: 12,
        latitude: 41,
        influence: 1,
        style: {
          marker: {
            fillColor: "#123456",
            color: "#abcdef",
            weight: 4,
            size: 32,
            shape: "square",
            icon: "crown",
          },
        },
      },
    ],
  });
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(createWorldProjection({ instances: [styled], edges: [] }));

  const placeIcons = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.placeIcons);
  assert.ok(placeIcons);
  const datum = placeIcons.props.data.find((candidate) => candidate.placeId === "styled-place");
  assert.ok(datum);
  const marker = placeIcons.props.getIcon(datum);
  assert.ok(
    marker.id.startsWith("lum-node:square|#123456|#abcdef|4|16|crown|"),
    `authored marker visual tuple must remain authoritative: ${marker.id}`,
  );
});

test("entity and place labels come from renderer-neutral WorldProjection metadata", () => {
  const h = harness();
  // Close zoom: these fixtures sit 0.5 degrees apart, which screen-space
  // declutter would (correctly) merge at regional zooms.
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 9 });
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
    [
      worldInstanceId("entity-0", "occurrence-0"),
      worldInstanceId("entity-1", "occurrence-0"),
    ].sort(),
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
  assert.equal(labels.props.parameters.cullMode, "none", "globe back-face culling keeps glyphs");
});

test("detail zoom repositions co-located semantic labels before hiding them", () => {
  const h = harness();
  const source = instance(0, {
    geographicAnchors: [
      {
        placeId: "shared",
        label: "Shared place",
        longitude: 10,
        latitude: 50,
        influence: 1,
      },
    ],
  });
  const target = instance(1, {
    geographicAnchors: [
      {
        placeId: "shared",
        label: "Shared place",
        longitude: 10,
        latitude: 50,
        influence: 1,
      },
    ],
  });
  const surface = new DeckWorldSurface({}, h.runtime, {
    ...WORKING_CAMERA,
    longitude: 10,
    latitude: 50,
    zoom: 9,
  });
  surface.setProjection(
    createWorldProjection({
      instances: [source, target],
      edges: [
        createProjectedWorldEdge({
          id: "shared-edge",
          label: "connected to",
          sourceInstanceId: source.id,
          targetInstanceId: target.id,
          temporalWeight: 1,
          visible: true,
          retained: false,
        }),
      ],
    }),
  );

  const labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const data = labels.props.data;
  assert.equal(data.filter((datum) => datum.kind === "entity-label").length, 2);
  assert.equal(data.filter((datum) => datum.kind === "place-label").length, 1);
  assert.equal(data.filter((datum) => datum.kind === "relationship-label").length, 1);

  const offsets = data.map((datum) => labels.props.getPixelOffset(datum).join(":"));
  assert.ok(new Set(offsets).size >= 3, "colliding semantic labels use alternate placements");
  assert.equal(labels.props.getTextAnchor, "middle");
});

test("dense detail scenes keep only collision-free labels and reveal interaction context", () => {
  const h = harness();
  const instances = Array.from({ length: 24 }, (_, index) =>
    instance(index, {
      geographicAnchors: [
        {
          placeId: `dense-place-${index}`,
          label: `Dense place ${index}`,
          longitude: 10,
          latitude: 50,
          influence: 1,
        },
      ],
      localOffset: { eastMeters: 0, northMeters: 0 },
    }),
  );
  const surface = new DeckWorldSurface({}, h.runtime, {
    ...WORKING_CAMERA,
    longitude: 10,
    latitude: 50,
    zoom: 9,
  });
  surface.setProjection(createWorldProjection({ instances, edges: [] }));

  const labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const visibleEntityIds = new Set(
    labels.props.data
      .filter((datum) => datum.kind === "entity-label")
      .map((datum) => datum.entityId),
  );
  assert.ok(
    labels.props.data.length < instances.length * 2,
    "detail zoom no longer forces overlapping labels back into the scene",
  );

  const hidden = instances.find((candidate) => !visibleEntityIds.has(candidate.canonicalId));
  assert.ok(hidden, "dense co-located fixture leaves at least one optional entity label hidden");

  surface.setSelection({ kind: "entity", id: hidden.canonicalId });
  const selectedLabels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.ok(
    selectedLabels.some(
      (datum) => datum.kind === "entity-label" && datum.entityId === hidden.canonicalId,
    ),
    "selection still reveals a suppressed label without restoring the surrounding clutter",
  );
});

test("large marker labels clear the rendered node footprint", () => {
  const h = harness();
  const large = instance(0, {
    style: { radius: 32 },
    geographicAnchors: [],
  });
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 9 });
  surface.setProjection(createWorldProjection({ instances: [large], edges: [] }));

  const layers = h.lastLayers();
  const icons = layer(layers, DECK_WORLD_LAYER_IDS.entityIcons);
  const labels = layer(layers, DECK_WORLD_LAYER_IDS.labels);
  const entity = icons.props.data[0];
  const labelDatum = labels.props.data.find((datum) => datum.kind === "entity-label");
  assert.ok(labelDatum);
  const markerRadius = icons.props.getSize(entity) / 2;
  const [x, y] = labels.props.getPixelOffset(labelDatum);
  assert.ok(
    Math.hypot(x, y) > markerRadius + 8,
    "label placement derives clearance from the actual marker instead of a fixed 32px offset",
  );
});

test("clustered overview replaces nearby member labels with aggregate context", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
  surface.setProjection(directedProjection());

  const labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  assert.ok(labels.props.data.length > 0);
  assert.ok(
    labels.props.data.every((datum) => datum.kind === "cluster-label"),
    "collapsed nearby places expose aggregate context instead of duplicating member labels",
  );
  assert.ok(
    labels.props.data.some(
      (datum) => datum.text.includes("2 places") && datum.text.includes("2 nodes"),
    ),
  );
});

test("same-place overview retains members at the cluster origin while hiding member topology", () => {
  const h = harness();
  const source = instance(0, {
    geographicAnchors: [
      {
        placeId: "shared-place",
        label: "Shared place",
        longitude: 10,
        latitude: 50,
        influence: 1,
      },
    ],
    localOffset: { eastMeters: -500, northMeters: 0 },
  });
  const target = instance(1, {
    geographicAnchors: [
      {
        placeId: "shared-place",
        label: "Shared place",
        longitude: 10,
        latitude: 50,
        influence: 1,
      },
    ],
    localOffset: { eastMeters: 500, northMeters: 0 },
  });
  const surface = new DeckWorldSurface({}, h.runtime, {
    ...WORKING_CAMERA,
    longitude: 10,
    latitude: 50,
    zoom: 0.2,
  });
  surface.setProjection(
    createWorldProjection({
      instances: [source, target],
      edges: [
        createProjectedWorldEdge({
          id: "shared-edge",
          label: "met",
          sourceInstanceId: source.id,
          targetInstanceId: target.id,
          temporalWeight: 1,
          visible: true,
          retained: false,
        }),
      ],
    }),
  );

  const layers = h.lastLayers();
  const entities = layer(layers, DECK_WORLD_LAYER_IDS.entities);
  const clusters = entities.props.data.filter((datum) => datum.kind === "cluster");
  const retainedMembers = entities.props.data.filter((datum) => datum.kind === "entity");
  assert.equal(clusters.length, 1);
  assert.equal(retainedMembers.length, 2);
  assert.ok(entities.props.getRadius(clusters[0]) > 0);
  assert.deepEqual(
    retainedMembers.map((datum) => entities.props.getRadius(datum)),
    [0, 0],
    "member hit bodies are retained but not exposed while collapsed",
  );

  const relationships = layer(layers, DECK_WORLD_LAYER_IDS.relationships);
  assert.equal(relationships.props.data.length, 1);
  assert.equal(relationships.props.getWidth(relationships.props.data[0]), 0);
  const path = relationships.props.getPath(relationships.props.data[0]);
  assert.deepEqual(path[0], path.at(-1), "edge endpoints collapse to the shared place origin");

  const labels = layer(layers, DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.equal(
    labels.some((datum) => datum.kind === "entity-label"),
    false,
  );
  assert.equal(
    labels.some((datum) => datum.kind === "relationship-label"),
    false,
  );
  assert.equal(
    labels.some((datum) => datum.kind === "place-label"),
    false,
    "collapsed place members use one aggregate label instead of duplicating the place name",
  );
  assert.ok(
    labels.some((datum) => datum.kind === "cluster-label" && datum.text.includes("2 nodes")),
    "collapsed topology exposes aggregate cluster context",
  );
});

test("a lone relationship remains visually straight on fixed sampled path topology", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const relationships = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationships);
  const [datum] = relationships.props.data;
  const path = relationships.props.getPath(datum);
  assert.equal(path.length, 9, "straight and curved paths share interpolation topology");

  const source = path[0];
  const midpoint = path[4];
  const target = path.at(-1);
  assert.ok(source);
  assert.ok(midpoint);
  assert.ok(target);
  assert.ok(Math.abs(midpoint[0] - (source[0] + target[0]) / 2) < 1e-9);
  assert.ok(Math.abs(midpoint[1] - (source[1] + target[1]) / 2) < 1e-9);
});

test("parallel and reciprocal relationships fan into distinct curved paths with labels and arrows", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 9 });
  surface.setProjection(parallelProjection());

  const layers = h.lastLayers();
  const relationships = layer(layers, DECK_WORLD_LAYER_IDS.relationships);
  const paths = new Map(
    relationships.props.data.map((datum) => [
      datum.relationshipId,
      relationships.props.getPath(datum),
    ]),
  );
  assert.equal(paths.size, 3);
  assert.equal(new Set([...paths.values()].map((path) => path.length)).size, 1);
  assert.equal(paths.get("alpha").length, 9);

  const alpha = paths.get("alpha");
  const beta = paths.get("beta");
  const gamma = paths.get("gamma");
  assert.ok(alpha && beta && gamma);
  assert.deepEqual(gamma[0], alpha.at(-1), "reciprocal edge starts at its canonical source");
  assert.deepEqual(gamma.at(-1), alpha[0], "reciprocal edge ends at its canonical target");

  const straightMidpoint = [
    (alpha[0][0] + alpha.at(-1)[0]) / 2,
    (alpha[0][1] + alpha.at(-1)[1]) / 2,
  ];
  const midpoints = [alpha[4], beta[4], gamma[4]];
  assert.equal(
    new Set(midpoints.map((point) => `${point[0].toFixed(9)}:${point[1].toFixed(9)}`)).size,
    3,
    "every parallel relationship owns a distinct curve lane",
  );
  for (const midpoint of midpoints) {
    assert.ok(
      Math.hypot(midpoint[0] - straightMidpoint[0], midpoint[1] - straightMidpoint[1]) > 1e-9,
      "no relationship remains on the overlapping straight centre line",
    );
  }

  const labels = layer(layers, DECK_WORLD_LAYER_IDS.labels).props.data.filter(
    (datum) => datum.kind === "relationship-label",
  );
  for (const labelDatum of labels) {
    const path = paths.get(labelDatum.relationshipId);
    assert.ok(path);
    assert.deepEqual(labelDatum.position, path[4], "label follows its own curved edge midpoint");
  }

  const directions = layer(layers, DECK_WORLD_LAYER_IDS.relationshipDirections);
  const arrowApexes = directions.props.data.map((datum) => directions.props.getPath(datum)[1]);
  assert.equal(
    new Set(arrowApexes.map((point) => `${point[0].toFixed(9)}:${point[1].toFixed(9)}`)).size,
    3,
    "direction markers follow the separate curve tangents",
  );
  assert.equal(relationships.props.transitions, undefined);
});

test("each rendered directed relationship has a visible marker preserving source/target identity", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const layers = h.lastLayers();
  const relationshipLayer = layer(layers, DECK_WORLD_LAYER_IDS.relationships);
  const relationships = relationshipLayer.props.data;
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
  const edgePath = relationshipLayer.props.getPath(relationships[0]);
  const source = edgePath[0];
  const target = edgePath.at(-1);
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const [wingA, apex, wingB] = markers.props.getPath(marker);
  assert.ok(distance(apex, target) < distance(apex, source));
  assert.ok(distance(wingA, source) < distance(apex, source));
  assert.ok(distance(wingB, source) < distance(apex, source));
  assert.notDeepEqual(wingA, wingB);
});

test("direction marker clears the target marker footprint", () => {
  const clearanceFor = (targetStyle) => {
    const h = harness();
    const source = instance(0, { visualWeight: 1 });
    const target = instance(1, { style: targetStyle });
    const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 8 });
    surface.setProjection(
      createWorldProjection({
        instances: [source, target],
        edges: [
          createProjectedWorldEdge({
            id: "clearance",
            label: "met",
            sourceInstanceId: source.id,
            targetInstanceId: target.id,
            temporalWeight: 1,
            visible: true,
            retained: false,
          }),
        ],
      }),
    );
    const directions = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections);
    const marker = directions.props.data[0];
    const [wingA, apex, wingB] = directions.props.getPath(marker);
    const relationship = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationships);
    const edge = relationship.props.data[0];
    const targetPosition = relationship.props.getPath(edge).at(-1);
    const distanceToTarget = Math.hypot(apex[0] - targetPosition[0], apex[1] - targetPosition[1]);
    return {
      targetClearanceDegrees: marker.targetClearanceDegrees,
      distanceToTarget,
      wingA,
      wingB,
    };
  };

  const ordinary = clearanceFor(undefined);
  const large = clearanceFor({ radius: 32 });
  assert.ok(large.targetClearanceDegrees > ordinary.targetClearanceDegrees);
  assert.ok(
    large.distanceToTarget > ordinary.distanceToTarget,
    "larger target nodes push the arrow apex farther from the node center",
  );
  assert.notDeepEqual(large.wingA, large.wingB);
});

test("interactive zoom refreshes world-space arrow geometry before LOD thresholds", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 7 });
  surface.setProjection(directedProjection());

  const beforeLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections);
  const before = beforeLayer.props.data[0].arrowLengthDegrees;

  surface.setCamera({ ...WORKING_CAMERA, zoom: 7.04 });

  const afterLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections);
  const after = afterLayer.props.data[0].arrowLengthDegrees;
  assert.ok(after < before, "zooming in refreshes the angular arrow size");
  assert.ok(
    Math.abs(after / before - 2 ** -0.04) < 0.01,
    "arrow geometry tracks the pixel-sized node scale between semantic LOD thresholds",
  );
});

test("direction marker length stays node-relative across camera zoom", () => {
  const markerLength = (zoom) => {
    const h = harness();
    const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom });
    surface.setProjection(directedProjection());
    const marker = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections).props.data[0];
    return marker.arrowLengthDegrees;
  };

  const zoom7 = markerLength(7);
  const zoom8 = markerLength(8);
  assert.ok(zoom7 > 0);
  assert.ok(zoom8 > 0);
  assert.ok(
    Math.abs(zoom7 / zoom8 - 2) < 1e-9,
    "pixel-sized nodes imply halved angular arrow length for each +1 zoom",
  );
});

test("direction marker length and stroke follow the target marker scale", () => {
  const metricsFor = (sourceStyle, targetStyle, edgeStyle) => {
    const h = harness();
    const source = instance(0, { style: sourceStyle, visualWeight: 1 });
    const target = instance(1, { style: targetStyle });
    const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 8 });
    surface.setProjection(
      createWorldProjection({
        instances: [source, target],
        edges: [
          createProjectedWorldEdge({
            id: "scaled",
            label: "met",
            sourceInstanceId: source.id,
            targetInstanceId: target.id,
            temporalWeight: 1,
            visible: true,
            retained: false,
            ...(edgeStyle ? { style: edgeStyle } : {}),
          }),
        ],
      }),
    );
    const directions = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections);
    const marker = directions.props.data[0];
    return {
      width: directions.props.getWidth(marker),
      length: marker.arrowLengthDegrees,
    };
  };

  const ordinary = metricsFor(undefined, undefined);
  const largeSource = metricsFor({ radius: 32 }, undefined);
  const largeTarget = metricsFor(undefined, { radius: 32 });
  const thinEdgeLargeTarget = metricsFor(undefined, { radius: 32 }, { width: 0.5 });

  assert.ok(
    Math.abs(largeSource.length - ordinary.length) < 1e-12,
    "source-node size does not distort a marker terminating at the target",
  );
  assert.ok(largeTarget.length > ordinary.length, "target-node size controls chevron length");
  assert.ok(largeTarget.width > ordinary.width, "target-node size controls chevron stroke");
  assert.ok(
    thinEdgeLargeTarget.width > 1,
    "a thin authored edge cannot force a large target-relative chevron into a hairline stroke",
  );
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

test("hover and selection surface omitted entity labels without relocating stable labels", () => {
  const h = harness();
  const projection = denseProjection(1_000);
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 2 });
  surface.setProjection(projection);

  const beforeLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const beforeEntityIds = new Set(
    beforeLayer.props.data
      .filter((datum) => datum.kind === "entity-label")
      .map((datum) => datum.entityId),
  );
  const hidden = projection.instances.find(
    (candidate) => !beforeEntityIds.has(candidate.canonicalId),
  );
  assert.ok(hidden, "dense LOD fixture must omit at least one entity label");

  const beforeGeometry = new Map(
    beforeLayer.props.data.map((datum) => [
      datum.key,
      {
        position: beforeLayer.props.getPosition(datum),
        pixelOffset: beforeLayer.props.getPixelOffset(datum),
      },
    ]),
  );
  const assertStableBaseGeometry = (labelLayer) => {
    for (const [key, geometry] of beforeGeometry) {
      const datum = labelLayer.props.data.find((candidate) => candidate.key === key);
      assert.ok(datum, `${key} remains visible while an interaction label is appended`);
      assert.deepEqual(
        {
          position: labelLayer.props.getPosition(datum),
          pixelOffset: labelLayer.props.getPixelOffset(datum),
        },
        geometry,
        `${key} keeps its stable declutter placement`,
      );
    }
  };

  surface.setSelection({ kind: "entity", id: hidden.canonicalId });
  let interactionLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  assert.ok(
    interactionLayer.props.data.some(
      (datum) => datum.kind === "entity-label" && datum.entityId === hidden.canonicalId,
    ),
    "selected node receives a label even when ordinary dense LOD suppressed it",
  );
  assertStableBaseGeometry(interactionLayer);

  surface.setSelection(null);
  h.getDeckProps().onHover({
    object: {
      kind: "entity",
      entityId: hidden.canonicalId,
      worldInstanceId: hidden.id,
    },
  });
  interactionLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  assert.ok(
    interactionLayer.props.data.some(
      (datum) => datum.kind === "entity-label" && datum.entityId === hidden.canonicalId,
    ),
    "hovered node receives a label even when ordinary dense LOD suppressed it",
  );
  assertStableBaseGeometry(interactionLayer);
});

test("clustered overview reveals aggregate and location context on interaction", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
  surface.setProjection(denseProjection(200));

  let labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.equal(
    labels.some((datum) => datum.kind === "entity-label"),
    false,
  );
  assert.equal(
    labels.some((datum) => datum.kind === "relationship-label"),
    false,
  );
  assert.ok(
    labels.some((datum) => datum.kind === "cluster-label"),
    "collapsed overview presents cluster summaries",
  );

  surface.setSelection({ kind: "entity", id: "entity-150" });
  labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.equal(
    labels.some((datum) => datum.kind === "entity-label"),
    false,
    "clustered member geometry remains suppressed",
  );
  assert.ok(
    labels.some((datum) => datum.kind === "place-label" && datum.text === "Place 0"),
    "selected clustered nodes reveal their canonical location",
  );
  assert.ok(
    labels.some((datum) => datum.kind === "cluster-label" && datum.emphasized),
    "the selected node's aggregate context is emphasized",
  );

  surface.setSelection(null);
  const cluster = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.entities).props.data.find(
    (datum) => datum.kind === "cluster",
  );
  assert.ok(cluster);
  h.getDeckProps().onHover({ object: cluster });
  const hovered = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data.find(
    (datum) => datum.kind === "cluster-label" && datum.clusterId === cluster.clusterId,
  );
  assert.ok(hovered);
  assert.equal(hovered.emphasized, true, "hover reveals the cluster summary");
});

test("inactive relationships mute until their connected neighborhood is emphasized", () => {
  const h = harness();
  const source = instance(0, { style: { fill: "#123456" }, visualWeight: 1 });
  const target = instance(1);
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(
    createWorldProjection({
      instances: [source, target],
      edges: [
        createProjectedWorldEdge({
          id: "hierarchy",
          label: "met",
          sourceInstanceId: source.id,
          targetInstanceId: target.id,
          temporalWeight: 1,
          visible: true,
          retained: false,
        }),
      ],
    }),
  );

  let relationships = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationships);
  let edge = relationships.props.data[0];
  const inactive = relationships.props.getColor(edge);
  assert.equal(inactive[3], 72, "ordinary edges stay visually subordinate");

  h.getDeckProps().onHover({
    object: {
      kind: "entity",
      entityId: source.canonicalId,
      worldInstanceId: source.id,
    },
  });

  relationships = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationships);
  edge = relationships.props.data[0];
  const emphasized = relationships.props.getColor(edge);
  assert.deepEqual(emphasized.slice(0, 3), [18, 52, 86]);
  assert.ok(emphasized[3] > inactive[3], "hover restores the semantic edge emphasis");
});

test("hover changes label color only and never invokes renderer transitions", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const beforeLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const beforeByKey = new Map(beforeLayer.props.data.map((datum) => [datum.key, datum]));
  const beforeGeometry = new Map(
    beforeLayer.props.data.map((datum) => [
      datum.key,
      {
        position: beforeLayer.props.getPosition(datum),
        pixelOffset: beforeLayer.props.getPixelOffset(datum),
      },
    ]),
  );
  const hoveredBefore = beforeLayer.props.data.find(
    (datum) => datum.kind === "entity-label" && datum.entityId === "entity-0",
  );
  assert.ok(hoveredBefore);
  const colorBefore = beforeLayer.props.getColor(hoveredBefore);

  h.getDeckProps().onHover({
    object: {
      kind: "entity",
      entityId: "entity-0",
      worldInstanceId: worldInstanceId("entity-0", "occurrence-0"),
    },
  });

  const afterLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const hoveredAfter = afterLayer.props.data.find(
    (datum) => datum.kind === "entity-label" && datum.entityId === "entity-0",
  );
  assert.equal(hoveredAfter, hoveredBefore, "hover preserves label datum identity");

  for (const datum of afterLayer.props.data) {
    assert.equal(datum, beforeByKey.get(datum.key), `${datum.key} datum identity stays stable`);
    assert.deepEqual(
      {
        position: afterLayer.props.getPosition(datum),
        pixelOffset: afterLayer.props.getPixelOffset(datum),
      },
      beforeGeometry.get(datum.key),
      `${datum.key} label geometry stays stable on hover`,
    );
  }

  assert.notDeepEqual(afterLayer.props.getColor(hoveredAfter), colorBefore);
  assert.equal(
    afterLayer.props.transitions,
    undefined,
    "hover emphasis must not invoke renderer transitions",
  );
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
    (datum) =>
      datum.kind === "entity-label" && datum.worldInstanceId === entityBefore.worldInstanceId,
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
  assert.deepEqual(snapshot.entities.map((entity) => entity.label).sort(), [
    "Entity 0",
    "Entity 1",
  ]);
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
  assert.deepEqual(
    layer(layers, DECK_WORLD_LAYER_IDS.labels).props.getPosition(label),
    entity.position,
  );
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

test("the live region announces the selected object's projection label", () => {
  const h = harness();
  const region = { textContent: "" };
  const container = {
    ownerDocument: {
      createElement() {
        return {
          setAttribute() {},
          set textContent(value) {
            region.textContent = value;
          },
          get textContent() {
            return region.textContent;
          },
          remove() {},
        };
      },
    },
    appendChild() {},
  };
  const surface = new DeckWorldSurface(container, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());
  surface.setSelection({ kind: "relationship", id: "meeting" });

  assert.match(region.textContent, /Selected relationship meeting \(met\)\./);
});

function chainProjection(count) {
  const instances = [];
  const edges = [];
  for (let index = 0; index < count; index += 1) {
    instances.push(instance(index));
    if (index > 0) {
      edges.push(
        createProjectedWorldEdge({
          id: `edge-${index}`,
          label: "next",
          sourceInstanceId: instances[index - 1].id,
          targetInstanceId: instances[index].id,
          temporalWeight: index === 1 ? 1 : 0.2,
          visible: true,
          retained: false,
        }),
      );
    }
  }
  return createWorldProjection({ instances, edges });
}

test("selection changes label color without changing label membership or placement", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 1 });
  surface.setProjection(chainProjection(2_000));

  const beforeLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const before = beforeLayer.props.data;
  const beforeGeometry = before.map((datum) => ({
    key: datum.key,
    position: beforeLayer.props.getPosition(datum),
    pixelOffset: beforeLayer.props.getPixelOffset(datum),
  }));
  const selectedBefore = before.find(
    (datum) => datum.kind === "entity-label" && datum.entityId === "entity-0",
  );
  const incidentBefore = before.find(
    (datum) => datum.kind === "relationship-label" && datum.relationshipId === "edge-1",
  );
  assert.ok(selectedBefore);
  assert.ok(incidentBefore);
  const selectedColorBefore = beforeLayer.props.getColor(selectedBefore);
  const incidentColorBefore = beforeLayer.props.getColor(incidentBefore);

  surface.setSelection({ kind: "entity", id: "entity-0" });

  const afterLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const after = afterLayer.props.data;
  assert.deepEqual(
    after.map((datum) => ({
      key: datum.key,
      position: afterLayer.props.getPosition(datum),
      pixelOffset: afterLayer.props.getPixelOffset(datum),
    })),
    beforeGeometry,
    "selection must not perturb label LOD or declutter geometry",
  );

  const selectedAfter = after.find(
    (datum) => datum.kind === "entity-label" && datum.entityId === "entity-0",
  );
  const incidentAfter = after.find(
    (datum) => datum.kind === "relationship-label" && datum.relationshipId === "edge-1",
  );
  assert.equal(selectedAfter, selectedBefore, "selection reuses the same selected label datum");
  assert.equal(incidentAfter, incidentBefore, "selection reuses the same incident label datum");
  assert.notDeepEqual(afterLayer.props.getColor(selectedAfter), selectedColorBefore);
  assert.notDeepEqual(afterLayer.props.getColor(incidentAfter), incidentColorBefore);
});

test("dense direction-marker LOD is selection-stable while explicit focus may pin an edge", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 1 });
  surface.setProjection(chainProjection(2_000));

  const before = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections).props.data;
  const beforeIds = before.map((marker) => marker.relationshipId);
  assert.ok(beforeIds.length < 1_999, "dense marker load is reduced at overview");
  assert.ok(beforeIds.includes("edge-1"), "high-importance edge keeps its marker");

  surface.setSelection({ kind: "relationship", id: "edge-1500" });
  let markers = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections).props.data;
  assert.deepEqual(
    markers.map((marker) => marker.relationshipId),
    beforeIds,
    "selection must not add, remove, or reorder direction markers",
  );

  surface.focusOccurrence("edge-900");
  markers = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections).props.data;
  assert.ok(markers.some((marker) => marker.relationshipId === "edge-900"));

  assert.equal(surface.getAccessibleSnapshot().relationships.length, 1_999);
});

test("zooming across a LOD tier re-renders labels and markers, zooming within one does not", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 1 });
  surface.setProjection(chainProjection(2_000));
  const overviewMarkers = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections).props
    .data.length;
  const renders = h.setProps.filter((props) => props.layers).length;

  surface.setCamera({ ...WORKING_CAMERA, zoom: 1.3 });
  assert.equal(h.setProps.filter((props) => props.layers).length, renders);

  surface.setCamera({ ...WORKING_CAMERA, zoom: 6.5 });
  const detailMarkers = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections).props
    .data.length;
  assert.ok(detailMarkers > overviewMarkers);
});
