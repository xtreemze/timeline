import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isVerificationRequiredStoryProposal,
  stageProjectImportReview,
  verifyStagedProjectImport,
} from "../src/application/project-import-review.ts";

function envelope(overrides = {}) {
  return {
    schemaVersion: "lum-story-proposal-v1",
    status: "ready-for-user-verification",
    project: {
      title: "Generated case",
      stories: [{ id: "story-1" }],
      items: [{ id: "item-1" }],
      entities: [{ id: "entity-1" }, { id: "entity-2" }],
      relationships: [{ id: "rel-1" }],
      places: [{ id: "place-1" }],
      evidence: [{ id: "evidence-1" }],
    },
    sources: [{ id: "source-a", title: "Source A" }],
    unresolved: ["Date for item 2 remains ambiguous."],
    generationNotes: "Derived from supplied documents.",
    preflight: {
      valid: true,
      errors: [],
      warnings: ["One relationship has approximate time."],
      summary: {},
    },
    verificationRequired: true,
    verificationInstructions: ["Inspect evidence before approval."],
    ...overrides,
  };
}

const dependencies = {
  normalize(project) {
    return JSON.parse(JSON.stringify(project));
  },
  validate() {
    return { valid: true, errors: [], warnings: [] };
  },
};

test("recognizes only verification-required public story proposal envelopes", () => {
  assert.equal(isVerificationRequiredStoryProposal(envelope()), true);
  assert.equal(isVerificationRequiredStoryProposal({ ...envelope(), verificationRequired: false }), false);
  assert.equal(isVerificationRequiredStoryProposal(envelope({ schemaVersion: "other" })), false);
  assert.equal(isVerificationRequiredStoryProposal({ title: "ordinary project" }), false);
});

test("staging preserves review metadata and never mutates the source proposal", () => {
  const source = envelope();
  const before = JSON.stringify(source);
  const staged = stageProjectImportReview(source, dependencies);

  assert.ok(staged);
  assert.equal(JSON.stringify(source), before);
  assert.notEqual(staged.project, source.project);
  assert.equal(staged.status, "ready-for-user-verification");
  assert.equal(staged.verificationRequired, true);
  assert.deepEqual(staged.unresolved, ["Date for item 2 remains ambiguous."]);
  assert.deepEqual(staged.warnings, ["One relationship has approximate time."]);
  assert.deepEqual(staged.errors, []);
  assert.equal(staged.generationNotes, "Derived from supplied documents.");
  assert.deepEqual(staged.summary, {
    stories: 1,
    items: 1,
    entities: 2,
    relationships: 1,
    places: 1,
    evidence: 1,
    sources: 1,
  });
  assert.match(staged.fingerprint, /^fnv1a64:[0-9a-f]{16}:\d+$/);
});

test("fingerprint is stable across object key ordering", () => {
  const first = envelope();
  const second = envelope({
    project: {
      evidence: [{ id: "evidence-1" }],
      places: [{ id: "place-1" }],
      relationships: [{ id: "rel-1" }],
      entities: [{ id: "entity-1" }, { id: "entity-2" }],
      items: [{ id: "item-1" }],
      stories: [{ id: "story-1" }],
      title: "Generated case",
    },
  });

  const a = stageProjectImportReview(first, dependencies);
  const b = stageProjectImportReview(second, dependencies);
  assert.equal(a?.fingerprint, b?.fingerprint);
});

test("preflight or local validation errors keep the proposal in needs-repair state", () => {
  const preflightFailure = stageProjectImportReview(
    envelope({
      preflight: {
        valid: false,
        errors: ["Story item is missing evidence."],
        warnings: [],
        summary: {},
      },
    }),
    dependencies,
  );
  assert.equal(preflightFailure?.status, "needs-repair");
  assert.deepEqual(preflightFailure?.errors, ["Story item is missing evidence."]);

  const localFailure = stageProjectImportReview(envelope(), {
    ...dependencies,
    validate() {
      return { valid: false, errors: ["Graph contract rejected relationship rel-1."], warnings: [] };
    },
  });
  assert.equal(localFailure?.status, "needs-repair");
  assert.deepEqual(localFailure?.errors, ["Graph contract rejected relationship rel-1."]);

  const flagOnlyFailure = stageProjectImportReview(
    envelope({
      status: "needs-repair",
      preflight: { valid: false, errors: [], warnings: [], summary: {} },
    }),
    dependencies,
  );
  assert.equal(flagOnlyFailure?.status, "needs-repair");
  assert.ok(flagOnlyFailure?.errors.length);

  const normalizationFailure = stageProjectImportReview(envelope(), {
    ...dependencies,
    normalize() {
      throw new Error("Canonical project shape is invalid.");
    },
  });
  assert.equal(normalizationFailure?.status, "needs-repair");
  assert.deepEqual(normalizationFailure?.errors, ["Canonical project shape is invalid."]);
});

test("verification revalidates the exact fingerprinted candidate before commit", () => {
  const staged = stageProjectImportReview(envelope(), dependencies);
  assert.ok(staged);

  const verified = verifyStagedProjectImport(staged, dependencies);
  assert.equal(verified.title, "Generated case");

  staged.project.title = "Tampered after review";
  assert.throws(
    () => verifyStagedProjectImport(staged, dependencies),
    /changed after it was staged/i,
  );
});

test("application stages public story proposal envelopes without replacing canonical state", async () => {
  const app = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  assert.match(app, /stageProjectImportReview/);
  assert.match(app, /pendingProjectImportReview/);
  assert.match(
    app,
    /importProjectFile[\s\S]*stageVerificationRequiredProjectImport\(raw\)[\s\S]*current project unchanged/,
  );

  const importBody = app.match(
    /async function importProjectFile[\s\S]*?\n\}/,
  )?.[0] ?? "";
  const stageIndex = importBody.indexOf("stageVerificationRequiredProjectImport(raw)");
  const applyIndex = importBody.indexOf("applyImportedTimeline(");
  assert.ok(stageIndex >= 0);
  assert.ok(applyIndex > stageIndex, "ordinary trusted import may apply only after staged-proposal detection");
  assert.doesNotMatch(importBody, /applyImportedTimeline\(\s*staged/);
});

test("staged import recomputes semantic icon provenance locally without applying inferred icons", () => {
  const source = envelope({
    project: {
      title: "Generated icon review",
      stories: [],
      items: [],
      entities: [
        { id: "wolf", name: "The Wolf", type: "person", attributes: {} },
        {
          id: "queen",
          name: "Queen",
          type: "person",
          attributes: { style: { icon: "crown" } },
        },
        { id: "vessel", name: "Unknown Vessel", type: "spaceship", attributes: {} },
      ],
      relationships: [],
      places: [],
      evidence: [],
    },
    semanticIcons: [
      {
        entityId: "wolf",
        icon: "person",
        origin: "explicit",
        reason: "untrusted-envelope-metadata",
      },
    ],
  });

  const staged = stageProjectImportReview(source, dependencies);
  assert.ok(staged);
  assert.deepEqual(staged.semanticIcons, [
    {
      entityId: "wolf",
      entityName: "The Wolf",
      entityType: "person",
      icon: "wolf",
      origin: "inferred",
      confidence: "high",
      reason: "name:wolf",
      authoredIcon: null,
    },
    {
      entityId: "queen",
      entityName: "Queen",
      entityType: "person",
      icon: "crown",
      origin: "explicit",
      confidence: null,
      reason: "authored",
      authoredIcon: "crown",
    },
    {
      entityId: "vessel",
      entityName: "Unknown Vessel",
      entityType: "spaceship",
      icon: null,
      origin: "none",
      confidence: null,
      reason: "no-confident-semantic-icon",
      authoredIcon: null,
    },
  ]);
  assert.equal(staged.project.entities[0].attributes.style, undefined);
});
