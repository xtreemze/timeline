import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { occurrenceComposerSuggestions } from "../site/occurrence-composer-model.ts";

test("composer prioritizes canonical relationship endpoint context", () => {
  const suggestions = occurrenceComposerSuggestions("@alice calls ", {
    entities: [
      { id: "charlie", name: "Charlie" },
      { id: "bob", name: "Bob" },
    ],
    places: [],
    categories: [],
    preferredEntityIds: ["bob"],
  });

  assert.equal(suggestions[0]?.insertText, "Bob");
});

test("composer selection context reuses canonical entity and place identities", async () => {
  const [composer, app] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composer, /setSelectionContext\(/);
  assert.match(composer, /@\$\{subjectId\}/);
  assert.match(composer, /placeReference:/);
  assert.match(composer, /preferredEntityIds/);

  assert.match(app, /syncOccurrenceComposerSelection/);
  assert.match(app, /applicationSelection\.subscribe[\s\S]*syncOccurrenceComposerSelection/);
  assert.match(app, /selectedEntityId:/);
  assert.match(app, /relationship:[\s\S]*subjectId:[\s\S]*objectId:/);
  assert.match(app, /place:[\s\S]*id:[\s\S]*name:/);
  assert.match(app, /placeName:\s*detail\.draft\.place\?\.name\s*\?\?\s*detail\.defaults\.placeReference/);
});

test("closing timeline focus does not erase canonical selection", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  const focusHandler =
    app.match(/timelinefocuschange"[\s\S]*?\n\}\);/)?.[0] ?? "";

  assert.match(focusHandler, /if \(focused\)[\s\S]*selectionForTimelineFocus/);
  assert.doesNotMatch(focusHandler, /focused \? selectionForTimelineFocus[\s\S]*: null/);
  assert.doesNotMatch(focusHandler, /applicationSelection\.clear/);
});

test("opening the composer reapplies the retained canonical selection context", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(
    app,
    /setOccurrenceComposerOpen\(open: boolean\)[\s\S]*syncOccurrenceComposerSelection\(applicationSelection\.current\)[\s\S]*occurrenceComposer\.show\(\)/,
  );
});
