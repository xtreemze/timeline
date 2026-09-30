import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeOccurrenceNodeSemanticStyle,
  occurrenceNodeSemanticStyle,
  semanticHueCarrier,
} from "../src/presentation/occurrence-semantic-color.ts";
import { canonicalSemanticHueColor } from "../src/presentation/semantic-color.ts";

test("occurrence node semantics use category fill and tag border", () => {
  const style = occurrenceNodeSemanticStyle(
    ["hsl(12 64% 50%)", "hsl(282 64% 50%)"],
    ["hsl(145 64% 50%)"],
  );
  assert.deepEqual(style, {
    fillColor: canonicalSemanticHueColor("hsl(12 64% 50%)"),
    borderColor: canonicalSemanticHueColor("hsl(145 64% 50%)"),
  });
});

test("secondary category supplies the border when no tag hue exists", () => {
  const style = occurrenceNodeSemanticStyle(["#b42318", "#287a42"], []);
  assert.deepEqual(style, {
    fillColor: canonicalSemanticHueColor("#b42318"),
    borderColor: canonicalSemanticHueColor("#287a42"),
  });
});

test("tag semantics can color an otherwise uncategorized occurrence", () => {
  const style = occurrenceNodeSemanticStyle([], [278]);
  assert.deepEqual(style, {
    fillColor: canonicalSemanticHueColor(278),
    borderColor: canonicalSemanticHueColor(278),
  });
});

test("authored entity channels remain authoritative independently", () => {
  const semantic = occurrenceNodeSemanticStyle(["#b42318"], ["hsl(145 64% 50%)"]);
  assert.deepEqual(
    mergeOccurrenceNodeSemanticStyle({ fillColor: "#112233" }, semantic),
    {
      fillColor: "#112233",
      borderColor: canonicalSemanticHueColor("hsl(145 64% 50%)"),
    },
  );
  assert.deepEqual(
    mergeOccurrenceNodeSemanticStyle({ borderColor: "#445566" }, semantic),
    {
      fillColor: canonicalSemanticHueColor("#b42318"),
      borderColor: "#445566",
    },
  );
  const authored = Object.freeze({ color: "#112233", stroke: "#445566" });
  assert.equal(mergeOccurrenceNodeSemanticStyle(authored, semantic), authored);
});

test("semantic hue carriers reject non-color strings and normalize numeric hue", () => {
  assert.equal(semanticHueCarrier("hsl(212 64% 50%)"), canonicalSemanticHueColor(212));
  assert.equal(semanticHueCarrier(725), canonicalSemanticHueColor(5));
  assert.equal(semanticHueCarrier("not-a-color"), null);
});
