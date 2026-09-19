import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../site/time-graphics-adapter.js");

const adapter = globalThis.TimeGraphicsAdapter;

test("imports Time.Graphics events, periods, and groups", () => {
  const imported = adapter.importData({
    title: "Imported history",
    groups: [
      { id: 7, name: "Research", color: "#123456", description: "Vendor group metadata" }
    ],
    events: [
      {
        id: 10,
        title: "Point event",
        date: "2026-09-19T10:30:45Z",
        group: 7,
        media: [{ type: "image", url: "https://example.test/image.jpg" }],
        vendorFlag: true
      }
    ],
    periods: [
      {
        id: 11,
        name: "Period",
        start: "2026-09-20",
        end: "2026-09-22",
        groupId: 7,
        comments: [{ text: "kept" }]
      }
    ]
  });

  assert.equal(imported.timeline.title, "Imported history");
  assert.equal(imported.timeline.items.length, 2);
  assert.equal(imported.timeline.categories.length, 1);
  assert.equal(imported.timeline.items[0].kind, "event");
  assert.equal(imported.timeline.items[0].start, "2026-09-19T10:30");
  assert.equal(imported.timeline.items[1].kind, "range");
  assert.equal(imported.timeline.items[1].end, "2026-09-22");
  assert.equal(imported.timeline.items[0].extensions.timeGraphics.raw.vendorFlag, true);
  assert.equal(imported.timeline.items[1].extensions.timeGraphics.comments[0].text, "kept");
  assert.ok(imported.warnings.some((warning) => warning.includes("minute precision")));
});

test("recognizes common generic items and numeric timestamps", () => {
  const imported = adapter.importData({
    format: "Time.Graphics",
    categories: [{ id: "a", name: "A" }],
    items: [
      { id: "x", title: "Instant", timestamp: 0, category: "a" },
      { id: "y", title: "Range", from: 60, to: 120, category: "a" }
    ]
  });

  assert.equal(imported.timeline.items[0].start, "1970-01-01T00:00");
  assert.equal(imported.timeline.items[1].kind, "range");
  assert.equal(imported.timeline.items[1].end, "1970-01-01T00:02");
});

test("exports event/period/group structures and round-trips source extensions", () => {
  const imported = adapter.importData({
    title: "Round trip",
    groups: [{ id: "g1", name: "Group", color: "#abcdef", vendorGroup: 9 }],
    events: [{ id: "e1", title: "Event", date: "2026-01-02", group: "g1", vendorField: "keep" }],
    periods: [{ id: "p1", title: "Period", start: "2026-01-03", end: "2026-01-04", group: "g1" }]
  });

  imported.timeline.stories = [{ id: "s1", title: "Story", description: "", itemIds: ["tg-e1"] }];
  const exported = adapter.exportData(imported.timeline);

  assert.equal(exported.events.length, 1);
  assert.equal(exported.periods.length, 1);
  assert.equal(exported.groups.length, 1);
  assert.equal(exported.events[0].vendorField, "keep");
  assert.equal(exported.groups[0].vendorGroup, 9);
  assert.equal(exported._timeline.format, "time.graphics-interchange");
  assert.equal(exported._timeline.stories.length, 1);
});

test("publishes a JSON Schema and documents the vendor-schema boundary", async () => {
  const [schemaText, docs] = await Promise.all([
    readFile(new URL("../schemas/time-graphics-interchange-v1.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/TIME-GRAPHICS-INTERCHANGE.md", import.meta.url), "utf8")
  ]);
  const schema = JSON.parse(schemaText);
  assert.equal(schema.properties._timeline.properties.format.const, "time.graphics-interchange");
  assert.match(docs, /does \*\*not\*\* publish a stable JSON or XML field schema/i);
});
