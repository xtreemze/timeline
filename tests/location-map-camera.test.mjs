import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DeckPlaceMap, PLACE_MAP_LAYER_IDS, PLACE_MAP_MAX_ZOOM } from "../site/world/place-map.ts";
import {
  accuracyRing,
  hasRenderableGeometry,
  parseDashArray,
  placeMapColorBytes,
  placeMapGeometry,
  presentationZoom,
} from "../site/world/place-map-geometry.ts";

const DEFAULTS = Object.freeze({
  color: "#315fbd",
  iconName: "place",
  markerShape: "pin",
  label: "Stockholm",
});

function element(tag = "div") {
  const listeners = new Map();
  return {
    tag,
    children: [],
    attributes: {},
    dataset: {},
    style: {},
    className: "",
    textContent: "",
    title: "",
    type: "",
    tabIndex: -1,
    clientWidth: 400,
    clientHeight: 300,
    isConnected: true,
    ownerDocument: null,
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    dispatch(type, event = {}) {
      listeners.get(type)?.({ target: this, preventDefault() {}, ...event });
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    remove() {
      this.removed = true;
    },
  };
}

function container() {
  const root = element();
  root.ownerDocument = { createElement: (tag) => element(tag) };
  return root;
}

function harness() {
  const calls = { deckProps: null, setProps: [], globeViews: [], finalized: 0 };
  const layer = (type) => (props) => ({ type, props });
  const runtime = {
    createGlobeView(props) {
      calls.globeViews.push(props);
      return { props };
    },
    createScatterplotLayer: layer("scatter"),
    createPathLayer: layer("path"),
    createSolidPolygonLayer: layer("polygon"),
    createIconLayer: layer("icon"),
    createTextLayer: layer("text"),
    createDashedPathExtension: () => ({ kind: "dash-extension" }),
    createDeck(props) {
      calls.deckProps = props;
      return {
        setProps(next) {
          calls.setProps.push(next);
        },
        pickObject: () => null,
        getViewports: () => [
          {
            unproject: ([x, y]) => [x / 10 - 20, 60 - y / 10, 0],
          },
        ],
        redraw() {},
        finalize() {
          calls.finalized += 1;
        },
      };
    },
  };
  const layers = () => calls.setProps.findLast((props) => props.layers)?.layers ?? [];
  const layerById = (id) => layers().find((candidate) => candidate.props.id === id);
  const lastViewState = () => calls.setProps.findLast((props) => props.viewState)?.viewState;
  return { calls, runtime, layers, layerById, lastViewState };
}

test("a located point resolves to one labelled primary marker with its accuracy ring", () => {
  const geometry = placeMapGeometry(
    {
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      accuracyMeters: 500,
    },
    DEFAULTS,
  );

  assert.equal(geometry.markers.length, 1);
  const [marker] = geometry.markers;
  assert.deepEqual(marker.position, [18.0686, 59.3293, 0]);
  assert.equal(marker.label, "Stockholm");
  assert.equal(marker.primary, true);
  assert.equal(marker.shape, "pin");
  assert.equal(marker.size, 44);
  assert.equal(geometry.areas.length, 1, "accuracy fills a faint area");
  assert.equal(geometry.paths.length, 1, "accuracy has an outline");
  assert.equal(geometry.paths[0].dash, null);
  assert.ok(geometry.positions.length > 1);
});

test("the accuracy ring is a closed geodesic circle of the stated radius", () => {
  const ring = accuracyRing({ longitude: 0, latitude: 0 }, 111_195, 4);
  assert.equal(ring.length, 5);
  assert.deepEqual(ring[0], ring[4]);
  assert.ok(Math.abs(ring[0][1] - 1) < 1e-3, "north point one degree away");
  assert.ok(Math.abs(ring[1][0] - 1) < 1e-3, "east point one degree away");
});

test("GeoJSON features keep their own style, colour, icon and label", () => {
  const geometry = placeMapGeometry(
    {
      geometry: { type: "Point", coordinates: [10, 50] },
      style: { path: { color: "#112233", weight: 4, dashArray: "6 3" } },
      mapFeatures: [
        {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "Harbour", icon: "anchor", markerShape: "diamond" },
              geometry: { type: "Point", coordinates: [11, 51] },
            },
            {
              type: "Feature",
              properties: { style: { path: { color: "rgb(10, 20, 30)", opacity: 0.5 } } },
              geometry: {
                type: "LineString",
                coordinates: [
                  [10, 50],
                  [11, 51],
                  [999, 1],
                ],
              },
            },
            {
              type: "Feature",
              properties: {
                style: {
                  area: { fillColor: "#ff0000", fillOpacity: 0.5 },
                  path: { stroke: false },
                },
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [10, 50],
                    [12, 50],
                    [12, 52],
                    [10, 50],
                  ],
                ],
              },
            },
          ],
        },
        { not: "geojson" },
      ],
    },
    DEFAULTS,
  );

  const [primary, harbour] = geometry.markers;
  assert.equal(primary.label, "Stockholm");
  assert.equal(harbour.label, "Harbour");
  assert.equal(harbour.icon, "anchor");
  assert.equal(harbour.shape, "diamond");
  assert.equal(harbour.primary, false);

  const [route] = geometry.paths;
  assert.equal(route.path.length, 2, "invalid coordinates are skipped, not invented");
  assert.deepEqual(route.color, [10, 20, 30, 128]);
  assert.equal(route.width, 4);
  assert.deepEqual(route.dash, [6, 3]);

  assert.equal(geometry.areas.length, 1);
  assert.deepEqual(geometry.areas[0].fill, [255, 0, 0, 128]);
  assert.equal(geometry.paths.length, 1, "unstroked areas draw no outline");
});

test("colours, dashes and zoom framing stay renderer-neutral", () => {
  assert.deepEqual(placeMapColorBytes("#abc", "#000000"), [170, 187, 204, 255]);
  assert.deepEqual(placeMapColorBytes("rgba(1, 2, 3, 50%)", "#000000"), [1, 2, 3, 128]);
  assert.deepEqual(placeMapColorBytes("tomato", "#315fbd", 0.5), [49, 95, 189, 128]);
  assert.deepEqual(parseDashArray("8,4"), [8, 4]);
  assert.deepEqual(parseDashArray("5"), [5, 5]);
  assert.equal(parseDashArray(""), null);
  assert.equal(parseDashArray("a b"), null);
  assert.equal(presentationZoom({ accuracyMeters: 40 }), 16);
  assert.equal(presentationZoom({}), 13);
  assert.equal(hasRenderableGeometry({ geometry: { type: "Point", coordinates: [0, 0] } }), true);
  assert.equal(hasRenderableGeometry({}), false);
});

test("a read-only place map draws the WorldSurface basemap and the place geometry", () => {
  const h = harness();
  const root = container();
  let rendered = 0;
  const map = new DeckPlaceMap(root, h.runtime, {
    interactive: false,
    label: "Stockholm",
    onRender: () => {
      rendered += 1;
    },
  });

  assert.equal(h.calls.deckProps.controller, false, "read-only camera ignores input");
  assert.equal(h.calls.deckProps.parent, root);
  assert.equal(root.attributes["aria-label"], "Stockholm");
  assert.equal(root.children.length, 0, "no zoom controls without interaction");
  assert.ok(h.layerById(PLACE_MAP_LAYER_IDS.earth));
  assert.ok(h.layerById(PLACE_MAP_LAYER_IDS.graticule));
  assert.equal(h.layerById(PLACE_MAP_LAYER_IDS.coastlines), undefined);

  map.setBasemap({ coastlines: [[[0, 0, 0]]], borders: [[[1, 1, 0]]] });
  assert.ok(h.layerById(PLACE_MAP_LAYER_IDS.coastlines));
  assert.ok(h.layerById(PLACE_MAP_LAYER_IDS.borders));
  map.setFictional(true);
  assert.equal(h.layerById(PLACE_MAP_LAYER_IDS.coastlines), undefined, "no real coastlines");
  assert.ok(h.layerById(PLACE_MAP_LAYER_IDS.graticule));

  const geometry = placeMapGeometry(
    {
      geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
      accuracyMeters: 300,
      style: { path: { dashArray: "4 2" } },
    },
    DEFAULTS,
  );
  map.setGeometry(geometry);
  const markers = h.layerById(PLACE_MAP_LAYER_IDS.markers);
  assert.equal(markers.type, "icon");
  assert.equal(markers.props.pickable, false);
  assert.equal(markers.props.data[0].label, "Stockholm");
  assert.match(decodeURIComponent(markers.props.getIcon(markers.props.data[0]).url), /<svg/);
  assert.deepEqual(markers.props.getPixelOffset(markers.props.data[0])[0], 0);
  assert.ok(markers.props.getPixelOffset(markers.props.data[0])[1] < 0, "pin tip marks the place");
  assert.equal(h.layerById(PLACE_MAP_LAYER_IDS.labels).props.data.length, 1);
  assert.ok(h.layerById(PLACE_MAP_LAYER_IDS.areas));
  const paths = h.layerById(PLACE_MAP_LAYER_IDS.paths);
  assert.equal(paths.props.getDashArray, undefined, "accuracy outlines stay solid");

  assert.equal(rendered, 0);
  h.calls.deckProps.onAfterRender();
  h.calls.deckProps.onAfterRender();
  assert.equal(rendered, 1, "render callback fires once per content change");

  map.destroy();
  assert.equal(h.calls.finalized, 1);
  assert.throws(() => map.setGeometry(null), /destroyed/);
});

test("authored dashed paths use the dash extension in line-width units", () => {
  const h = harness();
  const map = new DeckPlaceMap(container(), h.runtime, { interactive: false, label: "Route" });
  map.setGeometry(
    placeMapGeometry(
      {
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        style: { path: { weight: 2, dashArray: "8 4" } },
      },
      DEFAULTS,
    ),
  );
  const paths = h.layerById(PLACE_MAP_LAYER_IDS.paths);
  assert.deepEqual(paths.props.extensions, [{ kind: "dash-extension" }]);
  assert.deepEqual(paths.props.getDashArray(paths.props.data[0]), [4, 2]);
});

test("the editor picks a location by click, Enter or marker drag without moving the camera", () => {
  const h = harness();
  const root = container();
  const picks = [];
  const map = new DeckPlaceMap(root, h.runtime, {
    interactive: true,
    editable: true,
    label: "Location picker",
    onPick: (point) => picks.push(point),
  });

  assert.equal(root.tabIndex, 0, "keyboard reachable");
  assert.match(root.attributes["aria-description"], /press Enter/);
  assert.equal(h.calls.deckProps.controller.dragRotate, false);
  assert.equal(h.calls.deckProps.getCursor({}), "crosshair");

  h.calls.deckProps.onClick({ x: 400, y: 100 });
  assert.deepEqual(picks.at(-1), { longitude: 20, latitude: 50 });
  let markers = h.layerById(PLACE_MAP_LAYER_IDS.markers);
  assert.equal(markers.props.pickable, true, "the placed marker can be dragged");
  assert.deepEqual(markers.props.data[0].position, [20, 50, 0]);

  const camera = map.camera;
  root.dispatch("keydown", { key: "Enter" });
  assert.deepEqual(picks.at(-1), { longitude: camera.longitude, latitude: camera.latitude });

  markers = h.layerById(PLACE_MAP_LAYER_IDS.markers);
  let stopped = 0;
  const event = { stopPropagation: () => (stopped += 1) };
  assert.equal(markers.props.onDragStart({}, event), true);
  // Controller movement is rejected while the marker owns the gesture.
  h.calls.deckProps.onViewStateChange({ viewState: { ...camera, longitude: 99 } });
  assert.equal(map.camera.longitude, camera.longitude);
  markers.props.onDrag({ x: 300, y: 200 }, event);
  assert.deepEqual(h.layerById(PLACE_MAP_LAYER_IDS.markers).props.data[0].position, [10, 40, 0]);
  const before = picks.length;
  markers.props.onDragEnd({ x: 310, y: 200 }, event);
  assert.equal(stopped, 3, "deck's controller never pans under the marker");
  assert.equal(picks.length, before + 1);
  assert.deepEqual(picks.at(-1), { longitude: 11, latitude: 40 });
  assert.equal(map.userControlsCamera, false);

  map.setMarker(null);
  assert.equal(h.layerById(PLACE_MAP_LAYER_IDS.markers), undefined);
});

test("a read-only map never proposes locations", () => {
  const h = harness();
  const picks = [];
  new DeckPlaceMap(container(), h.runtime, {
    interactive: true,
    label: "Place",
    onPick: (point) => picks.push(point),
  });
  h.calls.deckProps.onClick({ x: 10, y: 10 });
  assert.deepEqual(picks, []);
});

test("camera input, zoom buttons and fitting stay within the globe's precise range", () => {
  const h = harness();
  const root = container();
  const map = new DeckPlaceMap(root, h.runtime, { interactive: true, label: "Place" });

  const controls = root.children[0];
  assert.equal(controls.className, "place-map-zoom");
  const [zoomIn, zoomOut] = controls.children;
  assert.equal(zoomIn.attributes["aria-label"], "Zoom in");
  assert.equal(zoomOut.attributes["aria-label"], "Zoom out");
  const zoom = map.camera.zoom;
  zoomIn.dispatch("click");
  assert.equal(map.camera.zoom, zoom + 1);
  assert.equal(map.userControlsCamera, true);
  zoomOut.dispatch("click");
  assert.equal(map.camera.zoom, zoom);

  h.calls.deckProps.onViewStateChange({
    viewState: { longitude: 190, latitude: 89, zoom: 30, bearing: 0, pitch: 0 },
  });
  assert.equal(map.camera.zoom, PLACE_MAP_MAX_ZOOM);
  assert.equal(map.camera.latitude, 85);
  assert.equal(map.camera.longitude, -170);
  assert.deepEqual(h.lastViewState(), map.camera);

  const point = [[18.0686, 59.3293, 0]];
  assert.equal(map.fitCamera(point, 5).zoom, 5);
  assert.equal(
    map.fitCamera(point).zoom,
    PLACE_MAP_MAX_ZOOM,
    "a lone point frames at the closest regional zoom",
  );
  assert.equal(map.fitCamera([]), null);
  const overview = map.overviewCamera(point);
  assert.ok(overview.zoom < 3, "overview shows the whole globe");
  assert.ok(Math.abs(overview.longitude - 18.0686) < 1e-9, "overview faces the place");
  map.jumpTo(overview);
  assert.deepEqual(h.lastViewState(), overview);
  map.destroy();
  assert.equal(controls.removed, true);
});

test("focused map opens on the globe and slowly flies to country context", async () => {
  const [mapSource, appSource] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /countryContextIntro:\s*true/);
  assert.match(mapSource, /PRESENTATION_COUNTRY_ZOOM\s*=\s*5/);
  assert.match(mapSource, /PRESENTATION_FLY_DURATION_MS\s*=\s*7_000/);
  assert.match(mapSource, /PRESENTATION_WORLD_DWELL_MS\s*=\s*450/);
  assert.match(mapSource, /map\.jumpTo\(map\.overviewCamera\(this\.positions\)\)/);
  assert.match(mapSource, /map\.flyTo\(target, PRESENTATION_FLY_DURATION_MS\)/);
  assert.match(mapSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(mapSource, /"pointerdown", "wheel"/);
  assert.match(mapSource, /cameraUserControlled/);
});

test("focused map ties the semantic place identity to the stored coordinate", async () => {
  const [mapSource, appSource, styles] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /label:\s*name/);
  assert.match(appSource, /placeForItem\(item\.id\)/);
  assert.match(appSource, /markerShape:\s*place\.markerShape/);
  assert.match(appSource, /spatialReferenceFrame[\s\S]*fictional/);
  assert.match(appSource, /fictionalReferenceFrame/);
  assert.match(mapSource, /renderPlacePlaceholder\(\)/);
  assert.match(mapSource, /clearPlacePlaceholder\(\)/);
  assert.match(mapSource, /container\.setAttribute\("aria-label", this\.label\)/);
  assert.match(mapSource, /map\.setFictional\(true\)/);
  assert.match(styles, /timeline-map-marker-shape-pin/);
  assert.match(styles, /\.timeline-map-place-placeholder/);
  assert.match(styles, /\.presentation-map\.is-fictional-map/);
});

test("map runtime is the WorldSurface stack and basemap failure cannot remove semantic geometry", async () => {
  const [mapSource, html, pkg, styles] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);
  assert.equal(pkg.dependencies?.leaflet, undefined, "Leaflet is deprecated and removed");
  assert.doesNotMatch(mapSource, /leaflet/i);
  assert.doesNotMatch(html, /leaflet/i);
  assert.match(mapSource, /import\("\.\/world\/deck-world-bindings\.ts"\)/);
  assert.match(mapSource, /import\("\.\/world\/place-map\.ts"\)/);
  assert.match(mapSource, /basemapState = "unavailable"/);
  assert.match(mapSource, /geometry-unavailable/);
  assert.match(mapSource, /renderer-unavailable/);
  assert.match(mapSource, /No mapped coordinates/);
  assert.match(mapSource, /Coordinates can still be entered manually/);
  assert.match(styles, /data-basemap-state="unavailable"/);
});

test("map touch targets match the coarse-pointer floor and editing has non-drag alternatives", async () => {
  const [styles, html] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(
    styles,
    /@media \(pointer:\s*coarse\)\s*\{\s*\.place-map-zoom-button\s*\{\s*inline-size:\s*44px;\s*block-size:\s*44px;/,
  );
  assert.match(html, /id="item-location-latitude"[^>]*inputmode="decimal"/);
  assert.match(html, /id="item-location-longitude"[^>]*inputmode="decimal"/);
});

test("place editor exposes renderer-neutral marker path and area styling", async () => {
  const [html, spatialSource, appSource, styles] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);
  for (const id of [
    "graph-place-marker-color",
    "graph-place-marker-fill-color",
    "graph-place-marker-opacity",
    "graph-place-marker-size",
    "graph-place-marker-weight",
    "graph-place-path-stroke",
    "graph-place-path-color",
    "graph-place-path-weight",
    "graph-place-path-opacity",
    "graph-place-path-dash-array",
    "graph-place-path-dash-offset",
    "graph-place-path-line-cap",
    "graph-place-path-line-join",
    "graph-place-area-fill",
    "graph-place-area-fill-color",
    "graph-place-area-fill-opacity",
    "graph-place-area-fill-rule",
  ])
    assert.match(html, new RegExp(`id="${id}"`));

  assert.match(html, /LineString\/MultiLineString\/Polygon\/MultiPolygon/);
  assert.match(spatialSource, /interface PlaceStyle/);
  assert.match(spatialSource, /dashArray\?: string/);
  assert.match(appSource, /markerColor:\s*els\.graphPlaceMarkerColor\.value/);
  assert.match(appSource, /pathDashArray:\s*els\.graphPlacePathDashArray\.value/);
  assert.match(appSource, /areaFillOpacity:\s*els\.graphPlaceAreaFillOpacity\.value/);
  assert.match(styles, /--map-marker-fill/);
});
