import assert from "node:assert/strict";
import test from "node:test";

import {
  DECK_WORLD_LAYER_IDS,
  DeckWorldSurface,
} from "../site/world/deck-world-surface.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function harness() {
  const calls = {
    globeViews: [],
    scatterLayers: [],
    pathLayers: [],
    deckProps: null,
    setProps: [],
    pickOptions: [],
    redraw: [],
    finalize: 0,
  };

  let pickResult = null;

  const runtime = {
    createGlobeView(props) {
      const view = { type: "globe", props };
      calls.globeViews.push(view);
      return view;
    },
    createScatterplotLayer(props) {
      const layer = { type: "scatter", props };
      calls.scatterLayers.push(layer);
      return layer;
    },
    createPathLayer(props) {
      const layer = { type: "path", props };
      calls.pathLayers.push(layer);
      return layer;
    },
    createDeck(props) {
      calls.deckProps = props;
      return {
        setProps(next) {
          calls.setProps.push(next);
        },
        pickObject(options) {
          calls.pickOptions.push(options);
          return pickResult;
        },
        redraw(force) {
          calls.redraw.push(force);
        },
        finalize() {
          calls.finalize += 1;
        },
      };
    },
  };

  return {
    calls,
    runtime,
    setPickResult(value) {
      pickResult = value;
    },
  };
}

function projection() {
  const aliceId = worldInstanceId("alice", "meeting");
  const bobId = worldInstanceId("bob", "meeting");

  return createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id: aliceId,
        canonicalId: "alice",
        occurrenceId: "meeting",
        geographicAnchors: [
          {
            placeId: "stockholm",
            longitude: 18.0686,
            latitude: 59.3293,
            sourceAltitude: 20,
            influence: 1,
          },
        ],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
        visualAltitude: 1000,
      }),
      createProjectedWorldInstance({
        id: bobId,
        canonicalId: "bob",
        occurrenceId: "meeting",
        geographicAnchors: [
          {
            placeId: "stockholm",
            longitude: 18.0686,
            latitude: 59.3293,
            sourceAltitude: 20,
            influence: 1,
          },
        ],
        temporalWeight: 1,
        visualWeight: 0.5,
        retained: false,
        visualAltitude: 1200,
        localOffset: { eastMeters: 150, northMeters: 0 },
      }),
    ],
    edges: [
      createProjectedWorldEdge({
        id: "meeting",
        sourceInstanceId: aliceId,
        targetInstanceId: bobId,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });
}

test("DeckWorldSurface constructs one globe view and controlled deck runtime", () => {
  const { calls, runtime } = harness();
  const container = {};
  const surface = new DeckWorldSurface(container, runtime);

  assert.equal(calls.globeViews.length, 1);
  assert.deepEqual(calls.globeViews[0].props, { id: "lum-world" });
  assert.equal(calls.deckProps.parent, container);
  assert.equal(calls.deckProps.controller, true);
  assert.equal(calls.deckProps.views.length, 1);
  assert.deepEqual(surface.getCamera(), {
    longitude: 0,
    latitude: 20,
    zoom: 1,
    bearing: 0,
    pitch: 20,
  });
});

test("DeckWorldSurface renders places, globe-visible paths, and elevated entity instances", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);

  surface.setProjection(projection());

  const render = calls.setProps.at(-1);
  assert.ok(render);
  assert.equal(render.layers.length, 3);

  const [places, relationships, entities] = render.layers;
  assert.equal(places.props.id, DECK_WORLD_LAYER_IDS.places);
  assert.equal(relationships.props.id, DECK_WORLD_LAYER_IDS.relationships);
  assert.equal(entities.props.id, DECK_WORLD_LAYER_IDS.entities);

  assert.deepEqual(places.props.data[0].position, [18.0686, 59.3293, 20]);
  assert.deepEqual(entities.props.data[0].position, [18.0686, 59.3293, 1020]);
  assert.ok(entities.props.data[1].position[0] > 18.0686);
  assert.equal(entities.props.data[1].position[2], 1220);

  assert.equal(relationships.props.data.length, 1);
  assert.equal(relationships.props.parameters.cullMode, "none");
  assert.equal(relationships.props.data[0].path.length, 2);
});

test("unplaced instances remain outside globe layers rather than receiving invented coordinates", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  const aliceId = worldInstanceId("alice", "unplaced");
  const bobId = worldInstanceId("bob", "unplaced");

  surface.setProjection(
    createWorldProjection({
      instances: [
        createProjectedWorldInstance({
          id: aliceId,
          canonicalId: "alice",
          occurrenceId: "unplaced",
          geographicAnchors: [],
          temporalWeight: 1,
          visualWeight: 1,
          retained: false,
        }),
        createProjectedWorldInstance({
          id: bobId,
          canonicalId: "bob",
          occurrenceId: "unplaced",
          geographicAnchors: [],
          temporalWeight: 1,
          visualWeight: 1,
          retained: false,
        }),
      ],
      edges: [
        createProjectedWorldEdge({
          id: "unplaced",
          sourceInstanceId: aliceId,
          targetInstanceId: bobId,
          temporalWeight: 1,
          visible: true,
          retained: false,
        }),
      ],
    }),
  );

  const render = calls.setProps.at(-1);
  assert.equal(render.layers[1].props.data.length, 0);
  assert.equal(render.layers[2].props.data.length, 0);
});

test("selection updates presentation data while preserving canonical IDs", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());
  surface.setSelection({ kind: "entity", id: "alice" });

  const render = calls.setProps.at(-1);
  const entities = render.layers[2].props.data;

  assert.equal(entities.find((datum) => datum.entityId === "alice").selected, true);
  assert.equal(entities.find((datum) => datum.entityId === "bob").selected, false);
});

test("deck picking translates directly to canonical world hits with a touch-sized radius", () => {
  const { calls, runtime, setPickResult } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  const instanceId = worldInstanceId("alice", "meeting");

  setPickResult({
    layer: { id: DECK_WORLD_LAYER_IDS.entities },
    object: {
      kind: "entity",
      entityId: "alice",
      worldInstanceId: instanceId,
    },
  });

  assert.deepEqual(surface.pick({ x: 10, y: 20 }), {
    kind: "entity",
    entityId: "alice",
    worldInstanceId: instanceId,
  });

  assert.deepEqual(calls.pickOptions.at(-1), {
    x: 10,
    y: 20,
    radius: 22,
    unproject3D: true,
    layerIds: [
      DECK_WORLD_LAYER_IDS.entities,
      DECK_WORLD_LAYER_IDS.relationships,
      DECK_WORLD_LAYER_IDS.places,
    ],
  });
});

test("focus moves the globe camera to a rendered canonical target", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());

  surface.focusEntity("alice");

  assert.deepEqual(calls.setProps.at(-1).viewState, {
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: 5,
    bearing: 0,
    pitch: 20,
  });
});

test("runtime view-state callbacks stay inside renderer-neutral camera validation", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);

  calls.deckProps.onViewStateChange({
    viewState: {
      longitude: 12.5683,
      latitude: 55.6761,
      zoom: 4,
      bearing: 370,
      pitch: 30,
    },
  });

  assert.deepEqual(surface.getCamera(), {
    longitude: 12.5683,
    latitude: 55.6761,
    zoom: 4,
    bearing: 10,
    pitch: 30,
  });
});

test("capabilities expose the intentionally incomplete first deck slice", () => {
  const { runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);

  assert.deepEqual(surface.getCapabilities(), {
    globe: true,
    depthPicking: true,
    directNodeDrag: false,
    gpuFiltering: false,
    localPrecisionMode: false,
  });
});

test("refresh and destruction delegate to Deck lifecycle exactly once", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);

  surface.refresh();
  surface.destroy();
  surface.destroy();

  assert.deepEqual(calls.redraw, [true]);
  assert.equal(calls.finalize, 1);
  assert.throws(() => surface.refresh(), /destroyed/);
});
