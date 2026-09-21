import type { EntityId, OccurrenceId, PlaceId, RelationshipId } from "./ids.ts";

export interface ValidationResult {
  readonly valid: boolean;
  readonly message: string;
}

export interface CanonicalEntity {
  readonly id: EntityId;
  readonly type: string;
  readonly name: string;
  readonly alternateNames: readonly string[];
  readonly identifiers: readonly Readonly<Record<string, unknown>>[];
  readonly sourceIds: readonly string[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface CanonicalRelationship {
  readonly id: RelationshipId;
  readonly subjectId: EntityId;
  readonly objectId: EntityId;
  readonly predicate: string;
  readonly role?: string;
  readonly placeId?: PlaceId;
  readonly itemIds: readonly OccurrenceId[];
  readonly initialState: "active" | "inactive";
  readonly time: unknown | null;
  readonly sourceIds: readonly string[];
  readonly confidence: number | null;
  readonly attributes: Readonly<Record<string, unknown>>;
}

const NON_ENTITY_NODE_TYPES = new Set([
  "action","activity","event","occurrence","process","operation","transaction","interaction",
  "communication","decision","movement","meeting","visit","place","location","date","time",
  "period","geometry","coordinate",
]);
const ENTITY_CONTEXT_KEYS = new Set([
  "time","date","period","start","end","location","place","placeid","geometry","coordinates",
  "latitude","longitude","radius","radiusmeters",
]);
const GENERIC_RELATION_KEYS = new Set([
  "relatedto","relationto","associatedwith","associationwith","connectedto","linkedto","linksto",
  "involvedin","involves","involvesobject","participatesin","participatedin","participantof",
  "tookpartin","partof","partofstory","memberof","belongsto","belongto","haspart","contains",
  "containsstory","includes","includesstory","features","protagonistof","presentat","locatedat",
  "occursat","is","was","were","has",
]);
const ACTION_PREDICATE_PARTICLES = new Set([
  "for","with","to","over","under","through","across","up","down","out","off","away","back",
  "forth","against","around",
]);
const ACTION_NAME_PATTERN =
  /^(?:called|calls|met|meets|sent|sends|transferred|transfers|paid|pays|visited|visits|arrived|arrives|departed|departs|left|leaves|built|builds|created|creates|attacked|attacks|ordered|orders|warned|warns|approved|approves|authorized|authorizes|signed|signs|moved|moves|travelled|traveled|travels|fled|flees|married|marries|danced|dances|consulted|consults|poisoned|poisons|searched|searches|found|finds|lost|loses|gave|gives|took|takes|received|receives)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function semanticKey(value: unknown): string {
  return text(value, 120).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}
function predicateTerms(value: string): string[] {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean);
}

export function validateEntityNode(value: unknown): ValidationResult {
  const raw = isRecord(value) ? value : {};
  const name = text(raw.name ?? raw.label ?? raw.title, 180);
  const type = text(raw.type, 60) || "entity";
  const typeKey = semanticKey(type);
  if (NON_ENTITY_NODE_TYPES.has(typeKey)) {
    return { valid: false, message: `“${type}” is not an entity-node type. A graph node represents one entity only; actions belong to edge predicates, time belongs to edge.time, and place belongs to edge.placeId.` };
  }
  if (ACTION_NAME_PATTERN.test(name)) {
    return { valid: false, message: `“${name}” reads like an action. Nodes name one entity only; express the action as an edge predicate.` };
  }
  const attributes = isRecord(raw.attributes) ? raw.attributes : isRecord(raw.properties) ? raw.properties : null;
  if (attributes) {
    const invalidKey = Object.keys(attributes).find((key) => ENTITY_CONTEXT_KEYS.has(semanticKey(key)));
    if (invalidKey) {
      return { valid: false, message: `Node property “${invalidKey}” is spatiotemporal context. Store time on edge.time and place on edge.placeId instead of the entity node.` };
    }
  }
  return { valid: true, message: "" };
}

export function validateActionPredicate(value: unknown): ValidationResult {
  const predicate = text(value, 120);
  if (!predicate) return { valid: false, message: "A specific action verb is required for every edge." };
  const key = semanticKey(predicate);
  if (!key || GENERIC_RELATION_KEYS.has(key)) {
    return { valid: false, message: `“${predicate}” is a generic association, not a specific action. Use a concrete verb such as called, warned, built, transferredTo, acquired, or authorized.` };
  }
  if (/^(?:related|associated|connected|linked|involved|participat|member|belong|partof|protagonist|presentat|locatedat|occursat)/.test(key)) {
    return { valid: false, message: `“${predicate}” is too general. Name the concrete action performed by the source toward the target.` };
  }
  if (/\b(?:at|near|during|on\s+\d{4}|in\s+\d{4})\b/i.test(predicate) ||
      /(?:At|Near|During|Via|Along|Toward|From|Into|Onto|In)$/.test(predicate) ||
      /\d{4}-\d{2}-\d{2}/.test(predicate)) {
    return { valid: false, message: `“${predicate}” mixes action with place or time. Keep the label to the action only; select placeId and time separately on the edge.` };
  }
  const terms = predicateTerms(predicate);
  if (terms.length > 2 || (terms.length === 2 && !ACTION_PREDICATE_PARTICLES.has(terms[1]!.toLowerCase()))) {
    return { valid: false, message: `“${predicate}” embeds a noun, instrument, role, cause, or other context in the edge label. Canonical predicates are one action verb, optionally followed by one grammatical particle (for example searchesFor, dancesWith, transferredTo). Model other entities as nodes and time/place/other context as properties.` };
  }
  return { valid: true, message: "" };
}

export function validateRelationshipCore(value: unknown): ValidationResult {
  if (!isRecord(value)) return { valid: false, message: "Relationship must be an object." };
  const subjectId = text(value.subjectId ?? value.start ?? value.source, 120);
  const objectId = text(value.objectId ?? value.end ?? value.target, 120);
  if (!subjectId || !objectId) return { valid: false, message: "Relationship requires explicit subject and object entity IDs." };
  if (subjectId === objectId) return { valid: false, message: "Relationship endpoints must be two distinct canonical entities." };
  return validateActionPredicate(value.predicate ?? value.label ?? value.type);
}
