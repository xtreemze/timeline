import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  occurrenceComposerSuggestions,
  parseOccurrenceSentence,
  replaceComposerTail,
} from "../site/occurrence-composer-model.ts";

test("occurrence sentence maps grammar into canonical authoring slots", () => {
  const parsed = parseOccurrenceSentence(
    'Alice(type: person, icon: user) meets Bob at Stockholm on 2026-09-26T14:00Z [category: observation, tags: friend|work]',
  );

  assert.equal(parsed.stage, "complete");
  assert.equal(parsed.subject?.name, "Alice");
  assert.equal(parsed.subject?.properties.type, "person");
  assert.equal(parsed.subject?.properties.icon, "user");
  assert.equal(parsed.predicate, "meets");
  assert.equal(parsed.object?.name, "Bob");
  assert.equal(parsed.place?.name, "Stockholm");
  assert.deepEqual(parsed.time, {
    kind: "instant",
    start: "2026-09-26T14:00Z",
  });
  assert.equal(parsed.options.category, "observation");
  assert.deepEqual(parsed.options.tags, ["friend", "work"]);
  assert.deepEqual(parsed.diagnostics, []);
});

test("quoted endpoint names and ranges remain deterministic", () => {
  const parsed = parseOccurrenceSentence(
    '"Alice Smith" sends "Case File" at "Central Station" from 2026-09-26T14:00Z to 2026-09-26T14:30Z',
  );

  assert.equal(parsed.subject?.name, "Alice Smith");
  assert.equal(parsed.predicate, "sends");
  assert.equal(parsed.object?.name, "Case File");
  assert.equal(parsed.place?.name, "Central Station");
  assert.deepEqual(parsed.time, {
    kind: "range",
    start: "2026-09-26T14:00Z",
    end: "2026-09-26T14:30Z",
  });
});

test("composer exposes cursor-local entity properties before generic entity completion", () => {
  const suggestions = occurrenceComposerSuggestions("Alice(type: ", {
    entities: [],
    places: [],
    categories: [],
    timelineDefault: "2026-09-26T14:00:00Z",
    locationDefault: "59.3293, 18.0686",
  });

  assert.ok(suggestions.some((suggestion) => suggestion.insertText === "type: person"));
  assert.equal(
    replaceComposerTail("Alice(type: ", "type: person", "subject"),
    "Alice(type: person",
  );
});

test("ambiguous entity names complete by canonical ID", () => {
  const suggestions = occurrenceComposerSuggestions("", {
    entities: [
      { id: "alice-a", name: "Alice", type: "person" },
      { id: "alice-b", name: "Alice", type: "person" },
    ],
    places: [],
    categories: [],
  });

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.insertText),
    ["@alice-a", "@alice-b"],
  );
});

test("completed grammar offers live World and timeline defaults without writing them into text", () => {
  const suggestions = occurrenceComposerSuggestions("Alice meets Bob", {
    entities: [],
    places: [{ id: "stockholm", name: "Stockholm" }],
    categories: [{ id: "observation", name: "Observation" }],
    timelineDefault: "2026-09-26T14:00:00Z",
    locationDefault: "59.3293, 18.0686",
  });

  assert.ok(
    suggestions.some(
      (suggestion) =>
        suggestion.kind === "place" &&
        suggestion.detail === "current World center" &&
        suggestion.insertText === "",
    ),
  );
  assert.ok(
    suggestions.some(
      (suggestion) =>
        suggestion.kind === "time" &&
        suggestion.insertText === "on 2026-09-26T14:00:00Z",
    ),
  );
});

test("Lit composer is a touch-safe ARIA combobox with live-context guidance", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /class LuumOccurrenceComposerElement extends LitElement/);
  assert.match(source, /customElements\.define\("luum-occurrence-composer"/);
  assert.match(source, /role="combobox"/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /min-block-size:\s*44px/);
  assert.match(source, /Move the timeline or World while this is open/);
  assert.match(source, /occurrencecomposeropenrequest/);
  assert.match(source, /occurrencecommit/);
});

test("application keeps timeline and World live while composer uses their centers as defaults", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(source, /requiredElement<LuumOccurrenceComposerElement>\("#occurrence-composer"\)/);
  assert.match(
    source,
    /presentationStage\.inert = Boolean\(ui\.browserOpen \|\| ui\.editorOpen\)/,
  );
  assert.match(
    source,
    /timelineviewportchange[\s\S]*setTimelineCenter\([\s\S]*viewport\.start[\s\S]*viewport\.end/,
  );
  assert.match(source, /worldviewportchange[\s\S]*setWorldCenter\(longitude, latitude\)/);
  assert.match(source, /const draft = clone\(state\) as TimelineState/);
  assert.match(source, /draft\.entities\.push\(entity\)/);
  assert.match(source, /draft\.places\.push\(place\)/);
  assert.match(source, /draft\.items\.push\(item\)/);
  assert.match(source, /draft\.relationships\.push\(relationship\)/);
  assert.match(source, /state = normalizeTimeline\(draft, \{ strictGraph: true \}\)/);
});

test("World surface publishes camera-center changes without persisting camera state", async () => {
  const source = await readFile(
    new URL("../site/world/deck-world-surface.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /#publishCameraContext\(\)/);
  assert.match(source, /new CustomEvent\("worldviewportchange"/);
  assert.match(source, /longitude:\s*this\.#camera\.longitude/);
  assert.match(source, /latitude:\s*this\.#camera\.latitude/);
});
