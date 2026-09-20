import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("focused map opens at world scale and slowly flies to country context", async () => {
  const [mapSource, appSource] = await Promise.all([
    readFile(new URL("../site/location-map.js", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
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
    readFile(new URL("../site/location-map.js", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
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
    readFile(new URL("../site/location-map.js", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);

  assert.match(appSource, /spatialReferenceFrame\?\.fictional === true/);
  assert.match(appSource, /fictionalReferenceFrame/);
  assert.match(mapSource, /function fictionalTextureLayer/);
  assert.match(mapSource, /L\.gridLayer/);
  assert.match(mapSource, /createTile/);
  assert.match(mapSource, /timeline-fictional-map-tile/);
  assert.match(mapSource, /if \(this\.fictionalReferenceFrame\)[\s\S]*fictionalTextureLayer/);
  assert.match(mapSource, /else \{[\s\S]*L\.tileLayer\(this\.provider\.url/);
  assert.match(mapSource, /Fictional reference frame · procedural texture/);
  assert.match(styles, /\.presentation-map\.is-fictional-map/);
});


test("secondary GeoJSON points render as labeled semantic route markers", async () => {
  const mapSource = await readFile(new URL("../site/location-map.js", import.meta.url), "utf8");
  assert.match(mapSource, /feature\?\.properties/);
  assert.match(mapSource, /properties\.name \|\| properties\.label/);
  assert.match(mapSource, /properties\.icon \|\| this\.iconName/);
  assert.match(mapSource, /markerLabel \|\| "Map feature"/);
});


test("interactive maps use the timeline weighted drag response and shared release decay", async () => {
  const source = await readFile(new URL("../site/location-map.js", import.meta.url), "utf8");
  assert.match(source, /const motion = globalThis\.TimelineMotion/);
  assert.match(source, /function weightedMapDragAvailable\(\)/);
  assert.match(source, /motion\?\.appendPointerVectorSamples/);
  assert.match(source, /motion\?\.estimatePointerVectorVelocity/);
  assert.match(source, /motion\?\.responseForElapsed/);
  assert.match(source, /motion\?\.decayVelocity/);
  assert.match(source, /inertia:\s*Boolean\(interactive && !reducedMotion && !weightedDrag\)/);
  assert.match(source, /inertiaDeceleration:\s*motion\?\.CAMERA_INERTIA_DECELERATION_PX_PER_S2 \|\| 3810/);
  assert.match(source, /inertiaMaxSpeed:\s*motion\?\.MAX_RELEASE_SPEED_PX_PER_S \|\| 3200/);
  assert.match(
    source,
    /function installWeightedMapDragging\(map, container, interactive = true\)[\s\S]*motion\.responseForElapsed\(now - drag\.lastTime\)/
  );
  assert.match(
    source,
    /startCenter[\s\S]*target = \{[\s\S]*drag\.startCenter\.x - deltaX[\s\S]*drag\.startCenter\.y - deltaY/
  );
  assert.match(
    source,
    /motion\.estimatePointerVectorVelocity\(finishedDrag\.samples\)[\s\S]*startInertia\(velocity\)/
  );
  assert.match(
    source,
    /velocityX = -velocity\.x[\s\S]*velocityY = -velocity\.y[\s\S]*motion\.decayVelocity\(velocityX, elapsed\)[\s\S]*map\.panBy/
  );
  assert.match(source, /dragging:\s*this\.interactive && !weightedDrag/);
  assert.match(source, /dragging:\s*!weightedDrag/);
  assert.match(source, /touchZoom:\s*this\.interactive/);
  assert.match(source, /pointers\.size > 1[\s\S]*cancelDrag\(\)/);
  assert.match(source, /pointers\.size === 1[\s\S]*beginDrag\(remaining\.pointerId, remaining\)/);
  assert.match(source, /prefersReducedMotion\(\)/);
});


test("map touch targets match the coarse-pointer interaction floor and editing has non-drag alternatives", async () => {
  const [source, styles, html] = await Promise.all([
    readFile(new URL("../site/location-map.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/index.html", import.meta.url), "utf8")
  ]);
  assert.match(source, /iconSize:\s*\[44, 44\]/);
  assert.match(source, /iconAnchor:\s*\[22, 22\]/);
  assert.match(source, /L\.marker\(\[lat, lng\],[\s\S]*draggable:\s*true[\s\S]*keyboard:\s*true[\s\S]*semanticMarkerIcon/);
  assert.match(source, /this\.map\.on\("click"[\s\S]*this\.applyPosition/);
  assert.match(styles, /\.timeline-map-marker\s*\{[\s\S]*width:\s*44px !important[\s\S]*height:\s*44px !important/);
  assert.match(styles, /@media \(pointer:\s*coarse\)[\s\S]*leaflet-control-zoom a[\s\S]*width:\s*44px !important[\s\S]*height:\s*44px !important/);
  assert.match(html, /id="item-location-latitude"[^>]*inputmode="decimal"/);
  assert.match(html, /id="item-location-longitude"[^>]*inputmode="decimal"/);
});
