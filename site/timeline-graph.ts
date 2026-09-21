/**
 * Canonical Timeline graph model with strict validation
 * Enforces one-entity-per-node, one-action-per-edge semantics with spatiotemporal properties
 */

const GRAPH_CONTRACT_VERSION = "2026-09-21.1";
const GRAPH_MODEL_RULES = Object.freeze({
  nodeIdentity: "one-durable-entity",
  relationshipIdentity: "one-directed-action-fact",
  stableExplicitIds: true,
  selfLoops: "forbidden",
  predicateSemantics: "one-action-verb-plus-optional-particle-no-entities",
  duplicateFacts: "merge-context-on-one-edge",
  mirroredDuplicates: "forbidden",
  cycles: "allowed-when-each-directed-edge-is-a-distinct-fact",
  orphanCanonicalEntities: "forbidden",
  eventActionPlaceTimeNodes: "forbidden",
  spatiotemporalContext: "relationship.time-and-relationship.placeId",
  categories: "chronology-items-only",
  stories: "narrative-membership-not-graph-topology",
  namedNarrativeEntities: "known-canonical-mentions-must-be-endpoints-of-contextual-action-edges",
  uncataloguedNarrativeEntities:
    "authors-and-agents-must-create-or-reuse-an-entity-before-writing-the-named-entity-into-context",
});

const GRAPH_CONTRACT = Object.freeze({
  version: GRAPH_CONTRACT_VERSION,
  rules: GRAPH_MODEL_RULES,
  narrativeContext: Object.freeze({
    included: Object.freeze(["item.title", "item.description", "media.alt", "evidence.note"]),
    excludedProvenance: Object.freeze([
      "media.caption",
      "evidence.title",
      "evidence.sourceName",
      "evidence.url",
      "evidence.file",
      "evidence.forensic",
    ]),
    matching:
      "canonical entity name or alternateNames/aliases, resolved within item.extensions.narrative.storyId when present",
  }),
  requiredAuthoringWorkflow: Object.freeze([
    "Extract every durable named entity from event narrative context before mutation.",
    "Create or reuse one canonical entity node for each durable entity.",
    "Represent each relation as one directed subject-action-object edge between two different entity nodes.",
    "Use one action verb, optionally followed by one grammatical particle, as the predicate; never encode entity, place, time, role, instrument, or cause in the predicate.",
    "Store time on relationship.time and place on relationship.placeId.",
    "Link every named contextual entity to the event through at least one meaningful action edge referenced by relationship.itemIds or relationChanges.",
    "Keep categories on chronology items only and stories outside graph topology.",
    "Run strict graph audit/validation before committing the mutation.",
  ]),
  examples: Object.freeze({
    valid: Object.freeze([
      "wolf --attacks--> brick-house",
      "queen --poisons--> apple",
      "prince --dancesWith--> cinderella",
    ]),
    invalid: Object.freeze([
      "wolf --attacksBrickHouse--> wolf",
      "queen --poisonsApple--> queen",
      "prince --dancesWithCinderella--> prince",
      "entity --relatedTo--> entity",
    ]),
  }),
});

interface ValidationResult {
  valid: boolean;
  message: string;
}

interface RelationshipFactKey {
  subjectId: string;
  objectId: string;
  predicate: string;
  time: string;
}

interface GraphAudit {
  orphanEntityIds: string[];
  duplicateFactGroups: string[][];
  mirroredFactPairs: string[][];
  reciprocalActionPairs: Array<{ entityIds: [string, string]; relationshipIds: string[] }>;
}

interface RelationChangeRecord {
  relationshipId: string;
  operation: "activate" | "deactivate" | "update";
  predicate?: string;
  role?: string;
  properties?: Record<string, any>;
}

interface RelationshipState {
  active: boolean;
  changedInWindow: boolean;
  predicate: string;
  role: string;
  attributes: Record<string, any>;
  lastChange: any;
  changes: any[];
}

interface EntityNode {
  id: string;
  type: string;
  name: string;
  alternateNames: string[];
  identifiers: any[];
  sourceIds: string[];
  attributes: Record<string, any>;
}

interface Relationship {
  id: string;
  subjectId: string;
  objectId: string;
  predicate: string;
  role?: string;
  placeId?: string;
  itemIds?: string[];
  initialState?: "active" | "inactive";
  time?: any;
  sourceIds?: string[];
  confidence?: number;
  attributes?: Record<string, any>;
}

interface OrbGraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

interface OrbGraphEdge {
  id: string;
  start: string;
  end: string;
  label: string;
  temporalState?: string;
  properties: Record<string, any>;
}

interface OrbGraph {
  nodes: OrbGraphNode[];
  edges: OrbGraphEdge[];
}

function getGraphContract() {
  return cloneJson(GRAPH_CONTRACT);
}

function cloneJson(value: unknown): any {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function text(value: unknown, max = 180): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function textList(
  value: unknown,
  { maxItems = 48, maxLength = 180 } = {},
): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => text(entry, maxLength)).filter(Boolean))].slice(
    0,
    maxItems,
  );
}

const NON_ENTITY_NODE_TYPES = new Set([
  "action", "activity", "event", "occurrence", "process", "operation", "transaction",
  "interaction", "communication", "decision", "movement", "meeting", "visit",
  "place", "location", "date", "time", "period", "geometry", "coordinate",
]);

const ENTITY_CONTEXT_KEYS = new Set([
  "time", "date", "period", "start", "end", "location", "place", "placeid",
  "geometry", "coordinates", "latitude", "longitude", "radius", "radiusmeters",
]);

const GENERIC_RELATION_KEYS = new Set([
  "relatedto", "relationto", "associatedwith", "associationwith", "connectedto", "linkedto",
  "linksto", "involvedin", "involves", "involvesobject", "participatesin", "participatedin",
  "participantof", "tookpartin", "partof", "partofstory", "memberof", "belongsto", "belongto",
  "haspart", "contains", "containsstory", "includes", "includesstory", "features",
  "protagonistof", "presentat", "locatedat", "occursat", "is", "was", "were", "has",
]);

const ACTION_NAME_PATTERN =
  /^(?:called|calls|met|meets|sent|sends|transferred|transfers|paid|pays|visited|visits|arrived|arrives|departed|departs|left|leaves|built|builds|created|creates|attacked|attacks|ordered|orders|warned|warns|approved|approves|authorized|authorizes|signed|signs|moved|moves|travelled|traveled|travels|fled|flees|married|marries|danced|dances|consulted|consults|poisoned|poisons|searched|searches|found|finds|lost|loses|gave|gives|took|takes|received|receives)\b/i;

const ACTION_PREDICATE_PARTICLES = new Set([
  "for", "with", "to", "over", "under", "through", "across", "up", "down", "out",
  "off", "away", "back", "forth", "against", "around",
]);

const FORBIDDEN_GRAPH_TAXONOMY_KEYS = new Set([
  "category", "categoryid", "categoryids", "categories", "group", "groupid", "groupids",
]);

function semanticKey(value: unknown): string {
  return text(value, 120)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function entityMentionKey(value: unknown): string {
  return String(value || "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/['']s\b/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function entityMentionVariants(value: unknown): string[] {
  const key = entityMentionKey(value);
  if (!key) return [];
  const variants = new Set([key]);
  const withoutArticle = key.replace(/^(?:the|a|an)\s+/, "");
  if (withoutArticle.length >= 3) variants.add(withoutArticle);
  return [...variants];
}

function itemNarrativeContext(item: any, evidenceById: Map<string, any> | null = null): string {
  if (!item || typeof item !== "object") return "";
  const mediaContext = Array.isArray(item.media)
    ? item.media.map((media) => (typeof media?.alt === "string" ? media.alt : ""))
    : [];
  const evidenceNotes =
    evidenceById instanceof Map
      ? textList(item.evidenceIds, { maxItems: 96, maxLength: 120 })
          .map((id) => evidenceById.get(String(id))?.note)
          .filter((note) => typeof note === "string" && note.trim())
      : [];
  return [
    typeof item.title === "string" ? item.title : "",
    typeof item.description === "string" ? item.description : "",
    ...mediaContext,
    ...evidenceNotes,
  ]
    .filter(Boolean)
    .join(" ");
}

function namedEntityMentions(item: any, entities: any[], evidenceById: Map<string, any> | null = null): any[] {
  const context = entityMentionKey(itemNarrativeContext(item, evidenceById));
  if (!context) return [];
  const padded = ` ${context} `;
  const itemStoryId = text(item?.extensions?.narrative?.storyId, 120);
  const groups = new Map();

  for (const entity of Array.isArray(entities) ? entities : []) {
    const id = text(entity?.id, 120);
    if (!id || !validateEntityNode(entity).valid) continue;
    const entityStoryId = text(entity?.attributes?.storyId, 120);
    const canonicalLabel = text(entity?.name || entity?.label || entity?.title, 180);
    const labels = [
      canonicalLabel,
      ...textList(entity?.alternateNames || entity?.aliases, { maxItems: 48, maxLength: 180 }),
    ].filter(Boolean);

    for (const label of labels) {
      const matched = entityMentionVariants(label).some(
        (variant) => variant.length >= 3 && padded.includes(` ${variant} `),
      );
      if (!matched) continue;
      const groupKey = entityMentionKey(label);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { label: canonicalLabel || label, candidates: [] });
      }
      groups.get(groupKey).candidates.push({ id, storyId: entityStoryId });
    }
  }

  return [...groups.values()]
    .map((group) => {
      const sameStory = itemStoryId
        ? group.candidates.filter((candidate) => candidate.storyId === itemStoryId)
        : [];
      const globalEntities = group.candidates.filter((candidate) => !candidate.storyId);
      const candidates = itemStoryId ? [...sameStory, ...globalEntities] : group.candidates;
      return {
        label: group.label,
        entityIds: [...new Set(candidates.map((candidate) => candidate.id))],
      };
    })
    .filter((mention) => mention.entityIds.length);
}

function graphTaxonomyKeys(raw: any): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const attributes =
    raw.attributes && typeof raw.attributes === "object" && !Array.isArray(raw.attributes)
      ? raw.attributes
      : raw.properties && typeof raw.properties === "object" && !Array.isArray(raw.properties)
        ? raw.properties
        : {};
  return [
    ...new Set(
      [...Object.keys(raw), ...Object.keys(attributes)].filter((key) =>
        FORBIDDEN_GRAPH_TAXONOMY_KEYS.has(semanticKey(key)),
      ),
    ),
  ];
}

function predicateTerms(value: unknown): string[] {
  return text(value, 120)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function temporalEndpointFactKey(endpoint: any, open: boolean): string {
  if (open) return "<open>";
  if (!endpoint || typeof endpoint !== "object") return "";
  const value = text(endpoint.value, 120);
  if (value) return value;
  if (endpoint.certainty === "unknown") {
    return `<unknown:${text(endpoint.earliest, 120)}:${text(endpoint.latest, 120)}:${text(endpoint.sourceText, 120)}>`;
  }
  return "";
}

function temporalFactKey(time: any): string {
  if (!time || typeof time !== "object") return "timeless";
  const type = text(time.type, 24) || "instant";
  const start = temporalEndpointFactKey(time.start, time.openStart === true);
  const end = type === "interval" ? temporalEndpointFactKey(time.end, time.openEnd === true) : "";
  if (!start && type !== "interval") return "timeless";
  return `${type}:${start}->${end}`;
}

function relationshipFactKey(raw: any): string {
  if (!raw || typeof raw !== "object") return "";
  const subjectId = text(raw.subjectId ?? raw.start ?? raw.source, 120);
  const objectId = text(raw.objectId ?? raw.end ?? raw.target, 120);
  const predicate = semanticKey(raw.predicate ?? raw.label ?? raw.type);
  if (!subjectId || !objectId || !predicate) return "";
  return JSON.stringify([subjectId, predicate, objectId, temporalFactKey(raw.time)]);
}

function findDuplicateRelationship(candidate: any, relationships: any[], excludeId = ""): any {
  const key = relationshipFactKey(candidate);
  if (!key) return null;
  return (
    (Array.isArray(relationships) ? relationships : []).find(
      (relationship) =>
        String(relationship?.id || "") !== String(excludeId || "") &&
        relationshipFactKey(relationship) === key,
    ) || null
  );
}

function findMirroredRelationship(candidate: any, relationships: any[], excludeId = ""): any {
  if (!candidate || String(candidate.subjectId || "") === String(candidate.objectId || ""))
    return null;
  const reverseKey = relationshipFactKey({
    ...candidate,
    subjectId: candidate.objectId,
    objectId: candidate.subjectId,
  });
  if (!reverseKey) return null;
  return (
    (Array.isArray(relationships) ? relationships : []).find(
      (relationship) =>
        String(relationship?.id || "") !== String(excludeId || "") &&
        relationshipFactKey(relationship) === reverseKey,
    ) || null
  );
}

function auditGraphStructure(input: any): GraphAudit {
  const entities = Array.isArray(input?.entities) ? input.entities : [];
  const relationships = Array.isArray(input?.relationships) ? input.relationships : [];
  const entityIds = new Set(entities.map((entity) => text(entity?.id, 120)).filter(Boolean));
  const incident = new Set();
  const factGroups = new Map();
  const mirroredFactPairs: string[][] = [];
  const mirroredSeen = new Set();
  const endpointPairs = new Map();

  for (const relationship of relationships) {
    const subjectId = text(relationship?.subjectId, 120);
    const objectId = text(relationship?.objectId, 120);
    const predicate = text(relationship?.predicate, 120);
    if (
      !subjectId ||
      !objectId ||
      subjectId === objectId ||
      !entityIds.has(subjectId) ||
      !entityIds.has(objectId) ||
      !validateActionPredicate(predicate).valid
    )
      continue;

    incident.add(subjectId);
    incident.add(objectId);

    const key = relationshipFactKey(relationship);
    if (key) {
      if (!factGroups.has(key)) factGroups.set(key, []);
      factGroups.get(key).push(String(relationship.id || ""));
    }

    const mirrored = findMirroredRelationship(relationship, relationships, relationship.id);
    if (mirrored) {
      const pair = [String(relationship.id || ""), String(mirrored.id || "")].sort();
      const pairKey = pair.join(" ");
      if (!mirroredSeen.has(pairKey)) {
        mirroredSeen.add(pairKey);
        mirroredFactPairs.push(pair);
      }
    }

    const [first, second] = [subjectId, objectId].sort();
    const endpointKey = `${first} ${second}`;
    if (!endpointPairs.has(endpointKey)) endpointPairs.set(endpointKey, []);
    endpointPairs.get(endpointKey).push({
      id: String(relationship.id || ""),
      subjectId,
      objectId,
    });
  }

  const reciprocalActionPairs: Array<{ entityIds: [string, string]; relationshipIds: string[] }> = [];
  for (const [endpointKey, records] of endpointPairs) {
    const [first, second] = endpointKey.split(" ");
    const forward = records.some(
      (record) => record.subjectId === first && record.objectId === second,
    );
    const reverse = records.some(
      (record) => record.subjectId === second && record.objectId === first,
    );
    if (forward && reverse) {
      reciprocalActionPairs.push({
        entityIds: [first, second] as [string, string],
        relationshipIds: records.map((record) => record.id).filter(Boolean),
      });
    }
  }

  return {
    orphanEntityIds: [...entityIds].filter((id) => !incident.has(id)),
    duplicateFactGroups: [...factGroups.values()].filter((ids) => ids.length > 1),
    mirroredFactPairs,
    reciprocalActionPairs,
  };
}

function contextPropertyKey(value: unknown): boolean {
  return ENTITY_CONTEXT_KEYS.has(semanticKey(value));
}

function cleanContextFreeAttributes(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const cleaned: Record<string, any> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!contextPropertyKey(key) && !FORBIDDEN_GRAPH_TAXONOMY_KEYS.has(semanticKey(key))) {
      cleaned[key] = cloneJson(entry);
    }
  }
  return cleaned;
}

export function validateEntityNode(raw: any): ValidationResult {
  const name = text(raw?.name || raw?.label || raw?.title, 180);
  const type = text(raw?.type, 60) || "entity";
  const typeKey = semanticKey(type);
  if (NON_ENTITY_NODE_TYPES.has(typeKey)) {
    return {
      valid: false,
      message: `"${type}" is not an entity-node type. A graph node represents one entity only; actions belong to edge predicates, time belongs to edge.time, and place belongs to edge.placeId.`,
    };
  }
  if (ACTION_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      message: `"${name}" reads like an action. Nodes name one entity only; express the action as an edge predicate.`,
    };
  }
  const attributes = raw?.attributes || raw?.properties;
  if (attributes && typeof attributes === "object" && !Array.isArray(attributes)) {
    const invalidKey = Object.keys(attributes).find((key) =>
      ENTITY_CONTEXT_KEYS.has(semanticKey(key)),
    );
    if (invalidKey) {
      return {
        valid: false,
        message: `Node property "${invalidKey}" is spatiotemporal context. Store time on edge.time and place on edge.placeId instead of the entity node.`,
      };
    }
  }
  return { valid: true, message: "" };
}

export function validateActionPredicate(value: unknown): ValidationResult {
  const predicate = text(value, 120);
  if (!predicate)
    return { valid: false, message: "A specific action verb is required for every edge." };
  const key = semanticKey(predicate);
  if (!key || GENERIC_RELATION_KEYS.has(key)) {
    return {
      valid: false,
      message: `"${predicate}" is a generic association, not a specific action. Use a concrete verb such as called, warned, built, transferredTo, acquired, or authorized.`,
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
      message: `"${predicate}" mixes action with place or time. Keep the label to the action only; select placeId and time separately on the edge.`,
    };
  }
  const terms = predicateTerms(predicate);
  if (
    terms.length > 2 ||
    (terms.length === 2 && !ACTION_PREDICATE_PARTICLES.has(terms[1].toLowerCase()))
  ) {
    return {
      valid: false,
      message: `"${predicate}" embeds a noun, instrument, role, cause, or other context in the edge label. Canonical predicates are one action verb, optionally followed by one grammatical particle (for example searchesFor, dancesWith, transferredTo). Model other entities as nodes and time/place/other context as properties.`,
    };
  }
  return { valid: true, message: "" };
}

function normalizeEntity(raw: any, index: number): EntityNode | null {
  if (!raw || typeof raw !== "object") return null;
  if (!validateEntityNode(raw).valid) return null;
  const id = text(raw.id, 120) || `entity-${index + 1}`;
  return {
    id,
    type: text(raw.type, 60) || "entity",
    name: text(raw.name || raw.label || raw.title, 180) || id,
    alternateNames: textList(raw.alternateNames || raw.aliases, { maxItems: 48, maxLength: 180 }),
    identifiers: Array.isArray(raw.identifiers) ? cloneJson(raw.identifiers) : [],
    sourceIds: textList(raw.sourceIds, { maxItems: 96, maxLength: 120 }),
    attributes: cleanContextFreeAttributes(
      raw.properties && typeof raw.properties === "object"
        ? raw.properties
        : raw.attributes && typeof raw.attributes === "object"
          ? raw.attributes
          : {},
    ),
  };
}

function normalizeConfidence(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(1, Math.max(0, numeric));
}

function normalizeRelationship(raw: any, index: number, temporal: any): Relationship | null {
  if (!raw || typeof raw !== "object") return null;
  const subjectId = text(raw.subjectId ?? raw.start ?? raw.source, 120);
  const objectId = text(raw.objectId ?? raw.end ?? raw.target, 120);
  const predicate = text(raw.predicate || raw.label || raw.type, 120);
  if (
    !subjectId ||
    !objectId ||
    subjectId === objectId ||
    !validateActionPredicate(predicate).valid
  )
    return null;

  let time = null;
  const sourceTime = raw.time && typeof raw.time === "object" ? raw.time : null;
  if (sourceTime && temporal) {
    const interval =
      sourceTime.type === "interval" ||
      sourceTime.openStart === true ||
      sourceTime.openEnd === true ||
      (sourceTime.end !== null && sourceTime.end !== undefined);
    time = temporal.normalizeExtent(
      sourceTime,
      sourceTime.start?.value || "",
      sourceTime.end?.value || "",
      interval ? "range" : "event",
    );
  }

  return {
    id: text(raw.id, 120) || `relationship-${index + 1}`,
    subjectId,
    objectId,
    predicate,
    role: text(raw.role, 120),
    placeId: text(raw.placeId || raw.locationId, 120),
    itemIds: textList(raw.itemIds || raw.contextItemIds || raw.eventIds, {
      maxItems: 96,
      maxLength: 120,
    }),
    initialState: raw.initialState === "inactive" ? "inactive" : "active",
    time,
    sourceIds: textList(raw.sourceIds, { maxItems: 96, maxLength: 120 }),
    confidence: normalizeConfidence(raw.confidence),
    attributes: cleanContextFreeAttributes(
      raw.properties && typeof raw.properties === "object"
        ? raw.properties
        : raw.attributes && typeof raw.attributes === "object"
          ? raw.attributes
          : {},
    ),
  };
}

const RELATION_CHANGE_OPERATIONS = new Set(["activate", "deactivate", "update"]);

function normalizeRelationChanges(value: unknown): RelationChangeRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 12)
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const relationshipId = text(raw.relationshipId || raw.edgeId, 120);
      if (!relationshipId) return null;
      const operation = RELATION_CHANGE_OPERATIONS.has(raw.operation) ? raw.operation : "update";
      const predicate = text(raw.predicate, 120);
      if (predicate && !validateActionPredicate(predicate).valid) return null;
      const properties =
        raw.properties && typeof raw.properties === "object" && !Array.isArray(raw.properties)
          ? raw.properties
          : {};
      if (Object.keys(properties).some(contextPropertyKey)) return null;
      return {
        relationshipId,
        operation: operation as "activate" | "deactivate" | "update",
        predicate,
        role: text(raw.role, 120),
        properties: cloneJson(properties),
      };
    })
    .filter(Boolean) as RelationChangeRecord[];
}

function relationChangeIndex(input: any, temporal: any = globalThis.TimelineTemporal): Map<string, any[]> {
  const index = new Map();
  for (const item of Array.isArray(input?.items) ? input.items : []) {
    const time = temporal?.sortKey(item.time?.start || item.start);
    if (!Number.isFinite(time)) continue;
    for (const change of normalizeRelationChanges(item.relationChanges)) {
      const record = {
        ...change,
        itemId: item.id,
        itemTitle: item.title || item.id,
        time,
      };
      const key = String(change.relationshipId);
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(record);
    }
  }
  for (const changes of index.values()) {
    changes.sort((a, b) => a.time - b.time || String(a.itemId).localeCompare(String(b.itemId)));
  }
  return index;
}

function relationChangesFor(input: any, relationshipId: string, temporal: any = globalThis.TimelineTemporal): any[] {
  return relationChangeIndex(input, temporal).get(String(relationshipId)) || [];
}

export function relationshipStateAt(
  input: any,
  relationship: Relationship,
  viewport: any,
  temporal: any = globalThis.TimelineTemporal,
  indexedChanges: any[] | null = null,
): RelationshipState {
  const changes = indexedChanges || relationChangesFor(input, relationship.id, temporal);
  const hasViewport =
    viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end);
  const snapshotTime = hasViewport
    ? viewport.start + (viewport.end - viewport.start) / 2
    : Number.POSITIVE_INFINITY;
  let active = relationship.initialState !== "inactive";
  let predicate = relationship.predicate;
  let role = relationship.role || "";
  let attributes = cloneJson(relationship.attributes || {}) || {};

  if (relationship.time && temporal) {
    const bounds = temporal.extentBounds?.(relationship.time);
    if (bounds?.locatable) {
      active = hasViewport ? bounds.end >= viewport.start && bounds.start <= viewport.end : true;
    }
  }

  let changedInWindow = false;
  let lastChange = null;
  for (const change of changes) {
    if (hasViewport && change.time >= viewport.start && change.time <= viewport.end)
      changedInWindow = true;
    if (change.time > snapshotTime) break;
    lastChange = change;
    if (change.operation === "activate") active = true;
    else if (change.operation === "deactivate") active = false;
    else if (change.operation === "update") {
      if (change.predicate) predicate = change.predicate;
      if (change.role) role = change.role;
      attributes = { ...attributes, ...(change.properties || {}) };
    }
  }

  return {
    active,
    changedInWindow,
    predicate,
    role,
    attributes,
    lastChange,
    changes,
  };
}

export function normalizeGraphData(
  input: any,
  temporal: any = globalThis.TimelineTemporal,
  spatial: any = globalThis.TimelineSpatial,
): { entities: EntityNode[]; places: any[]; relationships: Relationship[] } {
  const entities = (Array.isArray(input?.entities) ? input.entities : [])
    .map((e: any, i: number) => normalizeEntity(e, i))
    .filter(Boolean);
  const places = spatial?.normalizePlaces?.(input?.places) || [];
  const entityIds = new Set(entities.map((entity) => String(entity.id)));
  const placeIds = new Set(places.map((place) => String(place.id)));
  const relationships = (Array.isArray(input?.relationships) ? input.relationships : [])
    .map((raw: any, index: number) => normalizeRelationship(raw, index, temporal))
    .filter(
      (relationship: Relationship | null) =>
        relationship &&
        entityIds.has(String(relationship.subjectId)) &&
        entityIds.has(String(relationship.objectId)) &&
        (!relationship.placeId || placeIds.has(String(relationship.placeId))),
    );
  return { entities, places, relationships };
}

export function validateGraphInput(input: any, spatial: any = globalThis.TimelineSpatial): string[] {
  const errors: string[] = [];
  const rawEntities = Array.isArray(input?.entities) ? input.entities : [];
  const rawRelationships = Array.isArray(input?.relationships) ? input.relationships : [];
  const rawItems = Array.isArray(input?.items) ? input.items : [];
  const rawStories = Array.isArray(input?.stories) ? input.stories : [];
  const rawPlaces = Array.isArray(input?.places) ? input.places : [];
  const rawEvidence = Array.isArray(input?.evidence) ? input.evidence : [];
  const itemIds = new Set(rawItems.map((item) => text(item?.id, 120)).filter(Boolean));
  const storyIds = new Set(rawStories.map((story) => text(story?.id, 120)).filter(Boolean));
  const entityIds = new Set();
  const placeIds = new Set();
  const canonicalIds = new Map();
  const relationshipById = new Map();
  const contextualEntityIdsByItem = new Map();
  const evidenceById = new Map(
    rawEvidence.map((record) => [text(record?.id, 120), record]).filter(([id]) => Boolean(id)),
  );

  const addContextualEndpoints = (itemId: string, subjectId: string, objectId: string) => {
    if (!itemId || !subjectId || !objectId) return;
    if (!contextualEntityIdsByItem.has(itemId)) contextualEntityIdsByItem.set(itemId, new Set());
    const endpoints = contextualEntityIdsByItem.get(itemId);
    endpoints.add(subjectId);
    endpoints.add(objectId);
  };

  const registerId = (rawId: any, kind: string, label: string): string => {
    const id = text(rawId, 120);
    if (!id) {
      errors.push(
        `${label}: a stable explicit ID is required; generated positional IDs are not canonical.`,
      );
      return "";
    }
    const previous = canonicalIds.get(id);
    if (previous) {
      errors.push(
        `ID "${id}" is reused by ${previous} and ${kind}. Canonical entity, place, chronology, story, and relationship IDs must be unique.`,
      );
    } else {
      canonicalIds.set(id, kind);
    }
    return id;
  };

  rawItems.forEach((item, index) => {
    registerId(item?.id, `chronology item ${index + 1}`, `Chronology item ${index + 1}`);
  });
  rawStories.forEach((story, index) => {
    registerId(story?.id, `story ${index + 1}`, `Story ${index + 1}`);
  });

  rawPlaces.forEach((raw, index) => {
    const label = `Place ${text(raw?.id, 120) || index + 1}`;
    const id = registerId(raw?.id, `place ${index + 1}`, label);
    if (id) placeIds.add(id);
    if (!raw || typeof raw !== "object") {
      errors.push(`${label}: place must be an object.`);
      return;
    }
    const taxonomyKeys = graphTaxonomyKeys(raw);
    if (taxonomyKeys.length) {
      errors.push(
        `${label}: graph/place records cannot carry timeline category/group taxonomy (${taxonomyKeys.join(", ")}). Categories classify chronology items only.`,
      );
    }
    let normalized = null;
    try {
      normalized = spatial?.normalizePlace?.(raw, index) || null;
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : "invalid geometry."}`);
    }
    if (!normalized?.geometry) {
      errors.push(
        `${label}: canonical place requires Point coordinates or Polygon/MultiPolygon area geometry.`,
      );
    }
  });

  rawEntities.forEach((raw, index) => {
    const label = `Node ${text(raw?.id, 120) || index + 1}`;
    const id = registerId(raw?.id, `entity node ${index + 1}`, label);
    if (id) entityIds.add(id);
    const result = validateEntityNode(raw);
    if (!result.valid) errors.push(`${label}: ${result.message}`);
    const taxonomyKeys = graphTaxonomyKeys(raw);
    if (taxonomyKeys.length) {
      errors.push(
        `${label}: entity nodes cannot carry timeline category/group taxonomy (${taxonomyKeys.join(", ")}). Categories classify chronology items only.`,
      );
    }
  });

  rawRelationships.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      errors.push(`Edge ${index + 1}: edge must be an object.`);
      return;
    }
    const id = registerId(raw.id, `relationship ${index + 1}`, `Edge ${index + 1}`);
    const label = `Edge ${id || index + 1}`;
    const predicate = text(raw.predicate || raw.label || raw.type, 120);
    const predicateResult = validateActionPredicate(predicate);
    if (!predicateResult.valid) errors.push(`${label}: ${predicateResult.message}`);

    const subjectId = text(raw.subjectId || raw.start || raw.source, 120);
    const objectId = text(raw.objectId || raw.end || raw.target, 120);
    if (subjectId && objectId && subjectId === objectId) {
      errors.push(`${label}: source and target must be different entity nodes.`);
    }
    if (!entityIds.has(subjectId))
      errors.push(`${label}: subject/source must reference an entity node.`);
    if (!entityIds.has(objectId))
      errors.push(`${label}: object/target must reference an entity node.`);

    const validEndpoints =
      Boolean(id) &&
      entityIds.has(subjectId) &&
      entityIds.has(objectId) &&
      subjectId !== objectId &&
      predicateResult.valid;
    if (validEndpoints) relationshipById.set(id, { subjectId, objectId });
  });

  const audit = auditGraphStructure(input);
  for (const ids of audit.duplicateFactGroups) {
    errors.push(
      `Edges ${ids.join(", ")} duplicate one directed action fact. Keep one canonical edge and merge properties.`,
    );
  }
  for (const [first, second] of audit.mirroredFactPairs) {
    errors.push(
      `Edges ${first} and ${second} mirror the same action in opposite directions. Add reverse edges only for genuinely distinct reverse actions.`,
    );
  }
  for (const id of audit.orphanEntityIds) {
    errors.push(`Node ${id}: canonical entity is orphaned and must participate in at least one meaningful action edge.`);
  }

  return errors;
}

export function graphForWindow(input: any, viewport: any, temporal: any = globalThis.TimelineTemporal): OrbGraph {
  const entities = Array.isArray(input?.entities) ? input.entities : [];
  const relationships = Array.isArray(input?.relationships) ? input.relationships : [];
  const graphData = toOrbGraph({ entities, relationships });
  const states = new Map();
  const relationshipById = new Map(
    relationships.map((relationship) => [String(relationship.id), relationship]),
  );
  const changesByRelationship = relationChangeIndex(input, temporal);

  for (const relationship of relationships) {
    const derived = relationshipStateAt(
      input,
      relationship,
      viewport,
      temporal,
      changesByRelationship.get(String(relationship.id)) || [],
    );
    states.set(String(relationship.id), derived);
  }

  const edges = graphData.edges
    .map((edge) => {
      const relationship = relationshipById.get(String(edge.id));
      const state = states.get(String(edge.id));
      if (!relationship || !state) return { ...edge, temporalState: "inactive" };

      const active = state.active;
      const temporalState = active ? "active" : "inactive";

      return {
        ...edge,
        label: state.predicate,
        temporalState,
        properties: {
          ...edge.properties,
          role: state.role,
          attributes: cloneJson(state.attributes),
          lastChange: state.lastChange ? cloneJson(state.lastChange) : null,
          changes: cloneJson(state.changes),
        },
      };
    })
    .filter((edge) => edge.temporalState !== "inactive");

  const hasViewport =
    viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end);
  if (!hasViewport) return { ...graphData, edges };

  const visibleNodeIds = new Set();
  for (const edge of edges) {
    visibleNodeIds.add(String(edge.start));
    visibleNodeIds.add(String(edge.end));
  }

  return {
    nodes: graphData.nodes.filter((node) => visibleNodeIds.has(String(node.id))),
    edges,
  };
}

export function toOrbGraph({ entities = [], relationships = [] } = {}): OrbGraph {
  const nodes: OrbGraphNode[] = [];
  const seen = new Set();

  for (const entity of entities) {
    if (!entity?.id || seen.has(entity.id) || !validateEntityNode(entity).valid) continue;
    seen.add(entity.id);
    nodes.push({
      id: entity.id,
      label: entity.name || entity.id,
      properties: {
        timelineType: entity.type || "entity",
        alternateNames: cloneJson(entity.alternateNames || []),
        identifiers: cloneJson(entity.identifiers || []),
        sourceIds: cloneJson(entity.sourceIds || []),
        attributes: cloneJson(entity.attributes || {}),
      },
    });
  }

  const edges = relationships
    .filter(
      (relationship) =>
        seen.has(String(relationship.subjectId)) &&
        seen.has(String(relationship.objectId)) &&
        String(relationship.subjectId) !== String(relationship.objectId) &&
        validateActionPredicate(relationship.predicate).valid,
    )
    .map((relationship) => ({
      id: relationship.id,
      start: relationship.subjectId,
      end: relationship.objectId,
      label: relationship.predicate,
      properties: {
        role: relationship.role || "",
        initialState: relationship.initialState || "active",
        time: cloneJson(relationship.time || null),
        placeId: relationship.placeId || "",
        itemIds: cloneJson(relationship.itemIds || []),
        sourceIds: cloneJson(relationship.sourceIds || []),
        confidence: relationship.confidence ?? null,
        attributes: cloneJson(relationship.attributes || {}),
      },
    }));

  return { nodes, edges };
}

export function migrateLegacySpatialModel(input: any, spatial: any = globalThis.TimelineSpatial): any {
  const migrated = cloneJson(input) || {};
  const rawEntities = Array.isArray(migrated.entities) ? migrated.entities : [];
  const legacyPlaceEntities = rawEntities.filter((entity) =>
    ["place", "location"].includes(semanticKey(entity?.type)),
  );
  const places = spatial?.normalizePlaces?.(migrated.places) || [];
  const placeByKey = new Map(places.map((place) => [JSON.stringify(place.geometry), place]));
  const placeByLegacyId = new Map();

  const addPlace = (raw: any, preferredId = ""): any => {
    if (!spatial?.normalizePlace) return null;
    const candidate = spatial.normalizePlace(
      {
        id: preferredId || raw?.id,
        name: raw?.name || raw?.label || "Place",
        geometry: raw?.geometry,
      },
      places.length,
    );
    if (!candidate) return null;
    const key = JSON.stringify(candidate.geometry);
    const existing = placeByKey.get(key);
    if (existing) return existing;
    places.push(candidate);
    placeByKey.set(key, candidate);
    return candidate;
  };

  for (const entity of legacyPlaceEntities) {
    const place = addPlace(entity, text(entity.id, 120));
    if (place) placeByLegacyId.set(String(entity.id), place.id);
  }

  migrated.entities = rawEntities.filter(
    (entity) => !["place", "location"].includes(semanticKey(entity?.type)),
  );
  const entityIds = new Set(migrated.entities.map((entity) => String(entity?.id || "")));

  migrated.relationships = (Array.isArray(migrated.relationships) ? migrated.relationships : [])
    .map((raw: any) => {
      if (!raw || typeof raw !== "object") return raw;
      const relationship = { ...raw };
      let subjectId = text(
        relationship.subjectId ?? relationship.start ?? relationship.source,
        120,
      );
      let objectId = text(relationship.objectId ?? relationship.end ?? relationship.target, 120);

      if (placeByLegacyId.has(subjectId)) {
        subjectId = objectId;
      }
      if (placeByLegacyId.has(objectId)) {
        objectId = subjectId;
      }

      relationship.subjectId = subjectId;
      relationship.objectId = objectId;
      return relationship;
    })
    .filter(
      (relationship) =>
        relationship &&
        entityIds.has(String(relationship.subjectId || "")) &&
        entityIds.has(String(relationship.objectId || "")),
    );

  migrated.places = places;
  return migrated;
}

export const TimelineGraph = Object.freeze({
  GRAPH_CONTRACT_VERSION,
  GRAPH_MODEL_RULES,
  getGraphContract,
  auditGraphStructure,
  findDuplicateRelationship,
  findMirroredRelationship,
  relationshipFactKey,
  graphForWindow,
  migrateLegacySpatialModel,
  normalizeGraphData,
  namedEntityMentions,
  itemNarrativeContext,
  validateGraphInput,
  validateActionPredicate,
  validateEntityNode,
  contextPropertyKey,
  normalizeRelationChanges,
  relationshipStateAt,
  toOrbGraph,
});
