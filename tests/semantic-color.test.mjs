import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  canonicalSemanticHueColor,
  semanticColorCss,
  semanticColorHex,
  semanticHue,
  semanticThemeForSurface,
} from "../src/presentation/semantic-color.ts";

function hueDistance(a, b) {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

test("semantic colors preserve hue while the app owns saturation and lightness", () => {
  const source = "#b42318";
  const sourceHue = semanticHue(source);
  const lightAmbient = semanticColorHex(source, "light", "ambient");
  const lightActive = semanticColorHex(source, "light", "active");
  const darkAmbient = semanticColorHex(source, "dark", "ambient");
  const darkActive = semanticColorHex(source, "dark", "active");

  assert.ok(hueDistance(semanticHue(lightAmbient), sourceHue) < 1.5);
  assert.ok(hueDistance(semanticHue(lightActive), sourceHue) < 1.5);
  assert.ok(hueDistance(semanticHue(darkAmbient), sourceHue) < 1.5);
  assert.ok(hueDistance(semanticHue(darkActive), sourceHue) < 1.5);
  assert.notEqual(lightAmbient, lightActive);
  assert.notEqual(darkAmbient, darkActive);

  for (const color of [lightAmbient, lightActive, darkAmbient, darkActive]) {
    assert.notEqual(color.toLowerCase(), "#000000");
    assert.notEqual(color.toLowerCase(), "#ffffff");
  }
});

test("semantic css adapts to OS color scheme without changing hue identity", () => {
  const css = semanticColorCss("hsl(212 100% 50%)", "active");
  assert.match(css, /^light-dark\(hsl\(212\.0deg 70% 36%\), hsl\(212\.0deg 72% 72%\)\)$/);
  assert.equal(semanticThemeForSurface("#fffdf9"), "light");
  assert.equal(semanticThemeForSurface("#171716"), "dark");
});

test("achromatic legacy colors do not invent a red semantic hue", () => {
  assert.equal(semanticHue("#ffffff", 212), 212);
  assert.equal(semanticHue("#171717", 145), 145);
  assert.equal(semanticHue("#fffdf9", 278), 278);
  assert.equal(semanticHue("hsl(0 0% 50%)", 330), 330);
});

test("canonical persistence stores a hue carrier rather than authored display contrast", () => {
  const canonical = canonicalSemanticHueColor(278);
  assert.match(canonical, /^#[0-9a-f]{6}$/);
  assert.ok(hueDistance(semanticHue(canonical), 278) < 1.5);
});

test("category authoring exposes hue only and semantic surfaces derive presentation colors", async () => {
  const [html, app, styles, composer, worldSurface, locationMap] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/world/deck-world-surface.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="category-hue" type="range" min="0" max="359"/);
  assert.doesNotMatch(html, /id="category-color" type="color"/);
  assert.match(html, /the app controls saturation and lightness/);
  assert.match(app, /canonicalSemanticHueColor\(els\.categoryHue\.value, 220\)/);
  assert.match(app, /semanticColorCss\(category\.color, "ambient"\)/);
  assert.match(app, /semanticColorCss\(category\.color, "active"\)/);
  assert.match(styles, /color-scheme:\s*light dark/);
  assert.match(styles, /--tag-color:\s*light-dark/);
  assert.match(composer, /semanticColorCss\(deckAccentSource, "active"\)/);
  assert.match(composer, /--suggestion-accent: \$\{semanticColorCss/);
  assert.match(worldSurface, /labelHalo: worldColorBytes\(palette\.paper, 160\)/);
  assert.match(
    worldSurface,
    /\(emphasized \|\| directlyInteracted\) && entity[\s\S]*?: this\.#theme\.labelPlace/,
  );
  assert.match(locationMap, /color: mapSemanticColor\(semanticSource, fallbackHue, "ambient"\)/);
  assert.match(
    locationMap,
    /fillColor: mapSemanticColor\(marker\.fillColor \|\| semanticSource, markerHue, "subdued"\)/,
  );
  assert.match(locationMap, /color: mapSemanticColor\(pathSource, fallbackHue, "subdued"\)/);
  assert.match(html, /Stroke \/ icon hue source/);
  assert.match(html, /Fill hue source/);
  assert.match(html, /Path hue source/);
});
