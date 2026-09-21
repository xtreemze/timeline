import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../site/interchange-adapter.js");

const adapter = globalThis.TimelineInterchangeAdapter;

test("imports external interchange events, periods, and groups", () => {
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
  assert.equal(imported.timeline.items[0].extensions.externalInterchange.raw.vendorFlag, true);
  assert.equal(imported.timeline.items[1].extensions.externalInterchange.comments[0].text, "kept");
  assert.ok(imported.warnings.some((warning) => warning.includes("minute precision")));
});

test("recognizes common generic items and numeric timestamps", () => {
  const imported = adapter.importData({
    format: "external interchange",
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

  imported.timeline.stories = [{ id: "s1", title: "Story", description: "", itemIds: ["ext-e1"] }];
  imported.timeline.entities = [
    { id: "person-a", type: "person", name: "A" },
    { id: "person-b", type: "person", name: "B" }
  ];
  imported.timeline.places = [{
    id: "place-a",
    name: "Example Place",
    geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
    radiusMeters: 100,
    icon: "place",
    markerShape: "pin"
  }];
  imported.timeline.relationships = [{
    id: "rel-a",
    subjectId: "person-a",
    objectId: "person-b",
    predicate: "witnessed",
    placeId: "place-a",
    itemIds: ["ext-e1"],
    initialState: "inactive"
  }];
  imported.timeline.items[0].media = [{
    src: "https://example.test/photo.jpg",
    alt: "Example photo",
    caption: "Preserved media"
  }];
  imported.timeline.items[0].tags = [{
    label: "Evidence",
    icon: "evidence",
    hue: 145
  }];
  imported.timeline.items[0].presentation = { variant: "evidence-dossier" };
  imported.timeline.items[0].relationChanges = [{
    relationshipId: "rel-a",
    operation: "update",
    predicate: "authorized",
    role: "approver",
    properties: { status: "approved" }
  }];
  imported.timeline.items[0].evidenceIds = ["evidence-a"];
  imported.timeline.reasoning = {
    observations: [{ id: "obs-1", text: "Observed event", evidenceIds: ["evidence-a"] }],
    assertions: [{ id: "assert-1", text: "The event occurred.", inputIds: ["obs-1"] }],
    claims: [{ id: "claim-1", text: "Case claim", assertionIds: ["assert-1"] }],
    theses: [{ id: "thesis-1", text: "Case thesis", claimIds: ["claim-1"] }]
  };
  imported.timeline.evidence = [{
    id: "evidence-a",
    type: "pdf",
    title: "Exhibit A",
    sourceName: "Case file",
    url: "",
    note: "Supports the event.",
    publishedAt: "2026-01-02",
    file: {
      blobKey: "evidence:evidence-a",
      name: "exhibit-a.pdf",
      mimeType: "application/pdf",
      size: 4096
    },
    extraction: {
      schemaVersion: "timeline-evidence-extraction-v1",
      status: "complete",
      mimeType: "application/pdf",
      generatedAt: "2026-09-21T00:00:00Z",
      tool: { name: "Timeline Evidence Extraction", version: "1" },
      segments: [{
        id: "page-1",
        locator: { kind: "page", page: 1 },
        method: "pdf-text",
        text: "Alice called Bob.",
        confidence: 1
      }],
      unresolved: []
    }
  }];
  const exported = adapter.exportData(imported.timeline);

  assert.equal(exported.events.length, 1);
  assert.equal(exported.periods.length, 1);
  assert.equal(exported.groups.length, 1);
  assert.equal(exported.events[0].vendorField, "keep");
  assert.equal(exported.groups[0].vendorGroup, 9);
  assert.equal(exported._timeline.format, "timeline-interchange");
  assert.equal(exported._timeline.stories.length, 1);
  assert.equal(exported._timeline.entities.length, 2);
  assert.equal(exported._timeline.places.length, 1);
  assert.equal(exported._timeline.relationships.length, 1);
  assert.equal(exported._timeline.evidence.length, 1);
  assert.equal(exported._timeline.evidence[0].extraction.segments[0].locator.page, 1);
  assert.equal(exported._timeline.reasoning.theses[0].id, "thesis-1");
  assert.equal(exported.events[0].media[0].url, "https://example.test/photo.jpg");
  assert.equal(exported.events[0].tags[0].icon, "evidence");
  assert.equal(exported.events[0].presentation.variant, "evidence-dossier");
  assert.equal(exported.events[0].relationChanges[0].operation, "update");
  assert.equal(exported._timeline.relationships[0].initialState, "inactive");
  assert.deepEqual(exported._timeline.relationships[0].itemIds, ["ext-e1"]);
  assert.equal(exported._timeline.relationships[0].placeId, "place-a");
  assert.equal(exported._timeline.places[0].markerShape, "pin");
  assert.deepEqual(exported.events[0].evidenceIds, ["evidence-a"]);

  const reimported = adapter.importData(exported);
  assert.equal(reimported.timeline.entities.length, 2);
  assert.equal(reimported.timeline.places.length, 1);
  assert.equal(reimported.timeline.relationships.length, 1);
  assert.equal(reimported.timeline.evidence.length, 1);
  assert.equal(reimported.timeline.evidence[0].extraction.segments[0].text, "Alice called Bob.");
  assert.equal(reimported.timeline.reasoning.claims[0].id, "claim-1");
  assert.equal(reimported.timeline.items[0].media[0].url, "https://example.test/photo.jpg");
  assert.equal(reimported.timeline.items[0].tags[0].hue, 145);
  assert.equal(reimported.timeline.items[0].presentation.variant, "evidence-dossier");
  assert.equal(reimported.timeline.items[0].relationChanges[0].relationshipId, "rel-a");
  assert.equal(reimported.timeline.relationships[0].initialState, "inactive");
  assert.equal(reimported.timeline.relationships[0].placeId, "place-a");
  assert.deepEqual(reimported.timeline.items[0].evidenceIds, ["evidence-a"]);
});

test("publishes a JSON Schema and documents the vendor-schema boundary", async () => {
  const [schemaText, docs] = await Promise.all([
    readFile(new URL("../schemas/interchange-v1.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/INTERCHANGE.md", import.meta.url), "utf8")
  ]);
  const schema = JSON.parse(schemaText);
  assert.equal(schema.properties._timeline.properties.format.const, "timeline-interchange");
  assert.equal(schema.properties._timeline.properties.reasoning.type, "object");
  assert.equal(schema.properties._timeline.properties.places.type, "array");
  assert.match(docs, /vendor-neutral/i);
});
