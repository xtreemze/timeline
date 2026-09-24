import assert from "node:assert/strict";
import test from "node:test";

import { DeckWorldSurface } from "../site/world/deck-world-surface.ts";
import { fitWorldCamera } from "../src/layout/world-camera-fit.ts";
import {
  createProjectedWorldInstance,
  createWorldProjection,
} from "../src/projection/world-projection.ts";

const CURRENT = Object.freeze({ longitude: 0, latitude: 20, zoom: 1, bearing: 10, pitch: 20 });
const VIEWPORT = Object.freeze({ width: 1000, height: 600 });

test("fit centres on content, keeps bearing/pitch, and zooms to its extent", () => {
  const camera = fitWorldCamera(
    [
      [10, 50, 0],
      [20, 60, 0],
    ],
    VIEWPORT,
    CURRENT,
  );
  assert.ok(Math.abs(camera.longitude - 15) < 1e-9);
  assert.ok(Math.abs(camera.latitude - 55) < 1e-9);
  assert.equal(camera.bearing, 10);
  assert.equal(camera.pitch, 20);
  assert.ok(camera.zoom > 2 && camera.zoom < 6, `zoom ${camera.zoom}`);
});

test("fit takes the short way around the antimeridian", () => {
  const camera = fitWorldCamera(
    [
      [170, 0, 0],
      [-170, 0, 0],
    ],
    VIEWPORT,
    CURRENT,
  );
  assert.ok(Math.abs(Math.abs(camera.longitude) - 180) < 1e-9, `longitude ${camera.longitude}`);
  assert.ok(camera.zoom > 2);
});

test("a single point fits at a bounded readable detail zoom; nothing to fit returns null", () => {
  assert.equal(fitWorldCamera([[5, 5, 0]], VIEWPORT, CURRENT).zoom <= 7.25, true);
  assert.equal(fitWorldCamera([], VIEWPORT, CURRENT), null);
});

function runtime() {
  const views = [];
  return {
    views,
    createGlobeView: (props) => ({ props }),
    createScatterplotLayer: (props) => ({ props }),
    createPathLayer: (props) => ({ props }),
    createDeck() {
      return {
        setProps(props) {
          if (props.viewState) views.push(props.viewState);
        },
        pickObject: () => null,
        getViewports: () => [],
        redraw() {},
        finalize() {},
      };
    },
  };
}

function placed(longitude, latitude) {
  return createWorldProjection({
    instances: [
      createProjectedWorldInstance({
        id: `e-${longitude}::o`,
        canonicalId: `e-${longitude}`,
        occurrenceId: "o",
        geographicAnchors: [{ placeId: `p-${longitude}`, longitude, latitude, influence: 1 }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: false,
      }),
    ],
    edges: [],
  });
}

test("without a caller camera the first placed content fits the camera exactly once", () => {
  const r = runtime();
  const surface = new DeckWorldSurface({ clientWidth: 1000, clientHeight: 600 }, r);
  surface.setProjection(createWorldProjection({ instances: [], edges: [] }));
  assert.equal(r.views.length, 0, "empty content does not move the camera");

  surface.setProjection(placed(30, 40));
  assert.equal(surface.getCamera().longitude, 30);
  assert.equal(surface.getCamera().latitude, 40);

  surface.setProjection(placed(-60, -10));
  assert.equal(surface.getCamera().longitude, 30, "later updates never yank the camera");
});

test("a caller-chosen or explicitly set camera is never overridden by fitting", () => {
  const r = runtime();
  const surface = new DeckWorldSurface({}, r, CURRENT);
  surface.setProjection(placed(30, 40));
  assert.equal(surface.getCamera().longitude, 0);

  const r2 = runtime();
  const later = new DeckWorldSurface({}, r2);
  later.setCamera({ ...CURRENT, longitude: 5 });
  later.setProjection(placed(30, 40));
  assert.equal(later.getCamera().longitude, 5);
});
