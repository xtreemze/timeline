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
  assert.match(composer, /selectionSeeded/);

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


test("composer owns Home/End suggestion navigation while active", async () => {
  const composer = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    composer,
    /event\.key === "Home"[\s\S]*activeSuggestion = 0/,
  );
  assert.match(
    composer,
    /event\.key === "End"[\s\S]*activeSuggestion = suggestions\.length - 1/,
  );
});

test("contextual composer returns focus to its connected invoker on close", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /occurrenceComposerReturnFocus/);
  assert.match(
    app,
    /function composerInvoker\(\)[\s\S]*document\.activeElement/,
  );
  assert.match(
    app,
    /setOccurrenceComposerOpen\(open: boolean\)[\s\S]*occurrenceComposerReturnFocus = composerInvoker\(\)/,
  );
  assert.match(
    app,
    /restoreComposerFocus[\s\S]*isConnected[\s\S]*focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(
    app,
    /syncApplicationSurfaces\(\)[\s\S]*restoreComposerFocus/,
  );
});
