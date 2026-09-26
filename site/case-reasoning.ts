/**
 * Forensic case reasoning validation and dependency ordering
 * Normalizes reasoning records, validates integrity, traces dependencies
 */

const STAGE_ORDER = Object.freeze([
  "observation",
  "citation",
  "assertion",
  "assumption",
  "question",
  "hypothesis",
  "proposition",
  "lineOfEnquiry",
  "indicator",
  "informationReview",
  "analysis",
  "legalIssue",
  "claim",
  "thesis",
  "review",
] as const);

const COLLECTION_TYPES = Object.freeze({
  observations: "observation",
  citations: "citation",
  assertions: "assertion",
  assumptions: "assumption",
  questions: "question",
  hypotheses: "hypothesis",
  propositions: "proposition",
  linesOfEnquiry: "lineOfEnquiry",
  indicators: "indicator",
  informationReviews: "informationReview",
  analyses: "analysis",
  legalIssues: "legalIssue",
  claims: "claim",
  theses: "thesis",
  reviews: "review",
} as const);

const EDGE_PREDICATES = Object.freeze([
  "producedObservation",
  "supports",
  "contradicts",
  "contextualizes",
  "impeaches",
  "mentions",
  "explains",
  "evaluates",
  "reliesOn",
  "appliesRule",
  "definesRule",
  "governs",
  "opposes",
  "supersedes",
] as const);

const SUPPORT_PREDICATES = new Set([
  "supports",
  "reliesOn",
  "explains",
  "evaluates",
  "appliesRule",
  "definesRule",
  "governs",
  "producedObservation",
]);
const CONTRADICTION_PREDICATES = new Set(["contradicts", "impeaches", "opposes"]);
const CITATION_RELATIONS = Object.freeze([
  "supports",
  "contradicts",
  "contextualizes",
  "impeaches",
  "mentions",
] as const);
const HYPOTHESIS_KINDS = Object.freeze([
  "general",
  "identity",
  "causal",
  "sequence",
  "source",
] as const);
const IDENTITY_CANDIDATE_SCOPES = Object.freeze(["entity", "none-known"] as const);
const ASSUMPTION_STATUSES = Object.freeze(["open", "supported", "challenged", "rejected"] as const);
const QUESTION_STATUSES = Object.freeze(["open", "answered", "deferred"] as const);
const ENQUIRY_STATUSES = Object.freeze([
  "proposed",
  "active",
  "completed",
  "deferred",
  "not-pursued",
] as const);
const ENQUIRY_TEST_TYPES = Object.freeze([
  "discover",
  "discriminate",
  "corroborate",
  "falsify",
] as const);
const INDICATOR_STATES = Object.freeze(["unknown", "observed", "absent"] as const);
const INFORMATION_FINDINGS = Object.freeze([
  "corroborated",
  "uncorroborated",
  "conflicted",
  "limited",
  "unknown",
] as const);

const CITATION_LOCATOR_TYPES = Object.freeze([
  "page",
  "bates",
  "paragraph",
  "line",
  "time",
  "json-pointer",
  "record-key",
  "uri-fragment",
] as const);

export const ANALYTIC_METHODS = Object.freeze([
  Object.freeze({
    id: "ach",
    name: "Analysis of Competing Hypotheses",
    family: "diagnostic",
    source: "CIA Tradecraft Primer",
    sourceUrl: "https://www.cia.gov/resources/csi/books-monographs/a-tradecraft-primer/",
    purpose: "compare the same evidence across reasonable alternative hypotheses, emphasizing inconsistency and diagnostic evidence",
  }),
  Object.freeze({
    id: "key-assumptions-check",
    name: "Key Assumptions Check",
    family: "diagnostic",
    source: "CIA Tradecraft Primer",
    sourceUrl: "https://www.cia.gov/resources/csi/books-monographs/a-tradecraft-primer/",
    purpose: "make assumptions explicit and challenge whether they remain necessary and well founded",
  }),
  Object.freeze({
    id: "quality-of-information-check",
    name: "Quality of Information Check",
    family: "diagnostic",
    source: "CIA Tradecraft Primer",
    sourceUrl: "https://www.cia.gov/resources/csi/books-monographs/a-tradecraft-primer/",
    purpose: "review source strengths, weaknesses, corroboration, and information gaps without collapsing them to a truth score",
  }),
  Object.freeze({
    id: "indicators-signposts",
    name: "Indicators or Signposts",
    family: "diagnostic",
    source: "CIA Tradecraft Primer",
    sourceUrl: "https://www.cia.gov/resources/csi/books-monographs/a-tradecraft-primer/",
    purpose: "state observable developments that would support, contradict, or change an analytical hypothesis",
  }),
  Object.freeze({
    id: "devils-advocacy",
    name: "Devil's Advocacy",
    family: "contrarian",
    source: "CIA Tradecraft Primer",
    sourceUrl: "https://www.cia.gov/resources/csi/books-monographs/a-tradecraft-primer/",
    purpose: "construct a serious challenge to a prevailing analytical view",
  }),
  Object.freeze({
    id: "what-if",
    name: "What If? Analysis",
    family: "contrarian",
    source: "CIA Tradecraft Primer",
    sourceUrl: "https://www.cia.gov/resources/csi/books-monographs/a-tradecraft-primer/",
    purpose: "test consequences and warning signs for an outcome that may otherwise be dismissed",
  }),
  Object.freeze({
    id: "reasonable-lines-of-enquiry",
    name: "Reasonable lines of enquiry",
    family: "investigative",
    source: "College of Policing investigation guidance",
    sourceUrl: "https://www.college.police.uk/app/investigation/investigation-process",
    purpose: "record and pursue proportionate enquiries that gather material pointing both toward and away from a hypothesis or suspect",
  }),
  Object.freeze({
    id: "alternative-propositions",
    name: "Alternative propositions",
    family: "forensic-interpretation",
    source: "ISO 21043-4:2025",
    sourceUrl: "https://www.iso.org/standard/72039.html",
    purpose: "interpret observations against alternative propositions relevant to the decision question",
  }),
]);

export function analyticMethod(methodId: unknown) {
  const id = text(methodId, 160);
  return ANALYTIC_METHODS.find((method) => method.id === id) ?? null;
}

export const STANDARDS_BASELINE = Object.freeze([
  Object.freeze({
    id: "iso-21043-1",
    edition: "2025",
    status: "published",
    scope: "forensic vocabulary",
  }),
  Object.freeze({
    id: "iso-21043-2",
    edition: "2018",
    status: "published-revision-in-progress",
    scope: "recognition, recording, collection, transport and storage of items",
  }),
  Object.freeze({
    id: "iso-21043-3",
    edition: "2025",
    status: "published",
    scope: "forensic analysis",
  }),
  Object.freeze({
    id: "iso-21043-4",
    edition: "2025",
    status: "published",
    scope: "forensic interpretation",
  }),
  Object.freeze({
    id: "iso-21043-5",
    edition: "2025",
    status: "published",
    scope: "forensic reporting",
  }),
  Object.freeze({
    id: "iso-iec-27037",
    edition: "2012",
    status: "published",
    scope: "digital evidence identification, collection, acquisition and preservation",
  }),
  Object.freeze({
    id: "iso-iec-27041",
    edition: "2015",
    status: "published",
    scope: "suitability and adequacy of incident investigative methods",
  }),
  Object.freeze({
    id: "iso-iec-27042",
    edition: "2015",
    status: "published",
    scope: "digital evidence analysis and interpretation",
  }),
  Object.freeze({
    id: "iso-iec-27043",
    edition: "2015",
    status: "published-under-review",
    scope: "incident investigation principles and processes",
  }),
  Object.freeze({
    id: "case-uco",
    edition: "1.x",
    status: "community-standard",
    scope: "cyber-investigation representation and provenance",
  }),
  Object.freeze({
    id: "w3c-prov-o",
    edition: "2013",
    status: "recommendation",
    scope: "generic provenance",
  }),
]);

function text(value: unknown, max: number = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const id = text(item, 160);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function normalizedStatus(value: unknown): string {
  return text(value, 80) || "unassessed";
}

function wholeNumber(value: unknown, minimum: number = 0): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= minimum ? number : null;
}

export function normalizeCitationLocator(raw: any): Record<string, any> | null {
  if (!raw || typeof raw !== "object") return null;
  const type = CITATION_LOCATOR_TYPES.includes(raw.type) ? raw.type : "";
  if (!type) return null;
  const locator: Record<string, any> = { type };
  const label = text(raw.label, 500);
  if (label) locator.label = label;

  if (type === "page") {
    const page = wholeNumber(raw.page ?? raw.start, 1);
    if (page === null) return null;
    locator.page = page;
    const pageEnd = wholeNumber(raw.pageEnd ?? raw.end, 1);
    if (pageEnd !== null && pageEnd >= page) locator.pageEnd = pageEnd;
  } else if (type === "bates") {
    const value = text(raw.value ?? raw.bates, 500);
    if (!value) return null;
    locator.value = value;
    const endValue = text(raw.endValue ?? raw.batesEnd, 500);
    if (endValue) locator.endValue = endValue;
  } else if (type === "paragraph") {
    const value = text(raw.value ?? raw.paragraph, 500);
    if (!value) return null;
    locator.value = value;
  } else if (type === "line") {
    const lineStart = wholeNumber(raw.lineStart ?? raw.start, 1);
    if (lineStart === null) return null;
    locator.lineStart = lineStart;
    const lineEnd = wholeNumber(raw.lineEnd ?? raw.end, 1);
    if (lineEnd !== null && lineEnd >= lineStart) locator.lineEnd = lineEnd;
  } else if (type === "time") {
    const startMs = wholeNumber(raw.startMs ?? raw.start, 0);
    if (startMs === null) return null;
    locator.startMs = startMs;
    const endMs = wholeNumber(raw.endMs ?? raw.end, 0);
    if (endMs !== null && endMs >= startMs) locator.endMs = endMs;
  } else {
    const value = text(raw.value ?? raw.pointer ?? raw.key ?? raw.fragment, 4000);
    if (!value) return null;
    locator.value = value;
  }
  return locator;
}

export function normalizeRecord(
  raw: any,
  type: string,
  index: number = 0,
): Record<string, any> | null {
  if (!raw || typeof raw !== "object") return null;
  const id = text(raw.id, 160) || `${type}-${index + 1}`;
  const record: Record<string, any> = {
    id,
    type,
    text: text(raw.text ?? raw.title ?? raw.description, 12000),
    status: normalizedStatus(raw.status),
    rationale: text(raw.rationale, 12000),
    limitations: text(raw.limitations, 12000),
    authorEntityId: text(raw.authorEntityId ?? raw.recordedByEntityId, 160),
    createdAt: text(raw.createdAt, 80),
    modifiedAt: text(raw.modifiedAt, 80),
    auditRefs: idList(raw.auditRefs),
    sourceIds: idList(raw.sourceIds),
    inputIds: idList(raw.inputIds),
    supersedesIds: idList(raw.supersedesIds ?? raw.supersedes),
    supersededByIds: idList(raw.supersededByIds ?? raw.supersededBy),
    questionIds: idList(raw.questionIds),
    assumptionIds: idList(raw.assumptionIds),
  };

  if (type === "assumption") {
    const status = text(raw.status, 80);
    record.status = ASSUMPTION_STATUSES.includes(status as any) ? status : "open";
    record.hypothesisIds = idList(raw.hypothesisIds);
    record.propositionIds = idList(raw.propositionIds);
    record.basisIds = idList(raw.basisIds ?? raw.inputIds);
  } else if (type === "question") {
    const status = text(raw.status, 80);
    record.status = QUESTION_STATUSES.includes(status as any) ? status : "open";
    record.hypothesisIds = idList(raw.hypothesisIds);
    record.propositionIds = idList(raw.propositionIds);
    record.answerAssertionIds = idList(raw.answerAssertionIds);
  } else if (type === "lineOfEnquiry") {
    const status = text(raw.status, 80);
    record.status = ENQUIRY_STATUSES.includes(status as any) ? status : "proposed";
    const testType = text(raw.testType, 80);
    record.testType = ENQUIRY_TEST_TYPES.includes(testType as any) ? testType : "discover";
    record.questionIds = idList(raw.questionIds);
    record.hypothesisIds = idList(raw.hypothesisIds);
    record.propositionIds = idList(raw.propositionIds);
    record.targetIds = idList(raw.targetIds);
    record.resultIds = idList(raw.resultIds);
    record.expectedDiscriminator = text(
      raw.expectedDiscriminator ?? raw.expectedResult,
      12000,
    );
  } else if (type === "indicator") {
    const state = text(raw.state, 80);
    record.state = INDICATOR_STATES.includes(state as any) ? state : "unknown";
    record.hypothesisIds = idList(raw.hypothesisIds);
    record.propositionIds = idList(raw.propositionIds);
    record.observationIds = idList(raw.observationIds);
    record.temporalScope =
      raw.temporalScope && typeof raw.temporalScope === "object"
        ? structuredClone(raw.temporalScope)
        : null;
  } else if (type === "informationReview") {
    const finding = text(raw.finding, 80);
    record.finding = INFORMATION_FINDINGS.includes(finding as any)
      ? finding
      : "unknown";
    record.targetIds = idList(raw.targetIds);
    record.methodId = text(raw.methodId, 160) || "quality-of-information-check";
  } else if (type === "citation") {
    record.assertionId = text(raw.assertionId, 160);
    record.evidenceId = text(raw.evidenceId, 160);
    record.evidenceIds = record.evidenceId ? [record.evidenceId] : [];
    record.relation = CITATION_RELATIONS.includes(raw.relation) ? raw.relation : "mentions";
    record.locator = normalizeCitationLocator(raw.locator);
    record.excerpt = text(raw.excerpt, 24000);
    record.analystNote = text(raw.analystNote ?? raw.note, 12000);
    record.linkageConfidence = text(raw.linkageConfidence ?? raw.confidence, 80);
  } else if (type === "observation") {
    record.evidenceIds = idList(raw.evidenceIds);
    record.methodId = text(raw.methodId, 160);
    record.temporalScope =
      raw.temporalScope && typeof raw.temporalScope === "object"
        ? structuredClone(raw.temporalScope)
        : null;
  } else if (type === "assertion") {
    record.citationIds = idList(raw.citationIds);
    record.itemIds = idList(raw.itemIds ?? (raw.itemId ? [raw.itemId] : []));
    record.issueIds = idList(raw.issueIds);
  } else if (type === "hypothesis") {
    record.observationIds = idList(raw.observationIds);
    record.assertionIds = idList(raw.assertionIds);
    record.assessment = text(raw.assessment, 80) || "open";
    const hypothesisKind = text(raw.hypothesisKind ?? raw.kind, 80);
    record.hypothesisKind = HYPOTHESIS_KINDS.includes(hypothesisKind as any)
      ? hypothesisKind
      : "general";
    record.alternativeGroupId = text(raw.alternativeGroupId, 160);
    record.unknownEntityId = text(raw.unknownEntityId, 160);
    record.candidateEntityId = text(raw.candidateEntityId, 160);
    const candidateScope = text(raw.candidateScope, 80);
    record.candidateScope = IDENTITY_CANDIDATE_SCOPES.includes(candidateScope as any)
      ? candidateScope
      : record.candidateEntityId
        ? "entity"
        : "";
  } else if (type === "proposition") {
    record.assertionIds = idList(raw.assertionIds);
    record.level = text(raw.level, 80);
    record.alternativeGroupId = text(raw.alternativeGroupId, 160);
  } else if (type === "analysis") {
    record.mode = text(raw.mode, 80) || "investigative";
    record.observationIds = idList(raw.observationIds);
    record.assertionIds = idList(raw.assertionIds);
    record.hypothesisIds = idList(raw.hypothesisIds);
    record.propositionIds = idList(raw.propositionIds);
    record.methodId = text(raw.methodId, 160);
    record.methodVersion = text(raw.methodVersion, 160);
    record.conditioningInformation = text(raw.conditioningInformation, 12000);
    record.reviewStatus = text(raw.reviewStatus, 80) || "unreviewed";
  } else if (type === "legalIssue") {
    record.authorityIds = idList(raw.authorityIds);
    record.ruleIds = idList(raw.ruleIds);
    record.assertionIds = idList(raw.assertionIds);
    record.analysisIds = idList(raw.analysisIds);
  } else if (type === "claim") {
    record.assertionIds = idList(raw.assertionIds);
    record.analysisIds = idList(raw.analysisIds);
    record.ruleIds = idList(raw.ruleIds);
    record.counterclaimIds = idList(raw.counterclaimIds);
  } else if (type === "thesis") {
    record.claimIds = idList(raw.claimIds);
    record.counterclaimIds = idList(raw.counterclaimIds);
  } else if (type === "review") {
    record.targetIds = idList(raw.targetIds);
    record.reviewerEntityId = text(raw.reviewerEntityId, 160);
    record.decision = text(raw.decision, 80) || "pending";
    record.reviewedAt = text(raw.reviewedAt, 80);
  }

  return record;
}

function normalizeCollection(value: unknown, type: string): Record<string, any>[] {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const records: Record<string, any>[] = [];
  source.forEach((raw, index) => {
    const record = normalizeRecord(raw, type, index);
    if (!record || seen.has(record.id)) return;
    seen.add(record.id);
    records.push(record);
  });
  return records;
}

export function normalizeEdge(raw: any, index: number = 0): Record<string, any> | null {
  if (!raw || typeof raw !== "object") return null;
  const fromId = text(raw.fromId, 160);
  const toId = text(raw.toId, 160);
  if (!fromId || !toId) return null;
  const predicate = EDGE_PREDICATES.includes(raw.predicate) ? raw.predicate : "reliesOn";
  return {
    id: text(raw.id, 160) || `reasoning-edge-${index + 1}`,
    fromId,
    toId,
    predicate,
    rationale: text(raw.rationale, 12000),
    authorEntityId: text(raw.authorEntityId, 160),
    createdAt: text(raw.createdAt, 80),
    temporalScope:
      raw.temporalScope && typeof raw.temporalScope === "object"
        ? structuredClone(raw.temporalScope)
        : null,
  };
}

export function normalizeReasoning(raw: any): Record<string, any> {
  const source = raw && typeof raw === "object" ? raw : {};
  const result: Record<string, any> = {};
  for (const [collection, type] of Object.entries(COLLECTION_TYPES)) {
    result[collection] = normalizeCollection(source[collection], type as string);
  }
  const seenEdges = new Set<string>();
  result.edges = [];
  (Array.isArray(source.edges) ? source.edges : []).forEach((rawEdge, index) => {
    const edge = normalizeEdge(rawEdge, index);
    if (!edge || seenEdges.has(edge.id)) return;
    seenEdges.add(edge.id);
    result.edges.push(edge);
  });
  return result;
}

export function recordsOf(reasoning: any): Record<string, any>[] {
  const normalized = normalizeReasoning(reasoning);
  const records: Record<string, any>[] = [];
  for (const collection of Object.keys(COLLECTION_TYPES)) records.push(...normalized[collection]);
  return records;
}

export function dependencyIds(record: Record<string, any>): string[] {
  const fields = [
    "sourceIds",
    "inputIds",
    "supersedesIds",
    "questionIds",
    "assumptionIds",
    "evidenceIds",
    "citationIds",
    "itemIds",
    "issueIds",
    "observationIds",
    "assertionIds",
    "hypothesisIds",
    "propositionIds",
    "authorityIds",
    "ruleIds",
    "analysisIds",
    "claimIds",
    "targetIds",
    "basisIds",
    "answerAssertionIds",
    "resultIds",
  ];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    for (const id of idList(record[field])) {
      if (id === record.id || seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
  }
  for (const field of ["unknownEntityId", "candidateEntityId"]) {
    const id = text(record[field], 160);
    if (!id || id === record.id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function indexReasoning(reasoning: any, externalIds: unknown[] = []) {
  const normalized = normalizeReasoning(reasoning);
  const records = recordsOf(normalized);
  const recordById = new Map(records.map((record) => [record.id, record]));
  const knownIds = new Set([...recordById.keys(), ...idList(externalIds)]);
  return { normalized, records, recordById, knownIds };
}

function hypothesisCell(
  evidenceId: string,
  hypothesis: Record<string, any>,
  normalized: Record<string, any>,
) {
  const edges = normalized.edges.filter(
    (edge: any) => edge.fromId === evidenceId && edge.toId === hypothesis.id,
  );
  const predicates = new Set(edges.map((edge: any) => edge.predicate));
  const supports = [...predicates].some((predicate) => SUPPORT_PREDICATES.has(predicate));
  const contradicts = [...predicates].some((predicate) =>
    CONTRADICTION_PREDICATES.has(predicate),
  );
  const explicitlyLinked =
    hypothesis.observationIds?.includes(evidenceId) ||
    hypothesis.assertionIds?.includes(evidenceId) ||
    hypothesis.inputIds?.includes(evidenceId);
  let assessment = "unknown";
  if (supports && contradicts) assessment = "mixed";
  else if (contradicts) assessment = "contradicts";
  else if (supports) assessment = "supports";
  else if (predicates.size > 0 || explicitlyLinked) assessment = "contextual";

  return {
    hypothesisId: hypothesis.id,
    assessment,
    edgeIds: edges.map((edge: any) => edge.id).sort(),
  };
}

export function competingHypothesisMatrix(reasoning: any, alternativeGroupId: unknown) {
  const normalized = normalizeReasoning(reasoning);
  const groupId = text(alternativeGroupId, 160);
  const hypotheses = normalized.hypotheses
    .filter((hypothesis: any) => hypothesis.alternativeGroupId === groupId)
    .sort((left: any, right: any) => left.id.localeCompare(right.id));
  const hypothesisIds = new Set(hypotheses.map((hypothesis: any) => hypothesis.id));

  const evidenceCandidates = [
    ...normalized.observations,
    ...normalized.assertions,
    ...normalized.citations,
  ];
  const evidence = evidenceCandidates
    .filter((record: any) => {
      if (
        hypotheses.some(
          (hypothesis: any) =>
            hypothesis.observationIds?.includes(record.id) ||
            hypothesis.assertionIds?.includes(record.id) ||
            hypothesis.inputIds?.includes(record.id),
        )
      ) {
        return true;
      }
      return normalized.edges.some(
        (edge: any) => edge.fromId === record.id && hypothesisIds.has(edge.toId),
      );
    })
    .sort((left: any, right: any) => left.id.localeCompare(right.id));

  return {
    alternativeGroupId: groupId,
    hypotheses,
    evidenceRows: evidence.map((record: any) => ({
      evidenceId: record.id,
      evidenceType: record.type,
      cells: hypotheses.map((hypothesis: any) =>
        hypothesisCell(record.id, hypothesis, normalized),
      ),
    })),
  };
}

function incomingEdges(id: string, normalized: Record<string, any>): Record<string, any>[] {
  return normalized.edges.filter((edge: any) => edge.toId === id);
}

export function traceDependencies(id: unknown, reasoning: any, options: any = {}) {
  const { normalized, recordById, knownIds } = indexReasoning(reasoning, [
    ...idList(options.externalIds),
    ...idList(options.entityIds),
  ]);
  if (!knownIds.has(String(id)))
    return { rootId: id, records: [], externalIds: [], edges: [], missingIds: [id] };

  const visited = new Set<string>();
  const tracedRecords: Record<string, any>[] = [];
  const tracedExternalIds = new Set<string>();
  const tracedEdges: Record<string, any>[] = [];
  const missingIds = new Set<string>();

  function visit(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    const record = recordById.get(currentId);
    if (!record) {
      if (knownIds.has(currentId)) tracedExternalIds.add(currentId);
      else missingIds.add(currentId);
      return;
    }

    tracedRecords.push(record);
    const deps = dependencyIds(record);
    for (const depId of deps) visit(depId);
    for (const edge of incomingEdges(currentId, normalized)) {
      tracedEdges.push(edge);
      visit(edge.fromId);
    }
  }

  visit(String(id));
  return {
    rootId: id,
    records: tracedRecords,
    externalIds: [...tracedExternalIds].sort(),
    edges: tracedEdges.sort((a, b) => a.id.localeCompare(b.id)),
    missingIds: [...missingIds].sort(),
  };
}

export function summarizeSupport(id: string, reasoning: any) {
  const normalized = normalizeReasoning(reasoning);
  const relevant = incomingEdges(id, normalized);
  return {
    supports: relevant.filter((edge) => SUPPORT_PREDICATES.has(edge.predicate)),
    contradicts: relevant.filter((edge) => CONTRADICTION_PREDICATES.has(edge.predicate)),
    contextual: relevant.filter(
      (edge) =>
        !SUPPORT_PREDICATES.has(edge.predicate) && !CONTRADICTION_PREDICATES.has(edge.predicate),
    ),
  };
}

export function collectAssertionCitations(id: string, reasoning: any) {
  const normalized = normalizeReasoning(reasoning);
  const assertion = normalized.assertions.find((record: any) => record.id === id);
  const linkedIds = new Set(assertion?.citationIds || []);
  const citations = normalized.citations.filter(
    (citation: any) => citation.assertionId === id || linkedIds.has(citation.id),
  );
  return {
    supports: citations.filter((citation: any) => citation.relation === "supports"),
    contradicts: citations.filter((citation: any) =>
      ["contradicts", "impeaches"].includes(citation.relation),
    ),
    contextual: citations.filter((citation: any) =>
      ["contextualizes", "mentions"].includes(citation.relation),
    ),
  };
}

function detectCycles(records: Record<string, any>[], normalized: Record<string, any>): string[][] {
  const internal = new Set(records.map((record) => record.id));
  const graph = new Map(records.map((record) => [record.id, [] as string[]]));
  for (const record of records) {
    graph.get(record.id)!.push(...dependencyIds(record).filter((id) => internal.has(id)));
  }
  for (const edge of normalized.edges) {
    if (edge.predicate === "opposes") continue;
    if (internal.has(edge.fromId) && internal.has(edge.toId))
      graph.get(edge.toId)!.push(edge.fromId);
  }

  const active = new Set<string>();
  const complete = new Set<string>();
  const cycles: string[][] = [];

  function walk(id: string, path: string[]) {
    if (active.has(id)) {
      const start = path.indexOf(id);
      cycles.push([...path.slice(start), id]);
      return;
    }
    if (complete.has(id)) return;
    active.add(id);
    path.push(id);
    for (const dep of graph.get(id) || []) walk(dep, path);
    path.pop();
    active.delete(id);
    complete.add(id);
  }

  for (const id of graph.keys()) walk(id, []);
  return cycles;
}

interface ValidationFinding {
  severity: string;
  code: string;
  recordId: string;
  message: string;
}

export function validateReasoning(reasoning: any, options: any = {}): ValidationFinding[] {
  const { normalized, records, recordById, knownIds } = indexReasoning(
    reasoning,
    [...idList(options.externalIds), ...idList(options.entityIds)],
  );
  const findings: ValidationFinding[] = [];

  const add = (severity: string, code: string, recordId: string | undefined, message: string) =>
    findings.push({ severity, code, recordId: recordId || "", message });

  for (const record of records) {
    for (const depId of dependencyIds(record)) {
      if (!knownIds.has(depId))
        add("error", "broken-reference", record.id, `Reference ${depId} does not resolve.`);
    }

    if (record.type === "citation") {
      const assertion = recordById.get(record.assertionId);
      if (!record.assertionId) {
        add(
          "error",
          "citation-assertion-missing",
          record.id,
          "Citation does not identify an assertion.",
        );
      } else if (!assertion) {
        add(
          "error",
          "citation-assertion-broken",
          record.id,
          `Citation assertion ${record.assertionId} does not resolve.`,
        );
      } else if (assertion.type !== "assertion") {
        add(
          "error",
          "citation-assertion-type",
          record.id,
          "Citation target is not a factual assertion.",
        );
      } else if (!assertion.citationIds.includes(record.id)) {
        add(
          "warning",
          "citation-backlink-missing",
          record.id,
          "Assertion does not include this citation in citationIds.",
        );
      }
      if (!record.evidenceId)
        add(
          "error",
          "citation-evidence-missing",
          record.id,
          "Citation does not identify evidence.",
        );
      if (!record.locator)
        add(
          "warning",
          "citation-locator-missing",
          record.id,
          "Citation has no valid pinpoint locator.",
        );
    }
    if (record.type === "assertion") {
      for (const citationId of record.citationIds) {
        const citation = recordById.get(citationId);
        if (citation && citation.type !== "citation") {
          add(
            "error",
            "assertion-citation-type",
            record.id,
            `Reference ${citationId} is not a citation.`,
          );
        } else if (citation?.assertionId && citation.assertionId !== record.id) {
          add(
            "error",
            "citation-assertion-mismatch",
            record.id,
            `Citation ${citationId} points to assertion ${citation.assertionId}.`,
          );
        }
      }
    }

    if (record.type === "assumption") {
      if (record.basisIds.length === 0 && record.inputIds.length === 0) {
        add(
          "warning",
          "assumption-basis-missing",
          record.id,
          "Assumption has no linked basis, evidence, or input record.",
        );
      }
      if (
        ["challenged", "rejected"].includes(record.status) &&
        !record.rationale &&
        !record.limitations
      ) {
        add(
          "warning",
          "assumption-challenge-rationale-missing",
          record.id,
          "Challenged or rejected assumptions should record rationale or limitations.",
        );
      }
    }
    if (record.type === "question") {
      if (record.status === "answered" && record.answerAssertionIds.length === 0) {
        add(
          "warning",
          "answered-question-without-assertion",
          record.id,
          "Answered question has no linked answer assertion.",
        );
      }
      if (record.status === "deferred" && !record.rationale) {
        add(
          "warning",
          "deferred-question-rationale-missing",
          record.id,
          "Deferred question should record why it is not currently pursued.",
        );
      }
    }
    if (record.type === "lineOfEnquiry") {
      if (
        ["deferred", "not-pursued"].includes(record.status) &&
        !record.rationale
      ) {
        add(
          "error",
          "enquiry-rationale-required",
          record.id,
          "Deferred or not-pursued line of enquiry requires a recorded rationale.",
        );
      }
      if (record.status === "completed" && record.resultIds.length === 0) {
        add(
          "warning",
          "completed-enquiry-result-missing",
          record.id,
          "Completed line of enquiry has no linked result, observation, or assertion.",
        );
      }
      if (
        ["discriminate", "falsify"].includes(record.testType) &&
        record.hypothesisIds.length === 0 &&
        record.propositionIds?.length === 0
      ) {
        add(
          "warning",
          "enquiry-alternative-target-missing",
          record.id,
          "Discriminating or falsification enquiry should identify the hypothesis or proposition it tests.",
        );
      }
    }
    if (record.type === "indicator") {
      if (
        ["observed", "absent"].includes(record.state) &&
        record.observationIds.length === 0
      ) {
        add(
          "warning",
          "indicator-observation-missing",
          record.id,
          "Observed or absent indicator should link the observation establishing that state.",
        );
      }
    }
    if (record.type === "informationReview") {
      if (record.targetIds.length === 0) {
        add(
          "error",
          "information-review-target-missing",
          record.id,
          "Information-quality review requires at least one target source, evidence, observation, or assertion.",
        );
      }
      if (
        ["conflicted", "limited"].includes(record.finding) &&
        !record.rationale &&
        !record.limitations
      ) {
        add(
          "warning",
          "information-review-limitation-missing",
          record.id,
          "Conflicted or limited information should record the reason or limitation.",
        );
      }
    }

    if (
      record.type === "hypothesis" &&
      [
        ...idList(record.observationIds),
        ...idList(record.assertionIds),
        ...idList(record.sourceIds),
        ...idList(record.inputIds),
      ].length === 0 &&
      incomingEdges(record.id, normalized).length === 0
    ) {
      add(
        "warning",
        "unsupported-hypothesis",
        record.id,
        "Hypothesis has no linked observations, assertions, sources, inputs, or analytical support edges.",
      );
    }
    if (record.type === "hypothesis" && record.hypothesisKind === "identity") {
      if (!record.unknownEntityId) {
        add(
          "error",
          "identity-unknown-missing",
          record.id,
          "Identity hypothesis must identify the unresolved entity being tested.",
        );
      }
      if (!record.alternativeGroupId) {
        add(
          "error",
          "identity-alternative-group-missing",
          record.id,
          "Identity hypothesis must belong to an alternative group.",
        );
      }
      if (record.candidateScope === "none-known") {
        if (record.candidateEntityId) {
          add(
            "error",
            "identity-none-known-has-candidate",
            record.id,
            "A none-known alternative must not identify a candidate entity.",
          );
        }
      } else if (!record.candidateEntityId) {
        add(
          "error",
          "identity-candidate-missing",
          record.id,
          "Identity hypothesis must identify a candidate entity or use candidateScope none-known.",
        );
      }
      if (
        record.unknownEntityId &&
        record.candidateEntityId &&
        record.unknownEntityId === record.candidateEntityId
      ) {
        add(
          "error",
          "identity-self-candidate",
          record.id,
          "An unresolved entity cannot be its own candidate identity hypothesis.",
        );
      }
    }
    if (
      record.type === "analysis" &&
      record.mode === "evaluative" &&
      record.propositionIds.length < 2
    ) {
      add(
        "warning",
        "evaluative-alternatives-required",
        record.id,
        "Evaluative analysis should identify at least two alternative propositions.",
      );
    }
    if (record.type === "claim" && dependencyIds(record).length === 0) {
      add(
        "warning",
        "unsupported-claim",
        record.id,
        "Claim has no linked factual, analytical, rule, or source support.",
      );
    }
    if (record.type === "thesis" && record.claimIds.length === 0) {
      add("warning", "unsupported-thesis", record.id, "Thesis has no linked claims.");
    }
    if (record.type === "legalIssue" && record.ruleIds.length === 0) {
      add(
        "warning",
        "legal-rule-gap",
        record.id,
        "Legal issue has no linked rule or authority-derived rule.",
      );
    }
  }

  const identityGroups = new Map<string, Record<string, any>[]>();
  for (const hypothesis of normalized.hypotheses) {
    if (hypothesis.hypothesisKind !== "identity" || !hypothesis.alternativeGroupId) continue;
    const group = identityGroups.get(hypothesis.alternativeGroupId) ?? [];
    group.push(hypothesis);
    identityGroups.set(hypothesis.alternativeGroupId, group);
  }
  for (const [groupId, hypotheses] of identityGroups) {
    const unknownIds = new Set(
      hypotheses.map((hypothesis) => hypothesis.unknownEntityId).filter(Boolean),
    );
    if (unknownIds.size > 1) {
      add(
        "error",
        "identity-group-mixed-unknowns",
        groupId,
        "Identity alternative group mixes hypotheses about different unresolved entities.",
      );
    }
    if (hypotheses.length < 2) {
      add(
        "warning",
        "identity-alternatives-required",
        groupId,
        "Identity analysis should retain at least two competing alternatives.",
      );
    }
    if (!hypotheses.some((hypothesis) => hypothesis.candidateScope === "none-known")) {
      add(
        "warning",
        "identity-open-world-alternative-missing",
        groupId,
        "Identity analysis has no explicit none-of-the-known-candidates alternative.",
      );
    }
  }

  for (const edge of normalized.edges) {
    if (!knownIds.has(edge.fromId))
      add("error", "broken-edge-source", edge.id, `Edge source ${edge.fromId} does not resolve.`);
    if (!knownIds.has(edge.toId))
      add("error", "broken-edge-target", edge.id, `Edge target ${edge.toId} does not resolve.`);
    if (edge.fromId === edge.toId)
      add("error", "self-edge", edge.id, "Analytical edge cannot point to itself.");
  }

  for (const cycle of detectCycles(records, normalized)) {
    add(
      "error",
      "provenance-cycle",
      cycle[0],
      `Analytical dependency cycle detected: ${cycle.join(" -> ")}`,
    );
  }

  return findings.sort(
    (a, b) =>
      a.severity.localeCompare(b.severity) ||
      a.recordId.localeCompare(b.recordId) ||
      a.code.localeCompare(b.code),
  );
}

export function methodologyReview(reasoning: any, options: any = {}) {
  const normalized = normalizeReasoning(reasoning);
  const findings = validateReasoning(reasoning, options);
  const alternativeGroups = new Map<string, Record<string, any>[]>();

  for (const hypothesis of normalized.hypotheses) {
    if (!hypothesis.alternativeGroupId) continue;
    const group = alternativeGroups.get(hypothesis.alternativeGroupId) ?? [];
    group.push(hypothesis);
    alternativeGroups.set(hypothesis.alternativeGroupId, group);
  }

  const disconfirmingCoverage = [...alternativeGroups.entries()].map(
    ([alternativeGroupId, hypotheses]) => {
      const hypothesisIds = new Set(hypotheses.map((hypothesis) => hypothesis.id));
      const enquiries = normalized.linesOfEnquiry.filter(
        (enquiry: any) =>
          ["discriminate", "falsify"].includes(enquiry.testType) &&
          enquiry.hypothesisIds.some((id: string) => hypothesisIds.has(id)),
      );
      return {
        alternativeGroupId,
        hypothesisIds: [...hypothesisIds].sort(),
        enquiryIds: enquiries.map((enquiry: any) => enquiry.id).sort(),
        hasDisconfirmingTest: enquiries.length > 0,
      };
    },
  );

  return {
    openQuestionIds: normalized.questions
      .filter((record: any) => record.status === "open")
      .map((record: any) => record.id)
      .sort(),
    assumptionIdsNeedingReview: normalized.assumptions
      .filter((record: any) => ["open", "challenged"].includes(record.status))
      .map((record: any) => record.id)
      .sort(),
    activeEnquiryIds: normalized.linesOfEnquiry
      .filter((record: any) => ["proposed", "active"].includes(record.status))
      .map((record: any) => record.id)
      .sort(),
    deferredEnquiryIds: normalized.linesOfEnquiry
      .filter((record: any) => ["deferred", "not-pursued"].includes(record.status))
      .map((record: any) => record.id)
      .sort(),
    unresolvedInformationReviewIds: normalized.informationReviews
      .filter((record: any) => ["conflicted", "limited", "unknown"].includes(record.finding))
      .map((record: any) => record.id)
      .sort(),
    unknownIndicatorIds: normalized.indicators
      .filter((record: any) => record.state === "unknown")
      .map((record: any) => record.id)
      .sort(),
    alternativeGroupsWithoutDisconfirmingTest: disconfirmingCoverage
      .filter((entry) => !entry.hasDisconfirmingTest)
      .map((entry) => entry.alternativeGroupId)
      .sort(),
    disconfirmingCoverage,
    validationFindings: findings,
  };
}

export function orderedRecords(reasoning: any): Record<string, any>[] {
  const normalized = normalizeReasoning(reasoning);
  const records = recordsOf(normalized);
  const rank = new Map(STAGE_ORDER.map((type, index) => [type, index]));
  const recordById = new Map(records.map((record) => [record.id, record]));
  const outgoing = new Map(records.map((record) => [record.id, new Set<string>()]));
  const indegree = new Map(records.map((record) => [record.id, 0]));

  const compare = (a: Record<string, any>, b: Record<string, any>) =>
    (rank.get(a.type) ?? 999) - (rank.get(b.type) ?? 999) || a.id.localeCompare(b.id);

  function link(prerequisiteId: string, dependentId: string) {
    if (
      prerequisiteId === dependentId ||
      !recordById.has(prerequisiteId) ||
      !recordById.has(dependentId)
    )
      return;
    const dependents = outgoing.get(prerequisiteId);
    if (dependents!.has(dependentId)) return;
    dependents!.add(dependentId);
    indegree.set(dependentId, indegree.get(dependentId)! + 1);
  }

  for (const record of records) {
    for (const dependencyId of dependencyIds(record)) link(dependencyId, record.id);
  }

  for (const edge of normalized.edges) {
    if (edge.predicate === "opposes") continue;
    if (edge.predicate === "supersedes") {
      link(edge.toId, edge.fromId);
    } else {
      link(edge.fromId, edge.toId);
    }
  }

  const ready = records.filter((record) => indegree.get(record.id) === 0).sort(compare);
  const ordered: Record<string, any>[] = [];

  while (ready.length) {
    const record = ready.shift()!;
    ordered.push(record);
    const dependents = [...outgoing.get(record.id)!].map((id) => recordById.get(id)!).sort(compare);
    for (const dependent of dependents) {
      const next = indegree.get(dependent.id)! - 1;
      indegree.set(dependent.id, next);
      if (next === 0) {
        ready.push(dependent);
        ready.sort(compare);
      }
    }
  }

  if (ordered.length !== records.length) {
    const emitted = new Set(ordered.map((record) => record.id));
    ordered.push(...records.filter((record) => !emitted.has(record.id)).sort(compare));
  }

  return ordered;
}

const TimelineCaseReasoningObj = {
  STAGE_ORDER,
  COLLECTION_TYPES,
  EDGE_PREDICATES,
  CITATION_RELATIONS,
  CITATION_LOCATOR_TYPES,
  HYPOTHESIS_KINDS,
  IDENTITY_CANDIDATE_SCOPES,
  ASSUMPTION_STATUSES,
  QUESTION_STATUSES,
  ENQUIRY_STATUSES,
  ENQUIRY_TEST_TYPES,
  INDICATOR_STATES,
  INFORMATION_FINDINGS,
  ANALYTIC_METHODS,
  STANDARDS_BASELINE,
  normalizeCitationLocator,
  normalizeRecord,
  normalizeEdge,
  normalizeReasoning,
  recordsOf,
  dependencyIds,
  traceDependencies,
  summarizeSupport,
  collectAssertionCitations,
  competingHypothesisMatrix,
  methodologyReview,
  analyticMethod,
  validateReasoning,
  orderedRecords,
} as const;

export const TimelineCaseReasoning = Object.freeze(TimelineCaseReasoningObj);
