import type { EntityId, SourceId } from "./ids.ts";
import type {
  CanonicalAppellation,
  CanonicalIdentifier,
  ExternalSemanticMapping,
} from "./semantics.ts";
import {
  validateCanonicalAppellations,
  validateCanonicalIdentifiers,
  validateExternalSemanticMappings,
} from "./semantics.ts";

export type EntityIdentityResolution = "identified" | "unresolved" | "disputed";

export interface CanonicalEntity {
  readonly id: EntityId;
  readonly type: string;
  readonly name: string;
  readonly alternateNames: readonly string[];
  readonly identityResolution?: EntityIdentityResolution;
  readonly identifiers?: readonly CanonicalIdentifier[];
  readonly appellations?: readonly CanonicalAppellation[];
  readonly semanticMappings?: readonly ExternalSemanticMapping[];
  readonly sourceIds: readonly SourceId[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly message: string;
}

const NON_ENTITY_NODE_TYPES = new Set([
  "action",
  "activity",
  "event",
  "occurrence",
  "process",
  "operation",
  "transaction",
  "interaction",
  "communication",
  "decision",
  "movement",
  "meeting",
  "visit",
  "place",
  "location",
  "date",
  "time",
  "period",
  "geometry",
  "coordinate",
]);

const ENTITY_CONTEXT_KEYS = new Set([
  "time",
  "date",
  "period",
  "start",
  "end",
  "location",
  "place",
  "placeid",
  "geometry",
  "coordinates",
  "latitude",
  "longitude",
  "radius",
  "radiusmeters",
]);

const ACTOR_ENTITY_TYPES = new Set([
  "person",
  "organization",
  "organisation",
  "group",
  "company",
  "corporation",
  "institution",
  "legalentity",
  "juridicalperson",
]);

const ACTOR_OCCURRENCE_KEYS = new Set([
  "birthplace",
  "birthdate",
  "dateofbirth",
  "deathplace",
  "deathdate",
  "dateofdeath",
  "school",
  "education",
  "workplace",
  "employer",
  "employment",
  "profession",
  "occupation",
  "community",
  "association",
  "membership",
  "residence",
  "citizenship",
  "nationality",
  "role",
  "office",
  "appointment",
  "representation",
  "representedentityid",
  "formationdate",
  "foundingdate",
  "dissolutiondate",
]);

const ACTION_NAME_PATTERN =
  /^(?:called|calls|met|meets|sent|sends|transferred|transfers|paid|pays|visited|visits|arrived|arrives|departed|departs|left|leaves|built|builds|created|creates|attacked|attacks|ordered|orders|warned|warns|approved|approves|authorized|authorizes|signed|signs|moved|moves|travelled|traveled|travels|fled|flees|married|marries|danced|dances|consulted|consults|poisoned|poisons|searched|searches|found|finds|lost|loses|gave|gives|took|takes|received|receives)\b/i;

function semanticKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function validateEntity(entity: {
  readonly name?: string;
  readonly type?: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly identityResolution?: unknown;
  readonly identifiers?: unknown;
  readonly appellations?: unknown;
  readonly semanticMappings?: unknown;
}): ValidationResult {
  const name = entity.name?.trim().slice(0, 180) ?? "";
  const type = entity.type?.trim().slice(0, 60) || "entity";
  const typeKey = semanticKey(type);

  if (!name) {
    return { valid: false, message: "An entity name is required." };
  }

  if (
    entity.identityResolution !== undefined &&
    !["identified", "unresolved", "disputed"].includes(String(entity.identityResolution))
  ) {
    return {
      valid: false,
      message: "Entity identityResolution must be identified, unresolved, or disputed.",
    };
  }

  if (NON_ENTITY_NODE_TYPES.has(typeKey)) {
    return {
      valid: false,
      message: `"${type}" is not an entity-node type. Actions belong to relationship predicates, time belongs to relationship.time, and place belongs to relationship.placeId.`,
    };
  }

  if (ACTION_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      message: `"${name}" reads like an action. Canonical entities name one durable entity only.`,
    };
  }

  if (entity.attributes) {
    const invalidKey = Object.keys(entity.attributes).find((key) =>
      ENTITY_CONTEXT_KEYS.has(semanticKey(key)),
    );
    if (invalidKey) {
      return {
        valid: false,
        message: `Entity attribute "${invalidKey}" is spatiotemporal context and does not belong on the entity.`,
      };
    }

    if (ACTOR_ENTITY_TYPES.has(typeKey)) {
      const occurrenceKey = Object.keys(entity.attributes).find((key) =>
        ACTOR_OCCURRENCE_KEYS.has(semanticKey(key)),
      );
      if (occurrenceKey) {
        return {
          valid: false,
          message: `Actor attribute "${occurrenceKey}" is historical or role context. Record it as an occurrence/assertion and derive profile summaries from that history.`,
        };
      }
    }
  }

  const semanticFindings = [
    ...validateCanonicalIdentifiers(entity.identifiers),
    ...validateCanonicalAppellations(entity.appellations),
    ...validateExternalSemanticMappings(entity.semanticMappings),
  ];
  if (semanticFindings.length > 0) {
    return { valid: false, message: semanticFindings[0] ?? "Entity semantic metadata is invalid." };
  }

  return { valid: true, message: "" };
}
