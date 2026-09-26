import type { EntityId, SourceId } from "./ids.ts";

export type SemanticMappingRelation = "exact" | "broader" | "narrower" | "related";

export interface ExternalSemanticMapping {
  readonly scheme: string;
  readonly version?: string;
  readonly identifier: string;
  readonly relation: SemanticMappingRelation;
}

export interface CanonicalIdentifier {
  readonly scheme: string;
  readonly value: string;
  readonly issuer?: string;
  readonly sourceIds?: readonly SourceId[];
}

export type AppellationKind = "preferred" | "alias" | "legal" | "historical" | "other";

export interface CanonicalAppellation {
  readonly value: string;
  readonly kind?: AppellationKind;
  readonly languageTag?: string;
  readonly sourceIds?: readonly SourceId[];
}

export interface ActorParticipationContext {
  readonly roleType?: string;
  readonly representedEntityId?: EntityId;
  readonly organizationId?: EntityId;
  readonly authoritySourceIds?: readonly SourceId[];
  readonly externalMappings?: readonly ExternalSemanticMapping[];
}

const MAPPING_RELATIONS = new Set<SemanticMappingRelation>([
  "exact",
  "broader",
  "narrower",
  "related",
]);
const APPELLATION_KINDS = new Set<AppellationKind>([
  "preferred",
  "alias",
  "legal",
  "historical",
  "other",
]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && Boolean(value.trim());
}

function validateSourceIdList(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => !nonEmptyString(entry))) {
    return [`${label} must be an array of non-empty source identifiers.`];
  }
  return [];
}

export function validateExternalSemanticMappings(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return ["Semantic mappings must be an array."];

  const findings: string[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      findings.push(`Semantic mapping ${index + 1} must be an object.`);
      return;
    }
    if (!nonEmptyString(entry.scheme)) {
      findings.push(`Semantic mapping ${index + 1} requires a scheme.`);
    }
    if (!nonEmptyString(entry.identifier)) {
      findings.push(`Semantic mapping ${index + 1} requires an identifier.`);
    }
    if (!MAPPING_RELATIONS.has(entry.relation as SemanticMappingRelation)) {
      findings.push(
        `Semantic mapping ${index + 1} relation must be exact, broader, narrower, or related.`,
      );
    }
    if (entry.version !== undefined && !nonEmptyString(entry.version)) {
      findings.push(`Semantic mapping ${index + 1} version must be a non-empty string.`);
    }
  });
  return findings;
}

export function validateCanonicalIdentifiers(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return ["Entity identifiers must be an array."];

  const findings: string[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      findings.push(`Entity identifier ${index + 1} must be an object.`);
      return;
    }
    if (!nonEmptyString(entry.scheme)) {
      findings.push(`Entity identifier ${index + 1} requires a scheme.`);
    }
    if (!nonEmptyString(entry.value)) {
      findings.push(`Entity identifier ${index + 1} requires a value.`);
    }
    if (entry.issuer !== undefined && !nonEmptyString(entry.issuer)) {
      findings.push(`Entity identifier ${index + 1} issuer must be a non-empty string.`);
    }
    findings.push(...validateSourceIdList(entry.sourceIds, `Entity identifier ${index + 1} sourceIds`));
  });
  return findings;
}

export function validateCanonicalAppellations(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return ["Entity appellations must be an array."];

  const findings: string[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      findings.push(`Entity appellation ${index + 1} must be an object.`);
      return;
    }
    if (!nonEmptyString(entry.value)) {
      findings.push(`Entity appellation ${index + 1} requires a value.`);
    }
    if (
      entry.kind !== undefined &&
      !APPELLATION_KINDS.has(entry.kind as AppellationKind)
    ) {
      findings.push(
        `Entity appellation ${index + 1} kind must be preferred, alias, legal, historical, or other.`,
      );
    }
    if (entry.languageTag !== undefined && !nonEmptyString(entry.languageTag)) {
      findings.push(`Entity appellation ${index + 1} languageTag must be a non-empty string.`);
    }
    findings.push(...validateSourceIdList(entry.sourceIds, `Entity appellation ${index + 1} sourceIds`));
  });
  return findings;
}

export function validateActorParticipationContext(
  value: unknown,
  entityIds?: ReadonlySet<string>,
): string[] {
  if (value === undefined) return [];
  if (!isRecord(value)) return ["Actor participation context must be an object."];

  const findings: string[] = [];
  for (const [field, label] of [
    ["roleType", "roleType"],
    ["representedEntityId", "representedEntityId"],
    ["organizationId", "organizationId"],
  ] as const) {
    if (value[field] !== undefined && !nonEmptyString(value[field])) {
      findings.push(`Actor participation ${label} must be a non-empty string.`);
    }
  }

  const representedEntityId =
    typeof value.representedEntityId === "string" ? value.representedEntityId.trim() : "";
  const organizationId =
    typeof value.organizationId === "string" ? value.organizationId.trim() : "";

  if (entityIds && representedEntityId && !entityIds.has(representedEntityId)) {
    findings.push(`Represented entity ${representedEntityId} does not resolve.`);
  }
  if (entityIds && organizationId && !entityIds.has(organizationId)) {
    findings.push(`Role organization ${organizationId} does not resolve.`);
  }

  findings.push(
    ...validateSourceIdList(value.authoritySourceIds, "Actor participation authoritySourceIds"),
  );
  findings.push(...validateExternalSemanticMappings(value.externalMappings));
  return findings;
}

export function participationFactIdentity(
  value: ActorParticipationContext | undefined,
): readonly [string, string | null, string | null] {
  return [
    value?.roleType?.trim().toLocaleLowerCase() ?? "",
    value?.representedEntityId ? String(value.representedEntityId) : null,
    value?.organizationId ? String(value.organizationId) : null,
  ];
}
