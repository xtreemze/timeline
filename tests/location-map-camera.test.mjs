import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("focused map opens at world scale and slowly flies to country context", async () => {
  const [mapSource, appSource] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /countryContextIntro:\s*true/);
  assert.match(mapSource, /PRESENTATION_WORLD_VIEW[\s\S]*zoom:\s*1/);
  assert.match(mapSource, /PRESENTATION_COUNTRY_ZOOM\s*=\s*5/);
  assert.match(mapSource, /PRESENTATION_FLY_DURATION_SECONDS\s*=\s*7/);
  assert.match(mapSource, /PRESENTATION_WORLD_DWELL_MS\s*=\s*450/);
  assert.match(mapSource, /fitWorld\(/);
  assert.match(mapSource, /flyToBounds\(/);
  assert.match(mapSource, /flyTo\(/);
  assert.match(mapSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(mapSource, /pointerdown/);
  assert.match(mapSource, /wheel/);
  assert.match(mapSource, /cameraUserControlled/);
});

test("focused map ties the semantic place identity to the stored coordinate", async () => {
  const [mapSource, appSource, styles] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /label:\s*name/);
  assert.match(mapSource, /semanticMarkerIcon\([\s\S]*label = ""[\s\S]*markerShape = "pin"/);
  assert.match(appSource, /placeForItem\(item\.id\)/);
  assert.match(appSource, /markerShape:\s*place\.markerShape/);
  assert.match(mapSource, /radiusMeters/);
  assert.match(mapSource, /isPrimaryPlacePoint[\s\S]*this\.label/);
  assert.match(mapSource, /L\.marker\(latlng,[\s\S]*icon:\s*markerIcon/);
  assert.match(mapSource, /timeline-map-marker-label/);
  assert.match(mapSource, /renderPlacePlaceholder\(\)/);
  assert.match(mapSource, /clearPlacePlaceholder\(\)/);
  assert.match(mapSource, /this\.container\.setAttribute\("aria-label", this\.label\)/);
  assert.match(styles, /\.timeline-map-marker-identity/);
  assert.match(styles, /\.timeline-map-marker-label/);
  assert.match(styles, /timeline-map-marker-shape-diamond/);
  assert.match(styles, /timeline-map-marker-shape-pin/);
  assert.match(styles, /\.timeline-map-place-placeholder/);
});

test("fictional spatial reference frames use local procedural texture instead of OSM tiles", async () => {
  const [mapSource, appSource, styles] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /spatialReferenceFrame[\s\S]*fictional/);
  assert.match(appSource, /fictionalReferenceFrame/);
  assert.match(mapSource, /function fictionalTextureLayer/);
  assert.match(mapSource, /L\.gridLayer/);
  assert.match(mapSource, /createTile/);
  assert.match(mapSource, /timeline-fictional-map-tile/);
  assert.match(mapSource, /if \(this\.fictionalReferenceFrame\)[\s\S]*fictionalTextureLayer/);
  assert.match(mapSource, /else \{[\s\S]*attachBasemap\(L, this\.map, this\.container, this\.providers\)/);
  assert.match(mapSource, /function attachBasemap\([\s\S]*L\.tileLayer\(provider\.url/);
  assert.match(mapSource, /Fictional reference frame · procedural texture/);
  assert.match(styles, /\.presentation-map\.is-fictional-map/);
});

test("secondary GeoJSON points render as labeled semantic route markers", async () => {
  const mapSource = await readFile(new URL("../site/location-map.ts", import.meta.url), "utf8");
  assert.match(mapSource, /feature\?\.properties/);
  assert.match(mapSource, /properties\.name \|\| properties\.label/);
  assert.match(mapSource, /properties\.icon \|\| this\.iconName/);
  assert.match(mapSource, /markerLabel \|\| "Map feature"/);
});

test("interactive maps use the timeline weighted drag response and shared release decay", async () => {
  const source = await readFile(new URL("../site/location-map.ts", import.meta.url), "utf8");
  assert.match(source, /const motion = globalThis\.TimelineMotion/);
  assert.match(source, /function weightedMapDragAvailable\(\)/);
  assert.match(source, /motion\?\.appendPointerVectorSamples/);
  assert.match(source, /motion\?\.estimatePointerVectorVelocity/);
  assert.match(source, /motion\?\.responseForElapsed/);
  assert.match(source, /motion\?\.decayVelocity/);
  assert.match(source, /inertia:\s*Boolean\(interactive && !reducedMotion && !weightedDrag\)/);
  assert.match(
    source,
    /inertiaDeceleration:\s*motion\?\.CAMERA_INERTIA_DECELERATION_PX_PER_S2 \|\| 3810/,
  );
  assert.match(source, /inertiaMaxSpeed:\s*motion\?\.MAX_RELEASE_SPEED_PX_PER_S \|\| 3200/);
  assert.match(
    source,
    /function installWeightedMapDragging\([\s\S]*interactive = true[\s\S]*motion\.responseForElapsed\(now - drag\.lastTime\)/,
  );
  assert.match(
    source,
    /startCenter[\s\S]*target = \{[\s\S]*drag\.startCenter\.x - deltaX[\s\S]*drag\.startCenter\.y - deltaY/,
  );
  assert.match(
    source,
    /motion\.estimatePointerVectorVelocity\(finishedDrag\.samples\)[\s\S]*startInertia\(velocity\)/,
  );
  assert.match(
    source,
    /velocityX = -velocity\.x[\s\S]*velocityY = -velocity\.y[\s\S]*motion\.decayVelocity\(velocityX, elapsed\)[\s\S]*map\.panBy/,
  );
  assert.match(source, /dragging:\s*this\.interactive && !weightedDrag/);
  assert.match(source, /dragging:\s*!weightedDrag/);
  assert.match(source, /touchZoom:\s*true/);
  assert.match(source, /pointers\.size > 1[\s\S]*cancelDrag\(\)/);
  assert.match(source, /pointers\.size === 1[\s\S]*beginDrag\(remaining\.pointerId, remaining\)/);
  assert.match(source, /prefersReducedMotion\(\)/);
});

test("map touch targets match the coarse-pointer interaction floor and editing has non-drag alternatives", async () => {
  const [source, styles, html] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(source, /iconSize:\s*\[56, 56\]/);
  assert.match(source, /iconAnchor:\s*\[28, 28\]/);
  assert.match(
    source,
    /L\.marker\(\[lat, lng\],[\s\S]*draggable:\s*true[\s\S]*keyboard:\s*true[\s\S]*semanticMarkerIcon/,
  );
  assert.match(source, /this\.map\.on\("click"[\s\S]*this\.applyPosition/);
  assert.match(
    styles,
    /\.timeline-map-marker\s*\{[\s\S]*width:\s*44px[\s\S]*height:\s*44px/,
  );
  assert.match(
    styles,
    /@media \(pointer:\s*coarse\)[\s\S]*leaflet-control-zoom a[\s\S]*width:\s*44px[\s\S]*height:\s*44px/,
  );
  assert.match(html, /id="item-location-latitude"[^>]*inputmode="decimal"/);
  assert.match(html, /id="item-location-longitude"[^>]*inputmode="decimal"/);
});


test("map runtime is local and basemap failure cannot remove semantic geometry", async () => {
  const [mapSource, html, packageSource, styles] = await Promise.all([
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);
  const pkg = JSON.parse(packageSource);
  assert.equal(pkg.dependencies.leaflet, "1.9.4");
  assert.match(pkg.scripts["build:leaflet"], /src\/leaflet-entry\.js/);
  assert.match(html, /href="\.\/leaflet\.css"/);
  assert.match(html, /src="\.\/leaflet\.bundle\.js"/);
  assert.doesNotMatch(mapSource, /unpkg\.com\/leaflet/);
  assert.match(mapSource, /function attachBasemap\(/);
  assert.match(mapSource, /(?:nextLayer|layer)\.on\("tileerror"/);
  assert.match(mapSource, /function observeMapSize\(/);
  assert.match(mapSource, /ResizeObserver/);
  assert.match(mapSource, /geometry-unavailable/);
  assert.match(mapSource, /No mapped coordinates/);
  assert.match(styles, /data-basemap-state="unavailable"/);
});

test("place editor exposes renderer-neutral marker path and area styling", async () => {
  const [html, spatialSource, appSource, mapSource, styles] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);
  for (const id of [
    "graph-place-marker-color", "graph-place-marker-fill-color",
    "graph-place-marker-opacity", "graph-place-marker-size",
    "graph-place-marker-weight", "graph-place-path-stroke",
    "graph-place-path-color", "graph-place-path-weight",
    "graph-place-path-opacity", "graph-place-path-dash-array",
    "graph-place-path-dash-offset", "graph-place-path-line-cap",
    "graph-place-path-line-join", "graph-place-area-fill",
    "graph-place-area-fill-color", "graph-place-area-fill-opacity",
    "graph-place-area-fill-rule",
  ]) assert.match(html, new RegExp(`id="${id}"`));

  assert.match(html, /LineString\/MultiLineString\/Polygon\/MultiPolygon/);
  assert.match(spatialSource, /interface PlaceStyle/);
  assert.match(spatialSource, /dashArray\?: string/);
  assert.match(appSource, /markerColor:\s*els\.graphPlaceMarkerColor\.value/);
  assert.match(appSource, /pathDashArray:\s*els\.graphPlacePathDashArray\.value/);
  assert.match(appSource, /areaFillOpacity:\s*els\.graphPlaceAreaFillOpacity\.value/);
  assert.match(mapSource, /function markerAppearance\(/);
  assert.match(mapSource, /function leafletPathStyle\(/);
  assert.match(styles, /--map-marker-size/);
  assert.match(styles, /--map-marker-weight/);
  assert.match(styles, /--map-marker-fill/);
});
