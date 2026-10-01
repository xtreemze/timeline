export type InvestigativeAssessment = "consistent" | "contradicts" | "unknown";

export interface InvestigativeEntity {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly alternateNames?: readonly string[];
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly sourceIds?: readonly string[];
}

export interface InvestigativeQualifierInput {
  readonly id: string;
  readonly section: string;
  readonly text: string;
}

export type InvestigativeInterpretation =
  | Readonly<{
      id: string;
      kind: "entity";
      label: string;
      entityId: string;
    }>
  | Readonly<{
      id: string;
      kind: "entity-type";
      label: string;
      value: string;
    }>
  | Readonly<{
      id: string;
      kind: "entity-property";
      label: string;
      property: string;
      value: string;
    }>
  | Readonly<{
      id: string;
      kind: "literal";
      label: string;
      text: string;
    }>;

export interface InvestigativeInterpretationContext {
  readonly entities: readonly InvestigativeEntity[];
}

export interface ProjectedInvestigativeQualifier {
  readonly id: string;
  readonly interpretation: InvestigativeInterpretation;
}

export interface InvestigativeEvidenceAssessment {
  readonly candidateEntityId: string;
  readonly qualifierId: string;
  readonly assessment: InvestigativeAssessment;
  readonly reason: string;
  readonly recordIds?: readonly string[];
}

export interface InvestigativeCandidateCell {
  readonly qualifierId: string;
  readonly assessment: InvestigativeAssessment;
  readonly reason: string;
  readonly recordIds: readonly string[];
}

export interface InvestigativeCandidateRow {
  readonly candidateEntityId: string | null;
  readonly candidateScope: "entity" | "none-known";
  readonly label: string;
  readonly cells: readonly InvestigativeCandidateCell[];
}

export interface InvestigativeCandidateMatrix {
  readonly qualifiers: readonly ProjectedInvestigativeQualifier[];
  readonly candidates: readonly InvestigativeCandidateRow[];
  readonly totalKnownCandidates: number;
  readonly visibleKnownCandidates: number;
  readonly hasMoreKnownCandidates: boolean;
}

export interface InvestigativeCandidateProjectionInput {
  readonly entities: readonly InvestigativeEntity[];
  readonly qualifiers: readonly ProjectedInvestigativeQualifier[];
  readonly evidenceAssessments?: readonly InvestigativeEvidenceAssessment[];
  readonly filterText?: string;
  readonly limit?: number;
}

const HUMAN_DESCRIPTOR_TYPE = new Map([
  ["man", "person"],
  ["male", "person"],
  ["woman", "person"],
  ["female", "person"],
]);

const SEMANTIC_EQUIVALENCE = new Map<string, readonly string[]>([
  ["man", Object.freeze(["man", "male"])],
  ["male", Object.freeze(["man", "male"])],
  ["woman", Object.freeze(["woman", "female"])],
  ["female", Object.freeze(["woman", "female"])],
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: unknown): string {
  return text(value)
    .toLocaleLowerCase()
    .replace(/^@/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function semanticVariants(value: unknown): ReadonlySet<string> {
  const key = normalized(value);
  const equivalents = SEMANTIC_EQUIVALENCE.get(key) ?? [key];
  return new Set(equivalents.map(normalized).filter(Boolean));
}

function semanticallyEqual(left: unknown, right: unknown): boolean {
  const leftValues = semanticVariants(left);
  const rightValues = semanticVariants(right);
  for (const value of leftValues) {
    if (rightValues.has(value)) return true;
  }
  return false;
}

function stableEntityId(entity: InvestigativeEntity): string {
  return text(entity.id);
}

function stableEntityName(entity: InvestigativeEntity): string {
  return text(entity.name) || stableEntityId(entity);
}

function entityNames(entity: InvestigativeEntity): readonly string[] {
  return Object.freeze([
    stableEntityName(entity),
    ...(entity.alternateNames ?? []).map(text).filter(Boolean),
  ]);
}

function exactEntityMatches(
  query: string,
  entities: readonly InvestigativeEntity[],
): InvestigativeEntity[] {
  const raw = text(query);
  const explicitId = raw.startsWith("@") ? raw.slice(1) : "";
  const queryKey = normalized(raw);
  return [...entities]
    .filter((entity) => {
      if (explicitId) return stableEntityId(entity) === explicitId;
      return entityNames(entity).some((name) => normalized(name) === queryKey);
    })
    .sort(
      (left, right) =>
        stableEntityName(left).localeCompare(stableEntityName(right)) ||
        stableEntityId(left).localeCompare(stableEntityId(right)),
    );
}

function projectPropertyInterpretations(
  clue: string,
  entities: readonly InvestigativeEntity[],
): InvestigativeInterpretation[] {
  const candidates = new Map<string, InvestigativeInterpretation>();
  for (const entity of entities) {
    for (const [property, rawValue] of Object.entries(entity.attributes ?? {})) {
      const value = text(rawValue);
      if (!value || !semanticallyEqual(clue, value)) continue;
      const id = `property:${property}:${normalized(value)}`;
      if (candidates.has(id)) continue;
      candidates.set(
        id,
        Object.freeze({
          id,
          kind: "entity-property" as const,
          label: `${property} = ${value}`,
          property,
          value,
        }),
      );
    }
  }
  return [...candidates.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function interpretInvestigativeQualifier(
  qualifier: InvestigativeQualifierInput,
  context: InvestigativeInterpretationContext,
): readonly InvestigativeInterpretation[] {
  const clue = text(qualifier.text).replace(/^@(?=\s*$)/, "");
  if (!clue) return Object.freeze([]);

  const interpretations: InvestigativeInterpretation[] = [];
  for (const entity of exactEntityMatches(clue, context.entities)) {
    interpretations.push(
      Object.freeze({
        id: `entity:${stableEntityId(entity)}`,
        kind: "entity",
        label: stableEntityName(entity),
        entityId: stableEntityId(entity),
      }),
    );
  }

  interpretations.push(...projectPropertyInterpretations(clue, context.entities));

  const descriptorType = HUMAN_DESCRIPTOR_TYPE.get(normalized(clue));
  if (
    descriptorType &&
    context.entities.some((entity) => normalized(entity.type) === descriptorType)
  ) {
    interpretations.push(
      Object.freeze({
        id: `type:${descriptorType}`,
        kind: "entity-type",
        label: `type = ${descriptorType}`,
        value: descriptorType,
      }),
    );
  } else {
    const typeMatch = [
      ...new Set(context.entities.map((entity) => text(entity.type)).filter(Boolean)),
    ].find((type) => normalized(type) === normalized(clue));
    if (typeMatch) {
      interpretations.push(
        Object.freeze({
          id: `type:${normalized(typeMatch)}`,
          kind: "entity-type",
          label: `type = ${typeMatch}`,
          value: typeMatch,
        }),
      );
    }
  }

  interpretations.push(
    Object.freeze({
      id: `literal:${normalized(clue) || "clue"}`,
      kind: "literal",
      label: `descriptor “${clue}”`,
      text: clue,
    }),
  );

  const seen = new Set<string>();
  return Object.freeze(
    interpretations.filter((interpretation) => {
      if (seen.has(interpretation.id)) return false;
      seen.add(interpretation.id);
      return true;
    }),
  );
}

function sourceRecordIds(entity: InvestigativeEntity): readonly string[] {
  return Object.freeze(
    [...new Set((entity.sourceIds ?? []).map(text).filter(Boolean))].sort(),
  );
}

function scalarAttributeValue(
  entity: InvestigativeEntity,
  property: string,
): string | null {
  const value = entity.attributes?.[property];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function inferredCell(
  entity: InvestigativeEntity,
  qualifier: ProjectedInvestigativeQualifier,
): InvestigativeCandidateCell {
  const interpretation = qualifier.interpretation;

  if (interpretation.kind === "entity") {
    return Object.freeze({
      qualifierId: qualifier.id,
      assessment: stableEntityId(entity) === interpretation.entityId ? "consistent" : "unknown",
      reason:
        stableEntityId(entity) === interpretation.entityId
          ? `Candidate identity matches ${interpretation.label}.`
          : "The identity clue does not by itself exclude other candidates.",
      recordIds: sourceRecordIds(entity),
    });
  }

  if (interpretation.kind === "entity-type") {
    const candidateType = text(entity.type);
    if (!candidateType) {
      return Object.freeze({
        qualifierId: qualifier.id,
        assessment: "unknown",
        reason: "Candidate type is not recorded.",
        recordIds: sourceRecordIds(entity),
      });
    }
    const consistent = semanticallyEqual(candidateType, interpretation.value);
    return Object.freeze({
      qualifierId: qualifier.id,
      assessment: consistent ? "consistent" : "contradicts",
      reason: consistent
        ? `Candidate type is ${candidateType}.`
        : `Candidate type is ${candidateType}, not ${interpretation.value}.`,
      recordIds: sourceRecordIds(entity),
    });
  }

  if (interpretation.kind === "entity-property") {
    const value = scalarAttributeValue(entity, interpretation.property);
    if (value === null) {
      return Object.freeze({
        qualifierId: qualifier.id,
        assessment: "unknown",
        reason: `Candidate has no recorded ${interpretation.property} value.`,
        recordIds: sourceRecordIds(entity),
      });
    }
    const consistent = semanticallyEqual(value, interpretation.value);
    return Object.freeze({
      qualifierId: qualifier.id,
      assessment: consistent ? "consistent" : "contradicts",
      reason: consistent
        ? `${interpretation.property} is recorded as ${value}.`
        : `${interpretation.property} is recorded as ${value}, not ${interpretation.value}.`,
      recordIds: sourceRecordIds(entity),
    });
  }

  const clue = normalized(interpretation.text);
  const matchingName = entityNames(entity).find((name) => normalized(name).includes(clue));
  return Object.freeze({
    qualifierId: qualifier.id,
    assessment: matchingName ? "consistent" : "unknown",
    reason: matchingName
      ? `Candidate name or alias “${matchingName}” matches the descriptor text.`
      : "No canonical property is available to test this free-text descriptor.",
    recordIds: sourceRecordIds(entity),
  });
}

function explicitCell(
  entityId: string,
  qualifierId: string,
  assessments: readonly InvestigativeEvidenceAssessment[],
): InvestigativeCandidateCell | null {
  const relevant = assessments.filter(
    (assessment) =>
      assessment.candidateEntityId === entityId && assessment.qualifierId === qualifierId,
  );
  if (!relevant.length) return null;

  const contradiction = relevant.find((assessment) => assessment.assessment === "contradicts");
  const consistent = relevant.find((assessment) => assessment.assessment === "consistent");
  const chosen = contradiction ?? consistent ?? relevant[0]!;
  const recordIds = [
    ...new Set(relevant.flatMap((assessment) => assessment.recordIds ?? [])),
  ].sort();

  return Object.freeze({
    qualifierId,
    assessment: chosen.assessment,
    reason: relevant
      .map((assessment) => assessment.reason)
      .filter(Boolean)
      .join(" "),
    recordIds: Object.freeze(recordIds),
  });
}

function candidateMatchesFilter(entity: InvestigativeEntity, filterText: string): boolean {
  const needle = normalized(filterText);
  if (!needle) return true;
  return [stableEntityId(entity), ...entityNames(entity)].some((value) =>
    normalized(value).includes(needle),
  );
}

function normalizedLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(500, Math.trunc(value)));
}

export function projectInvestigativeCandidateMatrix(
  input: InvestigativeCandidateProjectionInput,
): InvestigativeCandidateMatrix {
  const known = [...input.entities]
    .filter((entity) => candidateMatchesFilter(entity, input.filterText ?? ""))
    .sort(
      (left, right) =>
        stableEntityName(left).localeCompare(stableEntityName(right)) ||
        stableEntityId(left).localeCompare(stableEntityId(right)),
    );
  const totalKnownCandidates = known.length;
  const visible = known.slice(0, normalizedLimit(input.limit));
  const evidenceAssessments = input.evidenceAssessments ?? [];

  const rows: InvestigativeCandidateRow[] = visible.map((entity) =>
    Object.freeze({
      candidateEntityId: stableEntityId(entity),
      candidateScope: "entity" as const,
      label: stableEntityName(entity),
      cells: Object.freeze(
        input.qualifiers.map(
          (qualifier) =>
            explicitCell(stableEntityId(entity), qualifier.id, evidenceAssessments) ??
            inferredCell(entity, qualifier),
        ),
      ),
    }),
  );

  rows.push(
    Object.freeze({
      candidateEntityId: null,
      candidateScope: "none-known",
      label: "None of the currently known candidates",
      cells: Object.freeze(
        input.qualifiers.map((qualifier) =>
          Object.freeze({
            qualifierId: qualifier.id,
            assessment: "unknown" as const,
            reason: "Open-world alternative; the current project may not contain the identity.",
            recordIds: Object.freeze([]),
          }),
        ),
      ),
    }),
  );

  return Object.freeze({
    qualifiers: Object.freeze([...input.qualifiers]),
    candidates: Object.freeze(rows),
    totalKnownCandidates,
    visibleKnownCandidates: visible.length,
    hasMoreKnownCandidates: totalKnownCandidates > visible.length,
  });
}

function cleanId(value: string): string {
  return (
    normalized(value)
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || "record"
  );
}

function uniqueIds(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).map(text).filter(Boolean))];
}

export function buildObservationDraft(input: {
  readonly id: string;
  readonly text: string;
  readonly sourceIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly itemIds?: readonly string[];
  readonly relationshipIds?: readonly string[];
  readonly entityIds?: readonly string[];
  readonly placeIds?: readonly string[];
  readonly methodId?: string;
}) {
  return Object.freeze({
    id: text(input.id),
    text: text(input.text),
    sourceIds: Object.freeze(uniqueIds(input.sourceIds)),
    evidenceIds: Object.freeze(uniqueIds(input.evidenceIds)),
    itemIds: Object.freeze(uniqueIds(input.itemIds)),
    relationshipIds: Object.freeze(uniqueIds(input.relationshipIds)),
    entityIds: Object.freeze(uniqueIds(input.entityIds)),
    placeIds: Object.freeze(uniqueIds(input.placeIds)),
    methodId: text(input.methodId) || "composer-clue-promotion",
  });
}

export function buildAssertionDraft(input: {
  readonly id: string;
  readonly text: string;
  readonly sourceIds?: readonly string[];
  readonly inputIds?: readonly string[];
  readonly itemIds?: readonly string[];
  readonly citationIds?: readonly string[];
}) {
  return Object.freeze({
    id: text(input.id),
    text: text(input.text),
    sourceIds: Object.freeze(uniqueIds(input.sourceIds)),
    inputIds: Object.freeze(uniqueIds(input.inputIds)),
    itemIds: Object.freeze(uniqueIds(input.itemIds)),
    citationIds: Object.freeze(uniqueIds(input.citationIds)),
  });
}

export function buildQuestionDraft(input: {
  readonly id: string;
  readonly text: string;
  readonly hypothesisIds?: readonly string[];
  readonly propositionIds?: readonly string[];
}) {
  return Object.freeze({
    id: text(input.id),
    text: text(input.text),
    status: "open",
    hypothesisIds: Object.freeze(uniqueIds(input.hypothesisIds)),
    propositionIds: Object.freeze(uniqueIds(input.propositionIds)),
  });
}

export function buildIdentityHypothesisDrafts(input: {
  readonly unknownEntityId: string;
  readonly candidates: readonly Readonly<{ entityId: string; label: string }>[];
  readonly alternativeGroupId?: string;
}) {
  const unknownEntityId = text(input.unknownEntityId);
  const alternativeGroupId =
    text(input.alternativeGroupId) || `${cleanId(unknownEntityId)}-identity`;
  const candidates = input.candidates
    .map((candidate) => ({
      entityId: text(candidate.entityId),
      label: text(candidate.label) || text(candidate.entityId),
    }))
    .filter((candidate) => candidate.entityId);

  return Object.freeze([
    ...candidates.map((candidate) =>
      Object.freeze({
        id: `hyp-${cleanId(unknownEntityId)}-${cleanId(candidate.entityId)}`,
        text: `The unidentified entity ${unknownEntityId} was ${candidate.label}.`,
        hypothesisKind: "identity",
        unknownEntityId,
        candidateEntityId: candidate.entityId,
        alternativeGroupId,
        assessment: "open",
      }),
    ),
    Object.freeze({
      id: `hyp-${cleanId(unknownEntityId)}-none-known`,
      text: `The unidentified entity ${unknownEntityId} was none of the currently known candidates.`,
      hypothesisKind: "identity",
      unknownEntityId,
      candidateScope: "none-known",
      alternativeGroupId,
      assessment: "open",
    }),
  ]);
}

export function buildAssumptionDraft(input: {
  readonly id: string;
  readonly text: string;
  readonly hypothesisIds?: readonly string[];
  readonly propositionIds?: readonly string[];
  readonly basisIds?: readonly string[];
  readonly rationale?: string;
}) {
  return Object.freeze({
    id: text(input.id),
    text: text(input.text),
    status: "open",
    hypothesisIds: Object.freeze(uniqueIds(input.hypothesisIds)),
    propositionIds: Object.freeze(uniqueIds(input.propositionIds)),
    basisIds: Object.freeze(uniqueIds(input.basisIds)),
    rationale: text(input.rationale),
  });
}

export function buildLineOfEnquiryDraft(input: {
  readonly id: string;
  readonly text: string;
  readonly questionIds?: readonly string[];
  readonly hypothesisIds?: readonly string[];
  readonly propositionIds?: readonly string[];
  readonly targetIds?: readonly string[];
  readonly testType?: "discover" | "discriminate" | "corroborate" | "falsify";
  readonly expectedDiscriminator?: string;
}) {
  return Object.freeze({
    id: text(input.id),
    text: text(input.text),
    status: "proposed",
    testType: input.testType ?? "discover",
    questionIds: Object.freeze(uniqueIds(input.questionIds)),
    hypothesisIds: Object.freeze(uniqueIds(input.hypothesisIds)),
    propositionIds: Object.freeze(uniqueIds(input.propositionIds)),
    targetIds: Object.freeze(uniqueIds(input.targetIds)),
    expectedDiscriminator: text(input.expectedDiscriminator),
  });
}

export function buildDisconfirmationEnquiryDraft(input: {
  readonly id: string;
  readonly text: string;
  readonly questionIds?: readonly string[];
  readonly hypothesisIds?: readonly string[];
  readonly propositionIds?: readonly string[];
  readonly targetIds?: readonly string[];
  readonly expectedDiscriminator?: string;
}) {
  return buildLineOfEnquiryDraft({
    ...input,
    testType: "falsify",
  });
}

export function buildInformationReviewDraft(input: {
  readonly id: string;
  readonly text: string;
  readonly targetIds: readonly string[];
  readonly finding?: "corroborated" | "uncorroborated" | "conflicted" | "limited" | "unknown";
  readonly limitations?: string;
}) {
  return Object.freeze({
    id: text(input.id),
    text: text(input.text),
    finding: input.finding ?? "unknown",
    targetIds: Object.freeze(uniqueIds(input.targetIds)),
    methodId: "quality-of-information-check",
    limitations: text(input.limitations),
  });
}
