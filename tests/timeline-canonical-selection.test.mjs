import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { projectTimelineSelection } from "../src/application/timeline-selection.ts";

const items = [
  {
    id: "item-a",
    location: { id: "stockholm" },
    relations: [
      { id: "r1", subjectId: "alice", objectId: "bob" },
      { id: "r2", subjectId: "carol", objectId: "alice" },
    ],
  },
  {
    id: "r3",
    location: { id: "gothenburg" },
    relations: [{ id: "r3", subjectId: "dave", objectId: "erin" }],
  },
  {
    id: "item-b",
    location: { id: "stockholm" },
    relations: [{ id: "r4", subjectId: "frank", objectId: "grace" }],
  },
];

test("timeline selection projection maps canonical relationship identity without focus", () => {
  assert.deepEqual(projectTimelineSelection({ kind: "relationship", id: "r1" }, items), {
    itemIds: ["item-a"],
    relationshipId: "r1",
  });
  assert.deepEqual(projectTimelineSelection({ kind: "relationship", id: "r3" }, items), {
    itemIds: ["r3"],
    relationshipId: "r3",
  });
});

test("timeline selection projection maps entity and place context across chronology items", () => {
  assert.deepEqual(projectTimelineSelection({ kind: "entity", id: "alice" }, items), {
    itemIds: ["item-a"],
    relationshipId: null,
  });
  assert.deepEqual(projectTimelineSelection({ kind: "place", id: "stockholm" }, items), {
    itemIds: ["item-a", "item-b"],
    relationshipId: null,
  });
  assert.deepEqual(projectTimelineSelection(null, items), {
    itemIds: [],
    relationshipId: null,
  });
});

test("timeline controller keeps canonical selection separate from focus semantics", async () => {
  const [timeline, card, app, styles] = await Promise.all([
    readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/timeline-event-card.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.match(timeline, /setSelection\(selection: ApplicationSelection \| null\): void/);
  assert.match(timeline, /projectTimelineSelection/);
  assert.match(timeline, /selectedItemIds/);
  assert.match(timeline, /selectedRelationshipId/);
  assert.match(
    timeline,
    /syncRecordSelection[\s\S]*selectedItemIds\.has\(record\.item\.id\)/,
  );
  assert.match(
    timeline,
    /data-focus-anchor[\s\S]*focused/,
  );
  assert.match(timeline, /timeline-relation-segment[\s\S]*is-selected/);
  assert.match(timeline, /aria-label[\s\S]*Selected:/);
  const selectionMethod =
    timeline.match(/setSelection\(selection: ApplicationSelection \| null\): void \{[\s\S]*?\n  \}/)?.[0] ??
    "";
  assert.doesNotMatch(selectionMethod, /focusItem|emitViewport|timelinefocuschange|dispatchEvent/);

  assert.match(card, /setFocused\(focused: boolean\)/);
  assert.match(card, /aria-expanded/);
  assert.doesNotMatch(
    card.match(/setSelected\(selected: boolean\)[\s\S]*?\n  \}/)?.[0] ?? "",
    /aria-expanded/,
  );

  assert.match(
    app,
    /applicationSelection\.subscribe[\s\S]*timelineView\?\.setSelection\(selection\)/,
  );
  assert.match(styles, /timeline-relation-segment\.is-selected/);
});
