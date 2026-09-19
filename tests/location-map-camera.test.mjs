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
