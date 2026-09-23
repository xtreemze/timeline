import type { EntityId, SourceId } from "./ids.ts";

export interface CanonicalEntity {
  readonly id: EntityId;
  readonly type: string;
  readonly name: string;
  readonly alternateNames: readonly string[];
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

const GENERIC_ENTITY_NODE_TYPES = new Set([
  "entity",
  "object",
  "thing",
  "item",
  "resource",
  "agent",
]);

const PROPERTY_KEY_PATTERN = /^[a-z][A-Za-z0-9]*$/;

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
}): ValidationResult {
  const name = entity.name?.trim().slice(0, 180) ?? "";
  const type = entity.type?.trim().slice(0, 60) ?? "";
  const typeKey = semanticKey(type);

  if (!name) return { valid: false, message: "An entity name is required." };
  if (!type) return { valid: false, message: "A specific entity type is required." };
  if (GENERIC_ENTITY_NODE_TYPES.has(typeKey)) {
    return {
      valid: false,
      message: `"${type}" is too generic for a canonical entity type. Use a domain type such as person, organization, dwelling, vehicle, garment, food, or buildingMaterial.`,
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
    const nonCanonicalKey = Object.keys(entity.attributes).find((key) => !PROPERTY_KEY_PATTERN.test(key));
    if (nonCanonicalKey) {
      return {
        valid: false,
        message: `Entity attribute "${nonCanonicalKey}" must use lowerCamelCase.`,
      };
    }
    const invalidKey = Object.keys(entity.attributes).find((key) =>
      ENTITY_CONTEXT_KEYS.has(semanticKey(key)),
    );
    if (invalidKey) {
      return {
        valid: false,
        message: `Entity attribute "${invalidKey}" is spatiotemporal context and does not belong on the entity.`,
      };
    }
  }

  return { valid: true, message: "" };
}
