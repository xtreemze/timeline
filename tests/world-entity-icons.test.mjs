import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createDeckWorldRuntime } from "../site/world/deck-world-runtime.ts";
import { DECK_WORLD_LAYER_IDS, DeckWorldSurface } from "../site/world/deck-world-surface.ts";
import { worldEntityIconName } from "../site/world/world-entity-icon.ts";
import {
  createProjectedWorldInstance,
  createWorldProjection,
  worldInstanceId,
} from "../src/projection/world-projection.ts";

function harness({ icons = true } = {}) {
  const setProps = [];
  let pickOptions = null;
  const runtime = {
    createGlobeView: (props) => ({ type: "globe", props }),
    createScatterplotLayer: (props) => ({ type: "scatter", props }),
    createPathLayer: (props) => ({ type: "path", props }),
    ...(icons ? { createIconLayer: (props) => ({ type: "icon", props }) } : {}),
    createDeck() {
      return {
        setProps(props) {
          setProps.push(props);
        },
        pickObject(options) {
          pickOptions = options;
          return null;
        },
        getViewports: () => [],
        redraw() {},
        finalize() {},
      };
    },
  };
  return {
    runtime,
    lastLayers: () => setProps.filter((props) => props.layers).at(-1).layers,
    pickOptions: () => pickOptions,
  };
}

function entity(index, kind, overrides = {}) {
  const id = `entity-${index}`;
  return createProjectedWorldInstance({
    id: worldInstanceId(id, "occurrence"),
    canonicalId: id,
    ...(kind ? { kind } : {}),
    occurrenceId: "occurrence",
    geographicAnchors: [
      {
        placeId: `place-${index}`,
        longitude: 10 + (index % 60) * 0.5,
        latitude: 40 + Math.floor(index / 60) * 0.5,
        influence: 1,
      },
    ],
    temporalWeight: 1,
    visualWeight: 0.1,
    retained: false,
    ...overrides,
  });
}

const CAMERA = Object.freeze({ longitude: 12, latitude: 41, zoom: 5, bearing: 0, pitch: 0 });

test("entity kinds map to the app's semantic icon vocabulary; unknown kinds get none", () => {
  assert.equal(worldEntityIconName("person"), "person");
  assert.equal(worldEntityIconName("Person"), "person");
  assert.equal(worldEntityIconName("object"), "object");
  assert.equal(worldEntityIconName("group"), "group");
  assert.equal(worldEntityIconName("organization"), "group");
  assert.equal(worldEntityIconName("document"), "evidence");
  assert.equal(worldEntityIconName("pdf"), "evidence");
  assert.equal(worldEntityIconName("spaceship"), null);
  assert.equal(worldEntityIconName(undefined), null);
});

test("production bindings supply a real deck.gl IconLayer", async () => {
  const bindings = await readFile(
    new URL("../site/world/deck-world-bindings.ts", import.meta.url),
    "utf8",
  );
  assert.match(bindings, /import \{[^}]*\bIconLayer\b[^}]*\} from "@deck\.gl\/layers"/);
  const runtime = createDeckWorldRuntime({
    deck: () => ({}),
    globeView: () => ({}),
    scatterplotLayer: () => ({}),
    pathLayer: () => ({}),
    iconLayer: (props) => ({ type: "icon", props }),
  });
  assert.equal(typeof runtime.createIconLayer, "function");
});

test("kind icons render from projection metadata as tintable masks and pick as the entity", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, CAMERA);
  surface.setProjection(
    createWorldProjection({
      instances: [entity(0, "person"), entity(1, "spaceship"), entity(2, "object")],
      edges: [],
    }),
  );

  const icons = h.lastLayers().find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entityIcons);
  assert.ok(icons, "an entity icon layer is rendered");
  assert.equal(icons.type, "icon");
  assert.equal(icons.props.parameters.cullMode, "none");
  assert.equal(icons.props.pickable, true);

  const byEntity = new Map(icons.props.data.map((datum) => [datum.entityId, datum]));
  assert.deepEqual([...byEntity.keys()].sort(), ["entity-0", "entity-2"]);
  const personIcon = icons.props.getIcon(byEntity.get("entity-0"));
  assert.equal(personIcon.id, "lum-icon:person");
  assert.equal(personIcon.mask, true);
  assert.match(personIcon.url, /^data:image\/svg\+xml/);
  assert.equal(byEntity.get("entity-0").kind, "entity", "icons pick as the canonical entity");

  surface.pick({ x: 1, y: 1 });
  assert.ok(h.pickOptions().layerIds.includes(DECK_WORLD_LAYER_IDS.entityIcons));
});

test("dense icon load follows the LOD budget but keeps the selected entity", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, { ...CAMERA, zoom: 1 });
  const instances = Array.from({ length: 2_000 }, (_, index) => entity(index, "person"));
  surface.setProjection(createWorldProjection({ instances, edges: [] }));
  surface.setSelection({ kind: "entity", id: "entity-1999" });

  const icons = h.lastLayers().find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entityIcons);
  const ids = icons.props.data.map((datum) => datum.entityId);
  assert.ok(ids.length < 2_000);
  assert.ok(ids.includes("entity-1999"));
});

test("a runtime without icon support renders no icon layer", () => {
  const h = harness({ icons: false });
  const surface = new DeckWorldSurface({}, h.runtime, CAMERA);
  surface.setProjection(createWorldProjection({ instances: [entity(0, "person")], edges: [] }));
  assert.equal(
    h.lastLayers().find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entityIcons),
    undefined,
  );
});
