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
import {
  selectWorldSpatialMode,
} from "../src/layout/world-spatial-mode.ts";

function harness() {
  const calls = {
    globeViews: [],
    scatterLayers: [],
    pathLayers: [],
    deckProps: null,
    setProps: [],
    pickOptions: [],
    viewportQueries: [],
    projected: [],
    unprojected: [],
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
        getViewports(rect) {
          calls.viewportQueries.push(rect ?? null);
          return [
            {
              project(coordinates) {
                calls.projected.push(coordinates);
                return [coordinates[0] + 100, coordinates[1] + 200, 0.5];
              },
              unproject(pixels, options) {
                calls.unprojected.push([pixels, options]);
                return [pixels[0] - 100, pixels[1] - 200, options?.targetZ ?? 0];
              },
            },
          ];
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
  assert.equal(calls.deckProps.views.length, 1);
  assert.deepEqual(surface.getCamera(), {
    longitude: 0,
    latitude: 20,
    zoom: 1,
    bearing: 0,
    pitch: 20,
  });
});

test("deck controller is configured with orbit, pointer-anchored zoom, and inertia enabled", () => {
  const { calls, runtime } = harness();
  new DeckWorldSurface({}, runtime);

  assert.deepEqual(calls.deckProps.controller, {
    dragPan: true,
    dragRotate: true,
    scrollZoom: true,
    touchZoom: true,
    multiTouchDrag: "rotate",
    keyboard: true,
    doubleClickZoom: false,
    zoomAround: "pointer",
    inertia: true,
  });
});

test("deck controller disables inertia when prefers-reduced-motion is set", (t) => {
  const originalMatchMedia = globalThis.matchMedia;
  globalThis.matchMedia = (query) => ({ matches: query === "(prefers-reduced-motion: reduce)" });
  t.after(() => {
    globalThis.matchMedia = originalMatchMedia;
  });

  const { calls, runtime } = harness();
  new DeckWorldSurface({}, runtime);

  assert.equal(calls.deckProps.controller.inertia, false);
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

test("relationship and place selection are also reflected in their render datums (issue #445 Priority 4)", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());

  surface.setSelection({ kind: "relationship", id: "meeting" });
  const relationshipRender = calls.setProps.at(-1);
  const relationships = relationshipRender.layers[1].props.data;
  assert.equal(relationships.find((datum) => datum.relationshipId === "meeting").selected, true);

  surface.setSelection({ kind: "place", id: "stockholm" });
  const placeRender = calls.setProps.at(-1);
  const places = placeRender.layers[0].props.data;
  assert.equal(places.find((datum) => datum.placeId === "stockholm").selected, true);
  const entitiesAfterPlaceSelection = placeRender.layers[2].props.data;
  assert.ok(entitiesAfterPlaceSelection.every((datum) => datum.selected === false));
});

test("deck viewport project/unproject stays behind renderer-neutral world coordinates", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);

  assert.deepEqual(
    surface.project({
      longitude: 18.0686,
      latitude: 59.3293,
      altitudeMeters: 1200,
    }),
    { x: 118.0686, y: 259.3293 },
  );
  assert.deepEqual(calls.projected.at(-1), [18.0686, 59.3293, 1200]);

  const unprojected = surface.unproject({ x: 118.0686, y: 259.3293 }, 1200);
  assert.ok(unprojected);
  assert.ok(Math.abs(unprojected.longitude - 18.0686) < 1e-12);
  assert.ok(Math.abs(unprojected.latitude - 59.3293) < 1e-12);
  assert.equal(unprojected.altitudeMeters, 1200);
  assert.deepEqual(calls.viewportQueries.at(-1), {
    x: 118.0686,
    y: 259.3293,
    width: 1,
    height: 1,
  });
  assert.deepEqual(calls.unprojected.at(-1), [
    [118.0686, 259.3293],
    { targetZ: 1200 },
  ]);
});

test("deck viewport projection rejects invalid renderer-neutral spatial inputs", () => {
  const { runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);

  assert.throws(
    () =>
      surface.project({
        longitude: 181,
        latitude: 0,
        altitudeMeters: 0,
      }),
    /longitude/,
  );
  assert.throws(
    () => surface.unproject({ x: Number.NaN, y: 0 }, 1000),
    /screen point/,
  );
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


test("world spatial mode uses hysteresis around the local precision threshold", () => {
  assert.equal(selectWorldSpatialMode({ zoom: 11.4 }, "globe"), "globe");
  assert.equal(selectWorldSpatialMode({ zoom: 11.5 }, "globe"), "local");
  assert.equal(selectWorldSpatialMode({ zoom: 11.0 }, "local"), "local");
  assert.equal(selectWorldSpatialMode({ zoom: 10.5 }, "local"), "globe");
});

test("DeckWorldSurface switches to local geographic view only at high zoom", () => {
  const { calls, runtime } = harness();
  const localViews = [];
  runtime.createMapView = (props) => {
    const view = { type: "map", props };
    localViews.push(view);
    return view;
  };

  const surface = new DeckWorldSurface({}, runtime);
  assert.equal(surface.getCapabilities().localPrecisionMode, true);
  assert.equal(localViews.length, 1);

  surface.setCamera({
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: 11.5,
    bearing: 0,
    pitch: 20,
  });

  const localSwitch = calls.setProps.find(
    (props) => props.views?.[0]?.type === "map",
  );
  assert.ok(localSwitch);
  assert.deepEqual(localSwitch.views[0].props, { id: "lum-world-local" });

  const localSwitchCount = calls.setProps.filter(
    (props) => props.views?.[0]?.type === "map",
  ).length;

  surface.setCamera({
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: 11,
    bearing: 0,
    pitch: 20,
  });
  assert.equal(
    calls.setProps.filter((props) => props.views?.[0]?.type === "map").length,
    localSwitchCount,
  );

  surface.setCamera({
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: 10.5,
    bearing: 0,
    pitch: 20,
  });

  const globeSwitches = calls.setProps.filter(
    (props) => props.views?.[0]?.type === "globe",
  );
  assert.ok(globeSwitches.length >= 1);
});

test("deck entity drag callbacks resolve screen motion into world-local drag intents", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());

  const dragCalls = [];
  surface.setNodeDragSink({
    begin(pointerId, instanceId, position) {
      dragCalls.push(["begin", pointerId, instanceId, position]);
      return true;
    },
    update(pointerId, position) {
      dragCalls.push(["update", pointerId, position]);
      return true;
    },
    release(pointerId) {
      dragCalls.push(["release", pointerId]);
      return true;
    },
    cancel(reason) {
      dragCalls.push(["cancel", reason]);
    },
  });

  assert.equal(surface.getCapabilities().directNodeDrag, true);
  const entityLayer = calls.scatterLayers
    .filter((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities)
    .at(-1);
  const alice = entityLayer.props.data.find((datum) => datum.entityId === "alice");

  assert.equal(
    entityLayer.props.onDragStart(
      { object: alice, x: 118.0786, y: 259.3393 },
      { srcEvent: { pointerId: 7 } },
    ),
    true,
  );
  assert.equal(dragCalls[0][0], "begin");
  assert.equal(dragCalls[0][1], 7);
  assert.equal(dragCalls[0][2], alice.worldInstanceId);
  assert.ok(dragCalls[0][3].eastMeters > 0);
  assert.ok(dragCalls[0][3].northMeters > 0);

  assert.equal(
    entityLayer.props.onDrag(
      { object: alice, x: 118.0886, y: 259.3493 },
      { srcEvent: { pointerId: 7 } },
    ),
    true,
  );
  assert.equal(dragCalls.at(-1)[0], "update");

  assert.equal(
    entityLayer.props.onDragEnd(
      { object: alice, x: 118.0886, y: 259.3493 },
      { srcEvent: { pointerId: 7 } },
    ),
    true,
  );
  assert.deepEqual(dragCalls.at(-1), ["release", 7]);
});

test("pointer cancellation reaches the active Lūm world drag owner", () => {
  const { calls, runtime } = harness();
  const listeners = new Map();
  const container = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const surface = new DeckWorldSurface(container, runtime);
  surface.setProjection(projection());

  const dragCalls = [];
  surface.setNodeDragSink({
    begin() {
      return true;
    },
    update() {
      return true;
    },
    release() {
      return true;
    },
    cancel(reason) {
      dragCalls.push(reason);
    },
  });

  const entityLayer = calls.scatterLayers
    .filter((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities)
    .at(-1);
  const alice = entityLayer.props.data.find((datum) => datum.entityId === "alice");

  entityLayer.props.onDragStart(
    { object: alice, x: 118.0786, y: 259.3393 },
    { srcEvent: { pointerId: 11 } },
  );
  listeners.get("pointercancel")({ pointerId: 11 });

  assert.deepEqual(dragCalls, ["pointercancel"]);

  surface.destroy();
  assert.equal(listeners.size, 0);
});

test("removing the world drag sink disables direct-node-drag capability", () => {
  const { runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  const sink = {
    begin() { return true; },
    update() { return true; },
    release() { return true; },
    cancel() {},
  };

  surface.setNodeDragSink(sink);
  assert.equal(surface.getCapabilities().directNodeDrag, true);

  surface.setNodeDragSink(null);
  assert.equal(surface.getCapabilities().directNodeDrag, false);
});

function largeProjection(count, overrides = {}) {
  const instances = [];
  const edges = [];
  let previousId = null;

  for (let index = 0; index < count; index += 1) {
    const id = worldInstanceId(`entity-${index}`, `occ-${index}`);
    const override = overrides[index];
    instances.push(
      createProjectedWorldInstance({
        id,
        canonicalId: `entity-${index}`,
        occurrenceId: `occ-${index}`,
        geographicAnchors: [
          {
            placeId: `place-${index % 10}`,
            longitude: override?.longitude ?? -170 + (index % 340),
            latitude: override?.latitude ?? -80 + (index % 160),
            sourceAltitude: 0,
            influence: 1,
          },
        ],
        temporalWeight: 1,
        visualWeight: override?.visualWeight ?? 1,
        retained: false,
      }),
    );
    if (previousId !== null) {
      edges.push(
        createProjectedWorldEdge({
          id: `edge-${index}`,
          sourceInstanceId: previousId,
          targetInstanceId: id,
          temporalWeight: 1,
          visible: true,
          retained: false,
        }),
      );
    }
    previousId = id;
  }

  return createWorldProjection({ instances, edges });
}

test("incremental render reuses prior datum object references for unchanged rows (issue #445 Priority 3)", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);

  surface.setProjection(largeProjection(500));
  const firstRender = calls.setProps.at(-1);
  const firstEntities = firstRender.layers[2].props.data;
  const firstRelationships = firstRender.layers[1].props.data;
  const firstPlaces = firstRender.layers[0].props.data;

  // Perturb a single instance's position among 500.
  surface.setProjection(largeProjection(500, { 250: { longitude: 12.3, latitude: 45.6 } }));
  const secondRender = calls.setProps.at(-1);
  const secondEntities = secondRender.layers[2].props.data;
  const secondRelationships = secondRender.layers[1].props.data;
  const secondPlaces = secondRender.layers[0].props.data;

  assert.equal(secondEntities.length, firstEntities.length);

  const byId = new Map(firstEntities.map((datum) => [datum.worldInstanceId, datum]));
  let sameReference = 0;
  let changedReference = 0;
  for (const datum of secondEntities) {
    const prior = byId.get(datum.worldInstanceId);
    if (datum === prior) {
      sameReference += 1;
    } else {
      changedReference += 1;
    }
  }

  // Only the perturbed instance (and the edges touching it) should get a new
  // datum object; the vast majority must be the exact same reference.
  assert.ok(
    sameReference >= firstEntities.length - 1,
    `expected at most 1 changed entity datum reference, saw ${changedReference}`,
  );
  assert.ok(changedReference >= 1, "expected the perturbed instance to receive a new datum object");

  const relByIdFirst = new Map(firstRelationships.map((datum) => [datum.relationshipId, datum]));
  let relSame = 0;
  for (const datum of secondRelationships) {
    if (relByIdFirst.get(datum.relationshipId) === datum) relSame += 1;
  }
  // Two edges touch the perturbed instance (edge-250 and edge-251).
  assert.ok(
    relSame >= firstRelationships.length - 2,
    `expected at most 2 changed relationship datum references, saw ${firstRelationships.length - relSame}`,
  );

  // Places are unaffected by this perturbation (place-0 remains anchored by
  // many other, unperturbed instances), so every place datum must be reused.
  assert.equal(secondPlaces.length, firstPlaces.length);
  const placeByIdFirst = new Map(firstPlaces.map((datum) => [datum.placeId, datum]));
  for (const datum of secondPlaces) {
    assert.equal(datum, placeByIdFirst.get(datum.placeId));
  }
});

test("incremental render only replaces datums whose selection actually changed", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(largeProjection(50));

  const firstRender = calls.setProps.at(-1);
  const firstEntities = firstRender.layers[2].props.data;

  surface.setSelection({ kind: "entity", id: "entity-10" });
  const secondRender = calls.setProps.at(-1);
  const secondEntities = secondRender.layers[2].props.data;

  const byId = new Map(firstEntities.map((datum) => [datum.worldInstanceId, datum]));
  let changed = 0;
  for (const datum of secondEntities) {
    if (datum !== byId.get(datum.worldInstanceId)) changed += 1;
  }
  assert.equal(changed, 1);
  assert.equal(
    secondEntities.find((datum) => datum.entityId === "entity-10").selected,
    true,
  );
});

test("clustering is bypassed at the default working zoom (issue #445 Priority 2)", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());

  const render = calls.setProps.at(-1);
  const entities = render.layers[2].props.data;
  assert.equal(entities.length, 2);
  assert.ok(entities.every((datum) => datum.kind === "entity"));
});

test("zooming out past the cluster threshold groups nearby entities without losing canonical identity", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());
  surface.setCamera({ longitude: 0, latitude: 0, zoom: 0, bearing: 0, pitch: 0 });

  const render = calls.setProps.at(-1);
  const entities = render.layers[2].props.data;

  // alice and bob share the same Stockholm anchor, so at low zoom they
  // collapse into a single cluster datum.
  assert.equal(entities.length, 1);
  const [cluster] = entities;
  assert.equal(cluster.kind, "cluster");
  assert.equal(cluster.clusterMembers.length, 2);
  const memberIds = cluster.clusterMembers.map((member) => member.entityId).sort();
  assert.deepEqual(memberIds, ["alice", "bob"]);
});

test("picking a cluster resolves to one of its real canonical member entities", () => {
  const { calls, runtime, setPickResult } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());
  surface.setCamera({ longitude: 0, latitude: 0, zoom: 0, bearing: 0, pitch: 0 });

  const render = calls.setProps.at(-1);
  const [cluster] = render.layers[2].props.data;
  assert.equal(cluster.kind, "cluster");

  setPickResult({ object: cluster, layer: { id: DECK_WORLD_LAYER_IDS.entities }, x: 1, y: 2 });
  const hit = surface.pick({ x: 1, y: 2 });

  assert.equal(hit.kind, "entity");
  assert.ok(["alice", "bob"].includes(hit.entityId));
});

test("zooming back in above the cluster threshold restores per-entity picking and dragging", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());
  surface.setCamera({ longitude: 0, latitude: 0, zoom: 0, bearing: 0, pitch: 0 });
  assert.equal(calls.setProps.at(-1).layers[2].props.data.length, 1);

  surface.setCamera({ longitude: 0, latitude: 0, zoom: 5, bearing: 0, pitch: 0 });
  const entities = calls.setProps.at(-1).layers[2].props.data;
  assert.equal(entities.length, 2);
  assert.ok(entities.every((datum) => datum.kind === "entity"));
});
