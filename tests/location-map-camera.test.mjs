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
  assert.match(mapSource, /semanticMarkerIcon\([\s\S]*label = ""/);
  assert.match(mapSource, /isPrimaryPlacePoint[\s\S]*this\.label/);
  assert.match(mapSource, /L\.marker\(latlng,[\s\S]*icon:\s*markerIcon/);
  assert.match(mapSource, /timeline-map-marker-label/);
  assert.match(mapSource, /renderPlacePlaceholder\(\)/);
  assert.match(mapSource, /clearPlacePlaceholder\(\)/);
  assert.match(mapSource, /this\.container\.setAttribute\("aria-label", this\.label\)/);
  assert.match(styles, /\.timeline-map-marker-identity/);
  assert.match(styles, /\.timeline-map-marker-label/);
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


test("interactive maps use the shared camera release speed and equivalent weighted deceleration", async () => {
  const source = await readFile(new URL("../site/location-map.js", import.meta.url), "utf8");
  assert.match(source, /const motion = globalThis\.TimelineMotion/);
  assert.match(source, /function mapMotionOptions\(interactive = true\)/);
  assert.match(source, /inertia:\s*Boolean\(interactive && !reducedMotion\)/);
  assert.match(source, /inertiaDeceleration:\s*motion\?\.CAMERA_INERTIA_DECELERATION_PX_PER_S2 \|\| 3810/);
  assert.match(source, /inertiaMaxSpeed:\s*motion\?\.MAX_RELEASE_SPEED_PX_PER_S \|\| 3200/);
  assert.match(source, /easeLinearity:\s*0\.2/);
  assert.match(source, /touchZoom:\s*this\.interactive,[\s\S]*\.\.\.mapMotionOptions\(this\.interactive\)/);
  assert.match(source, /attributionControl:\s*true,[\s\S]*\.\.\.mapMotionOptions\(true\)/);
  assert.match(source, /zoomAnimation:\s*!reducedMotion/);
});
