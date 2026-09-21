import assert from "node:assert/strict";
import test from "node:test";

globalThis.document = { baseURI: "https://example.test/" };
await import("../site/evidence-store.js");

const evidence = globalThis.TimelineEvidence;

test("normalizes article, PDF metadata and notes without embedding binary data", () => {
  const records = evidence.normalizeRecords([
    { id: "a", type: "article", title: "News report", url: "https://example.org/story" },
    {
      id: "b",
      type: "pdf",
      title: "Exhibit",
      file: { blobKey: "blob-b", name: "exhibit.pdf", size: 1234 },
    },
    { id: "c", type: "note", title: "Interview note", note: "Observed at 09:30." },
  ]);
  assert.equal(records.length, 3);
  assert.equal(records[1].file.blobKey, "blob-b");
  assert.equal(records[1].file.mimeType, "application/pdf");
  assert.equal(records[2].note, "Observed at 09:30.");
});

test("preserves image evidence and derived OCR/PDF extraction metadata", () => {
  const record = evidence.normalizeRecord({
    id: "image-a",
    type: "image",
    title: "Photographed note",
    file: {
      blobKey: "evidence:image-a",
      name: "note.jpg",
      mimeType: "image/jpeg",
      size: 2048
    },
    extraction: {
      schemaVersion: "timeline-evidence-extraction-v1",
      status: "complete",
      mimeType: "image/jpeg",
      generatedAt: "2026-09-21T00:00:00Z",
      tool: { name: "Timeline Evidence Extraction", version: "1" },
      segments: [{
        id: "image-1",
        locator: { kind: "image", index: 1 },
        method: "text-detector",
        text: "Call Bob at 09:30",
        confidence: null
      }],
      unresolved: []
    }
  });

  assert.equal(record.type, "image");
  assert.equal(record.file.mimeType, "image/jpeg");
  assert.equal(record.extraction.segments[0].locator.kind, "image");
  assert.equal(record.extraction.segments[0].text, "Call Bob at 09:30");
});

test("preserves explicit forensic identity, integrity, acquisition and lineage metadata", () => {
  const record = evidence.normalizeRecord({
    id: "disk-copy",
    type: "document",
    title: "Forensic disk image",
    forensic: {
      recordClass: "acquired-copy",
      sourceFilename: "drive.E01",
      sourceLocator: "locker-4/device-2",
      exhibitNumber: "C001-HD1",
      rootExhibitNumber: "Collection-001",
      acquiredAt: "2026-09-19T09:15:00+02:00",
      acquiredByEntityId: "person-examiner",
      acquisitionMethod: "Forensic image acquisition",
      acquisitionPlaceEntityId: "place-lab",
      sourceItemId: "device-2",
      tool: { name: "Acquisition Tool", version: "5.4.1" },
      digests: [
        { algorithm: "SHA-256", value: "abc123", encoding: "hex" },
        { algorithm: "sha-256", value: "abc123", encoding: "hex" },
      ],
      derivedFromIds: ["device-2", "device-2"],
    },
  });

  assert.equal(record.forensic.recordClass, "acquired-copy");
  assert.equal(record.forensic.exhibitNumber, "C001-HD1");
  assert.equal(record.forensic.tool.version, "5.4.1");
  assert.deepEqual(record.forensic.digests, [
    { algorithm: "sha-256", value: "abc123", encoding: "hex" },
  ]);
  assert.deepEqual(record.forensic.derivedFromIds, ["device-2"]);
});

test("does not invent forensic metadata for ordinary evidence", () => {
  const record = evidence.normalizeRecord({ id: "a", type: "article", title: "Ordinary source" });
  assert.equal("forensic" in record, false);
});

test("normalizes append-only custody actions as separate records", () => {
  const actions = evidence.normalizeCustodyActions([
    {
      id: "custody-1",
      actionType: "transferred",
      evidenceIds: ["disk-copy", "disk-copy"],
      occurredAt: "2026-09-19T10:00:00+02:00",
      fromEntityId: "person-examiner",
      toEntityId: "person-custodian",
      placeEntityId: "place-vault",
      recorderEntityId: "person-recorder",
      reason: "Secure storage",
      sourceEvidenceIds: ["custody-form-1"],
    },
  ]);

  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0].evidenceIds, ["disk-copy"]);
  assert.equal(actions[0].actionType, "transferred");
  assert.equal(actions[0].toEntityId, "person-custodian");
  assert.deepEqual(actions[0].sourceEvidenceIds, ["custody-form-1"]);
});

test("rejects custody actions without evidence or an occurrence time", () => {
  assert.equal(evidence.normalizeCustodyAction({ occurredAt: "2026-09-19" }), null);
  assert.equal(evidence.normalizeCustodyAction({ evidenceIds: ["a"] }), null);
});

test("rejects unsafe evidence URLs", () => {
  const record = evidence.normalizeRecord({
    id: "a",
    type: "article",
    title: "Unsafe",
    url: "javascript:alert(1)",
  });
  assert.equal(record.url, "");
});
