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
  const setProps = [];
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
        pickObject() {
          return null;
        },
        getViewports() {
          return [];
        },
        redraw() {},
        finalize() {},
      };
    },
  };
  return { runtime, setProps };
}

function labeledProjection(count = 2) {
  const instances = [];
  const edges = [];

  for (let index = 0; index < count; index += 1) {
    const entity = `entity-${index}`;
    const occurrence = `occurrence-${index}`;
    instances.push(
      createProjectedWorldInstance({
        id: worldInstanceId(entity, occurrence),
        canonicalId: entity,
        label: `Entity ${index}`,
        kind: index === 0 ? "person" : "organization",
        occurrenceId: occurrence,
        geographicAnchors: [
          {
            placeId: "stockholm",
            label: "Stockholm",
            longitude: 18.0686 + index * 0.01,
            latitude: 59.3293 + index * 0.01,
            influence: 1,
          },
        ],
        temporalWeight: 1,
        visualWeight: index === 0 ? 1 : 0.1,
        retained: false,
        visualAltitude: 1000,
      }),
    );
  }

  if (count >= 2) {
    edges.push(
      createProjectedWorldEdge({
        id: "meeting",
        label: "met",
        sourceInstanceId: instances[0].id,
        targetInstanceId: instances[1].id,
        temporalWeight: 1,
        visible: true,
        retained: false,
      }),
    );
  }

  return createWorldProjection({ instances, edges });
}

test("semantic TextLayer contains entity/place labels and visible directed relationship markers", () => {
  const { runtime, setProps } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setCamera({ longitude: 18.07, latitude: 59.33, zoom: 5, bearing: 0, pitch: 20 });
  surface.setProjection(labeledProjection());

  const render = setProps.filter((props) => props.layers).at(-1);
  const labels = render.layers.find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.labels);

  assert.ok(labels);
  const kinds = new Set(labels.props.data.map((datum) => datum.kind));
  assert.ok(kinds.has("entity-label"));
  assert.ok(kinds.has("place-label"));
  assert.ok(kinds.has("relationship-direction"));

  const direction = labels.props.data.find((datum) => datum.kind === "relationship-direction");
  assert.equal(direction.relationshipId, "meeting");
  assert.equal(direction.label, "met");
  assert.equal(direction.sourceInstanceId, worldInstanceId("entity-0", "occurrence-0"));
  assert.equal(direction.targetInstanceId, worldInstanceId("entity-1", "occurrence-1"));
  assert.match(labels.props.getText(direction), /→/);
});

test("label LOD limits dense globe text while preserving important labels at working zoom", () => {
  const { runtime, setProps } = harness();
  const surface = new DeckWorldSurface({}, runtime);
  surface.setCamera({ longitude: 18.07, latitude: 59.33, zoom: 2, bearing: 0, pitch: 20 });
  surface.setProjection(labeledProjection(1_000));

  const render = setProps.filter((props) => props.layers).at(-1);
  const labels = render.layers.find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.labels);

  assert.ok(labels);
  const entityLabels = labels.props.data.filter((datum) => datum.kind === "entity-label");
  assert.ok(entityLabels.length > 0);
  assert.ok(entityLabels.length < 1_000);
  assert.ok(entityLabels.some((datum) => datum.entityId === "entity-0"));
});
