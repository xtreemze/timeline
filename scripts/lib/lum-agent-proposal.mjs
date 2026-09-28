import {
  serializeProjectInterchange,
  validateProjectInterchange,
} from "../../src/application/project-interchange.ts";
import { parseOccurrenceSentence } from "../../site/occurrence-composer-model.ts";

export const LUM_CHANGE_PROPOSAL_SCHEMA_ID =
  "https://xtreemze.github.io/timeline/schemas/lum-change-proposal-v1.schema.json";
export const LUM_CHANGE_PROPOSAL_FORMAT = "lum-change-proposal";
export const LUM_CHANGE_PROPOSAL_VERSION = 1;
export const LUM_CHANGE_PROPOSAL_FILE_EXTENSION = ".lum-proposal.json";

const COLLECTIONS = new Set([
  "entities",
  "relationships",
  "occurrences",
  "trajectories",
  "places",
  "sources",
  "categories",
  "stories",
]);

const TOP_LEVEL_FIELDS = new Set([
  "$schema",
  "format",
  "version",
  "projectKey",
  "expectedRevision",
  "verificationRequired",
  "instruction",
  "unresolvedFacts",
  "operations",
  "generation",
]);

const UNRESOLVED_FACT_FIELDS = new Set(["id", "question", "sourceIds", "note"]);
const GENERATION_FIELDS = new Set(["provider", "model", "createdAt", "requestId"]);
const CHANGE_OPERATION_FIELDS = new Set([
  "op",
  "collection",
  "record",
  "composerSentence",
  "sourceRefs",
]);
const DELETE_OPERATION_FIELDS = new Set(["op", "collection", "id", "sourceRefs"]);

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function diagnostic(code, path, message, remediation) {
  return {
    severity: "error",
    code,
    path,
    message,
    ...(remediation ? { remediation } : {}),
  };
}

function unknownFieldDiagnostics(value, allowed, basePath = "") {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .sort()
    .map((key) =>
      diagnostic(
        "unknown-field",
        `${basePath}/${pointerSegment(key)}`,
        `Unknown field "${key}" is not part of the strict Lūm change proposal contract.`,
        "Remove the field or move provenance into one of the documented proposal metadata fields.",
      ),
    );
}

function requireNonEmptyString(value, path, label, diagnostics) {
  if (typeof value !== "string" || !value.trim()) {
    diagnostics.push(
      diagnostic("invalid-proposal", path, `${label} must be a non-empty string.`),
    );
    return false;
  }
  return true;
}

function validateStringArray(value, path, diagnostics) {
  if (!Array.isArray(value)) {
    diagnostics.push(diagnostic("invalid-proposal", path, "Expected an array of strings."));
    return;
  }
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || !entry.trim()) {
      diagnostics.push(
        diagnostic(
          "invalid-proposal",
          `${path}/${index}`,
          "Expected a non-empty string.",
        ),
      );
    }
  });
}

function validateUnresolvedFacts(value, diagnostics) {
  if (!Array.isArray(value)) {
    diagnostics.push(
      diagnostic(
        "invalid-proposal",
        "/unresolvedFacts",
        "unresolvedFacts must be an array.",
      ),
    );
    return;
  }

  value.forEach((entry, index) => {
    const item = record(entry);
    const path = `/unresolvedFacts/${index}`;
    if (!item) {
      diagnostics.push(
        diagnostic("invalid-proposal", path, "Unresolved facts must be objects."),
      );
      return;
    }
    diagnostics.push(...unknownFieldDiagnostics(item, UNRESOLVED_FACT_FIELDS, path));
    requireNonEmptyString(item.question, `${path}/question`, "question", diagnostics);
    if (item.sourceIds !== undefined) {
      validateStringArray(item.sourceIds, `${path}/sourceIds`, diagnostics);
    }
  });
}

function validateGeneration(value, diagnostics) {
  if (value === undefined) return;
  const item = record(value);
  if (!item) {
    diagnostics.push(
      diagnostic("invalid-proposal", "/generation", "generation must be an object."),
    );
    return;
  }
  diagnostics.push(...unknownFieldDiagnostics(item, GENERATION_FIELDS, "/generation"));
  for (const field of ["provider", "model", "createdAt", "requestId"]) {
    if (item[field] !== undefined) {
      requireNonEmptyString(
        item[field],
        `/generation/${field}`,
        field,
        diagnostics,
      );
    }
  }
}

function validateOperationShape(value, index, diagnostics) {
  const path = `/operations/${index}`;
  const operation = record(value);
  if (!operation) {
    diagnostics.push(
      diagnostic("invalid-operation", path, "Every operation must be an object."),
    );
    return;
  }

  const op = operation.op;
  if (!["create", "replace", "delete"].includes(op)) {
    diagnostics.push(
      diagnostic(
        "invalid-operation",
        `${path}/op`,
        'Operation op must be "create", "replace", or "delete".',
      ),
    );
    return;
  }

  diagnostics.push(
    ...unknownFieldDiagnostics(
      operation,
      op === "delete" ? DELETE_OPERATION_FIELDS : CHANGE_OPERATION_FIELDS,
      path,
    ),
  );

  if (!COLLECTIONS.has(operation.collection)) {
    diagnostics.push(
      diagnostic(
        "invalid-operation",
        `${path}/collection`,
        "Operation collection must be a canonical Lūm project collection.",
      ),
    );
  }

  if (operation.sourceRefs !== undefined) {
    validateStringArray(operation.sourceRefs, `${path}/sourceRefs`, diagnostics);
  }

  if (op === "delete") {
    requireNonEmptyString(operation.id, `${path}/id`, "id", diagnostics);
    return;
  }

  const proposedRecord = record(operation.record);
  if (!proposedRecord) {
    diagnostics.push(
      diagnostic(
        "invalid-operation",
        `${path}/record`,
        "Create and replace operations require a record object.",
      ),
    );
    return;
  }
  requireNonEmptyString(
    proposedRecord.id,
    `${path}/record/id`,
    "record.id",
    diagnostics,
  );

  if (
    operation.composerSentence !== undefined &&
    operation.collection !== "relationships"
  ) {
    diagnostics.push(
      diagnostic(
        "invalid-composer-target",
        `${path}/composerSentence`,
        "composerSentence is only valid for relationship create/replace operations.",
      ),
    );
  } else if (operation.composerSentence !== undefined) {
    requireNonEmptyString(
      operation.composerSentence,
      `${path}/composerSentence`,
      "composerSentence",
      diagnostics,
    );
  }
}

function parseProposal(source) {
  try {
    return { value: JSON.parse(source), error: null };
  } catch {
    return { value: null, error: "Lūm change proposal is not valid JSON." };
  }
}

function validateProposalDocument(source) {
  const parsed = parseProposal(source);
  if (parsed.error) {
    return {
      proposal: null,
      diagnostics: [
        diagnostic(
          "invalid-json",
          "",
          parsed.error,
          "Repair JSON syntax before validating proposal semantics.",
        ),
      ],
    };
  }

  const proposal = record(parsed.value);
  if (!proposal) {
    return {
      proposal: null,
      diagnostics: [
        diagnostic(
          "invalid-proposal",
          "",
          "Lūm change proposal must be a JSON object.",
        ),
      ],
    };
  }

  const diagnostics = unknownFieldDiagnostics(proposal, TOP_LEVEL_FIELDS);

  if (proposal.$schema !== LUM_CHANGE_PROPOSAL_SCHEMA_ID) {
    diagnostics.push(
      diagnostic(
        "unsupported-proposal-schema",
        "/$schema",
        `Expected $schema "${LUM_CHANGE_PROPOSAL_SCHEMA_ID}".`,
      ),
    );
  }
  if (proposal.format !== LUM_CHANGE_PROPOSAL_FORMAT) {
    diagnostics.push(
      diagnostic(
        "unsupported-proposal-format",
        "/format",
        `Expected format "${LUM_CHANGE_PROPOSAL_FORMAT}".`,
      ),
    );
  }
  if (proposal.version !== LUM_CHANGE_PROPOSAL_VERSION) {
    diagnostics.push(
      diagnostic(
        "unsupported-proposal-version",
        "/version",
        `Expected version ${LUM_CHANGE_PROPOSAL_VERSION}.`,
      ),
    );
  }

  requireNonEmptyString(
    proposal.projectKey,
    "/projectKey",
    "projectKey",
    diagnostics,
  );
  if (
    !Number.isInteger(proposal.expectedRevision) ||
    proposal.expectedRevision < 1
  ) {
    diagnostics.push(
      diagnostic(
        "invalid-proposal",
        "/expectedRevision",
        "expectedRevision must be a positive integer.",
      ),
    );
  }
  if (proposal.verificationRequired !== true) {
    diagnostics.push(
      diagnostic(
        "verification-required",
        "/verificationRequired",
        "AI-authored change proposals must set verificationRequired to true.",
      ),
    );
  }
  requireNonEmptyString(
    proposal.instruction,
    "/instruction",
    "instruction",
    diagnostics,
  );
  validateUnresolvedFacts(proposal.unresolvedFacts, diagnostics);
  validateGeneration(proposal.generation, diagnostics);

  if (!Array.isArray(proposal.operations) || proposal.operations.length === 0) {
    diagnostics.push(
      diagnostic(
        "invalid-proposal",
        "/operations",
        "operations must be a non-empty array.",
      ),
    );
  } else {
    proposal.operations.forEach((operation, index) =>
      validateOperationShape(operation, index, diagnostics),
    );
  }

  return { proposal, diagnostics };
}

function entityFor(project, id) {
  return project.entities.find((entity) => String(entity.id) === String(id));
}

function composerEntityMatches(reference, entity) {
  if (!reference || !entity) return false;
  const name = String(reference.name ?? "").trim();
  if (name.startsWith("@")) {
    return name.slice(1) === String(entity.id);
  }
  const names = [entity.name, ...(entity.alternateNames ?? [])]
    .filter(Boolean)
    .map((value) => String(value).trim().toLocaleLowerCase());
  return names.includes(name.toLocaleLowerCase());
}

function endpointValue(endpoint) {
  const object = record(endpoint);
  if (!object) return null;
  return object.value === undefined || object.value === null
    ? null
    : String(object.value);
}

function composerTimeMatches(composerTime, relationshipTime) {
  if (!composerTime && !relationshipTime) return true;
  if (!(composerTime && relationshipTime)) return false;

  if (composerTime.kind === "instant") {
    return (
      relationshipTime.type === "instant" &&
      endpointValue(relationshipTime.start) === composerTime.start
    );
  }

  return (
    composerTime.kind === "range" &&
    relationshipTime.type === "interval" &&
    endpointValue(relationshipTime.start) === composerTime.start &&
    endpointValue(relationshipTime.end) === composerTime.end
  );
}

function composerPlaceMatches(composerPlace, relationship) {
  if (!composerPlace && !relationship.placeId) return true;
  if (!(composerPlace && relationship.placeId)) return false;
  const value = String(composerPlace.name ?? "").trim();
  return value.startsWith("@") && value.slice(1) === String(relationship.placeId);
}

function validateComposerRelationship(operation, project, path) {
  if (!operation.composerSentence) return [];
  const parsed = parseOccurrenceSentence(operation.composerSentence);
  if (parsed.stage !== "complete" || parsed.diagnostics.length > 0) {
    return [
      diagnostic(
        "composer-invalid",
        `${path}/composerSentence`,
        parsed.diagnostics.join(" ") ||
          "composerSentence does not form a complete occurrence sentence.",
      ),
    ];
  }

  const hasEntityProperties =
    Object.keys(parsed.subject?.properties ?? {}).length > 0 ||
    Object.keys(parsed.object?.properties ?? {}).length > 0;
  if (hasEntityProperties) {
    return [
      diagnostic(
        "composer-properties-unverifiable",
        `${path}/composerSentence`,
        "Composer entity properties cannot be verified against a relationship-only proposal operation.",
        "Create or replace the affected entity records explicitly in separate typed operations.",
      ),
    ];
  }

  if (parsed.options.category || parsed.options.tags.length > 0) {
    return [
      diagnostic(
        "composer-options-unverifiable",
        `${path}/composerSentence`,
        "Composer category/tags cannot yet be losslessly represented by the canonical relationship record.",
        "Remove those options from the sentence or wait for the canonical project model to own them.",
      ),
    ];
  }

  const relationship = operation.record;
  const subject = entityFor(project, relationship.subjectId);
  const object = entityFor(project, relationship.objectId);
  const findings = [];

  if (!composerEntityMatches(parsed.subject, subject)) {
    findings.push(
      diagnostic(
        "composer-mismatch",
        `${path}/composerSentence`,
        "Composer subject does not match the proposed relationship subjectId.",
      ),
    );
  }
  if (
    String(parsed.predicate ?? "").trim().toLocaleLowerCase() !==
    String(relationship.predicate ?? "").trim().toLocaleLowerCase()
  ) {
    findings.push(
      diagnostic(
        "composer-mismatch",
        `${path}/composerSentence`,
        "Composer action does not match the proposed relationship predicate.",
      ),
    );
  }
  if (!composerEntityMatches(parsed.object, object)) {
    findings.push(
      diagnostic(
        "composer-mismatch",
        `${path}/composerSentence`,
        "Composer object does not match the proposed relationship objectId.",
      ),
    );
  }
  if (!composerPlaceMatches(parsed.place, relationship)) {
    findings.push(
      diagnostic(
        "composer-mismatch",
        `${path}/composerSentence`,
        "Composer place does not match placeId. Until canonical place names are owned by this format, use an explicit @place-id reference.",
      ),
    );
  }
  if (!composerTimeMatches(parsed.time, relationship.time)) {
    findings.push(
      diagnostic(
        "composer-mismatch",
        `${path}/composerSentence`,
        "Composer time does not match the proposed relationship canonical time.",
      ),
    );
  }
  return findings;
}

function collectionArray(project, collection) {
  if (!Array.isArray(project[collection])) project[collection] = [];
  return project[collection];
}

function operationId(operation) {
  return operation.op === "delete"
    ? String(operation.id)
    : String(operation.record.id);
}

function applyOperations(proposal, sourceSnapshot, savedAt) {
  const diagnostics = [];
  const project = cloneJson(sourceSnapshot.project);
  const summary = {
    created: {
      entities: 0,
      relationships: 0,
      occurrences: 0,
      trajectories: 0,
      places: 0,
      sources: 0,
      categories: 0,
      stories: 0,
    },
    replaced: {
      entities: 0,
      relationships: 0,
      occurrences: 0,
      trajectories: 0,
      places: 0,
      sources: 0,
      categories: 0,
      stories: 0,
    },
    deleted: {
      entities: 0,
      relationships: 0,
      occurrences: 0,
      trajectories: 0,
      places: 0,
      sources: 0,
      categories: 0,
      stories: 0,
    },
    operations: [],
    unresolvedFacts: cloneJson(proposal.unresolvedFacts),
  };

  proposal.operations.forEach((operation, index) => {
    const path = `/operations/${index}`;
    const collection = operation.collection;
    if (!COLLECTIONS.has(collection)) return;
    const records = collectionArray(project, collection);
    const id = operationId(operation);
    const existingIndex = records.findIndex(
      (candidate) => String(candidate?.id) === id,
    );

    if (operation.op === "create" && existingIndex >= 0) {
      diagnostics.push(
        diagnostic(
          "record-already-exists",
          `${path}/record/id`,
          `${collection} record "${id}" already exists.`,
        ),
      );
      return;
    }
    if (operation.op !== "create" && existingIndex < 0) {
      diagnostics.push(
        diagnostic(
          "record-does-not-exist",
          operation.op === "delete" ? `${path}/id` : `${path}/record/id`,
          `${collection} record "${id}" does not exist.`,
        ),
      );
      return;
    }

    if (
      operation.op !== "delete" &&
      collection === "relationships" &&
      operation.composerSentence
    ) {
      const composerFindings = validateComposerRelationship(
        operation,
        project,
        path,
      );
      diagnostics.push(...composerFindings);
      if (composerFindings.length > 0) return;
    }

    if (operation.op === "create") {
      records.push(cloneJson(operation.record));
      summary.created[collection] += 1;
      summary.operations.push({ op: "create", collection, id });
      return;
    }
    if (operation.op === "replace") {
      records[existingIndex] = cloneJson(operation.record);
      summary.replaced[collection] += 1;
      summary.operations.push({ op: "replace", collection, id });
      return;
    }

    records.splice(existingIndex, 1);
    summary.deleted[collection] += 1;
    summary.operations.push({ op: "delete", collection, id });
  });

  if (diagnostics.length > 0) {
    return { valid: false, diagnostics, candidate: null, summary };
  }

  try {
    const candidate = serializeProjectInterchange({
      projectKey: sourceSnapshot.projectKey,
      revision: sourceSnapshot.revision + 1,
      savedAt,
      project,
    });
    const validation = validateProjectInterchange(candidate);
    if (!validation.valid) {
      return {
        valid: false,
        diagnostics: validation.diagnostics.map((finding) => ({
          ...finding,
          code:
            finding.code === "invalid-project"
              ? "candidate-invalid"
              : finding.code,
        })),
        candidate: null,
        summary,
      };
    }
    return { valid: true, diagnostics: [], candidate, summary };
  } catch (error) {
    return {
      valid: false,
      diagnostics: [
        diagnostic(
          "candidate-invalid",
          "/operations",
          error instanceof Error
            ? error.message
            : "The proposed operations do not produce a valid Lūm project.",
        ),
      ],
      candidate: null,
      summary,
    };
  }
}

function evaluateProposal(proposalSource, projectSource, options = {}) {
  const proposalResult = validateProposalDocument(proposalSource);
  if (!proposalResult.proposal || proposalResult.diagnostics.length > 0) {
    return {
      valid: false,
      diagnostics: proposalResult.diagnostics,
      proposal: proposalResult.proposal,
      candidate: null,
      summary: null,
    };
  }

  const sourceValidation = validateProjectInterchange(projectSource);
  if (!sourceValidation.valid) {
    return {
      valid: false,
      diagnostics: [
        diagnostic(
          "source-project-invalid",
          "",
          "The source project must pass strict Lūm validation before applying an AI proposal.",
        ),
        ...sourceValidation.diagnostics,
      ],
      proposal: proposalResult.proposal,
      candidate: null,
      summary: null,
    };
  }

  const proposal = proposalResult.proposal;
  const snapshot = sourceValidation.snapshot;
  const diagnostics = [];

  if (proposal.projectKey !== snapshot.projectKey) {
    diagnostics.push(
      diagnostic(
        "project-key-mismatch",
        "/projectKey",
        `Proposal targets project "${proposal.projectKey}" but source is "${snapshot.projectKey}".`,
      ),
    );
  }
  if (proposal.expectedRevision !== snapshot.revision) {
    diagnostics.push(
      diagnostic(
        "stale-project-revision",
        "/expectedRevision",
        `Proposal expects revision ${proposal.expectedRevision}; source is revision ${snapshot.revision}.`,
        "Regenerate or rebase the proposal against the current project revision.",
      ),
    );
  }
  if (diagnostics.length > 0) {
    return {
      valid: false,
      diagnostics,
      proposal,
      candidate: null,
      summary: null,
    };
  }

  const applied = applyOperations(
    proposal,
    snapshot,
    options.savedAt ?? snapshot.savedAt,
  );
  return {
    ...applied,
    proposal,
  };
}

export function validateLumChangeProposal(
  proposalSource,
  projectSource,
  options = {},
) {
  const result = evaluateProposal(proposalSource, projectSource, options);
  const diagnostics = [...result.diagnostics];
  if (
    options.fileName &&
    options.fileName !== "-" &&
    !options.fileName.endsWith(LUM_CHANGE_PROPOSAL_FILE_EXTENSION)
  ) {
    diagnostics.push(
      diagnostic(
        "non-canonical-proposal-extension",
        "",
        `Lūm change proposals must use the ${LUM_CHANGE_PROPOSAL_FILE_EXTENSION} suffix.`,
      ),
    );
  }
  return {
    valid:
      result.valid &&
      !diagnostics.some((finding) => finding.severity === "error"),
    diagnostics,
    ...(result.summary ? { summary: result.summary } : {}),
  };
}

export function applyLumChangeProposal(
  proposalSource,
  projectSource,
  options = {},
) {
  const validation = validateLumChangeProposal(
    proposalSource,
    projectSource,
    options,
  );
  if (!validation.valid) {
    return {
      valid: false,
      diagnostics: validation.diagnostics,
    };
  }

  const result = evaluateProposal(proposalSource, projectSource, options);
  if (!result.valid) {
    return {
      valid: false,
      diagnostics: result.diagnostics,
    };
  }
  return {
    valid: true,
    diagnostics: [],
    candidate: result.candidate,
    summary: result.summary,
    verificationRequired: true,
  };
}

export function createLumChangeProposalScaffold(options) {
  return `${JSON.stringify(
    {
      $schema: LUM_CHANGE_PROPOSAL_SCHEMA_ID,
      format: LUM_CHANGE_PROPOSAL_FORMAT,
      version: LUM_CHANGE_PROPOSAL_VERSION,
      projectKey: options.projectKey,
      expectedRevision: options.expectedRevision,
      verificationRequired: true,
      instruction: options.instruction ?? "Describe the intended bounded change.",
      unresolvedFacts: [],
      operations: [],
    },
    null,
    2,
  )}\n`;
}
