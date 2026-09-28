import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createDeckWorldRuntime } from "../site/world/deck-world-runtime.ts";
import { DECK_WORLD_LAYER_IDS, DeckWorldSurface } from "../site/world/deck-world-surface.ts";
import {
  directedEdgePathArrowhead,
  relationshipEdgePath,
} from "../src/layout/world-semantic-presentation.ts";
import { WORLD_CAMERA_MAX_ZOOM } from "../src/layout/world-spatial-mode.ts";
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
  const other = instance(2);
  return createWorldProjection({
    instances: [source, target, other],
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

function crossingRelationshipProjection() {
  const make = (index, placeId, longitude, latitude) =>
    instance(index, {
      geographicAnchors: [
        {
          placeId,
          label: placeId,
          longitude,
          latitude,
          influence: 1,
        },
      ],
    });
  const northwest = make(100, "crossing-northwest", 11, 42);
  const southeast = make(101, "crossing-southeast", 13, 40);
  const southwest = make(102, "crossing-southwest", 11, 40);
  const northeast = make(103, "crossing-northeast", 13, 42);
  return createWorldProjection({
    instances: [northwest, southeast, southwest, northeast],
    edges: [
      createProjectedWorldEdge({
        id: "diagonal-a",
        label: "crosses southeast",
        sourceInstanceId: northwest.id,
        targetInstanceId: southeast.id,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
      createProjectedWorldEdge({
        id: "diagonal-b",
        label: "crosses northeast",
        sourceInstanceId: southwest.id,
        targetInstanceId: northeast.id,
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

test("interacted label lookup does not feed every hidden member through ordinary label LOD", async () => {
  const source = await readFile(
    new URL("../site/world/deck-world-surface.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /const labelEntities = iconSource;/);
  assert.match(source, /entitiesByEntityId: entityResult\.byEntityId/);
  assert.doesNotMatch(source, /const labelEntities = entityResult\.datums;/);
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
  // Visual marker size is the authored footprint exactly: radius 12 + border 2 = 28px.
  // The separate >=44px hit target is handled by the scatter layer, not the icon size.
  assert.equal(placeIcons.props.getSize(datum), 28);
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

test("selected place labels preserve the authored semantic marker color", () => {
  const h = harness();
  const styled = instance(0, {
    geographicAnchors: [
      {
        placeId: "semantic-place",
        label: "Semantic place",
        longitude: 12,
        latitude: 41,
        influence: 1,
        style: {
          marker: {
            fillColor: "#123456",
            color: "#abcdef",
          },
        },
      },
    ],
  });
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(createWorldProjection({ instances: [styled], edges: [] }));
  surface.setSelection({ kind: "place", id: "semantic-place" });

  const labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const datum = labels.props.data.find(
    (candidate) => candidate.kind === "place-label" && candidate.placeId === "semantic-place",
  );
  assert.ok(datum, "selected place label must remain visible");
  assert.deepEqual(
    labels.props.getColor(datum).slice(0, 3),
    [0x12, 0x34, 0x56],
    "selection must use the place's authored semantic color rather than focus blue",
  );
});

test("place acquisition radius follows the same shape-aware marker footprint", () => {
  const h = harness();
  const styled = instance(0, {
    geographicAnchors: [
      {
        placeId: "diamond-place",
        label: "Diamond place",
        longitude: 12,
        latitude: 41,
        influence: 1,
        style: {
          marker: {
            radius: 24,
            borderWidth: 2,
            shape: "diamond",
            icon: "place",
          },
        },
      },
    ],
  });
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(createWorldProjection({ instances: [styled], edges: [] }));

  const layers = h.lastLayers();
  const placeIcons = layer(layers, DECK_WORLD_LAYER_IDS.placeIcons);
  const places = layer(layers, DECK_WORLD_LAYER_IDS.places);
  const iconDatum = placeIcons.props.data.find(
    (candidate) => candidate.placeId === "diamond-place",
  );
  const placeDatum = places.props.data.find((candidate) => candidate.placeId === "diamond-place");
  assert.ok(iconDatum);
  assert.ok(placeDatum);

  const visibleRadius = placeIcons.props.getSize(iconDatum) / 2;
  const acquisitionRadius = places.props.getRadius(placeDatum);
  assert.ok(visibleRadius > 22, "fixture must exceed the minimum touch target");
  assert.equal(
    acquisitionRadius,
    visibleRadius,
    "large shaped place markers cannot outgrow or undershoot their pick body",
  );
});

test("three very near places share one aggregate marker while readable nodes remain expanded", () => {
  const h = harness();
  const left = instance(0, {
    geographicAnchors: [
      {
        placeId: "near-a",
        label: "Near A",
        longitude: 12,
        latitude: 41,
        influence: 1,
      },
    ],
  });
  const middle = instance(1, {
    geographicAnchors: [
      {
        placeId: "near-b",
        label: "Near B",
        longitude: 12.01,
        latitude: 41,
        influence: 1,
      },
    ],
  });
  const right = instance(2, {
    geographicAnchors: [
      {
        placeId: "near-c",
        label: "Near C",
        longitude: 12.02,
        latitude: 41,
        influence: 1,
      },
    ],
  });
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 8 });
  surface.setProjection(createWorldProjection({ instances: [left, middle, right], edges: [] }));

  const layers = h.lastLayers();
  const entities = layer(layers, DECK_WORLD_LAYER_IDS.entities);
  const aggregate = entities.props.data.find((datum) => datum.kind === "cluster");
  assert.ok(aggregate, "three very near place pins use one aggregate marker");
  assert.deepEqual([...aggregate.placeIds].sort(), ["near-a", "near-b", "near-c"]);
  assert.equal(
    entities.props.data.filter((datum) => datum.kind === "entity").length,
    3,
    "node topology stays expanded because the sparse component fits",
  );
  assert.ok(
    entities.props.data
      .filter((datum) => datum.kind === "entity")
      .every((datum) => entities.props.getRadius(datum) > 0),
    "expanded member nodes remain visibly pickable",
  );
  assert.equal(layer(layers, DECK_WORLD_LAYER_IDS.placeIcons).props.data.length, 0);
  assert.ok(
    layer(layers, DECK_WORLD_LAYER_IDS.labels).props.data.some(
      (datum) =>
        datum.kind === "cluster-label" &&
        datum.text.includes("3 places") &&
        datum.text.includes("3 nodes"),
    ),
    "the aggregate marker communicates that nearby locations contain nodes",
  );
});

test("maximum zoom removes same-place aggregate markers so members are directly inspectable", () => {
  const h = harness();
  const instances = Array.from({ length: 5 }, (_, index) =>
    instance(index, {
      geographicAnchors: [
        {
          placeId: "shared-detail",
          label: "Shared detail",
          longitude: 12,
          latitude: 41,
          influence: 1,
        },
      ],
    }),
  );
  const surface = new DeckWorldSurface({}, h.runtime, {
    ...WORKING_CAMERA,
    zoom: WORLD_CAMERA_MAX_ZOOM,
  });
  surface.setProjection(createWorldProjection({ instances, edges: [] }));

  const layers = h.lastLayers();
  const entities = layer(layers, DECK_WORLD_LAYER_IDS.entities);
  assert.equal(
    entities.props.data.some((datum) => datum.kind === "cluster"),
    false,
    "the terminal camera level must not leave an aggregate cluster with no further zoom action",
  );
  assert.equal(
    entities.props.data.filter((datum) => datum.kind === "entity").length,
    5,
    "all bounded same-place members remain directly represented at maximum zoom",
  );
  assert.equal(
    layer(layers, DECK_WORLD_LAYER_IDS.placeIcons).props.data.length,
    1,
    "the canonical place remains represented by its single authored place marker",
  );
});

test("two very near places remain separate markers", () => {
  const h = harness();
  const left = instance(0, {
    geographicAnchors: [
      {
        placeId: "pair-a",
        label: "Pair A",
        longitude: 12,
        latitude: 41,
        influence: 1,
      },
    ],
  });
  const right = instance(1, {
    geographicAnchors: [
      {
        placeId: "pair-b",
        label: "Pair B",
        longitude: 12.02,
        latitude: 41,
        influence: 1,
      },
    ],
  });
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 8 });
  surface.setProjection(createWorldProjection({ instances: [left, right], edges: [] }));

  const layers = h.lastLayers();
  const entities = layer(layers, DECK_WORLD_LAYER_IDS.entities);
  assert.equal(
    entities.props.data.some((datum) => datum.kind === "cluster"),
    false,
  );
  assert.equal(entities.props.data.filter((datum) => datum.kind === "entity").length, 2);
  assert.equal(layer(layers, DECK_WORLD_LAYER_IDS.placeIcons).props.data.length, 2);
});

test("selecting a clustered place reveals its incident nodes and edges without opening neighbors", () => {
  const h = harness();
  const make = (index, placeId, longitude) =>
    instance(index, {
      geographicAnchors: [
        {
          placeId,
          label: placeId === "place-a" ? "Place A" : "Place B",
          longitude,
          latitude: 41,
          influence: 1,
        },
      ],
    });
  const a1 = make(0, "place-a", 12);
  const a2 = make(1, "place-a", 12);
  const b1 = make(2, "place-b", 12.03);
  const b2 = make(3, "place-b", 12.03);
  const b3 = make(4, "place-b", 12.03);
  const projection = createWorldProjection({
    instances: [a1, a2, b1, b2, b3],
    edges: [
      createProjectedWorldEdge({
        id: "a-internal",
        label: "knows",
        sourceInstanceId: a1.id,
        targetInstanceId: a2.id,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
      createProjectedWorldEdge({
        id: "a-to-b",
        label: "visits",
        sourceInstanceId: a1.id,
        targetInstanceId: b1.id,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });

  const originalSetTimeout = globalThis.setTimeout;
  try {
    globalThis.setTimeout = (callback) => {
      callback();
      return 0;
    };
    const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
    surface.setProjection(projection);
    surface.setSelection({ kind: "place", id: "place-a" });

    const layers = h.lastLayers();
    const entities = layer(layers, DECK_WORLD_LAYER_IDS.entities);
    const visibleEntityIds = entities.props.data
      .filter((datum) => datum.kind === "entity" && entities.props.getRadius(datum) > 0)
      .map((datum) => datum.entityId);

    assert.ok(visibleEntityIds.includes(a1.canonicalId));
    assert.ok(visibleEntityIds.includes(a2.canonicalId));
    assert.ok(
      visibleEntityIds.includes(b1.canonicalId),
      "the one-hop node connected from the selected location is revealed from its cluster",
    );
    assert.equal(
      entities.props.data.some(
        (datum) => datum.kind === "cluster" && datum.placeIds?.includes("place-b"),
      ),
      false,
      "revealing one member of a three-node cluster dissolves the remaining pair",
    );
    for (const member of [b2, b3]) {
      const datum = entities.props.data.find(
        (candidate) => candidate.kind === "entity" && candidate.worldInstanceId === member.id,
      );
      assert.ok(datum, "sub-three cluster remnants stay as individual node datums");
      assert.ok(
        entities.props.getRadius(datum) > 0,
        "sub-three cluster remnants stay visibly pickable",
      );
    }

    const relationships = layer(layers, DECK_WORLD_LAYER_IDS.relationships);
    const cross = relationships.props.data.find((datum) => datum.relationshipId === "a-to-b");
    assert.ok(cross);
    assert.ok(
      relationships.props.getWidth(cross) > 0,
      "the selected location reveals its incident edge into the remaining cluster",
    );
    assert.ok(
      layer(layers, DECK_WORLD_LAYER_IDS.labels).props.data.some(
        (datum) => datum.kind === "relationship-label" && datum.relationshipId === "a-to-b",
      ),
      "revealed incident relationships retain semantic labels",
    );
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
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
    "Entity 2",
  ]);
  assert.deepEqual(
    entityLabels.map((datum) => datum.worldInstanceId).sort(),
    [
      worldInstanceId("entity-0", "occurrence-0"),
      worldInstanceId("entity-1", "occurrence-0"),
      worldInstanceId("entity-2", "occurrence-1"),
    ].sort(),
  );

  const placeLabels = labels.props.data.filter((datum) => datum.kind === "place-label");
  assert.deepEqual(placeLabels.map((datum) => labels.props.getText(datum)).sort(), [
    "Place 0",
    "Place 1",
    "Place 2",
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

test("overview hides ordinary place labels until detail zoom while direct selection reveals one", () => {
  const h = harness();
  const make = (index, placeId, label, longitude) =>
    instance(index, {
      geographicAnchors: [
        {
          placeId,
          label,
          longitude,
          latitude: 0,
          influence: 1,
        },
      ],
    });
  const instances = [
    make(0, "overview-a", "Overview A", -10),
    make(1, "overview-b", "Overview B", 0),
    make(2, "overview-c", "Overview C", 10),
  ];
  const surface = new DeckWorldSurface({}, h.runtime, {
    ...WORKING_CAMERA,
    longitude: 0,
    latitude: 0,
    zoom: 4.999,
  });
  surface.setProjection(createWorldProjection({ instances, edges: [] }));

  let labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  assert.equal(
    labels.props.data.filter((datum) => datum.kind === "place-label").length,
    0,
    "overview/regional zoom keeps ordinary place labels off the map",
  );

  surface.setSelection({ kind: "place", id: "overview-b" });
  labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  assert.deepEqual(
    labels.props.data.filter((datum) => datum.kind === "place-label").map((datum) => datum.placeId),
    ["overview-b"],
    "direct place selection reveals only the requested overview label",
  );

  surface.setSelection(null);
  const rendersBeforeDetail = h.setProps.filter((props) => props.layers).length;
  surface.setCamera({
    ...WORKING_CAMERA,
    longitude: 0,
    latitude: 0,
    zoom: 5.001,
  });

  assert.ok(
    h.setProps.filter((props) => props.layers).length > rendersBeforeDetail,
    "crossing the place-label detail threshold re-renders even inside one screen-scale step",
  );
  labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  assert.ok(
    labels.props.data.some((datum) => datum.kind === "place-label"),
    "ordinary place labels return at detail zoom",
  );
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
  assert.equal(data.filter((datum) => datum.kind === "entity-label").length, 0);
  assert.equal(data.filter((datum) => datum.kind === "place-label").length, 1);
  assert.equal(data.filter((datum) => datum.kind === "relationship-label").length, 1);

  const offsets = data.map((datum) => labels.props.getPixelOffset(datum).join(":"));
  assert.ok(new Set(offsets).size >= 2, "colliding semantic labels use alternate placements");
  assert.equal(labels.props.getTextAnchor, "middle");
});

test("relationship hover reveals only endpoint node labels and does not resurrect place labels", () => {
  const h = harness();
  const instances = Array.from({ length: 60 }, (_, index) =>
    instance(index, {
      visualWeight: 0.1,
      geographicAnchors: [
        {
          placeId: `hover-place-${String(index).padStart(3, "0")}`,
          label: `Hover place ${index}`,
          longitude: -165 + (index % 12) * 30,
          latitude: -50 + Math.floor(index / 12) * 25,
          influence: 1,
        },
      ],
    }),
  );
  const source = instances[58];
  const target = instances[59];
  const surface = new DeckWorldSurface({}, h.runtime, {
    ...WORKING_CAMERA,
    longitude: 0,
    latitude: 0,
    zoom: 3,
  });
  surface.setProjection(
    createWorldProjection({
      instances,
      edges: [
        createProjectedWorldEdge({
          id: "hover-edge",
          label: "connects",
          sourceInstanceId: source.id,
          targetInstanceId: target.id,
          temporalWeight: 0.1,
          visible: true,
          retained: false,
        }),
      ],
    }),
  );

  const before = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  const beforeEntityIds = new Set(
    before.filter((datum) => datum.kind === "entity-label").map((datum) => datum.entityId),
  );
  const beforePlaceIds = new Set(
    before.filter((datum) => datum.kind === "place-label").map((datum) => datum.placeId),
  );
  assert.equal(beforeEntityIds.has(source.canonicalId), false);
  assert.equal(beforeEntityIds.has(target.canonicalId), false);
  assert.equal(beforePlaceIds.has("hover-place-058"), false);
  assert.equal(beforePlaceIds.has("hover-place-059"), false);

  h.getDeckProps().onHover({
    object: {
      kind: "relationship",
      relationshipId: "hover-edge",
    },
  });

  const after = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  const afterEntityIds = new Set(
    after.filter((datum) => datum.kind === "entity-label").map((datum) => datum.entityId),
  );
  const afterPlaceIds = new Set(
    after.filter((datum) => datum.kind === "place-label").map((datum) => datum.placeId),
  );
  const newlyRevealedEntityIds = [...afterEntityIds]
    .filter((entityId) => !beforeEntityIds.has(entityId))
    .sort();

  assert.deepEqual(newlyRevealedEntityIds, [source.canonicalId, target.canonicalId].sort());
  assert.deepEqual(
    [...afterPlaceIds].sort(),
    [...beforePlaceIds].sort(),
    "edge hover must leave place-label membership unchanged",
  );
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
  const visiblePlaceIds = new Set(
    labels.props.data.filter((datum) => datum.kind === "place-label").map((datum) => datum.placeId),
  );
  assert.ok(
    labels.props.data.length < instances.length * 2,
    "detail zoom no longer forces overlapping labels back into the scene",
  );
  for (const datum of labels.props.data) {
    const [offsetX, offsetY] = labels.props.getPixelOffset(datum);
    assert.ok(
      Math.hypot(offsetX, offsetY) <= 100,
      `${datum.key} stays visually attached to its semantic origin instead of escaping to a distant ring`,
    );
  }

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

  const hiddenPlaceId = instances
    .map((candidate) => candidate.geographicAnchors[0]?.placeId)
    .find((placeId) => placeId && !visiblePlaceIds.has(placeId));
  assert.ok(
    hiddenPlaceId,
    "dense co-located fixture leaves at least one optional place label hidden",
  );

  surface.setSelection({ kind: "place", id: hiddenPlaceId });
  const selectedPlaceLabels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.ok(
    selectedPlaceLabels.some(
      (datum) => datum.kind === "place-label" && datum.placeId === hiddenPlaceId,
    ),
    "selected place labels survive saturated collision placement",
  );

  surface.setSelection(null);
  h.getDeckProps().onHover({
    object: {
      kind: "entity",
      entityId: hidden.canonicalId,
      worldInstanceId: hidden.id,
    },
  });
  const hoveredEntityLabels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.ok(
    hoveredEntityLabels.some(
      (datum) => datum.kind === "entity-label" && datum.entityId === hidden.canonicalId,
    ),
    "hovered node labels survive saturated collision placement",
  );
});

test("selected objects without authored labels fall back to canonical identity", () => {
  const h = harness();
  const source = instance(0, {
    label: undefined,
    geographicAnchors: [
      {
        placeId: "fallback-place",
        longitude: 12,
        latitude: 41,
        influence: 1,
      },
    ],
  });
  const target = instance(1, {
    geographicAnchors: [
      {
        placeId: "fallback-target-place",
        label: "Fallback target place",
        longitude: 13,
        latitude: 41,
        influence: 1,
      },
    ],
  });
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 9 });
  surface.setProjection(
    createWorldProjection({
      instances: [source, target],
      edges: [
        createProjectedWorldEdge({
          id: "fallback-edge",
          sourceInstanceId: source.id,
          targetInstanceId: target.id,
          temporalWeight: 1,
          visible: true,
          retained: false,
        }),
      ],
    }),
  );

  surface.setSelection({ kind: "entity", id: source.canonicalId });
  let selected = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.equal(
    selected.find((datum) => datum.kind === "entity-label" && datum.entityId === source.canonicalId)
      ?.text,
    source.canonicalId,
  );

  surface.setSelection({ kind: "place", id: "fallback-place" });
  selected = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.equal(
    selected.find((datum) => datum.kind === "place-label" && datum.placeId === "fallback-place")
      ?.text,
    "fallback-place",
  );

  surface.setSelection({ kind: "relationship", id: "fallback-edge" });
  selected = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.equal(
    selected.find(
      (datum) => datum.kind === "relationship-label" && datum.relationshipId === "fallback-edge",
    )?.text,
    "fallback-edge",
  );
});

test("large marker labels clear the rendered node footprint", () => {
  const h = harness();
  const large = instance(0, {
    style: { radius: 32 },
    geographicAnchors: [
      {
        placeId: "large-place",
        label: "Large place",
        longitude: 10,
        latitude: 50,
        influence: 1,
      },
    ],
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

test("clustered overview replaces nearby place markers and member labels with aggregate context", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
  surface.setProjection(directedProjection());

  // Wait for cluster lifecycle to complete
  return new Promise((resolve) => setTimeout(resolve, 2000)).then(() => {
    const layers = h.lastLayers();
    const labels = layer(layers, DECK_WORLD_LAYER_IDS.labels);
    assert.ok(labels.props.data.length > 0);
    assert.ok(
      labels.props.data.every((datum) => datum.kind === "cluster-label"),
      "collapsed nearby places expose aggregate context instead of duplicating member labels",
    );
    assert.ok(
      labels.props.data.some(
        (datum) => datum.text.includes("3 places") && datum.text.includes("3 nodes"),
      ),
    );

    const entityCluster = layer(layers, DECK_WORLD_LAYER_IDS.entities).props.data.find(
      (datum) => datum.kind === "cluster",
    );
    assert.ok(entityCluster);
    assert.equal(entityCluster.placeIds.length, 3, "the aggregate preserves all canonical places");
    assert.equal(
      layer(layers, DECK_WORLD_LAYER_IDS.places).props.data.length,
      0,
      "represented place hit bodies are folded into the aggregate cluster",
    );
    assert.equal(
      layer(layers, DECK_WORLD_LAYER_IDS.placeIcons).props.data.length,
      0,
      "nearby place pins do not remain visibly stacked underneath the cluster",
    );
  });
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

test("relationship labels avoid every rendered edge and remain fixed across selection", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, {
    longitude: 12,
    latitude: 41,
    zoom: 9,
    bearing: 0,
    pitch: 0,
  });
  surface.setProjection(crossingRelationshipProjection());

  const beforeLayers = h.lastLayers();
  const relationshipLayer = layer(beforeLayers, DECK_WORLD_LAYER_IDS.relationships);
  const labelLayer = layer(beforeLayers, DECK_WORLD_LAYER_IDS.labels);
  const relationshipLabels = labelLayer.props.data.filter(
    (datum) => datum.kind === "relationship-label",
  );
  assert.equal(relationshipLabels.length, 2, "both crossing relationships retain readable labels");

  const scale = (512 / 360) * 2 ** 9;
  const point = (position) => {
    const latitudeScale = Math.max(0.2, Math.cos((position[1] * Math.PI) / 180));
    return [position[0] * scale * latitudeScale, -position[1] * scale];
  };
  const orientation = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const segmentsIntersect = (a, b, c, d) => {
    const boundsOverlap =
      Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) <=
        Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) &&
      Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) <=
        Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
    if (!boundsOverlap) return false;
    return (
      orientation(a, b, c) * orientation(a, b, d) <= 0 &&
      orientation(c, d, a) * orientation(c, d, b) <= 0
    );
  };
  const segmentCrossesBox = (a, b, box) => {
    const inside = (candidate) =>
      candidate[0] >= box.left &&
      candidate[0] <= box.right &&
      candidate[1] >= box.top &&
      candidate[1] <= box.bottom;
    if (inside(a) || inside(b)) return true;
    const topLeft = [box.left, box.top];
    const topRight = [box.right, box.top];
    const bottomRight = [box.right, box.bottom];
    const bottomLeft = [box.left, box.bottom];
    return (
      segmentsIntersect(a, b, topLeft, topRight) ||
      segmentsIntersect(a, b, topRight, bottomRight) ||
      segmentsIntersect(a, b, bottomRight, bottomLeft) ||
      segmentsIntersect(a, b, bottomLeft, topLeft)
    );
  };

  const paths = relationshipLayer.props.data.map((datum) => relationshipLayer.props.getPath(datum));
  const beforeGeometry = new Map();
  for (const datum of relationshipLabels) {
    const anchor = point(labelLayer.props.getPosition(datum));
    const [offsetX, offsetY] = labelLayer.props.getPixelOffset(datum);
    const size = 12;
    const width = datum.text.length * size * 0.6 + 6;
    const height = size * 0.9 + 6;
    const clearance = 7;
    const box = {
      left: anchor[0] + offsetX - width / 2 - clearance,
      right: anchor[0] + offsetX + width / 2 + clearance,
      top: anchor[1] + offsetY - height / 2 - clearance,
      bottom: anchor[1] + offsetY + height / 2 + clearance,
    };
    for (const path of paths) {
      for (let index = 0; index < path.length - 1; index += 1) {
        assert.equal(
          segmentCrossesBox(point(path[index]), point(path[index + 1]), box),
          false,
          `${datum.relationshipId} label must not be crossed by any rendered relationship segment`,
        );
      }
    }
    beforeGeometry.set(datum.key, {
      position: labelLayer.props.getPosition(datum),
      pixelOffset: labelLayer.props.getPixelOffset(datum),
    });
  }

  surface.setSelection({ kind: "relationship", id: "diagonal-a" });
  const selectedLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  for (const [key, geometry] of beforeGeometry) {
    const datum = selectedLayer.props.data.find((candidate) => candidate.key === key);
    assert.ok(datum, `${key} remains visible after selection`);
    assert.deepEqual(
      {
        position: selectedLayer.props.getPosition(datum),
        pixelOffset: selectedLayer.props.getPixelOffset(datum),
      },
      geometry,
      `${key} must not reflow when another relationship is selected`,
    );
  }
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

test("direction marker altitude scales with its actual head length on sloped edges", () => {
  const path = relationshipEdgePath([0, 0, 0], [10, 0, 1_000]);
  const longMarker = directedEdgePathArrowhead(path, 1);
  const shortMarker = directedEdgePathArrowhead(path, 0.25);

  assert.ok(longMarker);
  assert.ok(shortMarker);

  const altitudeSpan = (marker) => Math.abs(marker[1][2] - marker[0][2]);
  const longSpan = altitudeSpan(longMarker);
  const shortSpan = altitudeSpan(shortMarker);

  assert.ok(longSpan > shortSpan, "shorter arrowheads also reduce their altitude displacement");
  assert.ok(
    Math.abs(longSpan / shortSpan - 4) < 1e-9,
    "3D arrow geometry remains proportional to the requested head length",
  );
  assert.equal(longMarker[0][2], longMarker[2][2]);
  assert.equal(shortMarker[0][2], shortMarker[2][2]);
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

test("repeated zoom cycles restore direction geometry without cumulative scaling", () => {
  const h = harness();
  const source = instance(0, { visualWeight: 1, visualAltitude: 1_000 });
  const target = instance(1, { visualAltitude: 9_000 });
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 7 });
  surface.setProjection(
    createWorldProjection({
      instances: [source, target],
      edges: [
        createProjectedWorldEdge({
          id: "zoom-cycle",
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

  const markerGeometry = () => {
    const marker = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationshipDirections).props.data[0];
    return {
      arrowLengthDegrees: marker.arrowLengthDegrees,
      path: marker.path.map((point) => [...point]),
    };
  };

  const baseline = markerGeometry();
  for (const zoom of [8.5, 10, 6.5, 9.25, 7]) {
    surface.setCamera({ ...WORKING_CAMERA, zoom });
  }
  const restored = markerGeometry();

  assert.ok(
    Math.abs(restored.arrowLengthDegrees - baseline.arrowLengthDegrees) < 1e-12,
    "returning to the same zoom restores the same head length",
  );
  assert.deepEqual(
    restored.path,
    baseline.path,
    "repeated zoom-in/zoom-out operations do not accumulate arrow geometry scale",
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
    const layers = h.lastLayers();
    const directions = layer(layers, DECK_WORLD_LAYER_IDS.relationshipDirections);
    const marker = directions.props.data[0];
    const icons = layer(layers, DECK_WORLD_LAYER_IDS.entityIcons);
    const entities = layer(layers, DECK_WORLD_LAYER_IDS.entities);
    const targetIcon = icons.props.data.find((datum) => datum.worldInstanceId === target.id);
    const targetEntity = entities.props.data.find(
      (datum) => datum.kind === "entity" && datum.worldInstanceId === target.id,
    );
    assert.ok(targetIcon, "fixture renders the target marker");
    assert.ok(targetEntity, "fixture renders the target pick/collision body");
    return {
      width: directions.props.getWidth(marker),
      length: marker.arrowLengthDegrees,
      targetRadius: icons.props.getSize(targetIcon) / 2,
      collisionRadius: entities.props.getRadius(targetEntity),
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
  assert.equal(
    ordinary.collisionRadius,
    ordinary.targetRadius,
    "ordinary node collision/picking radius equals the rendered marker radius",
  );
  assert.equal(
    largeTarget.collisionRadius,
    largeTarget.targetRadius,
    "authored node collision/picking radius equals the rendered marker radius",
  );
  assert.ok(
    Math.abs(
      largeTarget.length / ordinary.length - largeTarget.targetRadius / ordinary.targetRadius,
    ) < 1e-12,
    "chevron length scales by the exact rendered target-marker radius",
  );
  assert.ok(
    Math.abs(
      largeTarget.width / ordinary.width - largeTarget.targetRadius / ordinary.targetRadius,
    ) < 1e-12,
    "chevron stroke scales by the exact rendered target-marker radius",
  );
  assert.equal(
    thinEdgeLargeTarget.width,
    1,
    "a large target cannot make its direction chevron wider than twice a thin authored edge",
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

test("focused entity labels remain pinned after returning to dense overview", () => {
  const h = harness();
  const projection = denseProjection(1_000);
  const overviewCamera = { ...WORKING_CAMERA, zoom: 2 };
  const surface = new DeckWorldSurface({}, h.runtime, overviewCamera);
  surface.setProjection(projection);

  const beforeLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const beforeIds = new Set(
    beforeLayer.props.data
      .filter((datum) => datum.kind === "entity-label")
      .map((datum) => datum.entityId),
  );
  const hidden = projection.instances.find((candidate) => !beforeIds.has(candidate.canonicalId));
  assert.ok(hidden, "dense overview fixture must suppress at least one entity label");

  surface.focusEntity(hidden.canonicalId);
  surface.setCamera(overviewCamera);

  const focusedLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const focusedLabel = focusedLayer.props.data.find(
    (datum) =>
      datum.kind === "entity-label" &&
      datum.worldInstanceId === hidden.id &&
      datum.entityId === hidden.canonicalId,
  );
  assert.ok(focusedLabel, "focused entity remains pinned through dense overview LOD");
  assert.ok(
    focusedLayer.props.getColor(focusedLabel)[3] > 0,
    "focused entity label remains visibly opaque",
  );
});

test("clustered overview keeps directly interacted node labels visible", () => {
  const h = harness();
  const projection = denseProjection(200);
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
  surface.setProjection(projection);

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
  const interactionLayers = h.lastLayers();
  const selectedLabelLayer = layer(interactionLayers, DECK_WORLD_LAYER_IDS.labels);
  labels = selectedLabelLayer.props.data;
  const selectedNodeLabel = labels.find(
    (datum) => datum.kind === "entity-label" && datum.entityId === "entity-150",
  );
  assert.ok(
    selectedNodeLabel,
    "selected clustered node keeps its label visible even while its marker remains aggregated",
  );
  assert.ok(
    selectedLabelLayer.props.getColor(selectedNodeLabel)[3] > 0,
    "selected clustered node label must remain visibly opaque instead of inheriting collapsed member alpha",
  );
  assert.equal(
    layer(interactionLayers, DECK_WORLD_LAYER_IDS.entities).props.data.some(
      (datum) => datum.kind === "entity" && datum.entityId === "entity-150",
    ),
    false,
    "showing the selected label does not expand clustered member geometry",
  );
  assert.ok(
    labels.some((datum) => datum.kind === "place-label" && datum.text === "Place 0"),
    "selected clustered nodes reveal their canonical location",
  );
  assert.ok(
    labels.some((datum) => datum.kind === "cluster-label" && datum.emphasized),
    "the selected node's aggregate context is emphasized",
  );
  assert.ok(
    layer(interactionLayers, DECK_WORLD_LAYER_IDS.placeIcons).props.data.some(
      (datum) => datum.label === "Place 0",
    ),
    "interaction restores the exact canonical place pin without expanding the surrounding cluster",
  );

  surface.setSelection(null);
  const hoveredMember = projection.instances.find(
    (candidate) => candidate.canonicalId === "entity-150",
  );
  assert.ok(hoveredMember);
  h.getDeckProps().onHover({
    object: {
      kind: "entity",
      entityId: hoveredMember.canonicalId,
      worldInstanceId: hoveredMember.id,
    },
  });
  const hoveredLabelLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const hoveredNodeLabel = hoveredLabelLayer.props.data.find(
    (datum) => datum.kind === "entity-label" && datum.entityId === hoveredMember.canonicalId,
  );
  assert.ok(
    hoveredNodeLabel,
    "hovered clustered node keeps its label visible even when overview LOD suppresses member markers",
  );
  assert.ok(
    hoveredLabelLayer.props.getColor(hoveredNodeLabel)[3] > 0,
    "hovered clustered node label must remain visibly opaque instead of inheriting collapsed member alpha",
  );

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

test("relationship labels use the exact rendered edge RGB in every interaction state", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, WORKING_CAMERA);
  surface.setProjection(directedProjection());

  const assertLabelMatchesEdge = () => {
    const layers = h.lastLayers();
    const relationships = layer(layers, DECK_WORLD_LAYER_IDS.relationships);
    const labels = layer(layers, DECK_WORLD_LAYER_IDS.labels);
    const edge = relationships.props.data.find((datum) => datum.relationshipId === "meeting");
    const labelDatum = labels.props.data.find(
      (datum) => datum.kind === "relationship-label" && datum.relationshipId === "meeting",
    );
    assert.ok(edge, "fixture renders the relationship");
    assert.ok(labelDatum, "fixture renders its predicate label");
    assert.deepEqual(
      labels.props.getColor(labelDatum).slice(0, 3),
      relationships.props.getColor(edge).slice(0, 3),
      "relationship label hue follows the exact resolved edge color",
    );
  };

  assertLabelMatchesEdge();

  surface.setSelection({ kind: "entity", id: "entity-0" });
  assertLabelMatchesEdge();

  surface.setSelection({ kind: "relationship", id: "meeting" });
  assertLabelMatchesEdge();
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
    "Entity 2",
  ]);
  assert.deepEqual(snapshot.places.map((place) => place.label).sort(), [
    "Place 0",
    "Place 1",
    "Place 2",
  ]);
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

function crowdedIncidentProjection(count = 20) {
  const source = instance(0, { visualWeight: 1 });
  const target = instance(1);
  const edges = Array.from({ length: count }, (_, index) =>
    createProjectedWorldEdge({
      id: `incident-${index}`,
      label: `relation ${index}`,
      sourceInstanceId: source.id,
      targetInstanceId: target.id,
      temporalWeight: 1 - index / (count * 2),
      visible: true,
      retained: false,
    }),
  );
  return createWorldProjection({ instances: [source, target], edges });
}

function clusteredRelationshipProjection() {
  const geographicAnchors = [
    {
      placeId: "clustered-edge-place",
      label: "Clustered edge place",
      longitude: 10,
      latitude: 40,
      influence: 1,
    },
  ];
  const source = instance(0, { visualWeight: 1, geographicAnchors });
  const target = instance(1, { geographicAnchors });
  const sibling = instance(2, { geographicAnchors });
  return createWorldProjection({
    instances: [source, target, sibling],
    edges: [
      createProjectedWorldEdge({
        id: "clustered-selected-edge",
        label: "connected",
        sourceInstanceId: source.id,
        targetInstanceId: target.id,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });
}

test("directly selected relationship labels survive saturated collision placement", () => {
  const h = harness();
  const projection = crowdedIncidentProjection();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 9 });
  surface.setProjection(projection);

  const before = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  const visibleRelationshipIds = new Set(
    before
      .filter((datum) => datum.kind === "relationship-label")
      .map((datum) => datum.relationshipId),
  );
  const hidden = projection.edges.find((edge) => !visibleRelationshipIds.has(edge.id));
  assert.ok(hidden, "crowded relationship fixture suppresses at least one predicate label");

  surface.setSelection({ kind: "relationship", id: hidden.id });
  const after = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.ok(
    after.some(
      (datum) => datum.kind === "relationship-label" && datum.relationshipId === hidden.id,
    ),
    "a directly selected relationship label cannot be dropped by collision declutter",
  );
});

test("hovered relationship labels survive saturated collision placement", () => {
  const h = harness();
  const projection = crowdedIncidentProjection();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 9 });
  surface.setProjection(projection);

  const before = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  const visibleRelationshipIds = new Set(
    before
      .filter((datum) => datum.kind === "relationship-label")
      .map((datum) => datum.relationshipId),
  );
  const hidden = projection.edges.find((edge) => !visibleRelationshipIds.has(edge.id));
  assert.ok(hidden, "crowded relationship fixture suppresses at least one predicate label");

  h.getDeckProps().onHover({
    object: {
      kind: "relationship",
      relationshipId: hidden.id,
    },
  });
  const after = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.ok(
    after.some(
      (datum) => datum.kind === "relationship-label" && datum.relationshipId === hidden.id,
    ),
    "a hovered relationship label cannot be dropped by collision declutter",
  );
});

test("active timeline event relationships expose their label and authored edge color", () => {
  const h = harness();
  const projection = crowdedIncidentProjection();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 9 });
  surface.setProjection(projection);

  const beforeLabels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  const visibleRelationshipIds = new Set(
    beforeLabels
      .filter((datum) => datum.kind === "relationship-label")
      .map((datum) => datum.relationshipId),
  );
  const hidden = projection.edges.find((edge) => !visibleRelationshipIds.has(edge.id));
  assert.ok(hidden, "crowded relationship fixture suppresses at least one predicate label");

  surface.setContextRelationships([hidden.id]);

  const layers = h.lastLayers();
  const labels = layer(layers, DECK_WORLD_LAYER_IDS.labels);
  const labelDatum = labels.props.data.find(
    (datum) => datum.kind === "relationship-label" && datum.relationshipId === hidden.id,
  );
  assert.ok(
    labelDatum,
    "active event relationship forces its predicate label through LOD/declutter",
  );

  const relationships = layer(layers, DECK_WORLD_LAYER_IDS.relationships);
  const edgeDatum = relationships.props.data.find((datum) => datum.relationshipId === hidden.id);
  assert.ok(edgeDatum, "active event relationship remains in the rendered edge layer");
  const edgeColor = relationships.props.getColor(edgeDatum);
  assert.equal(edgeColor[3], 242, "active event relationship uses emphasized edge opacity");
  assert.deepEqual(
    labels.props.getColor(labelDatum).slice(0, 3),
    edgeColor.slice(0, 3),
    "active event predicate label uses the same resolved relationship color",
  );
});

test("selected relationship labels remain visible inside collapsed clusters", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
  surface.setProjection(clusteredRelationshipProjection());

  assert.ok(
    layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.entities).props.data.some(
      (datum) => datum.kind === "cluster",
    ),
    "fixture must begin in a collapsed cluster",
  );
  let labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.equal(
    labels.some(
      (datum) =>
        datum.kind === "relationship-label" && datum.relationshipId === "clustered-selected-edge",
    ),
    false,
    "ordinary clustered relationship labels remain suppressed",
  );

  surface.setSelection({ kind: "relationship", id: "clustered-selected-edge" });
  labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.ok(
    labels.some(
      (datum) =>
        datum.kind === "relationship-label" && datum.relationshipId === "clustered-selected-edge",
    ),
    "selection overrides cluster label suppression",
  );
});

test("hovered relationship labels remain visible inside collapsed clusters", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
  surface.setProjection(clusteredRelationshipProjection());

  let labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.equal(
    labels.some(
      (datum) =>
        datum.kind === "relationship-label" && datum.relationshipId === "clustered-selected-edge",
    ),
    false,
    "ordinary clustered relationship labels remain suppressed",
  );

  h.getDeckProps().onHover({
    object: {
      kind: "relationship",
      relationshipId: "clustered-selected-edge",
    },
  });
  labels = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels).props.data;
  assert.ok(
    labels.some(
      (datum) =>
        datum.kind === "relationship-label" && datum.relationshipId === "clustered-selected-edge",
    ),
    "hover overrides cluster label suppression",
  );
});

test("active timeline event relationship remains enabled inside a collapsed cluster", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 0.2 });
  surface.setProjection(clusteredRelationshipProjection());

  let layers = h.lastLayers();
  assert.equal(
    layer(layers, DECK_WORLD_LAYER_IDS.labels).props.data.some(
      (datum) =>
        datum.kind === "relationship-label" && datum.relationshipId === "clustered-selected-edge",
    ),
    false,
    "ordinary clustered relationship labels remain suppressed",
  );

  surface.setContextRelationships(["clustered-selected-edge"]);
  layers = h.lastLayers();

  const labels = layer(layers, DECK_WORLD_LAYER_IDS.labels);
  assert.ok(
    labels.props.data.some(
      (datum) =>
        datum.kind === "relationship-label" && datum.relationshipId === "clustered-selected-edge",
    ),
    "active event context overrides cluster label suppression",
  );

  const relationships = layer(layers, DECK_WORLD_LAYER_IDS.relationships);
  const edgeDatum = relationships.props.data.find(
    (datum) => datum.relationshipId === "clustered-selected-edge",
  );
  assert.ok(edgeDatum, "active event context keeps clustered edge geometry enabled");
  assert.ok(relationships.props.getWidth(edgeDatum) > 0);
  assert.equal(relationships.props.getColor(edgeDatum)[3], 242);

  const directions = layer(layers, DECK_WORLD_LAYER_IDS.relationshipDirections);
  assert.ok(
    directions?.props.data.some((datum) => datum.relationshipId === "clustered-selected-edge"),
    "active event context keeps the edge direction marker enabled",
  );

  surface.setContextRelationships([]);
  layers = h.lastLayers();
  assert.equal(
    layer(layers, DECK_WORLD_LAYER_IDS.labels).props.data.some(
      (datum) =>
        datum.kind === "relationship-label" && datum.relationshipId === "clustered-selected-edge",
    ),
    false,
    "clearing event context restores ordinary cluster suppression",
  );
});

test("selecting a node makes every incident edge predicate visibly labeled", () => {
  const h = harness();
  const projection = crowdedIncidentProjection();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 1 });
  surface.setProjection(projection);

  const beforeLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const beforeRelationships = beforeLayer.props.data.filter(
    (datum) => datum.kind === "relationship-label",
  );
  assert.ok(
    beforeRelationships.length < projection.edges.length,
    "ordinary overview LOD must suppress at least one relationship label in the fixture",
  );
  const stableGeometry = new Map(
    beforeLayer.props.data.map((datum) => [
      datum.key,
      {
        position: beforeLayer.props.getPosition(datum),
        pixelOffset: beforeLayer.props.getPixelOffset(datum),
      },
    ]),
  );

  surface.setSelection({ kind: "entity", id: "entity-0" });

  const afterLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.labels);
  const afterRelationships = afterLayer.props.data.filter(
    (datum) => datum.kind === "relationship-label",
  );
  assert.equal(
    afterRelationships.length,
    projection.edges.length,
    "selection must surface every predicate on an edge incident to the selected node",
  );
  assert.deepEqual(
    new Set(afterRelationships.map((datum) => datum.relationshipId)),
    new Set(projection.edges.map((edge) => edge.id)),
  );
  for (const datum of afterRelationships) {
    const [offsetX, offsetY] = afterLayer.props.getPixelOffset(datum);
    assert.ok(
      Math.hypot(offsetX, offsetY) <= 64,
      `${datum.relationshipId} stays near its edge origin even when selection requires the label`,
    );
  }

  for (const [key, geometry] of stableGeometry) {
    const datum = afterLayer.props.data.find((candidate) => candidate.key === key);
    assert.ok(datum, `${key} remains visible after revealing incident edge labels`);
    assert.deepEqual(
      {
        position: afterLayer.props.getPosition(datum),
        pixelOffset: afterLayer.props.getPixelOffset(datum),
      },
      geometry,
      `${key} keeps its existing placement when selected-node edge labels are added`,
    );
  }
});

test("selection reveals semantic label color without changing membership or placement", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...WORKING_CAMERA, zoom: 1 });
  const baseProjection = chainProjection(2_000);
  const projection = createWorldProjection({
    instances: baseProjection.instances.map((datum, index) =>
      index === 0
        ? createProjectedWorldInstance({
            ...datum,
            style: { ...(datum.style ?? {}), fillColor: "#7a3456" },
          })
        : datum,
    ),
    edges: baseProjection.edges,
  });
  surface.setProjection(projection);

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
  assert.deepEqual(
    afterLayer.props.getColor(selectedAfter).slice(0, 3),
    [0x7a, 0x34, 0x56],
    "selected entity label keeps the entity's authored semantic color",
  );

  const relationshipLayer = layer(h.lastLayers(), DECK_WORLD_LAYER_IDS.relationships);
  const incidentEdge = relationshipLayer.props.data.find(
    (datum) => datum.relationshipId === "edge-1",
  );
  assert.ok(incidentEdge);
  assert.deepEqual(
    afterLayer.props.getColor(incidentAfter).slice(0, 3),
    relationshipLayer.props.getColor(incidentEdge).slice(0, 3),
    "incident relationship label keeps the relationship's resolved semantic color",
  );
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
