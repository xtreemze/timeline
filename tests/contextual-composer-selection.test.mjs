import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  formatOccurrenceComposition,
  occurrenceComposerSuggestions,
  parseOccurrenceSentence,
} from "../site/occurrence-composer-model.ts";

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

test("selected node seeds the action stage", () => {
  const suggestions = occurrenceComposerSuggestions("@pigs-wolf ", {
    entities: [
      { id: "pigs-wolf", name: "Big Bad Wolf" },
      { id: "pigs-third", name: "Third Pig" },
    ],
    places: [],
    categories: [],
  });

  assert.equal(suggestions[0]?.kind, "predicate");
});

test("selected occurrence composition round-trips canonical context", () => {
  const composition = formatOccurrenceComposition({
    subjectId: "pigs-wolf",
    predicate: "pursues",
    objectId: "pigs-third",
    placeId: "brick-house",
    start: "1975-02-01",
    category: "Conflict",
    tags: ["chase", "house"],
  });

  assert.equal(
    composition,
    "@pigs-wolf pursues @pigs-third at @brick-house on 1975-02-01 [category: Conflict, tags: chase|house]",
  );

  const parsed = parseOccurrenceSentence(composition);
  assert.equal(parsed.subject?.name, "@pigs-wolf");
  assert.equal(parsed.predicate, "pursues");
  assert.equal(parsed.object?.name, "@pigs-third");
  assert.equal(parsed.place?.name, "@brick-house");
  assert.equal(parsed.time?.start, "1975-02-01");
  assert.equal(parsed.options.category, "Conflict");
  assert.deepEqual(parsed.options.tags, ["chase", "house"]);
  assert.equal(parsed.stage, "complete");
});

test("composer selection context reuses canonical entity and place identities", async () => {
  const [composer, app] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(composer, /setSelectionContext\(/);
  assert.match(composer, /selectedOccurrenceId/);
  assert.match(composer, /selectedItemId/);
  assert.match(composer, /editTarget/);
  assert.match(composer, /dirtyDraft/);
  assert.match(composer, /pendingSelectionContext/);
  assert.match(composer, /composition/);
  assert.match(composer, /this\.value = composition/);
  assert.match(composer, /@\$\{subjectId\}/);
  assert.match(composer, /previousKey !== nextKey/);
  assert.match(composer, /placeReference:/);
  assert.match(composer, /preferredEntityIds/);
  assert.match(composer, /selectionSeeded/);

  assert.match(app, /syncOccurrenceComposerSelection/);
  assert.match(app, /applicationSelection\.subscribe[\s\S]*syncOccurrenceComposerSelection/);
  assert.match(app, /selectedEntityId:/);
  assert.match(app, /selectedOccurrenceId:/);
  assert.match(app, /selectedItemId/);
  assert.match(app, /composerItemIdForRelationship/);
  assert.match(app, /updateOccurrence/);
  assert.match(
    app,
    /composition:\s*occurrenceCompositionForRelationship\(relationship, selectedItemId\)/,
  );
  assert.match(app, /relationship:[\s\S]*subjectId:[\s\S]*objectId:/);
  assert.match(app, /place:[\s\S]*id:[\s\S]*name:/);
  assert.match(
    app,
    /placeName:\s*detail\.draft\.place\?\.name\s*\?\?\s*detail\.defaults\.placeReference/,
  );
});

test("closing timeline focus does not erase canonical selection", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  const focusHandler = app.match(/timelinefocuschange"[\s\S]*?\n\}\);/)?.[0] ?? "";

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
  const composerOpen =
    app.match(/function setOccurrenceComposerOpen\(open: boolean\)[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(composerOpen, /ui\.mode = "view"/);
  assert.doesNotMatch(composerOpen, /closeFocusedEventForUtility\(\)/);
  assert.doesNotMatch(composerOpen, /ui\.mode = "edit"/);
});

test("selection does not change the persistent Edit control presentation", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  const sync = app.match(/function syncTimelineContextControls\(\)[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(sync, /ui\.editorOpen \? "Done editing" : "Edit timeline"/);
  assert.doesNotMatch(sync, /Edit focused event|composerActive \? "Open editor"/);
});

test("investigation owns Home/End candidate navigation without stealing native suggestion editing", async () => {
  const composer = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    composer,
    /if \(investigation\.qualifiers\.length\)[\s\S]*\(event\.key === "Home" \|\| event\.key === "End"\) && candidates\.length[\s\S]*selectCandidate\(event\.key === "Home" \? 0 : candidates\.length - 1, candidates, false\)/,
  );
  const suggestionNavigation =
    composer.match(/const suggestions = this\.suggestions\(\)\.slice\(0, 7\);[\s\S]*?if \(event\.key !== "Enter"\) return;/)?.[0] ?? "";
  assert.doesNotMatch(suggestionNavigation, /event\.key === "Home"|event\.key === "End"/);
});

test("composer keeps active suggestions and investigation candidates visibly centered", async () => {
  const composer = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(composer, /private centerActiveChoice\(kind: "suggestion" \| "candidate"\)/);
  assert.match(composer, /kind === "suggestion" \? "\.listbox" : "\.candidate-matrix"/);
  assert.match(composer, /choiceCenter[\s\S]*container\.clientHeight \/ 2/);
  assert.match(composer, /container\.scrollTo\(\{ top: target, behavior: "auto" \}\)/);
  assert.match(composer, /visibleChoiceRect[\s\S]*panel\.scrollTo\(\{/);
  assert.match(composer, /private resetSuggestionSelection\(\)[\s\S]*centerActiveChoice\("suggestion"\)/);
  assert.match(composer, /private resetCandidateSelection\(\)[\s\S]*centerActiveChoice\("candidate"\)/);
  assert.match(composer, /@wheel=\$\{\(event: WheelEvent\) => this\.onSuggestionWheel\(event\)\}/);
  assert.match(composer, /vertical <= horizontal \* 1\.25/);
  assert.doesNotMatch(composer, /choiceWheelDelta|choiceWheelLastAt/);
  assert.match(composer, /choiceWheelLastStepAt > 0[\s\S]*< 48/);
  assert.match(composer, /return event\.deltaY > 0 \? 1 : -1/);
  assert.match(composer, /selectSuggestion\(this\.activeSuggestion \+ step, suggestions, false\)/);
  assert.match(composer, /selectCandidate\(this\.activeCandidate \+ step, candidates, false\)/);
  assert.match(composer, /occurrence-composer-candidate-\$\{index\}/);
});

test("contextual composer returns focus to its connected invoker on close", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(app, /occurrenceComposerReturnFocus/);
  assert.match(app, /function composerInvoker\(\)[\s\S]*document\.activeElement/);
  assert.match(
    app,
    /setOccurrenceComposerOpen\(open: boolean\)[\s\S]*occurrenceComposerReturnFocus = composerInvoker\(\)/,
  );
  assert.match(
    app,
    /restoreComposerFocus[\s\S]*isConnected[\s\S]*focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(app, /syncApplicationSurfaces\(\)[\s\S]*restoreComposerFocus/);
});


test("focused occurrence opens the composer directly and suppresses legacy detail", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial-shell.css", import.meta.url), "utf8"),
  ]);
  const focusHandler = app.match(/timelinefocuschange"[\s\S]*?\n\}\);/)?.[0] ?? "";

  assert.match(
    focusHandler,
    /selectionForTimelineFocus\([\s\S]*event\.detail\?\.id,[\s\S]*state\.relationships,[\s\S]*event\.detail\?\.relationshipId/,
  );
  assert.match(
    focusHandler,
    /focusSelection\?\.kind === "relationship"[\s\S]*setOccurrenceComposerOpen\(true\)/,
  );
  assert.match(
    css,
    /#app-shell:has\(#occurrence-composer\[active\]\) #timeline-focus-view,[\s\S]*\.timeline-event-detail[\s\S]*display:\s*none\s*!important/,
  );
  assert.match(
    app,
    /timelineoccurrenceeditrequest[\s\S]*relationshipId\?: string[\s\S]*selectionForTimelineFocus\(id, state\.relationships, relationshipId\)/,
  );
});
