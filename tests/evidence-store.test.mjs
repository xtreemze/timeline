import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = { baseURI: "https://example.test/" };
await import("../site/evidence-store.js");

const evidence = globalThis.TimelineEvidence;

test("normalizes article, PDF metadata and notes without embedding binary data", () => {
  const records = evidence.normalizeRecords([
    { id: "a", type: "article", title: "News report", url: "https://example.org/story" },
    { id: "b", type: "pdf", title: "Exhibit", file: { blobKey: "blob-b", name: "exhibit.pdf", size: 1234 } },
    { id: "c", type: "note", title: "Interview note", note: "Observed at 09:30." }
  ]);
  assert.equal(records.length, 3);
  assert.equal(records[1].file.blobKey, "blob-b");
  assert.equal(records[1].file.mimeType, "application/pdf");
  assert.equal(records[2].note, "Observed at 09:30.");
});

test("rejects unsafe evidence URLs", () => {
  const record = evidence.normalizeRecord({
    id: "a",
    type: "article",
    title: "Unsafe",
    url: "javascript:alert(1)"
  });
  assert.equal(record.url, "");
});
