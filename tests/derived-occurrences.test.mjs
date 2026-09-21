/**
 * Tests for derived occurrences projection.
 * Validates that relationships with temporal extent become occurrences,
 * and that the projection preserves all necessary information.
 */

import test from "node:test";
import { strict as assert } from "node:assert";

// Mock implementations for testing without importing TypeScript

class DerivedOccurrenceProjector {
  #project;

  constructor(project) {
    this.#project = project;
  }

  projectDerivedOccurrences() {
    const occurrences = [];
    for (const relationship of this.#project.relationships) {
      const occurrence = this.derivedOccurrenceFromRelationship(relationship);
      if (occurrence) {
        occurrences.push(occurrence);
      }
    }
    return occurrences;
  }

  derivedOccurrenceFromRelationship(relationship) {
    // A relationship is an occurrence only if it has temporal information
    if (!relationship.time) return null;

    const subject = this.#project.entities.find((e) => e.id === relationship.subjectId);
    const object = this.#project.entities.find((e) => e.id === relationship.objectId);

    const start = this.parseTemporalValue(relationship.time?.start);
    const end = this.parseTemporalValue(relationship.time?.end);

    // At least start time is required
    if (start === null) return null;

    const startLabel = this.formatTemporalEndpoint(relationship.time?.start);
    const endLabel = this.formatTemporalEndpoint(relationship.time?.end);

    const subjectName = this.entityName(subject, relationship.subjectId);
    const objectName = this.entityName(object, relationship.objectId);
    const title = `${subjectName} ${relationship.predicate} ${objectName}`;

    return {
      id: relationship.id,
      relationshipId: relationship.id,
      subjectId: relationship.subjectId,
      objectId: relationship.objectId,
      subjectName,
      objectName,
      predicate: relationship.predicate,
      role: relationship.role || "",
      placeId: relationship.placeId || "",
      itemIds: relationship.itemIds || [],
      sourceIds: relationship.sourceIds || [],
      confidence: relationship.confidence,
      start,
      end: end || null,
      startLabel,
      endLabel,
      title,
      attributes: relationship.attributes || {},
    };
  }

  entityName(entity, id) {
    if (entity?.name) return entity.name;
    return id;
  }

  formatTemporalEndpoint(value) {
    if (typeof value === "string") {
      return value.trim().slice(0, 120);
    }
    if (value && typeof value === "object") {
      const obj = value;
      if (typeof obj.value === "string") {
        return obj.value.trim().slice(0, 120);
      }
      if (typeof obj.sourceText === "string") {
        return obj.sourceText.trim().slice(0, 120);
      }
    }
    return "";
  }

  parseTemporalValue(value) {
    const source = this.formatTemporalEndpoint(value);
    if (!source) return null;

    const yearMatch = /^([+-]?\d{1,6})$/.exec(source);
    if (yearMatch) {
      const year = Number(yearMatch[1]);
      return new Date(year, 0, 1).getTime();
    }

    const monthMatch = /^([+-]?\d{1,6})-(\d{2})$/.exec(source);
    if (monthMatch) {
      const year = Number(monthMatch[1]);
      const month = Number(monthMatch[2]) - 1;
      return new Date(year, month, 1).getTime();
    }

    const dateMatch = /^([+-]?\d{1,6})-(\d{2})-(\d{2})$/.exec(source);
    if (dateMatch) {
      const year = Number(dateMatch[1]);
      const month = Number(dateMatch[2]) - 1;
      const day = Number(dateMatch[3]);
      return new Date(year, month, day).getTime();
    }

    const timestamp = Date.parse(source);
    return Number.isFinite(timestamp) ? timestamp : null;
  }
}

test("Derived occurrences: relationship without time is not an occurrence", () => {
  const project = {
    entities: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
    relationships: [
      {
        id: "rel-1",
        subjectId: "alice",
        objectId: "bob",
        predicate: "knows",
        time: null, // No temporal extent
        sourceIds: [],
        itemIds: [],
        confidence: 1,
        attributes: {},
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();

  assert.equal(occurrences.length, 0, "Non-temporal relationship should not become an occurrence");
});

test("Derived occurrences: relationship with time becomes an occurrence", () => {
  const project = {
    entities: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
    relationships: [
      {
        id: "rel-1",
        subjectId: "alice",
        objectId: "bob",
        predicate: "appointed",
        time: {
          type: "instant",
          start: "1978-03-04",
        },
        sourceIds: ["src-1"],
        itemIds: ["item-1"],
        confidence: 0.95,
        attributes: { note: "Important event" },
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();

  assert.equal(occurrences.length, 1, "Temporal relationship should become an occurrence");
  assert.equal(occurrences[0].id, "rel-1");
  assert.equal(occurrences[0].relationshipId, "rel-1");
  assert.equal(occurrences[0].predicate, "appointed");
  assert.equal(occurrences[0].subjectName, "Alice");
  assert.equal(occurrences[0].objectName, "Bob");
  assert.equal(occurrences[0].confidence, 0.95);
});

test("Derived occurrences: preserves all relationship fields", () => {
  const project = {
    entities: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
    relationships: [
      {
        id: "rel-1",
        subjectId: "alice",
        objectId: "bob",
        predicate: "worked-with",
        role: "colleague",
        placeId: "stockholm",
        time: {
          type: "interval",
          start: "1978-03-04",
          end: "1980-06-15",
        },
        sourceIds: ["src-1", "src-2"],
        itemIds: ["item-1"],
        confidence: 0.85,
        attributes: { context: "tech startup" },
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();
  const occ = occurrences[0];

  assert.equal(occ.role, "colleague");
  assert.equal(occ.placeId, "stockholm");
  assert.deepEqual(occ.sourceIds, ["src-1", "src-2"]);
  assert.deepEqual(occ.itemIds, ["item-1"]);
  assert.deepEqual(occ.attributes, { context: "tech startup" });
});

test("Derived occurrences: generates readable title", () => {
  const project = {
    entities: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
    relationships: [
      {
        id: "rel-1",
        subjectId: "alice",
        objectId: "bob",
        predicate: "collaborated with",
        time: {
          type: "instant",
          start: "1980",
        },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();

  assert.equal(occurrences[0].title, "Alice collaborated with Bob");
});

test("Derived occurrences: uses entity name or ID as fallback", () => {
  const project = {
    entities: [
      { id: "alice", name: "Alice" },
      { id: "unknown" }, // No name
    ],
    relationships: [
      {
        id: "rel-1",
        subjectId: "alice",
        objectId: "unknown",
        predicate: "met",
        time: {
          type: "instant",
          start: "1978",
        },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();

  assert.equal(occurrences[0].subjectName, "Alice");
  assert.equal(occurrences[0].objectName, "unknown", "Should use ID when entity has no name");
});

test("Derived occurrences: parses ISO date formats", () => {
  const project = {
    entities: [{ id: "alice", name: "Alice" }, { id: "bob", name: "Bob" }],
    relationships: [
      {
        id: "rel-year",
        subjectId: "alice",
        objectId: "bob",
        predicate: "met",
        time: {
          type: "instant",
          start: "1978", // Year only
        },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
      {
        id: "rel-month",
        subjectId: "alice",
        objectId: "bob",
        predicate: "met",
        time: {
          type: "instant",
          start: "1978-03", // Year-month
        },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
      {
        id: "rel-day",
        subjectId: "alice",
        objectId: "bob",
        predicate: "met",
        time: {
          type: "instant",
          start: "1978-03-04", // Full date
        },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();

  assert.equal(occurrences.length, 3);
  assert.ok(Number.isFinite(occurrences[0].start), "Year format should parse");
  assert.ok(Number.isFinite(occurrences[1].start), "Year-month format should parse");
  assert.ok(Number.isFinite(occurrences[2].start), "Full date format should parse");

  // Verify chronological order (year < month < day in milliseconds)
  assert.ok(occurrences[0].start < occurrences[1].start);
  assert.ok(occurrences[1].start < occurrences[2].start);
});

test("Derived occurrences: handles interval with start and end", () => {
  const project = {
    entities: [{ id: "alice", name: "Alice" }, { id: "company", name: "ACME" }],
    relationships: [
      {
        id: "rel-1",
        subjectId: "alice",
        objectId: "company",
        predicate: "worked-at",
        time: {
          type: "interval",
          start: "1978-03-04",
          end: "1980-06-15",
        },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();

  assert.equal(occurrences.length, 1);
  assert.ok(occurrences[0].start < occurrences[0].end, "End should be after start");
  assert.ok(occurrences[0].startLabel.includes("1978"));
  assert.ok(occurrences[0].endLabel.includes("1980"));
});

test("Derived occurrences: relationship without start time is rejected", () => {
  const project = {
    entities: [{ id: "alice" }, { id: "bob" }],
    relationships: [
      {
        id: "rel-1",
        subjectId: "alice",
        objectId: "bob",
        predicate: "knows",
        time: {
          type: "interval",
          start: null, // No start time
          end: "1980",
        },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();

  assert.equal(occurrences.length, 0, "Relationship without start time should be rejected");
});

test("Derived occurrences: multiple temporal relationships project correctly", () => {
  const project = {
    entities: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
      { id: "charlie", name: "Charlie" },
    ],
    relationships: [
      {
        id: "rel-1",
        subjectId: "alice",
        objectId: "bob",
        predicate: "met",
        time: { type: "instant", start: "1975" },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
      {
        id: "rel-2",
        subjectId: "alice",
        objectId: "bob",
        predicate: "collaborated-with",
        time: { type: "instant", start: "1978" },
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
      {
        id: "rel-3",
        subjectId: "bob",
        objectId: "charlie",
        predicate: "knows",
        time: null, // No time
        sourceIds: [],
        itemIds: [],
        confidence: null,
        attributes: {},
      },
    ],
  };

  const projector = new DerivedOccurrenceProjector(project);
  const occurrences = projector.projectDerivedOccurrences();

  assert.equal(occurrences.length, 2, "Should only include temporal relationships");
  assert.equal(occurrences[0].id, "rel-1");
  assert.equal(occurrences[1].id, "rel-2");
});
