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
  acceptComposerSuggestion,
  composerCompletionSuffix,
  composerCursorSection,
  composerEditableSections,
  occurrenceComposerSuggestions,
  parseOccurrenceSentence,
  replaceComposerTail,
} from "../site/occurrence-composer-model.ts";

test("occurrence sentence maps grammar into canonical authoring slots", () => {
  const parsed = parseOccurrenceSentence(
    "Alice(type: person, icon: user) meets Bob at Stockholm on 2026-09-26T14:00Z [category: observation, tags: friend|work]",
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

test("quoted grammar words remain entity and place text instead of structural clauses", () => {
  const noContext = parseOccurrenceSentence('Alice reads "Meeting at Dawn"');
  assert.equal(noContext.stage, "complete");
  assert.equal(noContext.object?.name, "Meeting at Dawn");
  assert.equal(noContext.place, null);
  assert.equal(noContext.time, null);

  const parsed = parseOccurrenceSentence(
    '"Alice at Home" studies "War on Drugs" at "Museum on Main" on 2026-09-28',
  );
  assert.equal(parsed.stage, "complete");
  assert.equal(parsed.subject?.name, "Alice at Home");
  assert.equal(parsed.object?.name, "War on Drugs");
  assert.equal(parsed.place?.name, "Museum on Main");
  assert.deepEqual(parsed.time, { kind: "instant", start: "2026-09-28" });
});

test("quoted option delimiters and tags round-trip without semantic loss", () => {
  const sentence = formatOccurrenceComposition({
    subjectId: "alice",
    predicate: "reports",
    objectId: "case-file",
    category: "Research, Analysis",
    tags: ["ops|critical", "red,blue", "plain"],
  });
  assert.equal(
    sentence,
    '@alice reports @case-file [category: "Research, Analysis", tags: "ops|critical"|"red,blue"|plain]',
  );

  const parsed = parseOccurrenceSentence(sentence);
  assert.equal(parsed.stage, "complete");
  assert.equal(parsed.options.category, "Research, Analysis");
  assert.deepEqual(parsed.options.tags, ["ops|critical", "red,blue", "plain"]);

  const sections = composerEditableSections(sentence);
  assert.equal(
    sentence.slice(
      sections.find((section) => section.kind === "category")?.start ?? 0,
      sections.find((section) => section.kind === "category")?.end ?? 0,
    ),
    '"Research, Analysis"',
  );
  assert.deepEqual(
    sections
      .filter((section) => section.kind === "tag")
      .map((section) => section.text),
    ["ops|critical", "red,blue", "plain"],
  );
});

test("quoted entity property delimiters do not terminate properties or trigger false modes", () => {
  const sentence = 'Alice(note: "A, B)", icon: person) meets Bob';
  const parsed = parseOccurrenceSentence(sentence);
  assert.equal(parsed.stage, "complete");
  assert.equal(parsed.subject?.properties.note, "A, B)");
  assert.equal(parsed.subject?.properties.icon, "person");

  const entitySentence = '"Research (Beta)" meets Bob';
  const suggestions = occurrenceComposerSuggestions(entitySentence, {
    entities: [{ id: "research-beta", name: "Research (Beta)", type: "group" }],
    places: [],
    categories: [],
    cursorOffset: entitySentence.indexOf("Beta"),
  });
  assert.equal(suggestions.some((suggestion) => suggestion.kind === "property"), false);
  assert.equal(suggestions[0]?.kind, "entity");

  const nextProperty = occurrenceComposerSuggestions("Alice(icon: person, ty", {
    entities: [],
    places: [],
    categories: [],
    cursorOffset: "Alice(icon: person, ty".length,
  });
  assert.ok(nextProperty.some((suggestion) => suggestion.label === "type: person"));
  assert.equal(
    nextProperty.some((suggestion) => suggestion.detail === "semantic icon"),
    false,
  );
});

test("quoted commas are preserved when accepting later property and option suggestions", () => {
  assert.equal(
    replaceComposerTail('Alice(note: "A, B", ic', "icon: person", "complete"),
    'Alice(note: "A, B", icon: person',
  );
  assert.equal(
    replaceComposerTail(
      'Alice meets Bob [category: "Research, Analysis", ta',
      "tags: plain",
      "complete",
    ),
    'Alice meets Bob [category: "Research, Analysis", tags: plain',
  );
});

test("selection-only composition preserves every previously accepted grammar component", () => {
  const options = {
    entities: [
      { id: "stick-house", name: "Stick House", type: "place-like object", icon: "object" },
      { id: "wolf", name: "Big Bad Wolf", type: "person", icon: "person" },
    ],
    places: [{ id: "forest-clearing", name: "Forest Clearing", icon: "forest" }],
    categories: [{ id: "encounter", name: "Encounter" }],
    tags: ["story", "danger"],
    predicates: ["calls"],
    timelineDefault: "2026-09-28",
  };

  let value = "";
  let cursorOffset = 0;
  const accept = (predicate) => {
    const suggestions = occurrenceComposerSuggestions(value, {
      ...options,
      cursorOffset,
    });
    const suggestion = suggestions.find(predicate);
    assert.ok(suggestion, `missing suggestion after: ${value}`);
    const accepted = acceptComposerSuggestion(
      value,
      suggestion,
      parseOccurrenceSentence(value).stage,
    );
    value = accepted.value;
    cursorOffset = accepted.cursorOffset;
    return value;
  };

  assert.equal(
    accept((suggestion) => suggestion.kind === "entity" && suggestion.label === "Stick House"),
    '"Stick House" ',
  );
  assert.equal(
    accept((suggestion) => suggestion.kind === "predicate" && suggestion.insertText === "calls"),
    '"Stick House" calls ',
  );
  assert.equal(
    accept((suggestion) => suggestion.kind === "entity" && suggestion.label === "Big Bad Wolf"),
    '"Stick House" calls "Big Bad Wolf" ',
  );
  assert.equal(
    accept((suggestion) => suggestion.kind === "place" && suggestion.label === "Forest Clearing"),
    '"Stick House" calls "Big Bad Wolf" at "Forest Clearing" ',
  );
  assert.equal(
    accept((suggestion) => suggestion.kind === "time" && suggestion.insertText === "on 2026-09-28"),
    '"Stick House" calls "Big Bad Wolf" at "Forest Clearing" on 2026-09-28 ',
  );
  assert.equal(
    accept((suggestion) => suggestion.kind === "category" && suggestion.label === "Encounter"),
    '"Stick House" calls "Big Bad Wolf" at "Forest Clearing" on 2026-09-28 [category: Encounter] ',
  );

  const parsed = parseOccurrenceSentence(value);
  assert.equal(parsed.subject?.name, "Stick House");
  assert.equal(parsed.predicate, "calls");
  assert.equal(parsed.object?.name, "Big Bad Wolf");
  assert.equal(parsed.place?.name, "Forest Clearing");
  assert.equal(parsed.time?.start, "2026-09-28");
  assert.equal(parsed.options.category, "Encounter");
});

test("accepting a missing predicate or object appends without reconstructing quoted or canonical prefixes", () => {
  const predicate = {
    kind: "predicate",
    label: "calls",
    detail: "action",
    insertText: "calls",
  };
  const entity = {
    kind: "entity",
    label: "Big Bad Wolf",
    detail: "person",
    insertText: '"Big Bad Wolf"',
  };

  const afterPredicate = acceptComposerSuggestion(
    '"Stick House" ',
    predicate,
    parseOccurrenceSentence('"Stick House" ').stage,
  );
  assert.equal(afterPredicate.value, '"Stick House" calls ');

  const afterObject = acceptComposerSuggestion(
    "@stick-house calls ",
    entity,
    parseOccurrenceSentence("@stick-house calls ").stage,
  );
  assert.equal(afterObject.value, '@stick-house calls "Big Bad Wolf" ');
});

test("cursor-local replacement changes only the selected component and preserves later components", () => {
  const original = '"Stick House" calls "Big Bad Wolf" at "Forest Clearing" on 2026-09-28';
  const cursorOffset = original.indexOf("calls") + 2;
  const suggestion = occurrenceComposerSuggestions(original, {
    entities: [],
    places: [],
    categories: [],
    predicates: ["visits"],
    cursorOffset,
  }).find((candidate) => candidate.kind === "predicate" && candidate.insertText === "visits");
  assert.ok(suggestion);
  const accepted = acceptComposerSuggestion(
    original,
    suggestion,
    parseOccurrenceSentence(original).stage,
  );
  assert.equal(
    accepted.value,
    '"Stick House" visits "Big Bad Wolf" at "Forest Clearing" on 2026-09-28',
  );
});

test("accepted terminal action advances from predicate to object suggestions", () => {
  const input = "Alice receives";
  const predicateSuggestions = occurrenceComposerSuggestions(input, {
    entities: [{ id: "bob", name: "Bob", type: "person" }],
    places: [],
    categories: [],
    cursorOffset: input.length,
  });
  const receives = predicateSuggestions.find(
    (suggestion) => suggestion.kind === "predicate" && suggestion.insertText === "receives",
  );
  assert.ok(receives);

  const accepted = acceptComposerSuggestion(
    input,
    receives,
    parseOccurrenceSentence(input).stage,
  );

  assert.equal(accepted.value, "Alice receives ");
  assert.equal(accepted.cursorOffset, accepted.value.length);
  assert.equal(parseOccurrenceSentence(accepted.value).stage, "object");
  assert.equal(
    composerCursorSection(accepted.value, accepted.cursorOffset).kind,
    "tail",
  );

  const objectSuggestions = occurrenceComposerSuggestions(accepted.value, {
    entities: [{ id: "bob", name: "Bob", type: "person" }],
    places: [],
    categories: [],
    cursorOffset: accepted.cursorOffset,
  });
  assert.equal(objectSuggestions[0]?.kind, "entity");
  assert.equal(objectSuggestions[0]?.label, "Bob");
});

test("accepted partial action and multi-word object advance exactly one grammar slot", () => {
  const actionInput = "Alice rece";
  const action = occurrenceComposerSuggestions(actionInput, {
    entities: [],
    places: [],
    categories: [],
    cursorOffset: actionInput.length,
  }).find((suggestion) => suggestion.insertText === "receives");
  assert.ok(action);

  const acceptedAction = acceptComposerSuggestion(
    actionInput,
    action,
    parseOccurrenceSentence(actionInput).stage,
  );
  assert.equal(acceptedAction.value, "Alice receives ");
  assert.equal(parseOccurrenceSentence(acceptedAction.value).stage, "object");

  const objectInput = `${acceptedAction.value}Big B`;
  const object = occurrenceComposerSuggestions(objectInput, {
    entities: [{ id: "big-bad-wolf", name: "Big Bad Wolf", type: "person" }],
    places: [],
    categories: [],
    cursorOffset: objectInput.length,
  })[0];
  assert.equal(object?.kind, "entity");

  const acceptedObject = acceptComposerSuggestion(
    objectInput,
    object,
    parseOccurrenceSentence(objectInput).stage,
  );
  assert.equal(acceptedObject.value, 'Alice receives "Big Bad Wolf" ');
  assert.equal(parseOccurrenceSentence(acceptedObject.value).stage, "complete");
});

test("accepted place and time suggestions advance out of their cursor-local sections", () => {
  const placeInput = 'Alice meets Bob at "Deep Forst"';
  const placeSuggestion = occurrenceComposerSuggestions(placeInput, {
    entities: [],
    places: [{ id: "deep-forest", name: "Deep Forest", icon: "forest" }],
    categories: [],
    cursorOffset: placeInput.length,
  })[0];
  assert.equal(placeSuggestion?.kind, "place");

  const acceptedPlace = acceptComposerSuggestion(
    placeInput,
    placeSuggestion,
    parseOccurrenceSentence(placeInput).stage,
  );
  assert.equal(acceptedPlace.value, 'Alice meets Bob at "Deep Forest" ');
  assert.equal(
    composerCursorSection(acceptedPlace.value, acceptedPlace.cursorOffset).kind,
    "tail",
  );

  const timeInput = "Alice meets Bob on 2026-09-27";
  const timeSuggestion = occurrenceComposerSuggestions(timeInput, {
    entities: [],
    places: [],
    categories: [],
    timelineDefault: "2026-09-28",
    cursorOffset: timeInput.length,
  })[0];
  assert.equal(timeSuggestion?.kind, "time");

  const acceptedTime = acceptComposerSuggestion(
    timeInput,
    timeSuggestion,
    parseOccurrenceSentence(timeInput).stage,
  );
  assert.equal(acceptedTime.value, "Alice meets Bob on 2026-09-28 ");
  assert.equal(
    composerCursorSection(acceptedTime.value, acceptedTime.cursorOffset).kind,
    "tail",
  );
});

test("editing an existing action replaces in place without inserting another separator", () => {
  const input = "Alice meets Bob";
  const cursorOffset = input.indexOf("meets") + 2;
  const calls = occurrenceComposerSuggestions(input, {
    entities: [],
    places: [],
    categories: [],
    cursorOffset,
  }).find((suggestion) => suggestion.insertText === "calls");
  assert.ok(calls);

  const accepted = acceptComposerSuggestion(
    input,
    calls,
    parseOccurrenceSentence(input).stage,
  );
  assert.equal(accepted.value, "Alice calls Bob");
  assert.equal(parseOccurrenceSentence(accepted.value).stage, "complete");
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

test("composer identifies the grammatical section under the caret", () => {
  const sentence = 'Alice meets "The Wolf" at "Deep Forest" on 2026-09-28 [category: Conflict]';

  assert.equal(composerCursorSection(sentence, sentence.indexOf("Alice") + 2).kind, "subject");
  assert.equal(composerCursorSection(sentence, sentence.indexOf("meets") + 2).kind, "predicate");
  assert.equal(composerCursorSection(sentence, sentence.indexOf("The Wolf") + 3).kind, "object");
  assert.equal(composerCursorSection(sentence, sentence.indexOf("Deep Forest") + 3).kind, "place");
  assert.equal(composerCursorSection(sentence, sentence.indexOf("2026-09-28") + 2).kind, "time");
  assert.equal(composerCursorSection(sentence, sentence.indexOf("[category") + 2).kind, "options");
});

test("composer stays on the current grammatical token until whitespace advances it", () => {
  const baseOptions = {
    entities: [
      { id: "alice", name: "Alice", type: "person", icon: "person" },
      { id: "bob", name: "Bob", type: "person", icon: "person" },
    ],
    places: [{ id: "deep-forest", name: "Deep Forest", icon: "forest" }],
    categories: [{ id: "observation", name: "Observation" }],
    timelineDefault: "2026-09-28T10:00:00Z",
  };

  const subject = occurrenceComposerSuggestions("A", {
    ...baseOptions,
    cursorOffset: 1,
  });
  assert.equal(subject[0]?.kind, "entity");
  assert.equal(subject[0]?.label, "Alice");

  const predicate = occurrenceComposerSuggestions("Alice m", {
    ...baseOptions,
    cursorOffset: "Alice m".length,
  });
  assert.equal(predicate[0]?.kind, "predicate");
  assert.equal(predicate[0]?.label, "meets");

  const object = occurrenceComposerSuggestions("Alice meets B", {
    ...baseOptions,
    cursorOffset: "Alice meets B".length,
  });
  assert.equal(object[0]?.kind, "entity");
  assert.equal(object[0]?.label, "Bob");

  const objectAdvanced = occurrenceComposerSuggestions("Alice meets Bob ", {
    ...baseOptions,
    cursorOffset: "Alice meets Bob ".length,
  });
  assert.equal(
    objectAdvanced.some((suggestion) => suggestion.detail?.startsWith("nearest object")),
    false,
  );
  assert.ok(objectAdvanced.some((suggestion) => suggestion.kind === "place"));

  const placeText = 'Alice meets Bob at "Deep Forest"';
  const place = occurrenceComposerSuggestions(placeText, {
    ...baseOptions,
    cursorOffset: placeText.length,
  });
  assert.equal(place[0]?.kind, "place");
  assert.equal(place[0]?.label, "Deep Forest");

  const placeAdvancedText = `${placeText} `;
  const placeAdvanced = occurrenceComposerSuggestions(placeAdvancedText, {
    ...baseOptions,
    cursorOffset: placeAdvancedText.length,
  });
  assert.equal(
    placeAdvanced.some((suggestion) => suggestion.detail === "nearest place"),
    false,
  );
  assert.ok(placeAdvanced.some((suggestion) => suggestion.kind === "time"));
});

test("single object character does not advance into occurrence context", () => {
  const input = "Alice meets B";
  assert.equal(composerCursorSection(input, input.length).kind, "object");

  const suggestions = occurrenceComposerSuggestions(input, {
    entities: [{ id: "bob", name: "Bob", type: "person", icon: "person" }],
    places: [{ id: "stockholm", name: "Stockholm", icon: "place" }],
    categories: [{ id: "observation", name: "Observation" }],
    timelineDefault: "2026-09-28T10:00:00Z",
    cursorOffset: input.length,
  });

  assert.equal(suggestions[0]?.kind, "entity");
  assert.equal(suggestions[0]?.label, "Bob");
  assert.equal(
    suggestions.some((suggestion) => suggestion.kind === "time"),
    false,
  );
});

test("caret-local entity suggestions rank nearest canonical matches and show their icons", () => {
  const sentence = "Alic meets Bob";
  const suggestions = occurrenceComposerSuggestions(sentence, {
    entities: [
      { id: "wolf", name: "The Wolf", type: "person", icon: "wolf" },
      { id: "alice", name: "Alice", type: "person", icon: "person" },
      { id: "alicia", name: "Alicia", type: "person", icon: "person" },
    ],
    places: [],
    categories: [],
    cursorOffset: 2,
  });

  assert.equal(suggestions[0]?.label, "Alice");
  assert.equal(suggestions[0]?.icon, "person");
  assert.deepEqual(suggestions[0]?.replaceRange, { start: 0, end: 4 });
});

test("entity suggestions use canonical IDs when a primary name collides with another alias", () => {
  const entities = [
    { id: "alice", name: "Alice", type: "person", icon: "person" },
    {
      id: "alicia",
      name: "Alicia",
      type: "person",
      icon: "person",
      alternateNames: ["Alice"],
    },
  ];

  const forward = occurrenceComposerSuggestions("", {
    entities,
    places: [],
    categories: [],
    cursorOffset: 0,
  }).find((suggestion) => suggestion.label === "Alice");
  assert.ok(forward);
  assert.equal(forward.insertText, "@alice");
  assert.match(forward.detail ?? "", /alice/);

  const sentence = "Alce meets Bob";
  const local = occurrenceComposerSuggestions(sentence, {
    entities,
    places: [],
    categories: [],
    cursorOffset: 2,
  }).find((suggestion) => suggestion.label === "Alice");
  assert.ok(local);
  assert.equal(local.insertText, "@alice");
  assert.deepEqual(local.replaceRange, { start: 0, end: 4 });
});

test("caret-local action suggestions rank typo-nearest actions and carry semantic glyphs", () => {
  const sentence = "Alice attaks Bob";
  const cursorOffset = sentence.indexOf("attaks") + 3;
  const suggestions = occurrenceComposerSuggestions(sentence, {
    entities: [],
    places: [],
    categories: [],
    cursorOffset,
  });

  assert.equal(suggestions[0]?.label, "attacks");
  assert.equal(suggestions[0]?.icon, "danger");
  assert.equal(suggestions[0]?.kind, "predicate");
});

test("caret-local action suggestions include project predicates and infer their glyph family", () => {
  const sentence = "Alice confrnts Bob";
  const cursorOffset = sentence.indexOf("confrnts") + 4;
  const suggestions = occurrenceComposerSuggestions(sentence, {
    entities: [],
    places: [],
    categories: [],
    predicates: ["confronts", "reunitesWith"],
    cursorOffset,
  });

  assert.equal(suggestions[0]?.label, "confronts");
  assert.equal(suggestions[0]?.icon, "danger");
});

test("caret-local place suggestions show canonical and inferred place iconography", () => {
  const sentence = 'Alice visits Bob at "Deep Forst" on 2026-09-28';
  const cursorOffset = sentence.indexOf("Deep Forst") + 4;
  const suggestions = occurrenceComposerSuggestions(sentence, {
    entities: [],
    places: [
      { id: "deep-forest", name: "Deep Forest", icon: "forest" },
      { id: "market-road", name: "Market Road", icon: "road" },
    ],
    categories: [],
    cursorOffset,
  });

  assert.equal(suggestions[0]?.label, "Deep Forest");
  assert.equal(suggestions[0]?.icon, "forest");
  assert.equal(suggestions[0]?.kind, "place");
});

test("new semantic entity and place text exposes an icon suggestion at the caret", () => {
  const entitySuggestions = occurrenceComposerSuggestions("Wolf meets Bob", {
    entities: [],
    places: [],
    categories: [],
    cursorOffset: 2,
  });
  assert.equal(entitySuggestions[0]?.icon, "wolf");
  assert.match(entitySuggestions[0]?.detail ?? "", /suggested wolf icon/);
  assert.match(entitySuggestions[0]?.insertText ?? "", /icon: wolf/);

  const placeSentence = 'Alice visits Bob at "Old Well"';
  const placeSuggestions = occurrenceComposerSuggestions(placeSentence, {
    entities: [],
    places: [],
    categories: [],
    cursorOffset: placeSentence.indexOf("Old Well") + 2,
  });
  assert.equal(placeSuggestions[0]?.icon, "well");
  assert.match(placeSuggestions[0]?.detail ?? "", /suggested well icon/);
});

test("complete sentence tail keeps contextual suggestions after an explicit separator", () => {
  const sentence = "Alice meets Bob ";
  const suggestions = occurrenceComposerSuggestions(sentence, {
    entities: [{ id: "bob", name: "Bob", type: "person", icon: "person" }],
    places: [{ id: "stockholm", name: "Stockholm", icon: "place" }],
    categories: [{ id: "observation", name: "Observation" }],
    timelineDefault: "2026-09-28T10:00:00Z",
    locationDefault: "World center",
    cursorOffset: sentence.length,
  });

  assert.ok(suggestions.some((suggestion) => suggestion.kind === "place"));
  assert.ok(suggestions.some((suggestion) => suggestion.kind === "time"));
  assert.equal(
    suggestions.some((suggestion) => suggestion.detail?.startsWith("nearest object")),
    false,
  );
});

test("caret over the time section suggests the live timeline center with iconography", () => {
  const sentence = "Alice meets Bob on 2026-09-27";
  const suggestions = occurrenceComposerSuggestions(sentence, {
    entities: [],
    places: [],
    categories: [],
    timelineDefault: "2026-09-28T10:00:00Z",
    cursorOffset: sentence.indexOf("2026-09-27") + 3,
  });

  assert.equal(suggestions[0]?.kind, "time");
  assert.equal(suggestions[0]?.icon, "milestone");
  assert.equal(suggestions[0]?.insertText, "2026-09-28T10:00:00Z");
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
  for (const placeIcon of [
    "forest",
    "road",
    "garden",
    "well",
    "room",
    "gate",
    "market",
    "castle",
  ]) {
    assert.ok(iconSuggestions.includes(placeIcon), `${placeIcon}: shared composer vocabulary`);
  }
});

test("entity completions carry their resolved semantic icon into the composer", () => {
  const suggestions = occurrenceComposerSuggestions("", {
    entities: [{ id: "wolf", name: "The Wolf", type: "person", icon: "wolf" }],
    places: [],
    categories: [],
  });

  assert.equal(suggestions[0]?.kind, "entity");
  assert.equal(suggestions[0]?.icon, "wolf");
});

test("composer renders semantic glyphs beside entity completions", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /iconPathData\(suggestion\.icon\)/);
  assert.match(source, /class="option-icon"/);
});

test("cursor-local ambiguous matches still replace with canonical IDs", () => {
  const sentence = "Alice meets Bob";
  const suggestions = occurrenceComposerSuggestions(sentence, {
    entities: [
      { id: "alice-a", name: "Alice", type: "person", icon: "person" },
      { id: "alice-b", name: "Alice", type: "person", icon: "person" },
      { id: "bob", name: "Bob", type: "person", icon: "person" },
    ],
    places: [],
    categories: [],
    cursorOffset: 2,
  });

  assert.deepEqual(
    suggestions.slice(0, 2).map((suggestion) => suggestion.insertText),
    ["@alice-a", "@alice-b"],
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

test("composer reuses existing tags and categories as contextual suggestions", () => {
  const tagSuggestions = occurrenceComposerSuggestions("Alice meets Bob [tags: fri", {
    entities: [],
    places: [],
    categories: [{ id: "observation", name: "Observation" }],
    tags: ["friend", "family", "work"],
    predicates: [],
  });
  assert.ok(
    tagSuggestions.some(
      (suggestion) => suggestion.kind === "tag" && suggestion.insertText === "tags: friend",
    ),
  );

  const secondTagSuggestions = occurrenceComposerSuggestions(
    "Alice meets Bob [tags: friend|wo",
    {
      entities: [],
      places: [],
      categories: [],
      tags: ["friend", "work"],
      predicates: [],
    },
  );
  assert.equal(
    secondTagSuggestions.some((suggestion) => suggestion.insertText.includes("friend|friend")),
    false,
  );
  assert.ok(
    secondTagSuggestions.some((suggestion) => suggestion.insertText === "tags: friend|work"),
  );

  const categorySuggestions = occurrenceComposerSuggestions("Alice meets Bob [category: obs", {
    entities: [],
    places: [],
    categories: [{ id: "observation", name: "Observation" }],
    tags: [],
    predicates: [],
  });
  assert.ok(
    categorySuggestions.some(
      (suggestion) =>
        suggestion.kind === "category" && suggestion.insertText === "category: Observation",
    ),
  );
});

test("composer exposes shell-style ghost completion text without mutating the draft", () => {
  const suggestion = {
    kind: "predicate",
    label: "reports",
    detail: "action",
    insertText: "reports",
  };
  assert.equal(composerCompletionSuffix("Alice rep", suggestion), "orts");
  assert.equal(
    composerCompletionSuffix("Alice meets Big B", {
      kind: "entity",
      label: "Big Bad Wolf",
      detail: "person · @big-bad-wolf",
      insertText: "@big-bad-wolf",
    }),
    "ad Wolf",
  );
  assert.equal(
    composerCompletionSuffix("Alice meets Bob at Central Sta", {
      kind: "place",
      label: "Central Station",
      detail: "existing place · @central-station",
      insertText: "at @central-station",
    }),
    "tion",
  );
  assert.equal(composerCompletionSuffix("Alice xyz", suggestion), "");
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
        suggestion.kind === "time" && suggestion.insertText === "on 2026-09-26T14:00:00Z",
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
  const broad = timelineContextFromViewport(center - 30 * 86_400_000, center + 30 * 86_400_000);
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
  assert.match(source, /class="compact"/);
  assert.match(source, /class="ghost-completion"/);
  assert.match(source, /aria-autocomplete="both"/);
  assert.match(source, /suggestions\(\)\.slice\(0, 7\)/);
  assert.match(source, /Open occurrence composer/);
  assert.match(source, /occurrencecomposeropenrequest/);
  assert.doesNotMatch(source, /:host\(:not\(\[active\]\)\)\s*\{[\s\S]*display:\s*none/);
  assert.doesNotMatch(source, /position:\s*fixed/);
  assert.match(source, /\.completion-panel[\s\S]*position:\s*absolute/);
  assert.match(source, /occurrencecommit/);
  assert.match(source, /explicitPlaceContext/);
  assert.match(source, /accuracyMeters/);
  assert.match(source, /setTimelineViewport/);
  assert.match(source, /setWorldContext/);
  assert.match(source, /placeholder=\$\{\`Who did what to whom · at/);
  assert.match(source, /private cursorOffset = 0/);
  assert.match(source, /selectionStart/);
  assert.match(source, /@focus=\$\{\(event: Event\) => this\.onCaretMove\(event\)\}/);
  assert.match(source, /@click=\$\{\(event: Event\) => this\.onCaretMove\(event\)\}/);
  assert.match(source, /@keyup=\$\{\(event: Event\) => this\.onCaretMove\(event\)\}/);
  assert.match(source, /replaceRange/);
  assert.match(source, /class="context-row"/);
  assert.match(source, /data-context-state=\$\{placePinned \? "pinned" : "live"\}/);
  assert.match(source, /data-context-state=\$\{timePinned \? "pinned" : "live"\}/);
  assert.match(source, /private sessionKey = ""/);
  assert.match(source, /hasPendingSelectionContext/);
  assert.match(source, /Use selected context/);
  assert.match(source, /dirtyDraft/);
  assert.match(source, /editTarget:/);
  assert.match(source, /beginSession\(\): void/);
  assert.match(source, /currentContextKey\(\)/);
  assert.match(source, /resetDraft\(\)/);
  assert.match(source, /hide\(\): void \{[\s\S]*sessionKey = this\.currentContextKey\(\)/);
  assert.doesNotMatch(source, /event\.key === "Tab"/);
  assert.doesNotMatch(source, /event\.key === "Home"/);
  assert.doesNotMatch(source, /event\.key === "End"/);
  assert.match(source, /Tab moves focus/);
  assert.match(source, /--composer-completion-max-height/);
});

test("application keeps timeline and World live while composer uses their centers as defaults", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /function syncOccurrenceComposerData\(\): void \{[\s\S]*occurrenceComposer\.setData\(/,
  );

  assert.match(source, /requiredElement<LuumOccurrenceComposerElement>\("#occurrence-composer"\)/);
  assert.match(
    source,
    /presentationStage\.inert = Boolean\([\s\S]*ui\.browserOpen[\s\S]*ui\.investigationOpen[\s\S]*ui\.editorOpen/,
  );
  assert.match(source, /const titleEditing = ui\.editorOpen/);
  assert.match(source, /occurrenceComposer\.hidden = ui\.importReviewOpen/);
  assert.match(source, /occurrencecomposeropenrequest[\s\S]*setOccurrenceComposerOpen\(true\)/);
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
  assert.match(source, /occurrenceComposer\.beginSession\(\)/);
  assert.match(source, /tags:\s*\[[\s\S]*state\.items\.flatMap/);
  assert.match(source, /predicates:\s*\[\.\.\.new Set\(state\.relationships\.map/);
  assert.match(
    source,
    /createPointPlace:[\s\S]*suggestSemanticIconForPlace\(\{ name \}\)\?\.icon \?\? "place"/,
  );
  assert.match(source, /function syncComposerVisualViewport\(\)/);
  assert.match(
    source,
    /visualViewport\?\.addEventListener\("resize", syncComposerVisualViewport\)/,
  );
  assert.match(source, /dataset\.composerOpen = String\(composerActive\)/);
  assert.match(source, /editorToggle\.setAttribute\("aria-pressed", String\(ui\.editorOpen\)\)/);
  assert.doesNotMatch(source, /const authoringActive = ui\.editorOpen \|\| composerActive/);
  assert.match(
    source,
    /restoreComposerFocus[\s\S]*getClientRects\(\)\.length > 0[\s\S]*els\.editorToggle/,
  );
  assert.match(
    source,
    /worldviewportchange[\s\S]*camera\?\.zoom[\s\S]*setWorldContext\(longitude, latitude, zoom\)/,
  );
  assert.match(
    source,
    /import \{[\s\S]*authorOccurrence,[\s\S]*updateOccurrence,[\s\S]*\} from ["']\.\.\/src\/application\/occurrence-authoring\.ts["']/,
  );
  assert.match(source, /authorOccurrence\(state,[\s\S]*activeStoryId:[\s\S]*ui\.activeStoryId/);
  assert.match(
    source,
    /updateOccurrence\([\s\S]*relationshipId:\s*detail\.editTarget\.relationshipId/,
  );
  assert.match(source, /Occurrence unchanged\./);
  assert.match(source, /result\.semanticReviewRequired/);
  assert.match(source, /Review its evidence, confidence, and semantic context/);
  assert.match(source, /composerItemIdForRelationship/);
  assert.doesNotMatch(source, /draft\.entities\.push\(entity\)/);
  assert.doesNotMatch(source, /draft\.places\.push\(place\)/);
  assert.doesNotMatch(source, /draft\.items\.push\(item\)/);
  assert.doesNotMatch(source, /draft\.relationships\.push\(relationship\)/);
  assert.doesNotMatch(
    source,
    /function composerEntityByReference|function composerPlace|function composerCategory/,
  );
});

test("occurrence composer stays visibly integrated into the stable footer", async () => {
  const [markup, shellStyles] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/spatial-shell.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    markup,
    /<nav class="app-tool-dock app-footer-bar"[\s\S]*<luum-occurrence-composer id="occurrence-composer"><\/luum-occurrence-composer>/,
  );
  const footerStart = markup.indexOf('<nav class="app-tool-dock app-footer-bar"');
  const footerEnd = markup.indexOf("</nav>", footerStart);
  assert.equal((markup.match(/id="occurrence-composer-toggle"/g) ?? []).length, 0);
  assert.match(markup.slice(footerStart, footerEnd), /id="occurrence-composer"/);

  assert.doesNotMatch(
    shellStyles,
    /#app-shell:has\(#occurrence-composer\[active\]\)[\s\S]*--workspace-footer-content-block-size:\s*116px/,
  );
  assert.match(
    shellStyles,
    /#occurrence-composer\[active\][\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*1/,
  );
  assert.match(
    shellStyles,
    /#occurrence-composer:not\(\[active\]\)[\s\S]*grid-column:\s*2[\s\S]*min-inline-size:\s*160px/,
  );
  assert.match(
    shellStyles,
    /app-footer-actions[\s\S]*grid-row:\s*1[\s\S]*app-footer-view[\s\S]*grid-column:\s*3[\s\S]*grid-row:\s*1/,
  );
  assert.doesNotMatch(shellStyles, /app-footer-timeline/);
  assert.doesNotMatch(markup, /id="timeline-view-controls-toggle"/);
  assert.match(
    markup,
    /id="timeline-view-controls" class="app-footer-zone app-footer-view" role="group"/,
  );
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

test("composer exposes stable editable spans for every semantic sentence section", () => {
  const sentence =
    '@alice warns "Big Bad Wolf" at "Deep Forest" from 2026-09-28T08:00Z to 2026-09-28T09:00Z [category: "Critical Event", tags: work|urgent]';
  const sections = composerEditableSections(sentence);
  assert.deepEqual(
    sections.map((section) => [
      section.kind,
      section.index ?? null,
      sentence.slice(section.start, section.end),
    ]),
    [
      ["subject", null, "@alice"],
      ["predicate", null, "warns"],
      ["object", null, '"Big Bad Wolf"'],
      ["place", null, '"Deep Forest"'],
      ["time", null, "from 2026-09-28T08:00Z to 2026-09-28T09:00Z"],
      ["category", null, '"Critical Event"'],
      ["tag", 0, "work"],
      ["tag", 1, "urgent"],
    ],
  );
});

test("completed category and tag suggestions replace their selected spans in place", () => {
  const base = "Alice meets Bob [category: Observation, tags: work|urgent]";
  const options = {
    entities: [],
    places: [],
    categories: [
      { id: "observation", name: "Observation" },
      { id: "conflict", name: "Conflict" },
    ],
    tags: ["work", "urgent", "travel"],
  };

  const category = composerEditableSections(base).find((section) => section.kind === "category");
  assert.ok(category);
  const conflict = occurrenceComposerSuggestions(base, {
    ...options,
    cursorOffset: category.end,
  }).find((suggestion) => suggestion.kind === "category" && suggestion.label === "Conflict");
  assert.ok(conflict?.replaceRange);
  const categoryEdit = acceptComposerSuggestion(base, conflict, parseOccurrenceSentence(base).stage);
  assert.equal(categoryEdit.value, "Alice meets Bob [category: Conflict, tags: work|urgent]");

  const firstTag = composerEditableSections(categoryEdit.value).find(
    (section) => section.kind === "tag" && section.index === 0,
  );
  assert.ok(firstTag);
  const travel = occurrenceComposerSuggestions(categoryEdit.value, {
    ...options,
    cursorOffset: firstTag.end,
  }).find((suggestion) => suggestion.kind === "tag" && suggestion.label === "travel");
  assert.ok(travel?.replaceRange);
  const tagEdit = acceptComposerSuggestion(
    categoryEdit.value,
    travel,
    parseOccurrenceSentence(categoryEdit.value).stage,
  );
  assert.equal(tagEdit.value, "Alice meets Bob [category: Conflict, tags: travel|urgent]");
});

test("a complete sentence remains valid through reverse and unconventional edit order", () => {
  const options = {
    entities: [
      { id: "alice", name: "Alice", type: "person" },
      { id: "bob", name: "Bob", type: "person" },
      { id: "carol", name: "Carol", type: "person" },
      { id: "dana", name: "Dana", type: "person" },
    ],
    places: [
      { id: "stockholm", name: "Stockholm" },
      { id: "gothenburg", name: "Gothenburg" },
    ],
    categories: [{ id: "observation", name: "Observation" }],
    tags: ["work", "urgent", "travel"],
    timelineDefault: "2026-10-01T12:00Z",
    predicates: ["meets", "calls", "warns"],
  };
  let value =
    "Alice warns Dana at Stockholm from 2026-09-28T08:00Z to 2026-09-28T09:00Z [category: Observation, tags: work|urgent]";

  const apply = (kind, label, index = 0) => {
    const section = composerEditableSections(value).filter((candidate) => candidate.kind === kind)[index];
    assert.ok(section, `missing ${kind}[${index}] in ${value}`);
    const suggestion = occurrenceComposerSuggestions(value, {
      ...options,
      cursorOffset: section.end,
    }).find((candidate) => candidate.label === label);
    assert.ok(suggestion, `missing ${kind} suggestion ${label}`);
    value = acceptComposerSuggestion(value, suggestion, parseOccurrenceSentence(value).stage).value;
    assert.equal(parseOccurrenceSentence(value).stage, "complete", value);
  };

  apply("time", "2026-10-01T12:00Z");
  apply("subject", "Carol");
  apply("tag", "travel", 0);
  apply("place", "Gothenburg");
  apply("predicate", "calls");
  apply("object", "Bob");

  const parsed = parseOccurrenceSentence(value);
  assert.equal(parsed.subject?.name, "Carol");
  assert.equal(parsed.predicate, "calls");
  assert.equal(parsed.object?.name, "Bob");
  assert.equal(parsed.place?.name, "Gothenburg");
  assert.deepEqual(parsed.time, { kind: "instant", start: "2026-10-01T12:00Z" });
  assert.equal(parsed.options.category, "Observation");
  assert.deepEqual(parsed.options.tags, ["travel", "urgent"]);
});

test("a full occurrence can be composed entirely by accepting suggestions", () => {
  const options = {
    entities: [
      { id: "alice", name: "Alice", type: "person" },
      { id: "bob", name: "Bob", type: "person" },
    ],
    places: [{ id: "stockholm", name: "Stockholm" }],
    categories: [{ id: "observation", name: "Observation" }],
    tags: ["work", "travel"],
    timelineDefault: "2026-09-28T12:00Z",
    predicates: ["meets"],
  };
  let value = "";
  const accept = (kind, label) => {
    const suggestions = occurrenceComposerSuggestions(value, {
      ...options,
      cursorOffset: value.length,
    });
    const suggestion = suggestions.find(
      (candidate) => candidate.kind === kind && candidate.label === label,
    );
    assert.ok(suggestion, `missing ${kind} suggestion ${label} for ${value}`);
    value = acceptComposerSuggestion(value, suggestion, parseOccurrenceSentence(value).stage).value;
  };

  accept("entity", "Alice");
  accept("predicate", "meets");
  accept("entity", "Bob");
  accept("place", "Stockholm");
  accept("time", "2026-09-28T12:00Z");
  accept("category", "Observation");
  accept("tag", "work");

  const parsed = parseOccurrenceSentence(value);
  assert.equal(parsed.stage, "complete");
  assert.equal(parsed.subject?.name, "Alice");
  assert.equal(parsed.predicate, "meets");
  assert.equal(parsed.object?.name, "Bob");
  assert.equal(parsed.place?.name, "Stockholm");
  assert.equal(parsed.time?.start, "2026-09-28T12:00Z");
  assert.equal(parsed.options.category, "Observation");
  assert.deepEqual(parsed.options.tags, ["work"]);
});

test("live composer preserves project tags for option completion", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /tags:\s*Object\.freeze\(\[\.\.\.\(data\.tags \?\? \[\]\)\]\)/);
  assert.match(source, /composerEditableSections\(this\.value\)/);
  assert.match(source, /editSentenceSection\(section\)/);
});
