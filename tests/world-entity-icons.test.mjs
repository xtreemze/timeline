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
        // Wraps so large fixtures stay on valid latitudes.
        latitude: 40 + (Math.floor(index / 60) % 80) * 0.5,
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

test("every entity renders as a styled node marker that picks as the entity", () => {
  const h = harness();
  const surface = new DeckWorldSurface({}, h.runtime, CAMERA);
  surface.setProjection(
    createWorldProjection({
      instances: [entity(0, "person"), entity(1, "spaceship"), entity(2, "object")],
      edges: [],
    }),
  );

  const icons = h.lastLayers().find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entityIcons);
  assert.ok(icons, "an entity marker layer is rendered");
  assert.equal(icons.type, "icon");
  assert.equal(icons.props.parameters.cullMode, "none");
  assert.equal(icons.props.pickable, true);

  // The marker is the node body, so unknown kinds get one too (no glyph).
  const byEntity = new Map(icons.props.data.map((datum) => [datum.entityId, datum]));
  assert.deepEqual([...byEntity.keys()].sort(), ["entity-0", "entity-1", "entity-2"]);
  const person = icons.props.getIcon(byEntity.get("entity-0"));
  assert.match(person.id, /^lum-node:circle\|/);
  assert.equal(person.mask, false, "markers carry their own colours");
  assert.match(person.url, /^data:image\/svg\+xml/);
  assert.match(decodeURIComponent(person.url), /<path d=/, "known kinds draw their glyph");
  const unknown = icons.props.getIcon(byEntity.get("entity-1"));
  assert.doesNotMatch(
    decodeURIComponent(unknown.url),
    /<g transform/,
    "unknown kinds draw no glyph",
  );
  assert.ok(icons.props.getSize(byEntity.get("entity-0")) > 0);
  assert.equal(byEntity.get("entity-0").kind, "entity", "markers pick as the canonical entity");

  surface.pick({ x: 1, y: 1 });
  assert.ok(h.pickOptions().layerIds.includes(DECK_WORLD_LAYER_IDS.entityIcons));
});

test("dense marker load follows the LOD budget but keeps the selected entity", () => {
  const h = harness();
  // Dense (clustering) scale: markers fall back to the label budget there.
  const count = 26_000;
  const surface = new DeckWorldSurface({}, h.runtime, { ...CAMERA, zoom: 5 });
  const instances = Array.from({ length: count }, (_, index) => entity(index, "person"));
  surface.setProjection(createWorldProjection({ instances, edges: [] }));
  surface.setSelection({ kind: "entity", id: `entity-${count - 1}` });

  const icons = h.lastLayers().find((layer) => layer.props.id === DECK_WORLD_LAYER_IDS.entityIcons);
  const ids = icons.props.data.map((datum) => datum.entityId);
  assert.ok(ids.length < count);
  assert.ok(ids.includes(`entity-${count - 1}`));
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
