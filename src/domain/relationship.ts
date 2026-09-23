import type { CanonicalEntity, ValidationResult } from "./entity.ts";
import type { EntityId, PlaceId, RelationshipId, SourceId, TimelineId } from "./ids.ts";

export interface CanonicalTemporalExtent {
  readonly type: "instant" | "interval";
  readonly start: Readonly<Record<string, unknown>> | null;
  readonly end?: Readonly<Record<string, unknown>> | null;
  readonly openStart?: boolean;
  readonly openEnd?: boolean;
}

export interface CanonicalRelationship {
  readonly id: RelationshipId;
  readonly subjectId: EntityId;
  readonly objectId: EntityId;
  readonly predicate: string;
  readonly role?: string;
  readonly placeId?: PlaceId;
  readonly itemIds: readonly TimelineId<"occurrence">[];
  readonly sourceIds: readonly SourceId[];
  readonly confidence: number | null;
  readonly time: CanonicalTemporalExtent | null;
  readonly attributes: Readonly<Record<string, unknown>>;
}

const GENERIC_RELATION_KEYS = new Set([
  "relatedto",
  "relationto",
  "associatedwith",
  "associationwith",
  "connectedto",
  "linkedto",
  "linksto",
  "involvedin",
  "involves",
  "participatesin",
  "participatedin",
  "participantof",
  "tookpartin",
  "partof",
  "memberof",
  "belongsto",
  "haspart",
  "contains",
  "includes",
  "features",
  "presentat",
  "locatedat",
  "occursat",
  "is",
  "was",
  "were",
  "has",
]);

const ACTION_PREDICATE_PARTICLES = new Set([
  "for",
  "with",
  "to",
  "over",
  "under",
  "through",
  "across",
  "up",
  "down",
  "out",
  "off",
  "away",
  "back",
  "forth",
  "against",
  "around",
]);

function semanticKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function predicateTerms(value: string): string[] {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

export function validateActionPredicate(value: string): ValidationResult {
  const predicate = value.trim().slice(0, 120);
  if (!predicate) {
    return { valid: false, message: "A specific action verb is required for every relationship." };
  }

  const key = semanticKey(predicate);
  if (!key || GENERIC_RELATION_KEYS.has(key)) {
    return {
      valid: false,
      message: `"${predicate}" is a generic association rather than a concrete action.`,
    };
  }

  if (
    /^(?:related|associated|connected|linked|involved|participat|member|belong|partof|protagonist|presentat|locatedat|occursat)/.test(
      key,
    )
  ) {
    return {
      valid: false,
      message: `"${predicate}" is too general. Name the concrete action performed by the source toward the target.`,
    };
  }

  if (
    /\b(?:at|near|during|on\s+\d{4}|in\s+\d{4})\b/i.test(predicate) ||
    /(?:At|Near|During|Via|Along|Toward|From|Into|Onto|In)$/.test(predicate) ||
    /\d{4}-\d{2}-\d{2}/.test(predicate)
  ) {
    return {
      valid: false,
      message: `"${predicate}" mixes action with place or time. Keep place and time as separate canonical fields.`,
    };
  }

  const terms = predicateTerms(predicate);
  if (
    terms.length > 2 ||
    (terms.length === 2 && !ACTION_PREDICATE_PARTICLES.has(terms[1]?.toLowerCase() ?? ""))
  ) {
    return {
      valid: false,
      message:
        "Canonical relationship predicates are one action verb, optionally followed by one grammatical particle.",
    };
  }

  return { valid: true, message: "" };
}

export function validateRelationship(
  relationship: Pick<CanonicalRelationship, "subjectId" | "objectId" | "predicate">,
  entities: readonly CanonicalEntity[],
): ValidationResult {
  if (relationship.subjectId === relationship.objectId) {
    return { valid: false, message: "A canonical relationship cannot target its source entity." };
  }

  const entityIds = new Set(entities.map((entity) => entity.id));
  if (!entityIds.has(relationship.subjectId) || !entityIds.has(relationship.objectId)) {
    return {
      valid: false,
      message: "Both relationship endpoints must reference existing canonical entities.",
    };
  }

  return validateActionPredicate(relationship.predicate);
}

function temporalFactKey(time: CanonicalTemporalExtent | null): string {
  if (!time) return "timeless";
  return JSON.stringify(time);
}

export function relationshipFactKey(
  relationship: Pick<CanonicalRelationship, "subjectId" | "objectId" | "predicate" | "time">,
): string {
  return JSON.stringify([
    relationship.subjectId,
    semanticKey(relationship.predicate),
    relationship.objectId,
    temporalFactKey(relationship.time),
  ]);
}
