import assert from "node:assert/strict";
import test from "node:test";

await import("../site/temporal-standards-shim.ts");
await import("../site/spatial-shim.ts");
await import("../site/timeline-graph-shim.ts");
await import("../site/graph-inference-shim.ts");

const graph = globalThis.TimelineGraph;
const spatial = globalThis.TimelineSpatial;
const inference = globalThis.TimelineGraphInference;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function idFactory() {
  let counter = 0;
  return (prefix) => `${prefix}-generated-${++counter}`;
}

function context() {
  return {
    graphContractVersion: graph.GRAPH_CONTRACT_VERSION,
    event: {
      id: "event-a",
      start: "2026-09-21",
      end: "",
      time: {
        type: "instant",
        start: {
          value: "2026-09-21",
          precision: "day",
          certainty: "exact",
          calendar: "gregorian",
          timeZone: "",
        },
        end: null,
      },
      storyIds: ["story-a"],
    },
    fragments: [
      {
        ref: "event:title",
        kind: "event-title",
        text: "Alice called Bob and warned Charlie at the office.",
      },
      {
        ref: "evidence:evidence-a:note",
        kind: "evidence-note",
        text: "Alice warned Charlie after calling Bob.",
      },
    ],
    existingEntities: [
      { id: "alice", type: "person", name: "Alice", attributes: { storyId: "story-a" } },
      { id: "bob", type: "person", name: "Bob", attributes: { storyId: "story-a" } },
    ],
    existingPlaces: [
      {
        id: "office",
        name: "Office",
        geographicIdentifier: "Stockholm office",
        address: "Example Street 1",
        geometry: { type: "Point", coordinates: [18, 59] },
        icon: "place",
        markerShape: "pin",
        attributes: {},
      },
    ],
    existingRelationships: [
      {
        id: "alice-calls-bob",
        subjectId: "alice",
        objectId: "bob",
        predicate: "called",
        itemIds: [],
        sourceIds: [],
        placeId: "",
        time: {
          type: "instant",
          start: {
            value: "2026-09-21",
            precision: "day",
            certainty: "exact",
            calendar: "gregorian",
            timeZone: "",
          },
          end: null,
        },
        attributes: {},
      },
    ],
  };
}

test("built-in inference exposes a strict structured response schema", () => {
  const schema = inference.responseSchema();
  assert.equal(schema.type, "object");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ["entities", "places", "relationships", "unresolved"]);
  assert.equal(schema.properties.relationships.items.properties.predicate.maxLength, 120);
  assert.match(inference.SYSTEM_PROMPT, /only factual basis/i);
  assert.match(inference.SYSTEM_PROMPT, /never geocode from memory/i);
  assert.match(inference.SYSTEM_PROMPT, /never use generic associations/i);
});

test("built-in LanguageModel inference uses responseConstraint and can be injected for tests", async () => {
  let promptOptions = null;
  let systemPrompt = "";
  let destroyed = false;
  const languageModel = {
    async availability() {
      return "available";
    },
    async create(options) {
      systemPrompt = options.initialPrompts?.[0]?.content || "";
      return {
        async prompt(source, options) {
          assert.match(source, /Alice called Bob/);
          promptOptions = options;
          return JSON.stringify({
            entities: [
              {
                key: "alice",
                name: "Alice",
                type: "person",
                confidence: 0.99,
                sourceRefs: ["event:title"],
                rationale: "Named caller",
              },
              {
                key: "bob",
                name: "Bob",
                type: "person",
                confidence: 0.99,
                sourceRefs: ["event:title"],
                rationale: "Named recipient",
              },
            ],
            places: [],
            relationships: [
              {
                key: "call",
                subjectKey: "alice",
                predicate: "called",
                objectKey: "bob",
                confidence: 0.95,
                sourceRefs: ["event:title"],
                rationale: "Explicit action",
              },
            ],
            unresolved: [],
          });
        },
        destroy() {
          destroyed = true;
        },
      };
    },
  };

  const status = await inference.availability(languageModel);
  assert.equal(status.available, true);
  const result = await inference.infer(context(), { languageModel });
  assert.equal(result.relationships[0].predicate, "called");
  assert.match(systemPrompt, /places are separate reusable spatial candidates/i);
  assert.equal(promptOptions.omitResponseConstraintInput, true);
  assert.equal(promptOptions.responseConstraint.type, "object");
  assert.equal(destroyed, true);
});

test("inference reconciliation reuses canonical records and rejects unsafe graph facts", () => {
  const raw = {
    entities: [
      {
        key: "alice-key",
        name: "Alice",
        type: "person",
        confidence: 0.99,
        sourceRefs: ["event:title"],
        rationale: "Explicit",
      },
      {
        key: "bob-key",
        name: "Bob",
        type: "person",
        confidence: 0.99,
        sourceRefs: ["event:title"],
        rationale: "Explicit",
      },
      {
        key: "charlie-key",
        name: "Charlie",
        type: "person",
        confidence: 0.9,
        sourceRefs: ["event:title", "evidence:evidence-a:note"],
        rationale: "Explicit",
      },
      {
        key: "bad-event",
        name: "Alice calling Bob",
        type: "event",
        confidence: 0.7,
        sourceRefs: ["event:title"],
        rationale: "Not a durable entity",
      },
    ],
    places: [
      {
        key: "office-key",
        name: "Office",
        geographicIdentifier: "Stockholm office",
        coordinatesExplicit: false,
        confidence: 0.9,
        sourceRefs: ["event:title"],
        rationale: "Named place",
      },
      {
        key: "station-key",
        name: "Station",
        coordinatesExplicit: false,
        confidence: 0.6,
        sourceRefs: ["event:title"],
        rationale: "No coordinates supplied",
      },
    ],
    relationships: [
      {
        key: "call-key",
        subjectKey: "alice-key",
        predicate: "called",
        objectKey: "bob-key",
        placeKey: "office-key",
        confidence: 0.95,
        sourceRefs: ["event:title"],
        rationale: "Explicit call",
      },
      {
        key: "warn-key",
        subjectKey: "alice-key",
        predicate: "warned",
        objectKey: "charlie-key",
        confidence: 0.92,
        sourceRefs: ["event:title", "evidence:evidence-a:note"],
        rationale: "Explicit warning",
      },
      {
        key: "generic-key",
        subjectKey: "bob-key",
        predicate: "relatedTo",
        objectKey: "alice-key",
        confidence: 0.5,
        sourceRefs: ["event:title"],
        rationale: "Generic association",
      },
      {
        key: "self-key",
        subjectKey: "alice-key",
        predicate: "called",
        objectKey: "alice-key",
        confidence: 0.5,
        sourceRefs: ["event:title"],
        rationale: "Invalid self loop",
      },
    ],
    unresolved: [],
  };

  const proposal = inference.reconcileProposal(raw, context(), {
    graph,
    spatial,
    idFactory: idFactory(),
  });

  const alice = proposal.entities.find((candidate) => candidate.key === "alice-key");
  const charlie = proposal.entities.find((candidate) => candidate.key === "charlie-key");
  assert.equal(alice.status, "existing");
  assert.equal(alice.entityId, "alice");
  assert.equal(charlie.status, "new");
  assert.match(charlie.entityId, /^entity-generated-/);

  const office = proposal.places.find((candidate) => candidate.key === "office-key");
  const station = proposal.places.find((candidate) => candidate.key === "station-key");
  assert.equal(office.status, "existing");
  assert.equal(office.placeId, "office");
  assert.equal(station.status, "needs-geometry");
  assert.equal(station.placeId, "");

  const call = proposal.relationships.find((candidate) => candidate.key === "call-key");
  const warn = proposal.relationships.find((candidate) => candidate.key === "warn-key");
  assert.equal(call.status, "merge");
  assert.equal(call.mergeIntoRelationshipId, "alice-calls-bob");
  assert.equal(warn.status, "new");
  assert.ok(proposal.unresolved.some((entry) => /generic association/i.test(entry.reason)));
  assert.ok(proposal.unresolved.some((entry) => /self-loop/i.test(entry.reason)));
  assert.ok(proposal.unresolved.some((entry) => /not an entity-node type/i.test(entry.reason)));
});

test("new inferred places require explicit source coordinates", () => {
  const ctx = context();
  ctx.fragments.push({
    ref: "location:form",
    kind: "explicit-location",
    text: "Measured point coordinates: 59.3293, 18.0686",
  });
  const raw = {
    entities: [
      {
        key: "alice-key",
        name: "Alice",
        type: "person",
        confidence: 0.9,
        sourceRefs: ["event:title"],
        rationale: "Explicit",
      },
      {
        key: "bob-key",
        name: "Bob",
        type: "person",
        confidence: 0.9,
        sourceRefs: ["event:title"],
        rationale: "Explicit",
      },
    ],
    places: [
      {
        key: "coords-place",
        name: "Measured point",
        latitude: 59.3293,
        longitude: 18.0686,
        coordinatesExplicit: true,
        confidence: 0.9,
        sourceRefs: ["location:form"],
        rationale: "Coordinates were supplied",
      },
      {
        key: "invented-place",
        name: "Known city",
        latitude: 59.0,
        longitude: 18.0,
        coordinatesExplicit: false,
        confidence: 0.9,
        sourceRefs: ["event:title"],
        rationale: "Coordinates not present in source",
      },
    ],
    relationships: [],
    unresolved: [],
  };
  const proposal = inference.reconcileProposal(raw, ctx, {
    graph,
    spatial,
    idFactory: idFactory(),
  });
  assert.equal(proposal.places.find((place) => place.key === "coords-place").status, "new");
  assert.equal(
    proposal.places.find((place) => place.key === "invented-place").status,
    "needs-geometry",
  );
});

test("selected inference facts apply atomically and preserve graph validation", () => {
  const ctx = context();
  ctx.fragments.push({
    ref: "evidence:evidence-a:page:1",
    kind: "evidence-pdf-text",
    text: "Alice warned Charlie after calling Bob.",
  });
  const raw = {
    entities: [
      {
        key: "alice-key",
        name: "Alice",
        type: "person",
        confidence: 0.99,
        sourceRefs: ["event:title"],
        rationale: "Explicit",
      },
      {
        key: "bob-key",
        name: "Bob",
        type: "person",
        confidence: 0.99,
        sourceRefs: ["event:title"],
        rationale: "Explicit",
      },
      {
        key: "charlie-key",
        name: "Charlie",
        type: "person",
        confidence: 0.95,
        sourceRefs: ["event:title", "evidence:evidence-a:note"],
        rationale: "Explicit",
      },
    ],
    places: [
      {
        key: "office-key",
        name: "Office",
        geographicIdentifier: "Stockholm office",
        coordinatesExplicit: false,
        confidence: 0.8,
        sourceRefs: ["event:title"],
        rationale: "Existing canonical place",
      },
    ],
    relationships: [
      {
        key: "call-key",
        subjectKey: "alice-key",
        predicate: "called",
        objectKey: "bob-key",
        placeKey: "office-key",
        confidence: 0.95,
        sourceRefs: ["event:title"],
        rationale: "Explicit call",
      },
      {
        key: "warn-key",
        subjectKey: "alice-key",
        predicate: "warned",
        objectKey: "charlie-key",
        placeKey: "office-key",
        confidence: 0.9,
        sourceRefs: ["evidence:evidence-a:page:1"],
        rationale: "Explicit warning",
      },
    ],
    unresolved: [],
  };
  const proposal = inference.reconcileProposal(raw, ctx, {
    graph,
    spatial,
    idFactory: idFactory(),
  });

  const item = {
    id: "event-a",
    kind: "event",
    start: "2026-09-21",
    end: null,
    time: ctx.event.time,
    title: "Alice called Bob and warned Charlie at the office.",
    description: "",
    categoryId: "incident",
    evidenceIds: ["evidence-a"],
  };
  const project = {
    version: 2,
    title: "Inference test",
    categories: [{ id: "incident", name: "Incident", color: "#b42318" }],
    items: [item],
    stories: [{ id: "story-a", title: "Story", itemIds: ["event-a"] }],
    entities: clone(ctx.existingEntities),
    places: clone(ctx.existingPlaces),
    relationships: clone(ctx.existingRelationships),
    evidence: [
      {
        id: "evidence-a",
        type: "pdf",
        title: "Witness exhibit",
        note: "",
        extraction: {
          schemaVersion: "timeline-evidence-extraction-v1",
          status: "complete",
          mimeType: "application/pdf",
          generatedAt: "2026-09-21T00:00:00Z",
          tool: { name: "Timeline Evidence Extraction", version: "1" },
          segments: [
            {
              id: "page-1",
              locator: { kind: "page", page: 1 },
              method: "pdf-text",
              text: "Alice warned Charlie after calling Bob.",
              confidence: 1,
            },
          ],
          unresolved: [],
        },
      },
    ],
    custodyActions: [],
    reasoning: {},
  };

  const applied = inference.applyProposal(project, item, proposal, ["call-key", "warn-key"], {
    graph,
    spatial,
  });
  assert.ok(applied.entities.some((entity) => entity.name === "Charlie"));
  assert.equal(
    applied.relationships
      .find((relationship) => relationship.id === "alice-calls-bob")
      .itemIds.includes("event-a"),
    true,
  );
  const warning = applied.relationships.find((relationship) => relationship.predicate === "warned");
  assert.ok(warning);
  assert.equal(warning.placeId, "office");
  assert.deepEqual(warning.sourceIds, ["evidence-a"]);
  assert.deepEqual(graph.validateGraphInput(applied), []);
});

test("inference fingerprints invalidate changed narrative/evidence context", () => {
  const original = context();
  const changed = context();
  changed.fragments = [
    ...changed.fragments,
    { ref: "event:description", kind: "event-description", text: "New detail" },
  ];
  assert.notEqual(inference.fingerprint(original), inference.fingerprint(changed));

  const changedTime = context();
  changedTime.event.time.start.certainty = "inferred";
  assert.notEqual(
    inference.fingerprint(original),
    inference.fingerprint(changedTime),
    "changing temporal semantics makes staged inference stale",
  );
});

test("relationships without a valid cited source fragment are rejected", () => {
  const raw = {
    entities: [
      {
        key: "alice-key",
        name: "Alice",
        type: "person",
        confidence: 0.9,
        sourceRefs: ["event:title"],
        rationale: "Explicit",
      },
      {
        key: "bob-key",
        name: "Bob",
        type: "person",
        confidence: 0.9,
        sourceRefs: ["event:title"],
        rationale: "Explicit",
      },
    ],
    places: [],
    relationships: [
      {
        key: "unsupported-call",
        subjectKey: "alice-key",
        predicate: "called",
        objectKey: "bob-key",
        confidence: 0.8,
        sourceRefs: ["invented:source"],
        rationale: "Model cited a fragment that was never supplied",
      },
    ],
    unresolved: [],
  };
  const proposal = inference.reconcileProposal(raw, context(), {
    graph,
    spatial,
    idFactory: idFactory(),
  });
  assert.equal(proposal.relationships.length, 0);
  assert.ok(
    proposal.unresolved.some((entry) => /valid source fragment reference/.test(entry.reason)),
  );
});
