import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createEmptyProjectInterchange,
  formatProjectInterchange,
  validateProjectInterchange,
} from "../src/application/project-interchange.ts";
import {
  applyLumChangeProposal,
  LUM_CHANGE_PROPOSAL_SCHEMA_ID,
  validateLumChangeProposal,
} from "../scripts/lib/lum-agent-proposal.mjs";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

function runLum(args, options = {}) {
  return spawnSync(process.execPath, ["scripts/lum.mjs", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
}

function baseProject() {
  const parsed = JSON.parse(
    createEmptyProjectInterchange({
      projectKey: "agent-edit",
      savedAt: "2026-09-28T08:00:00.000Z",
    }),
  );
  parsed.project.entities = [
    {
      id: "alice",
      type: "person",
      name: "Alice",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
    {
      id: "bob",
      type: "person",
      name: "Bob",
      alternateNames: [],
      sourceIds: [],
      attributes: {},
    },
  ];
  return formatProjectInterchange(JSON.stringify(parsed));
}

function relationshipRecord(predicate = "warns") {
  return {
    id: "rel-1",
    subjectId: "alice",
    predicate,
    objectId: "bob",
    itemIds: [],
    sourceIds: [],
    confidence: 1,
    time: {
      type: "instant",
      start: { value: "2026-09-28" },
    },
    attributes: {},
  };
}

function proposal(operations, overrides = {}) {
  return JSON.stringify({
    $schema: LUM_CHANGE_PROPOSAL_SCHEMA_ID,
    format: "lum-change-proposal",
    version: 1,
    projectKey: "agent-edit",
    expectedRevision: 1,
    verificationRequired: true,
    instruction: "Apply a bounded source-grounded edit.",
    unresolvedFacts: [],
    operations,
    ...overrides,
  });
}

test("change proposal schema is strict and versioned", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL("../schemas/lum-change-proposal-v1.schema.json", import.meta.url),
      "utf8",
    ),
  );

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.$id, LUM_CHANGE_PROPOSAL_SCHEMA_ID);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.format.const, "lum-change-proposal");
  assert.equal(schema.properties.version.const, 1);
  assert.equal(schema.properties.verificationRequired.const, true);
  assert.ok(schema.$defs.operation.oneOf);
});

test("valid relationship create proposal yields a separately valid candidate", () => {
  const project = baseProject();
  const source = proposal([
    {
      op: "create",
      collection: "relationships",
      composerSentence: "Alice warns Bob on 2026-09-28",
      record: relationshipRecord(),
    },
  ]);

  const validation = validateLumChangeProposal(source, project);
  assert.equal(validation.valid, true, JSON.stringify(validation.diagnostics));

  const applied = applyLumChangeProposal(source, project, {
    savedAt: "2026-09-28T09:00:00.000Z",
  });
  assert.equal(applied.valid, true, JSON.stringify(applied.diagnostics));
  if (!applied.valid) return;

  const candidate = validateProjectInterchange(applied.candidate);
  assert.equal(candidate.valid, true);
  if (!candidate.valid) return;

  assert.equal(candidate.snapshot.revision, 2);
  assert.equal(candidate.snapshot.project.relationships.length, 1);
  assert.equal(candidate.snapshot.project.relationships[0].predicate, "warns");
  assert.equal(applied.summary.created.relationships, 1);
});

test("agent proposals cover canonical place/source/category/story composition", () => {
  const result = applyLumChangeProposal(
    proposal([
      {
        op: "create",
        collection: "places",
        record: {
          id: "stockholm",
          name: "Stockholm",
          geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
          sourceIds: [],
          attributes: {},
        },
      },
      {
        op: "create",
        collection: "sources",
        record: {
          id: "source-1",
          kind: "document",
          title: "Source document",
          attributes: {},
        },
      },
      {
        op: "create",
        collection: "categories",
        record: {
          id: "incident",
          name: "Incident",
          color: "#667085",
          attributes: {},
        },
      },
      {
        op: "create",
        collection: "stories",
        record: {
          id: "story-1",
          title: "Review story",
          occurrenceIds: [],
          placeIds: ["stockholm"],
          attributes: {},
        },
      },
    ]),
    baseProject(),
    { savedAt: "2026-09-28T09:00:00.000Z" },
  );

  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  if (!result.valid) return;
  const candidate = validateProjectInterchange(result.candidate);
  assert.equal(candidate.valid, true);
  if (!candidate.valid) return;
  assert.equal(candidate.snapshot.project.places?.[0]?.id, "stockholm");
  assert.equal(candidate.snapshot.project.sources?.[0]?.id, "source-1");
  assert.equal(candidate.snapshot.project.categories?.[0]?.id, "incident");
  assert.deepEqual(candidate.snapshot.project.stories?.[0]?.placeIds, ["stockholm"]);
});

test("proposal fails closed when expected project revision is stale", () => {
  const result = validateLumChangeProposal(
    proposal(
      [
        {
          op: "create",
          collection: "relationships",
          record: relationshipRecord(),
        },
      ],
      { expectedRevision: 99 },
    ),
    baseProject(),
  );

  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((finding) => finding.code === "stale-project-revision"));
});

test("unknown proposal fields and unsupported operations are rejected", () => {
  const unknown = validateLumChangeProposal(
    proposal([], { agentGuess: true }),
    baseProject(),
  );
  assert.equal(unknown.valid, false);
  assert.ok(unknown.diagnostics.some((finding) => finding.code === "unknown-field"));

  const badOperation = validateLumChangeProposal(
    proposal([{ op: "merge", collection: "entities", id: "alice" }]),
    baseProject(),
  );
  assert.equal(badOperation.valid, false);
  assert.ok(badOperation.diagnostics.some((finding) => finding.code === "invalid-operation"));
});

test("create, replace, and delete enforce record identity and existence", () => {
  const duplicate = validateLumChangeProposal(
    proposal([
      {
        op: "create",
        collection: "entities",
        record: {
          id: "alice",
          type: "person",
          name: "Alice clone",
          alternateNames: [],
          sourceIds: [],
          attributes: {},
        },
      },
    ]),
    baseProject(),
  );
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.diagnostics.some((finding) => finding.code === "record-already-exists"));

  const missingReplace = validateLumChangeProposal(
    proposal([
      {
        op: "replace",
        collection: "entities",
        record: {
          id: "carol",
          type: "person",
          name: "Carol",
          alternateNames: [],
          sourceIds: [],
          attributes: {},
        },
      },
    ]),
    baseProject(),
  );
  assert.equal(missingReplace.valid, false);
  assert.ok(missingReplace.diagnostics.some((finding) => finding.code === "record-does-not-exist"));

  const missingDelete = validateLumChangeProposal(
    proposal([{ op: "delete", collection: "entities", id: "carol" }]),
    baseProject(),
  );
  assert.equal(missingDelete.valid, false);
  assert.ok(missingDelete.diagnostics.some((finding) => finding.code === "record-does-not-exist"));
});

test("candidate validation rejects reference-unsafe deletion", () => {
  const created = applyLumChangeProposal(
    proposal([
      {
        op: "create",
        collection: "relationships",
        record: relationshipRecord(),
      },
    ]),
    baseProject(),
    { savedAt: "2026-09-28T09:00:00.000Z" },
  );
  assert.equal(created.valid, true);
  if (!created.valid) return;

  const deleteAlice = proposal(
    [{ op: "delete", collection: "entities", id: "alice" }],
    { expectedRevision: 2 },
  );
  const result = applyLumChangeProposal(deleteAlice, created.candidate, {
    savedAt: "2026-09-28T09:01:00.000Z",
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some(
      (finding) => finding.code === "record-still-referenced",
    ),
  );
});

test("source deletion is blocked while provenance references remain", () => {
  const parsed = JSON.parse(baseProject());
  parsed.project.sources = [
    {
      id: "source-1",
      kind: "document",
      title: "Source document",
      attributes: {},
    },
  ];
  parsed.project.entities[0].sourceIds = ["source-1"];
  const project = formatProjectInterchange(JSON.stringify(parsed));

  const result = applyLumChangeProposal(
    proposal([
      {
        op: "delete",
        collection: "sources",
        id: "source-1",
      },
    ]),
    project,
    { savedAt: "2026-09-28T09:00:00.000Z" },
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some(
      (finding) =>
        finding.code === "record-still-referenced" &&
        finding.message.includes("/project/entities/0/sourceIds"),
    ),
  );
});

test("composer sentence is cross-checked against relationship endpoints, action, and time", () => {
  const actionMismatch = validateLumChangeProposal(
    proposal([
      {
        op: "create",
        collection: "relationships",
        composerSentence: "Alice calls Bob on 2026-09-28",
        record: relationshipRecord("warns"),
      },
    ]),
    baseProject(),
  );
  assert.equal(actionMismatch.valid, false);
  assert.ok(actionMismatch.diagnostics.some((finding) => finding.code === "composer-mismatch"));

  const endpointMismatch = validateLumChangeProposal(
    proposal([
      {
        op: "create",
        collection: "relationships",
        composerSentence: "Bob warns Alice on 2026-09-28",
        record: relationshipRecord(),
      },
    ]),
    baseProject(),
  );
  assert.equal(endpointMismatch.valid, false);
  assert.ok(endpointMismatch.diagnostics.some((finding) => finding.code === "composer-mismatch"));

  const timeMismatch = validateLumChangeProposal(
    proposal([
      {
        op: "create",
        collection: "relationships",
        composerSentence: "Alice warns Bob on 2026-09-27",
        record: relationshipRecord(),
      },
    ]),
    baseProject(),
  );
  assert.equal(timeMismatch.valid, false);
  assert.ok(timeMismatch.diagnostics.some((finding) => finding.code === "composer-mismatch"));
});

test("composer options are rejected when the canonical relationship cannot preserve them", () => {
  const result = validateLumChangeProposal(
    proposal([
      {
        op: "create",
        collection: "relationships",
        composerSentence: "Alice warns Bob [category: incident]",
        record: {
          ...relationshipRecord(),
          time: null,
        },
      },
    ]),
    baseProject(),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some((finding) => finding.code === "composer-options-unverifiable"),
  );
});

test("CLI validate-proposal and apply write a new candidate by default", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-agent-proposal-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const projectPath = path.join(directory, "case.lum.json");
  const proposalPath = path.join(directory, "change.lum-proposal.json");
  await writeFile(projectPath, baseProject(), "utf8");
  await writeFile(
    proposalPath,
    proposal([
      {
        op: "create",
        collection: "relationships",
        composerSentence: "Alice warns Bob on 2026-09-28",
        record: relationshipRecord(),
      },
    ]),
    "utf8",
  );

  const before = await readFile(projectPath, "utf8");
  const check = runLum([
    "agent",
    "validate-proposal",
    proposalPath,
    "--project",
    projectPath,
    "--json",
  ]);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).valid, true);

  const apply = runLum([
    "agent",
    "apply",
    proposalPath,
    "--project",
    projectPath,
    "--json",
  ]);
  assert.equal(apply.status, 0, apply.stderr);
  const output = JSON.parse(apply.stdout);
  assert.match(output.output, /\.candidate\.lum\.json$/);

  assert.equal(await readFile(projectPath, "utf8"), before);
  const candidate = await readFile(output.output, "utf8");
  assert.equal(validateProjectInterchange(candidate).valid, true);
});
