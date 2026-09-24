import assert from "node:assert/strict";
import test from "node:test";

import { DECK_WORLD_LAYER_IDS, DeckWorldSurface } from "../site/world/deck-world-surface.ts";
import {
  worldRelationshipGraphStyle,
  WORLD_NODE_INTERACTION_DIAMETER_PX,
} from "../site/world/world-graph-style.ts";
import {
  createProjectedWorldEdge,
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function harness() {
  const renders = [];
  const runtime = {
    createGlobeView: (props) => ({ type: "globe", props }),
    createScatterplotLayer: (props) => ({ type: "scatter", props }),
    createPathLayer: (props) => ({ type: "path", props }),
    createIconLayer: (props) => ({ type: "icon", props }),
    createDeck() {
      return {
        setProps(props) {
          if (props.layers) renders.push(props.layers);
        },
        pickObject() {
          return null;
        },
        getViewports() {
          return [{
            project(position) {
              return [position[0] * 100, position[1] * 100, position[2] ?? 0];
            },
            unproject(point, options) {
              return [point[0] / 100, point[1] / 100, options?.targetZ ?? 0];
            },
          }];
        },
        redraw() {},
        finalize() {},
      };
    },
  };
  return { runtime, lastLayers: () => renders.at(-1) };
}

function projection() {
  const alice = worldInstanceId("alice", "warning");
  const acme = worldInstanceId("acme", "warning");
  return createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id: alice,
        canonicalId: "alice",
        label: "Alice",
        kind: "person",
        occurrenceId: "warning",
        geographicAnchors: [{ placeId: "p", longitude: 10, latitude: 40, influence: 1 }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
      createProjectedWorldInstance({
        id: acme,
        canonicalId: "acme",
        label: "Acme",
        kind: "organization",
        occurrenceId: "warning",
        geographicAnchors: [{ placeId: "p", longitude: 11, latitude: 40, influence: 1 }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
    ],
    edges: [
      createProjectedWorldEdge({
        id: "warning",
        label: "warned",
        sourceInstanceId: alice,
        targetInstanceId: acme,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    ],
  });
}

test("deck compatibility surface consumes the renderer-neutral semantic graph grammar", () => {
  const h = harness();
  const surface = new DeckWorldSurface(
    {},
    h.runtime,
    { longitude: 10.5, latitude: 40, zoom: 7.25, bearing: 0, pitch: 20 },
  );
  surface.setProjection(projection());

  const layers = h.lastLayers();
  const entities = layers.find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entities);
  const shapes = layers.find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entityShapes);
  const edges = layers.find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.relationships);
  const arrows = layers.find(
    (layer) => layer.props.id === DECK_WORLD_LAYER_IDS.relationshipDirections,
  );

  assert.equal(entities.props.getRadius(entities.props.data[0]), WORLD_NODE_INTERACTION_DIAMETER_PX / 2);

  const alice = shapes.props.data.find((datum) => datum.entityId === "alice");
  const acme = shapes.props.data.find((datum) => datum.entityId === "acme");
  assert.match(shapes.props.getIcon(alice).id, /^lum-node-shape:circle:person:/);
  assert.match(shapes.props.getIcon(acme).id, /^lum-node-shape:square:organization:/);

  const edge = edges.props.data[0];
  const expected = worldRelationshipGraphStyle("warned");
  assert.equal(edge.label, "warned");
  assert.deepEqual(edges.props.getColor(edge), expected.color);
  assert.equal(edges.props.getWidth(edge), expected.widthPx);

  const arrow = arrows.props.data[0];
  assert.deepEqual(arrows.props.getColor(arrow), expected.color);
  assert.equal(arrows.props.getWidth(arrow), expected.arrowWidthPx);
});

test("selection emphasizes width/border while preserving semantic relationship color", () => {
  const h = harness();
  const surface = new DeckWorldSurface(
    {},
    h.runtime,
    { longitude: 10.5, latitude: 40, zoom: 7.25, bearing: 0, pitch: 20 },
  );
  surface.setProjection(projection());
  surface.setSelection({ kind: "relationship", id: "warning" });

  const layers = h.lastLayers();
  const edges = layers.find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.relationships);
  const edge = edges.props.data[0];
  const base = worldRelationshipGraphStyle("warned");
  const selected = worldRelationshipGraphStyle("warned", true);

  assert.deepEqual(edges.props.getColor(edge).slice(0, 3), base.color.slice(0, 3));
  assert.equal(edges.props.getWidth(edge), selected.widthPx);
});
