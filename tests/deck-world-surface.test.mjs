import assert from "node:assert/strict";
import test from "node:test";

import {
  DECK_WORLD_LAYER_IDS,
  DeckWorldSurface,
  WORLD_CLOSE_DRAG_CAMERA_LOCK_ZOOM,
  WORLD_TEMPORAL_RELATION_TRANSITION_MS,
  worldGraphLabelSize,
} from "../site/world/deck-world-surface.ts";
import { selectWorldSpatialMode } from "../src/layout/world-spatial-mode.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";
import { diffWorldProjection } from "../src/projection/world-projection-delta.ts";

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

test("world graph label scale matches sidebar reading typography", () => {
  assert.equal(worldGraphLabelSize({ kind: "entity-label", emphasized: false }), 18);
  assert.equal(worldGraphLabelSize({ kind: "place-label", emphasized: false }), 18);
  assert.equal(worldGraphLabelSize({ kind: "relationship-label", emphasized: false }), 18);
  assert.equal(worldGraphLabelSize({ kind: "entity-label", emphasized: true }), 18);
});

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

test("short interaction feedback transitions respect reduced motion", (t) => {
  const originalMatchMedia = globalThis.matchMedia;
  t.after(() => {
    globalThis.matchMedia = originalMatchMedia;
  });

  globalThis.matchMedia = () => ({ matches: false });
  const animatedHarness = harness();
  const animated = new DeckWorldSurface({}, animatedHarness.runtime);
  animated.setProjection(projection());
  const animatedPlaces = animatedHarness.calls.setProps
    .at(-1)
    .layers.find((candidate) => candidate.props.id === DECK_WORLD_LAYER_IDS.places);
  assert.deepEqual(animatedPlaces.props.transitions, {
    getLineColor: 120,
    getFillColor: 120,
  });

  globalThis.matchMedia = (query) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
  });
  const reducedHarness = harness();
  const reduced = new DeckWorldSurface({}, reducedHarness.runtime);
  reduced.setProjection(projection());
  const reducedPlaces = reducedHarness.calls.setProps
    .at(-1)
    .layers.find((candidate) => candidate.props.id === DECK_WORLD_LAYER_IDS.places);
  assert.equal(reducedPlaces.props.transitions, undefined);
});

test("temporal relationship joins and disconnects remain perceptible for at least three seconds", () => {
  assert.ok(WORLD_TEMPORAL_RELATION_TRANSITION_MS >= 3_000);

  const { calls, runtime, setPickResult } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());

  const joinedLayer = calls.setProps.at(-1).layers.find(
    (candidate) => candidate.props.id === DECK_WORLD_LAYER_IDS.relationships,
  );
  assert.ok(joinedLayer);
  assert.equal(
    joinedLayer.props.transitions.getColor.duration,
    WORLD_TEMPORAL_RELATION_TRANSITION_MS,
  );
  assert.equal(
    joinedLayer.props.transitions.getWidth.duration,
    WORLD_TEMPORAL_RELATION_TRANSITION_MS,
  );

  const joined = joinedLayer.props.data[0];
  const joinedColor = joinedLayer.props.getColor(joined);
  const joinedWidth = joinedLayer.props.getWidth(joined);
  assert.equal(joined.kind, "relationship");
  assert.equal(joined.relationshipId, "meeting");
  assert.equal(joinedColor[3], 215);
  assert.ok(joinedWidth > 0);
  assert.equal(joinedLayer.props.transitions.getColor.enter(joinedColor)[3], 0);
  assert.equal(joinedLayer.props.transitions.getWidth.enter(joinedWidth), 0);

  surface.setProjection(createWorldProjection({ instances: [], edges: [] }));

  const disconnectedLayer = calls.setProps.at(-1).layers.find(
    (candidate) => candidate.props.id === DECK_WORLD_LAYER_IDS.relationships,
  );
  assert.ok(disconnectedLayer);
  assert.equal(disconnectedLayer.props.data.length, 1, "departing relation is retained visually");
  const disconnected = disconnectedLayer.props.data[0];
  assert.equal(disconnected, joined, "temporal row identity is retained across disconnection");
  assert.equal(disconnectedLayer.props.getColor(disconnected)[3], 0);
  assert.equal(disconnectedLayer.props.getWidth(disconnected), 0);
  assert.deepEqual(surface.getAccessibleSnapshot().relationships, []);

  setPickResult({
    object: disconnected,
    layer: { id: DECK_WORLD_LAYER_IDS.relationships },
    x: 0,
    y: 0,
  });
  assert.equal(
    surface.pick({ x: 0, y: 0 }),
    null,
    "departing ghost is never logically pickable",
  );

  surface.setProjection(projection());
  const rejoinedLayer = calls.setProps.at(-1).layers.find(
    (candidate) => candidate.props.id === DECK_WORLD_LAYER_IDS.relationships,
  );
  assert.equal(rejoinedLayer.props.data.length, 1);
  assert.equal(rejoinedLayer.props.data[0], joined, "rejoining reuses the same transition slot");
  assert.equal(rejoinedLayer.props.getColor(rejoinedLayer.props.data[0])[3], 215);
});

test("reduced motion keeps the three-second temporal fade without line-width motion", (t) => {
  const originalMatchMedia = globalThis.matchMedia;
  globalThis.matchMedia = (query) => ({ matches: query === "(prefers-reduced-motion: reduce)" });
  t.after(() => {
    globalThis.matchMedia = originalMatchMedia;
  });

  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());

  const joinedLayer = calls.setProps.at(-1).layers.find(
    (candidate) => candidate.props.id === DECK_WORLD_LAYER_IDS.relationships,
  );
  assert.ok(joinedLayer);
  const joined = joinedLayer.props.data[0];
  const width = joinedLayer.props.getWidth(joined);
  assert.equal(joinedLayer.props.transitions.getWidth.enter(width), width);
  assert.equal(
    joinedLayer.props.transitions.getColor.duration,
    WORLD_TEMPORAL_RELATION_TRANSITION_MS,
  );

  surface.setProjection(createWorldProjection({ instances: [], edges: [] }));
  const disconnectedLayer = calls.setProps.at(-1).layers.find(
    (candidate) => candidate.props.id === DECK_WORLD_LAYER_IDS.relationships,
  );
  assert.ok(disconnectedLayer);
  const disconnected = disconnectedLayer.props.data[0];
  assert.ok(disconnectedLayer.props.getWidth(disconnected) > 0);
  assert.equal(disconnectedLayer.props.getColor(disconnected)[3], 0);
});

test("DeckWorldSurface renders places, globe-visible paths, and elevated entity instances", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);

  surface.setProjection(projection());

  const render = calls.setProps.at(-1);
  assert.ok(render);
  // Geometry layers, place-to-entity tethers and the directed-relationship
  // marker layer; this fake runtime has no text support, so no label layer.
  assert.equal(render.layers.length, 5);

  const [places, relationships, entities, tethers, directions] = render.layers;
  assert.equal(tethers.props.id, DECK_WORLD_LAYER_IDS.tethers);
  assert.equal(tethers.props.pickable, false);
  assert.ok(tethers.props.data.length > 0, "floating entities hang from their place");
  assert.equal(directions.props.id, DECK_WORLD_LAYER_IDS.relationshipDirections);
  assert.equal(places.props.id, DECK_WORLD_LAYER_IDS.places);
  assert.equal(relationships.props.id, DECK_WORLD_LAYER_IDS.relationships);
  assert.equal(entities.props.id, DECK_WORLD_LAYER_IDS.entities);

  assert.deepEqual(places.props.data[0].position, [18.0686, 59.3293, 20]);
  // Places sit on the terrain (20 m); entities float clearly above it at a
  // constant on-screen height, with only a damped share of their simulated
  // altitude (1000 m vs 1200 m) so heights stay similar.
  const [alice, bob] = entities.props.data;
  assert.deepEqual(alice.position.slice(0, 2), [18.0686, 59.3293]);
  assert.ok(alice.position[2] > 1020, `entity floats above the place (${alice.position[2]})`);
  assert.ok(bob.position[0] > 18.0686);
  assert.ok(bob.position[2] > alice.position[2], "higher simulated altitude stays higher");
  assert.ok(bob.position[2] - alice.position[2] <= 200 * 0.15 + 1e-6, "altitude variety is damped");

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

test("WorldSurface applies force deltas without reframing and skips unchanged layer data", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime, {
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: 7,
    bearing: 0,
    pitch: 20,
  });
  const initial = projection();
  surface.setProjection(initial);
  const beforeCamera = surface.getCamera();
  const beforeRender = calls.setProps.at(-1);
  const beforePlaces = beforeRender.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.places,
  );
  const beforeEntities = beforeRender.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities,
  );

  const next = createWorldProjection({
    instances: initial.instances.map((instance) =>
      instance.canonicalId === "bob"
        ? createProjectedWorldInstance({
            ...instance,
            localOffset: { eastMeters: 600, northMeters: 0 },
          })
        : instance,
    ),
    edges: initial.edges,
  });

  surface.applyProjectionDelta(diffWorldProjection(initial, next));

  assert.deepEqual(surface.getCamera(), beforeCamera);
  const afterRender = calls.setProps.at(-1);
  const afterPlaces = afterRender.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.places,
  );
  const afterEntities = afterRender.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities,
  );
  const beforeBob = beforeEntities.props.data.find((datum) => datum.entityId === "bob");
  const afterBob = afterEntities.props.data.find((datum) => datum.entityId === "bob");

  assert.notDeepEqual(afterBob.position, beforeBob.position);
  assert.equal(typeof afterPlaces.props.dataComparator, "function");
  assert.equal(
    afterPlaces.props.dataComparator(afterPlaces.props.data, beforePlaces.props.data),
    true,
    "unchanged geographic place data stays GPU-stable during force deltas",
  );
  assert.equal(
    afterEntities.props.dataComparator(afterEntities.props.data, beforeEntities.props.data),
    false,
    "changed entity geometry invalidates only the dynamic topology layer",
  );
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

test("hover and selection emphasize without changing graph geometry, and repeated click toggles selection", () => {
  const { calls, runtime } = harness();
  const container = { style: {} };
  const surface = new DeckWorldSurface(container, runtime);
  surface.setProjection(projection());

  const initial = calls.setProps.at(-1);
  const initialEntitiesLayer = initial.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities,
  );
  const initialRelationshipsLayer = initial.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.relationships,
  );
  const initialPlacesLayer = initial.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.places,
  );
  const initialEntityGeometry = initialEntitiesLayer.props.data.map((datum) => ({
    id: datum.entityId,
    position: datum.position,
    radius: initialEntitiesLayer.props.getRadius(datum),
  }));
  const initialRelationship = initialRelationshipsLayer.props.data.find(
    (datum) => datum.relationshipId === "meeting",
  );
  const initialRelationshipWidth = initialRelationshipsLayer.props.getWidth(initialRelationship);
  const initialRelationshipAlpha = initialRelationshipsLayer.props.getColor(initialRelationship)[3];
  const initialPlaceGeometry = initialPlacesLayer.props.data.map((datum) => ({
    id: datum.placeId,
    position: datum.position,
    radius: initialPlacesLayer.props.getRadius(datum),
  }));

  const aliceId = worldInstanceId("alice", "meeting");
  const entityPick = {
    object: {
      kind: "entity",
      entityId: "alice",
      worldInstanceId: aliceId,
    },
  };

  calls.deckProps.onHover(entityPick);

  let render = calls.setProps.at(-1);
  let entitiesLayer = render.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities,
  );
  let relationshipsLayer = render.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.relationships,
  );
  let placesLayer = render.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.places,
  );
  let entities = entitiesLayer.props.data;
  let relationship = relationshipsLayer.props.data.find(
    (datum) => datum.relationshipId === "meeting",
  );

  assert.equal(entities.find((datum) => datum.entityId === "alice").emphasized, true);
  assert.equal(entities.find((datum) => datum.entityId === "bob").emphasized, true);
  assert.deepEqual(
    entities.map((datum) => ({
      id: datum.entityId,
      position: datum.position,
      radius: entitiesLayer.props.getRadius(datum),
    })),
    initialEntityGeometry,
  );
  assert.deepEqual(
    placesLayer.props.data.map((datum) => ({
      id: datum.placeId,
      position: datum.position,
      radius: placesLayer.props.getRadius(datum),
    })),
    initialPlaceGeometry,
  );
  assert.equal(relationshipsLayer.props.getWidth(relationship), initialRelationshipWidth);
  assert.ok(relationshipsLayer.props.getColor(relationship)[3] > initialRelationshipAlpha);
  assert.equal(container.style.cursor, "pointer");
  assert.equal(surface.getAccessibleSnapshot().selection, null);

  calls.deckProps.onClick(entityPick);

  render = calls.setProps.at(-1);
  entitiesLayer = render.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities,
  );
  relationshipsLayer = render.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.relationships,
  );
  entities = entitiesLayer.props.data;
  relationship = relationshipsLayer.props.data.find(
    (datum) => datum.relationshipId === "meeting",
  );

  const alice = entities.find((datum) => datum.entityId === "alice");
  const bob = entities.find((datum) => datum.entityId === "bob");
  assert.equal(alice.selected, true);
  assert.equal(alice.emphasized, true);
  assert.equal(bob.selected, false);
  assert.equal(bob.emphasized, true);
  assert.equal(relationshipsLayer.props.getWidth(relationship), initialRelationshipWidth);
  assert.ok(relationshipsLayer.props.getColor(relationship)[3] > initialRelationshipAlpha);
  assert.deepEqual(surface.getAccessibleSnapshot().selection, {
    kind: "entity",
    id: "alice",
  });

  calls.deckProps.onClick(entityPick);
  assert.equal(surface.getAccessibleSnapshot().selection, null);

  calls.deckProps.onHover({});
  render = calls.setProps.at(-1);
  entities = render.layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities,
  ).props.data;
  assert.equal(container.style.cursor, "");
  assert.ok(entities.every((datum) => datum.emphasized === false));
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
  assert.deepEqual(calls.unprojected.at(-1), [[118.0686, 259.3293], { targetZ: 1200 }]);
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
  assert.throws(() => surface.unproject({ x: Number.NaN, y: 0 }, 1000), /screen point/);
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
      DECK_WORLD_LAYER_IDS.entityIcons,
      DECK_WORLD_LAYER_IDS.entities,
      DECK_WORLD_LAYER_IDS.relationshipDirections,
      DECK_WORLD_LAYER_IDS.relationships,
      DECK_WORLD_LAYER_IDS.places,
    ],
  });
});

const OVERVIEW_CAMERA = Object.freeze({
  longitude: 0,
  latitude: 20,
  zoom: 1,
  bearing: 0,
  pitch: 20,
});

test("focus moves the globe camera to a rendered canonical target", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime, OVERVIEW_CAMERA);
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

test("double-click/double-tap focuses the canonical entity picked under the pointer (issue #445 Priority 4)", () => {
  const { calls, runtime, setPickResult } = harness();
  const listeners = new Map();
  const container = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const surface = new DeckWorldSurface(container, runtime, OVERVIEW_CAMERA);
  surface.setProjection(projection());

  setPickResult({
    layer: { id: DECK_WORLD_LAYER_IDS.entities },
    object: {
      kind: "entity",
      entityId: "alice",
      worldInstanceId: worldInstanceId("alice", "meeting"),
    },
  });

  listeners.get("dblclick")({ offsetX: 40, offsetY: 60 });

  assert.deepEqual(calls.pickOptions.at(-1), {
    x: 40,
    y: 60,
    radius: 22,
    unproject3D: true,
    layerIds: [
      DECK_WORLD_LAYER_IDS.entityIcons,
      DECK_WORLD_LAYER_IDS.entities,
      DECK_WORLD_LAYER_IDS.relationshipDirections,
      DECK_WORLD_LAYER_IDS.relationships,
      DECK_WORLD_LAYER_IDS.places,
    ],
  });
  assert.deepEqual(calls.setProps.at(-1).viewState, {
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: 5,
    bearing: 0,
    pitch: 20,
  });
});

test("double-click/double-tap on empty space does not move the camera", () => {
  const { calls, runtime, setPickResult } = harness();
  const listeners = new Map();
  const container = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener() {},
  };
  const surface = new DeckWorldSurface(container, runtime);
  surface.setProjection(projection());

  setPickResult(null);
  const setPropsCountBefore = calls.setProps.length;
  listeners.get("dblclick")({ offsetX: 40, offsetY: 60 });

  assert.equal(calls.setProps.length, setPropsCountBefore);
});

test("destroying the surface removes the double-click listener", () => {
  const { runtime } = harness();
  const listeners = new Map();
  const container = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
  };
  const surface = new DeckWorldSurface(container, runtime);
  assert.ok(listeners.has("dblclick"));

  surface.destroy();
  assert.ok(!listeners.has("dblclick"));
});

function keyboardHarness(runtime) {
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
  return { surface, listeners };
}

function keyEvent(key, extra = {}) {
  let defaultPrevented = false;
  return {
    key,
    shiftKey: false,
    ...extra,
    preventDefault() {
      defaultPrevented = true;
    },
    get defaultPrevented() {
      return defaultPrevented;
    },
  };
}

function selectedIds(render) {
  const [places, relationships, entities] = render.layers;
  return {
    place: places.props.data.find((datum) => datum.selected)?.placeId ?? null,
    relationship: relationships.props.data.find((datum) => datum.selected)?.relationshipId ?? null,
    entity: entities.props.data.find((datum) => datum.selected)?.entityId ?? null,
  };
}

test("Tab cycles selection through places, then relationships, then entities (issue #445 Priority 4)", () => {
  const { calls, runtime } = harness();
  const { surface, listeners } = keyboardHarness(runtime);
  surface.setProjection(projection());
  const onKeyDown = listeners.get("keydown");

  onKeyDown(keyEvent("Tab"));
  assert.deepEqual(selectedIds(calls.setProps.at(-1)), {
    place: "stockholm",
    relationship: null,
    entity: null,
  });

  onKeyDown(keyEvent("Tab"));
  assert.deepEqual(selectedIds(calls.setProps.at(-1)), {
    place: null,
    relationship: "meeting",
    entity: null,
  });

  onKeyDown(keyEvent("Tab"));
  assert.deepEqual(selectedIds(calls.setProps.at(-1)), {
    place: null,
    relationship: null,
    entity: "alice",
  });

  onKeyDown(keyEvent("Tab"));
  assert.deepEqual(selectedIds(calls.setProps.at(-1)), {
    place: null,
    relationship: null,
    entity: "bob",
  });

  // Wraps back to the first candidate (place "stockholm").
  onKeyDown(keyEvent("Tab"));
  assert.deepEqual(selectedIds(calls.setProps.at(-1)), {
    place: "stockholm",
    relationship: null,
    entity: null,
  });
});

test("Shift+Tab cycles backward and wraps to the last candidate", () => {
  const { calls, runtime } = harness();
  const { surface, listeners } = keyboardHarness(runtime);
  surface.setProjection(projection());
  const onKeyDown = listeners.get("keydown");

  onKeyDown(keyEvent("Tab", { shiftKey: true }));
  assert.deepEqual(selectedIds(calls.setProps.at(-1)), {
    place: null,
    relationship: null,
    entity: "alice",
  });

  onKeyDown(keyEvent("Tab", { shiftKey: true }));
  assert.deepEqual(selectedIds(calls.setProps.at(-1)), {
    place: null,
    relationship: "meeting",
    entity: null,
  });
});

test("Enter focuses the camera on the currently cycled selection", () => {
  const { calls, runtime } = harness();
  const { surface, listeners } = keyboardHarness(runtime);
  surface.setProjection(projection());
  const onKeyDown = listeners.get("keydown");

  // Cycle until an entity is selected (entities are last in candidate order).
  onKeyDown(keyEvent("Tab"));
  onKeyDown(keyEvent("Tab"));
  const enterEvent = keyEvent("Enter");
  const setPropsBefore = calls.setProps.length;
  onKeyDown(enterEvent);

  assert.ok(enterEvent.defaultPrevented);
  assert.ok(calls.setProps.length > setPropsBefore);
});

test("Enter is a no-op when nothing is selected", () => {
  const { calls, runtime } = harness();
  const { surface, listeners } = keyboardHarness(runtime);
  surface.setProjection(projection());
  const onKeyDown = listeners.get("keydown");

  const before = calls.setProps.length;
  onKeyDown(keyEvent("Enter"));
  assert.equal(calls.setProps.length, before);
});

test("Tab is a no-op with no renderable candidates", () => {
  const { calls, runtime } = harness();
  const { listeners } = keyboardHarness(runtime);
  const onKeyDown = listeners.get("keydown");

  const before = calls.setProps.length;
  const event = keyEvent("Tab");
  onKeyDown(event);
  assert.equal(calls.setProps.length, before);
  assert.ok(!event.defaultPrevented);
});

test("destroying the surface removes the keydown listener", () => {
  const { runtime } = harness();
  const { surface, listeners } = keyboardHarness(runtime);
  assert.ok(listeners.has("keydown"));

  surface.destroy();
  assert.ok(!listeners.has("keydown"));
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

  const localSwitch = calls.setProps.find((props) => props.views?.[0]?.type === "map");
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

  const globeSwitches = calls.setProps.filter((props) => props.views?.[0]?.type === "globe");
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

test("close-zoom node drag locks the globe camera until release", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());
  surface.setCamera({
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: WORLD_CLOSE_DRAG_CAMERA_LOCK_ZOOM + 1,
    bearing: 0,
    pitch: 20,
  });

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
    cancel() {},
  });

  const entityLayer = calls.scatterLayers
    .filter((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities)
    .at(-1);
  const alice = entityLayer.props.data.find((datum) => datum.entityId === "alice");
  const stopped = [];
  const dragEvent = {
    srcEvent: { pointerId: 17 },
    stopPropagation() {
      stopped.push(true);
    },
  };

  assert.equal(
    entityLayer.props.onDragStart({ object: alice, x: 118.0786, y: 259.3393 }, dragEvent),
    true,
  );
  const locked = surface.getCamera();

  calls.deckProps.onViewStateChange({
    viewState: {
      longitude: 40,
      latitude: 10,
      zoom: WORLD_CLOSE_DRAG_CAMERA_LOCK_ZOOM + 2,
      bearing: 35,
      pitch: 30,
    },
  });
  assert.deepEqual(surface.getCamera(), locked);
  assert.deepEqual(calls.setProps.at(-1).viewState, locked);

  assert.equal(
    entityLayer.props.onDrag({ object: alice, x: 118.0886, y: 259.3493 }, dragEvent),
    true,
  );
  assert.ok(stopped.length >= 2, "drag start and moves suppress globe-controller propagation");

  assert.equal(
    entityLayer.props.onDragEnd({ object: alice, x: 118.0886, y: 259.3493 }, dragEvent),
    true,
  );

  calls.deckProps.onViewStateChange({
    viewState: {
      longitude: 20,
      latitude: 30,
      zoom: WORLD_CLOSE_DRAG_CAMERA_LOCK_ZOOM + 1,
      bearing: 5,
      pitch: 25,
    },
  });
  assert.deepEqual(surface.getCamera(), {
    longitude: 20,
    latitude: 30,
    zoom: WORLD_CLOSE_DRAG_CAMERA_LOCK_ZOOM + 1,
    bearing: 5,
    pitch: 25,
  });
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
    begin() {
      return true;
    },
    update() {
      return true;
    },
    release() {
      return true;
    },
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
  assert.equal(secondEntities.find((datum) => datum.entityId === "entity-10").selected, true);
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

function harnessWithLocalView() {
  const built = harness();
  const localViews = [];
  built.runtime.createMapView = (props) => {
    const view = { type: "map", props };
    localViews.push(view);
    return view;
  };
  return { ...built, localViews };
}

test("crossing into local precision mode preserves the current canonical selection", () => {
  const { runtime } = harnessWithLocalView();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());
  surface.setSelection({ kind: "entity", id: "alice" });

  surface.setCamera({ longitude: 18.0686, latitude: 59.3293, zoom: 11.5, bearing: 0, pitch: 20 });

  assert.deepEqual(surface.getAccessibleSnapshot().selection, { kind: "entity", id: "alice" });

  surface.setCamera({ longitude: 18.0686, latitude: 59.3293, zoom: 10.5, bearing: 0, pitch: 20 });

  assert.deepEqual(surface.getAccessibleSnapshot().selection, { kind: "entity", id: "alice" });
});

test("a globe<->local view switch carries the current camera into the new view's props", () => {
  const { calls, runtime } = harnessWithLocalView();
  const surface = new DeckWorldSurface({}, runtime);

  const nextCamera = { longitude: 18.0686, latitude: 59.3293, zoom: 11.5, bearing: 0, pitch: 20 };
  surface.setCamera(nextCamera);

  const viewSwitch = calls.setProps.find((props) => props.views?.[0]?.type === "map");
  assert.ok(viewSwitch);
  assert.deepEqual(viewSwitch.viewState, nextCamera);
});

test("a spatial-mode crossing with no drag in flight does not touch the drag sink", () => {
  const { runtime } = harnessWithLocalView();
  const surface = new DeckWorldSurface({}, runtime);

  const dragCalls = [];
  surface.setNodeDragSink({
    begin: () => true,
    update: () => true,
    release: () => true,
    cancel: (reason) => dragCalls.push(reason),
  });

  surface.setCamera({ longitude: 18.0686, latitude: 59.3293, zoom: 11.5, bearing: 0, pitch: 20 });

  assert.deepEqual(dragCalls, []);
});

test("an in-flight node drag is cleanly cancelled when a spatial-mode crossing occurs", () => {
  const { calls, runtime } = harnessWithLocalView();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());

  const dragCalls = [];
  surface.setNodeDragSink({
    begin: () => true,
    update: () => true,
    release: () => true,
    cancel: (reason) => dragCalls.push(reason),
  });

  const entityLayer = calls.scatterLayers
    .filter((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities)
    .at(-1);
  const alice = entityLayer.props.data.find((datum) => datum.entityId === "alice");
  const begun = entityLayer.props.onDragStart(
    { object: alice, x: 118.0786, y: 259.3393 },
    { srcEvent: { pointerId: 3 } },
  );
  assert.equal(begun, true);

  surface.setCamera({ longitude: 18.0686, latitude: 59.3293, zoom: 11.5, bearing: 0, pitch: 20 });

  assert.deepEqual(dragCalls, ["pointercancel"]);

  // The cancelled drag's pointer no longer owns anything, so a further
  // update for that pointer is rejected rather than silently continuing a
  // drag that was supposed to have ended.
  assert.equal(
    entityLayer.props.onDrag({ object: alice, x: 5, y: 6 }, { srcEvent: { pointerId: 3 } }),
    false,
  );
});

test("a spatial-mode crossing alone does not re-render or invalidate memoized datums", () => {
  const { calls, runtime } = harnessWithLocalView();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());
  surface.setSelection({ kind: "entity", id: "alice" });
  // Start just below the local-entry zoom (11.5). Local offsets are
  // magnified in quarter-octave bands of zoom; for this fixture (one 150 m
  // offset at 59.3°N) zooms 11.463–11.713 share a band, so 11.49 and 11.5
  // differ only by the spatial-mode crossing under test.
  surface.setCamera({ longitude: 18.0686, latitude: 59.3293, zoom: 11.49, bearing: 0, pitch: 20 });

  const beforeEntities = calls.setProps.filter((props) => props.layers).at(-1).layers[2].props.data;
  const renderCallCountBefore = calls.setProps.filter((props) => props.layers).length;

  surface.setCamera({ longitude: 18.0686, latitude: 59.3293, zoom: 11.5, bearing: 0, pitch: 20 });

  const renderCallCountAfter = calls.setProps.filter((props) => props.layers).length;
  assert.equal(renderCallCountAfter, renderCallCountBefore);

  // Nothing re-rendered, so re-deriving datums from unchanged projection and
  // selection state reuses the same memoized datum object references.
  const afterEntities = surface
    .getAccessibleSnapshot()
    .entities.map((entry) => entry.worldInstanceId);
  assert.deepEqual(
    afterEntities.sort(),
    beforeEntities.map((datum) => datum.worldInstanceId).sort(),
  );
  assert.equal(
    calls.setProps.filter((props) => props.layers).at(-1).layers[2].props.data,
    beforeEntities,
  );
});

test("getAccessibleSnapshot derives entities/places/relationships/selection from projection state", () => {
  const { runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());
  surface.setSelection({ kind: "entity", id: "alice" });

  const snapshot = surface.getAccessibleSnapshot();
  assert.equal(snapshot.places.length, 1);
  assert.equal(snapshot.places[0].placeId, "stockholm");
  assert.equal(snapshot.relationships.length, 1);
  assert.equal(snapshot.relationships[0].relationshipId, "meeting");
  assert.equal(snapshot.entities.length, 2);

  const alice = snapshot.entities.find((entity) => entity.entityId === "alice");
  const bob = snapshot.entities.find((entity) => entity.entityId === "bob");
  assert.equal(alice.selected, true);
  assert.equal(bob.selected, false);
  assert.deepEqual(snapshot.selection, { kind: "entity", id: "alice" });
});

test("getAccessibleSnapshot never reflects GPU/layer state, only projection/selection", () => {
  const { calls, runtime, setPickResult } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setProjection(projection());

  // Simulate a pick/hover-style GPU interaction that never touches
  // #projection or #selection: the accessible snapshot must be unaffected.
  setPickResult({
    object: { kind: "entity", entityId: "alice", worldInstanceId: "alice::meeting" },
  });
  surface.pick({ x: 1, y: 2 });

  const snapshot = surface.getAccessibleSnapshot();
  assert.equal(
    snapshot.entities.every((entity) => entity.selected === false),
    true,
  );
  assert.equal(snapshot.selection, null);
  assert.ok(calls.pickOptions.length >= 1);
});

test("an off-screen live region mirrors the accessible snapshot when the container supports DOM", () => {
  const { runtime } = harness();

  const region = { attrs: {}, className: "", textContent: "", removed: false };
  const fakeDocument = {
    createElement: () => ({
      setAttribute(name, value) {
        region.attrs[name] = value;
      },
      set className(value) {
        region.className = value;
      },
      get className() {
        return region.className;
      },
      set textContent(value) {
        region.textContent = value;
      },
      get textContent() {
        return region.textContent;
      },
      remove() {
        region.removed = true;
      },
    }),
  };
  const container = { ownerDocument: fakeDocument, appendChild: () => {} };

  const surface = new DeckWorldSurface(container, runtime);
  assert.equal(region.attrs["aria-live"], "polite");
  assert.equal(region.className, "sr-only");

  surface.setProjection(projection());
  assert.match(region.textContent, /1 place/);
  assert.match(region.textContent, /1 relationship/);
  assert.match(region.textContent, /2 entities/);
  assert.match(region.textContent, /No selection/);

  surface.setSelection({ kind: "entity", id: "alice" });
  assert.match(region.textContent, /Selected entity alice/);

  surface.destroy();
  assert.equal(region.removed, true);
});

test("user camera moves are handed back to the controlled deck so the globe rotates", () => {
  const { calls, runtime } = harness();
  const surface = new DeckWorldSurface({}, runtime, OVERVIEW_CAMERA);
  surface.setProjection(projection());
  const before = calls.setProps.length;

  calls.deckProps.onViewStateChange({
    viewState: { longitude: 40, latitude: 10, zoom: OVERVIEW_CAMERA.zoom, bearing: 0, pitch: 0 },
  });

  const pushed = calls.setProps.slice(before).at(-1);
  assert.ok(pushed?.viewState, "the new camera is pushed back to deck");
  assert.equal(pushed.viewState.longitude, 40);
  assert.equal(surface.getCamera().longitude, 40);
});
