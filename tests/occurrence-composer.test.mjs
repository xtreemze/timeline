import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  formatTimelineCenter,
  spatialAccuracyForWorldZoom,
  temporalPrecisionForViewportSpan,
  timelineContextFromViewport,
  worldContextFromCamera,
} from "../site/occurrence-composer-context.ts";
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

test("composer suggests only supported semantic icon properties", async () => {
  const { TimelinePresentation } = await import("../site/event-presentation.ts");
  const suggestions = occurrenceComposerSuggestions("Alice(icon: ", {
    entities: [],
    places: [],
    categories: [],
  });
  const iconSuggestions = suggestions
    .filter((suggestion) => suggestion.insertText.startsWith("icon: "))
    .map((suggestion) => suggestion.insertText.slice("icon: ".length));

  assert.ok(iconSuggestions.length >= 6);
  for (const icon of iconSuggestions) {
    assert.ok(TimelinePresentation.ICON_NAMES.includes(icon), icon);
  }
  assert.equal(iconSuggestions.includes("user"), false);
  assert.equal(iconSuggestions.includes("building"), false);
  assert.equal(iconSuggestions.includes("document"), false);
  assert.ok(iconSuggestions.includes("person"));
  assert.ok(iconSuggestions.includes("group"));
  assert.ok(iconSuggestions.includes("evidence"));
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

test("timeline viewport span derives a bounded authoring precision", () => {
  const day = 86_400_000;
  assert.equal(temporalPrecisionForViewportSpan(20 * 365.2425 * day), "year");
  assert.equal(temporalPrecisionForViewportSpan(365 * day), "month");
  assert.equal(temporalPrecisionForViewportSpan(30 * day), "day");
  assert.equal(temporalPrecisionForViewportSpan(24 * 60 * 60 * 1000), "hour");
  assert.equal(temporalPrecisionForViewportSpan(2 * 60 * 60 * 1000), "minute");
  assert.equal(temporalPrecisionForViewportSpan(10 * 60 * 1000), "second");
});

test("timeline context formats the viewport center without manufacturing millisecond precision", () => {
  const center = Date.UTC(2026, 8, 26, 14, 37, 42, 987);
  const broad = timelineContextFromViewport(
    center - 30 * 86_400_000,
    center + 30 * 86_400_000,
  );
  const narrow = timelineContextFromViewport(center - 5 * 60_000, center + 5 * 60_000);

  assert.equal(broad?.precision, "day");
  assert.equal(broad?.value, "2026-09-26");
  assert.equal(narrow?.precision, "second");
  assert.equal(narrow?.value, "2026-09-26T14:37:42Z");
  assert.equal(formatTimelineCenter(center, "month"), "2026-09");
});

test("World zoom derives coarser accuracy when zoomed out", () => {
  const continent = spatialAccuracyForWorldZoom(3, 0);
  const street = spatialAccuracyForWorldZoom(17, 0);
  assert.ok(continent !== null && street !== null);
  assert.ok(continent > street);
  assert.ok(continent >= 100_000);
  assert.ok(street <= 100);
});

test("World authoring context labels coordinates at accuracy-appropriate precision", () => {
  const coarse = worldContextFromCamera({
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: 4,
  });
  const fine = worldContextFromCamera({
    longitude: 18.0686,
    latitude: 59.3293,
    zoom: 18,
  });

  assert.ok(coarse && fine);
  assert.ok(coarse.accuracyMeters > fine.accuracyMeters);
  assert.match(coarse.label, /±/);
  assert.match(fine.label, /±/);
  assert.ok(fine.label.length > coarse.label.length);
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
  assert.match(source, /:host\(:not\(\[active\]\)\)/);
  assert.doesNotMatch(source, /position:\s*fixed/);
  assert.match(source, /\.completion-panel[\s\S]*position:\s*absolute/);
  assert.match(source, /occurrencecommit/);
  assert.match(source, /explicitPlaceContext/);
  assert.match(source, /accuracyMeters/);
  assert.match(source, /setTimelineViewport/);
  assert.match(source, /setWorldContext/);
  assert.match(source, /placeholder=\$\{\`Who did what to whom · at/);
});

test("application keeps timeline and World live while composer uses their centers as defaults", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /function syncOccurrenceComposerData\(\): void \{[\s\S]*occurrenceComposer\.setData\(/,
  );


  assert.match(source, /requiredElement<LuumOccurrenceComposerElement>\("#occurrence-composer"\)/);
  assert.match(source, /requiredElement<HTMLButtonElement>\("#occurrence-composer-toggle"\)/);
  assert.match(
    source,
    /occurrenceComposerToggle\.addEventListener\("click"[\s\S]*setOccurrenceComposerOpen\(!els\.occurrenceComposer\.active\)/,
  );
  assert.match(
    source,
    /presentationStage\.inert = Boolean\([\s\S]*ui\.browserOpen[\s\S]*ui\.investigationOpen[\s\S]*ui\.editorOpen/,
  );
  assert.match(source, /const titleEditing = ui\.editorOpen/);
  assert.match(source, /occurrenceComposer\.hidden = Boolean\([\s\S]*ui\.investigationOpen/);
  assert.match(
    source,
    /timelineviewportchange[\s\S]*setTimelineViewport\([\s\S]*viewport\.start[\s\S]*viewport\.end/,
  );
  assert.match(
    source,
    /setOccurrenceComposerOpen[\s\S]*timelineView\?\.getViewport\?\.\(\)[\s\S]*setTimelineViewport/,
  );
  assert.match(
    source,
    /setOccurrenceComposerOpen[\s\S]*temporalGraphView\?\.getCamera\?\.\(\)[\s\S]*setWorldContext/,
  );
  assert.match(
    source,
    /worldviewportchange[\s\S]*camera\?\.zoom[\s\S]*setWorldContext\(longitude, latitude, zoom\)/,
  );
  assert.match(
    source,
    /import \\{ authorOccurrence \\} from ["\']\\.\\.\\/src\\/application\\/occurrence-authoring\\.ts["\']/,
  );
  assert.match(
    source,
    /authorOccurrence\\(state,[\\s\\S]*activeStoryId:[\\s\\S]*ui\\.activeStoryId/,
  );
  assert.doesNotMatch(source, /draft\\.entities\\.push\\(entity\\)/);
  assert.doesNotMatch(source, /draft\\.places\\.push\\(place\\)/);
  assert.doesNotMatch(source, /draft\\.items\\.push\\(item\\)/);
  assert.doesNotMatch(source, /draft\\.relationships\\.push\\(relationship\\)/);
  assert.doesNotMatch(
    source,
    /function composerEntityByReference|function composerPlace|function composerCategory/,
  );
});

test("occurrence composer is structurally integrated into the persistent footer", async () => {
  const [markup, shellStyles] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial-shell.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    markup,
    /<nav class="app-tool-dock app-footer-bar"[\s\S]*<luum-occurrence-composer id="occurrence-composer"><\/luum-occurrence-composer>/,
  );
  assert.match(
    markup,
    /id="occurrence-composer-toggle"[\s\S]*aria-controls="occurrence-composer"[\s\S]*aria-expanded="false"/,
  );
  assert.match(
    shellStyles,
    /#app-shell:has\(#occurrence-composer\[active\]\)[\s\S]*--workspace-footer-content-block-size:\s*116px/,
  );
  assert.match(
    shellStyles,
    /#occurrence-composer\[active\][\s\S]*grid-column:\s*1 \/ -1[\s\S]*grid-row:\s*1/,
  );
  assert.match(
    shellStyles,
    /app-footer-actions[\s\S]*grid-row:\s*2[\s\S]*app-footer-timeline[\s\S]*grid-row:\s*2/,
  );
  assert.match(markup, /id="timeline-view-controls-toggle"/);
  assert.match(markup, /id="timeline-view-controls" class="app-view-controls" popover="auto"/);
});

test("World application view exposes current camera for immediate composer initialization", async () => {
  const source = await readFile(
    new URL("../site/world/world-view-factory.ts", import.meta.url),
    "utf8",
  );
  const selection = await readFile(
    new URL("../site/world/world-view-selection.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /getCamera\(\): WorldCameraState/);
  assert.match(source, /return this\.#surface\.getCamera\(\)/);
  assert.match(selection, /getCamera\?\(\): WorldCameraState/);
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
