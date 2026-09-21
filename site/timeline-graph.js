(() => {
  "use strict";

  /**
   * Canonical Timeline graph profile. General property graphs are more permissive;
   * these types document the stricter contract enforced by Timeline.
   * @typedef {Object} TimelineGraphEntity
   * @property {string} id Stable explicit identifier for one durable entity.
   * @property {string} type Entity classification such as person, organization, group, object, device, account, or document.
   * @property {string} name Human-readable entity name; never an event/action phrase.
   * @property {string[]} [alternateNames]
   * @property {Array<Object>} [identifiers]
   * @property {string[]} [sourceIds]
   * @property {Object} [attributes] Entity-only properties; no time/place/geometry context.
   *
   * @typedef {Object} TimelineGraphRelationship
   * @property {string} id Stable explicit identifier for one directed action fact.
   * @property {string} subjectId Source entity ID.
   * @property {string} objectId Different target entity ID.
   * @property {string} predicate One action verb, optionally followed by one grammatical particle.
   * @property {string} [role]
   * @property {string} [placeId] Reference to the reusable place registry.
   * @property {string[]} [itemIds] Chronology records that contextualize this same action fact.
   * @property {"active"|"inactive"} [initialState]
   * @property {Object|null} [time] Canonical instant/interval context.
   * @property {string[]} [sourceIds]
   * @property {number|null} [confidence]
   * @property {Object} [attributes] Non-spatiotemporal action properties.
   *
   * @typedef {Object} TimelineGraphModel
   * @property {TimelineGraphEntity[]} entities
   * @property {Array<Object>} places
   * @property {TimelineGraphRelationship[]} relationships
   * @property {Array<Object>} [items]
   * @property {Array<Object>} [stories]
   *
   * @typedef {Object} TimelineGraphAudit
   * @property {string[]} orphanEntityIds
   * @property {string[][]} duplicateFactGroups
   * @property {Array<[string,string]>} mirroredFactPairs
   * @property {Array<{entityIds:[string,string],relationshipIds:string[]}>} reciprocalActionPairs
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
    uncataloguedNarrativeEntities: "authors-and-agents-must-create-or-reuse-an-entity-before-writing-the-named-entity-into-context"
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
        "evidence.forensic"
      ]),
      matching: "canonical entity name or alternateNames/aliases, resolved within item.extensions.narrative.storyId when present"
    }),
    requiredAuthoringWorkflow: Object.freeze([
      "Extract every durable named entity from event narrative context before mutation.",
      "Create or reuse one canonical entity node for each durable entity.",
      "Represent each relation as one directed subject-action-object edge between two different entity nodes.",
      "Use one action verb, optionally followed by one grammatical particle, as the predicate; never encode entity, place, time, role, instrument, or cause in the predicate.",
      "Store time on relationship.time and place on relationship.placeId.",
      "Link every named contextual entity to the event through at least one meaningful action edge referenced by relationship.itemIds or relationChanges.",
      "Keep categories on chronology items only and stories outside graph topology.",
      "Run strict graph audit/validation before committing the mutation."
    ]),
    examples: Object.freeze({
      valid: Object.freeze([
        "wolf --attacks--> brick-house",
        "queen --poisons--> apple",
        "prince --dancesWith--> cinderella"
      ]),
      invalid: Object.freeze([
        "wolf --attacksBrickHouse--> wolf",
        "queen --poisonsApple--> queen",
        "prince --dancesWithCinderella--> prince",
        "entity --relatedTo--> entity"
      ])
    })
  });

  function getGraphContract() {
    return cloneJson(GRAPH_CONTRACT);
  }

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }

  function text(value, max = 180) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function textList(value, { maxItems = 48, maxLength = 180 } = {}) {
    if (!Array.isArray(value)) return [];
    return [...new Set(
      value
        .map((entry) => text(entry, maxLength))
        .filter(Boolean)
    )].slice(0, maxItems);
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
    "coordinate"
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
    "radiusmeters"
  ]);

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
    "involvesobject",
    "participatesin",
    "participatedin",
    "participantof",
    "tookpartin",
    "partof",
    "partofstory",
    "memberof",
    "belongsto",
    "belongto",
    "haspart",
    "contains",
    "containsstory",
    "includes",
    "includesstory",
    "features",
    "protagonistof",
    "presentat",
    "locatedat",
    "occursat",
    "is",
    "was",
    "were",
    "has"
  ]);

  const ACTION_NAME_PATTERN = /^(?:called|calls|met|meets|sent|sends|transferred|transfers|paid|pays|visited|visits|arrived|arrives|departed|departs|left|leaves|built|builds|created|creates|attacked|attacks|ordered|orders|warned|warns|approved|approves|authorized|authorizes|signed|signs|moved|moves|travelled|traveled|travels|fled|flees|married|marries|danced|dances|consulted|consults|poisoned|poisons|searched|searches|found|finds|lost|loses|gave|gives|took|takes|received|receives)\b/i;

  const ACTION_PREDICATE_PARTICLES = new Set(["for", "with", "to", "over", "under", "through", "across", "up", "down", "out", "off", "away", "back", "forth", "against", "around"]);
  const FORBIDDEN_GRAPH_TAXONOMY_KEYS = new Set([
    "category",
    "categoryid",
    "categoryids",
    "categories",
    "group",
    "groupid",
    "groupids"
  ]);

  function semanticKey(value) {
    return text(value, 120).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function entityMentionKey(value) {
    return String(value || "")
      .normalize("NFKD")
      .toLocaleLowerCase()
      .replace(/[’']s\b/g, "")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function entityMentionVariants(value) {
    const key = entityMentionKey(value);
    if (!key) return [];
    const variants = new Set([key]);
    const withoutArticle = key.replace(/^(?:the|a|an)\s+/, "");
    if (withoutArticle.length >= 3) variants.add(withoutArticle);
    return [...variants];
  }

  function itemNarrativeContext(item, evidenceById = null) {
    if (!item || typeof item !== "object") return "";
    const mediaContext = Array.isArray(item.media)
      ? item.media.map((media) => typeof media?.alt === "string" ? media.alt : "")
      : [];
    const evidenceNotes = evidenceById instanceof Map
      ? textList(item.evidenceIds, { maxItems: 96, maxLength: 120 })
          .map((id) => evidenceById.get(String(id))?.note)
          .filter((note) => typeof note === "string" && note.trim())
      : [];
    return [
      typeof item.title === "string" ? item.title : "",
      typeof item.description === "string" ? item.description : "",
      ...mediaContext,
      ...evidenceNotes
    ].filter(Boolean).join(" ");
  }

  function namedEntityMentions(item, entities, evidenceById = null) {
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
        ...textList(entity?.alternateNames || entity?.aliases, { maxItems: 48, maxLength: 180 })
      ].filter(Boolean);

      for (const label of labels) {
        const matched = entityMentionVariants(label).some(
          (variant) => variant.length >= 3 && padded.includes(` ${variant} `)
        );
        if (!matched) continue;
        const groupKey = entityMentionKey(label);
        if (!groups.has(groupKey)) {
          groups.set(groupKey, { label: canonicalLabel || label, candidates: [] });
        }
        groups.get(groupKey).candidates.push({ id, storyId: entityStoryId });
      }
    }

    return [...groups.values()].map((group) => {
      const sameStory = itemStoryId
        ? group.candidates.filter((candidate) => candidate.storyId === itemStoryId)
        : [];
      const globalEntities = group.candidates.filter((candidate) => !candidate.storyId);
      const candidates = itemStoryId ? [...sameStory, ...globalEntities] : group.candidates;
      return {
        label: group.label,
        entityIds: [...new Set(candidates.map((candidate) => candidate.id))]
      };
    }).filter((mention) => mention.entityIds.length);
  }

  function graphTaxonomyKeys(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const attributes =
      raw.attributes && typeof raw.attributes === "object" && !Array.isArray(raw.attributes)
        ? raw.attributes
        : raw.properties && typeof raw.properties === "object" && !Array.isArray(raw.properties)
          ? raw.properties
          : {};
    return [...new Set([
      ...Object.keys(raw),
      ...Object.keys(attributes)
    ].filter((key) => FORBIDDEN_GRAPH_TAXONOMY_KEYS.has(semanticKey(key))))];
  }


  function predicateTerms(value) {
    return text(value, 120)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean);
  }
  
  function temporalEndpointFactKey(endpoint, open) {
    if (open) return "<open>";
    if (!endpoint || typeof endpoint !== "object") return "";
    const value = text(endpoint.value, 120);
    if (value) return value;
    if (endpoint.certainty === "unknown") {
      return `<unknown:${text(endpoint.earliest, 120)}:${text(endpoint.latest, 120)}:${text(endpoint.sourceText, 120)}>`;
    }
    return "";
  }

  function temporalFactKey(time) {
    if (!time || typeof time !== "object") return "timeless";
    const type = text(time.type, 24) || "instant";
    const start = temporalEndpointFactKey(time.start, time.openStart === true);
    const end = type === "interval"
      ? temporalEndpointFactKey(time.end, time.openEnd === true)
      : "";
    if (!start && type !== "interval") return "timeless";
    return `${type}:${start}->${end}`;
  }
  
  function relationshipFactKey(raw) {
    if (!raw || typeof raw !== "object") return "";
    const subjectId = text(raw.subjectId ?? raw.start ?? raw.source, 120);
    const objectId = text(raw.objectId ?? raw.end ?? raw.target, 120);
    const predicate = semanticKey(raw.predicate ?? raw.label ?? raw.type);
    if (!subjectId || !objectId || !predicate) return "";
    return JSON.stringify([subjectId, predicate, objectId, temporalFactKey(raw.time)]);
  }
  
  function findDuplicateRelationship(candidate, relationships, excludeId = "") {
    const key = relationshipFactKey(candidate);
    if (!key) return null;
    return (Array.isArray(relationships) ? relationships : []).find((relationship) =>
      String(relationship?.id || "") !== String(excludeId || "") &&
      relationshipFactKey(relationship) === key
    ) || null;
  }
  
  function findMirroredRelationship(candidate, relationships, excludeId = "") {
    if (!candidate || String(candidate.subjectId || "") === String(candidate.objectId || "")) return null;
    const reverseKey = relationshipFactKey({
      ...candidate,
      subjectId: candidate.objectId,
      objectId: candidate.subjectId
    });
    if (!reverseKey) return null;
    return (Array.isArray(relationships) ? relationships : []).find((relationship) =>
      String(relationship?.id || "") !== String(excludeId || "") &&
      relationshipFactKey(relationship) === reverseKey
    ) || null;
  }
  
  function auditGraphStructure(input) {
    const entities = Array.isArray(input?.entities) ? input.entities : [];
    const relationships = Array.isArray(input?.relationships) ? input.relationships : [];
    const entityIds = new Set(entities.map((entity) => text(entity?.id, 120)).filter(Boolean));
    const incident = new Set();
    const factGroups = new Map();
    const mirroredFactPairs = [];
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
      ) continue;
  
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
        const pairKey = pair.join("\u0000");
        if (!mirroredSeen.has(pairKey)) {
          mirroredSeen.add(pairKey);
          mirroredFactPairs.push(pair);
        }
      }
  
      const [first, second] = [subjectId, objectId].sort();
      const endpointKey = `${first}\u0000${second}`;
      if (!endpointPairs.has(endpointKey)) endpointPairs.set(endpointKey, []);
      endpointPairs.get(endpointKey).push({
        id: String(relationship.id || ""),
        subjectId,
        objectId
      });
    }
  
    const reciprocalActionPairs = [];
    for (const [endpointKey, records] of endpointPairs) {
      const [first, second] = endpointKey.split("\u0000");
      const forward = records.some((record) => record.subjectId === first && record.objectId === second);
      const reverse = records.some((record) => record.subjectId === second && record.objectId === first);
      if (forward && reverse) {
        reciprocalActionPairs.push({
          entityIds: [first, second],
          relationshipIds: records.map((record) => record.id).filter(Boolean)
        });
      }
    }
  
    return {
      orphanEntityIds: [...entityIds].filter((id) => !incident.has(id)),
      duplicateFactGroups: [...factGroups.values()].filter((ids) => ids.length > 1),
      mirroredFactPairs,
      reciprocalActionPairs
    };
  }

  function contextPropertyKey(value) {
    return ENTITY_CONTEXT_KEYS.has(semanticKey(value));
  }

  function cleanContextFreeAttributes(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const cleaned = {};
    for (const [key, entry] of Object.entries(value)) {
      if (
        !contextPropertyKey(key) &&
        !FORBIDDEN_GRAPH_TAXONOMY_KEYS.has(semanticKey(key))
      ) {
        cleaned[key] = cloneJson(entry);
      }
    }
    return cleaned;
  }

  function validateEntityNode(raw) {
    const name = text(raw?.name || raw?.label || raw?.title, 180);
    const type = text(raw?.type, 60) || "entity";
    const typeKey = semanticKey(type);
    if (NON_ENTITY_NODE_TYPES.has(typeKey)) {
      return {
        valid: false,
        message: `“${type}” is not an entity-node type. A graph node represents one entity only; actions belong to edge predicates, time belongs to edge.time, and place belongs to edge.placeId.`
      };
    }
    if (ACTION_NAME_PATTERN.test(name)) {
      return {
        valid: false,
        message: `“${name}” reads like an action. Nodes name one entity only; express the action as an edge predicate.`
      };
    }
    const attributes = raw?.attributes || raw?.properties;
    if (attributes && typeof attributes === "object" && !Array.isArray(attributes)) {
      const invalidKey = Object.keys(attributes).find((key) => ENTITY_CONTEXT_KEYS.has(semanticKey(key)));
      if (invalidKey) {
        return {
          valid: false,
          message: `Node property “${invalidKey}” is spatiotemporal context. Store time on edge.time and place on edge.placeId instead of the entity node.`
        };
      }
    }
    return { valid: true, message: "" };
  }

  function validateActionPredicate(value) {
    const predicate = text(value, 120);
    if (!predicate) return { valid: false, message: "A specific action verb is required for every edge." };
    const key = semanticKey(predicate);
    if (!key || GENERIC_RELATION_KEYS.has(key)) {
      return {
        valid: false,
        message: `“${predicate}” is a generic association, not a specific action. Use a concrete verb such as called, warned, built, transferredTo, acquired, or authorized.`
      };
    }
    if (/^(?:related|associated|connected|linked|involved|participat|member|belong|partof|protagonist|presentat|locatedat|occursat)/.test(key)) {
      return {
        valid: false,
        message: `“${predicate}” is too general. Name the concrete action performed by the source toward the target.`
      };
    }
    if (/\b(?:at|near|during|on\s+\d{4}|in\s+\d{4})\b/i.test(predicate) || /(?:At|Near|During|Via|Along|Toward|From|Into|Onto|In)$/.test(predicate) || /\d{4}-\d{2}-\d{2}/.test(predicate)) {
      return {
        valid: false,
        message: `“${predicate}” mixes action with place or time. Keep the label to the action only; select placeId and time separately on the edge.`
      };
    }
    const terms = predicateTerms(predicate);
    if (terms.length > 2 || (terms.length === 2 && !ACTION_PREDICATE_PARTICLES.has(terms[1].toLowerCase()))) {
      return {
        valid: false,
        message: `“${predicate}” embeds a noun, instrument, role, cause, or other context in the edge label. Canonical predicates are one action verb, optionally followed by one grammatical particle (for example searchesFor, dancesWith, transferredTo). Model other entities as nodes and time/place/other context as properties.`
      };
    }
    return { valid: true, message: "" };
  }

  function normalizeEntity(raw, index) {
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
            : {}
      )
    };
  }

  function normalizeConfidence(value) {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.min(1, Math.max(0, numeric));
  }

  function normalizeRelationship(raw, index, temporal) {
    if (!raw || typeof raw !== "object") return null;
    const subjectId = text(raw.subjectId ?? raw.start ?? raw.source, 120);
    const objectId = text(raw.objectId ?? raw.end ?? raw.target, 120);
    const predicate = text(raw.predicate || raw.label || raw.type, 120);
    if (!subjectId || !objectId || subjectId === objectId || !validateActionPredicate(predicate).valid) return null;

    let time = null;
    const sourceTime = raw.time && typeof raw.time === "object" ? raw.time : null;
    if (sourceTime && temporal) {
      const interval =
        sourceTime.type === "interval" ||
        sourceTime.openStart === true ||
        sourceTime.openEnd === true ||
        sourceTime.end !== null && sourceTime.end !== undefined;
      time = temporal.normalizeExtent(
        sourceTime,
        sourceTime.start?.value || "",
        sourceTime.end?.value || "",
        interval ? "range" : "event"
      );
    }

    return {
      id: text(raw.id, 120) || `relationship-${index + 1}`,
      subjectId,
      objectId,
      predicate,
      role: text(raw.role, 120),
      placeId: text(raw.placeId || raw.locationId, 120),
      itemIds: textList(raw.itemIds || raw.contextItemIds || raw.eventIds, { maxItems: 96, maxLength: 120 }),
      initialState: raw.initialState === "inactive" ? "inactive" : "active",
      time,
      sourceIds: textList(raw.sourceIds, { maxItems: 96, maxLength: 120 }),
      confidence: normalizeConfidence(raw.confidence),
      attributes: cleanContextFreeAttributes(
        raw.properties && typeof raw.properties === "object"
          ? raw.properties
          : raw.attributes && typeof raw.attributes === "object"
            ? raw.attributes
            : {}
      )
    };
  }

  const RELATION_CHANGE_OPERATIONS = new Set(["activate", "deactivate", "update"]);

  function normalizeRelationChanges(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 12).map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const relationshipId = text(raw.relationshipId || raw.edgeId, 120);
      if (!relationshipId) return null;
      const operation = RELATION_CHANGE_OPERATIONS.has(raw.operation) ? raw.operation : "update";
      const predicate = text(raw.predicate, 120);
      if (predicate && !validateActionPredicate(predicate).valid) return null;
      const properties = raw.properties && typeof raw.properties === "object" && !Array.isArray(raw.properties)
        ? raw.properties
        : {};
      if (Object.keys(properties).some(contextPropertyKey)) return null;
      return {
        relationshipId,
        operation,
        predicate,
        role: text(raw.role, 120),
        properties: cloneJson(properties)
      };
    }).filter(Boolean);
  }

  function relationChangeIndex(input, temporal = globalThis.TimelineTemporal) {
    const index = new Map();
    for (const item of Array.isArray(input?.items) ? input.items : []) {
      const time = temporal?.sortKey(item.time?.start || item.start);
      if (!Number.isFinite(time)) continue;
      for (const change of normalizeRelationChanges(item.relationChanges)) {
        const record = {
          ...change,
          itemId: item.id,
          itemTitle: item.title || item.id,
          time
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

  function relationChangesFor(input, relationshipId, temporal = globalThis.TimelineTemporal) {
    return relationChangeIndex(input, temporal).get(String(relationshipId)) || [];
  }

  function relationshipStateAt(
    input,
    relationship,
    viewport,
    temporal = globalThis.TimelineTemporal,
    indexedChanges = null
  ) {
    const changes = indexedChanges || relationChangesFor(input, relationship.id, temporal);
    const hasViewport = viewport && Number.isFinite(viewport.start) && Number.isFinite(viewport.end);
    const snapshotTime = hasViewport ? viewport.start + (viewport.end - viewport.start) / 2 : Number.POSITIVE_INFINITY;
    let active = relationship.initialState !== "inactive";
    let predicate = relationship.predicate;
    let role = relationship.role || "";
    let attributes = cloneJson(relationship.attributes || {}) || {};

    if (relationship.time && temporal) {
      const bounds = temporal.extentBounds?.(relationship.time);
      if (bounds?.locatable) {
        active = hasViewport
          ? bounds.end >= viewport.start && bounds.start <= viewport.end
          : true;
      }
    }

    let changedInWindow = false;
    let lastChange = null;
    for (const change of changes) {
      if (hasViewport && change.time >= viewport.start && change.time <= viewport.end) changedInWindow = true;
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
      changes
    };
  }

  function normalizeGraphData(input, temporal = globalThis.TimelineTemporal, spatial = globalThis.TimelineSpatial) {
    const entities = (Array.isArray(input?.entities) ? input.entities : [])
      .map(normalizeEntity)
      .filter(Boolean);
    const places = spatial?.normalizePlaces?.(input?.places) || [];
    const entityIds = new Set(entities.map((entity) => String(entity.id)));
    const placeIds = new Set(places.map((place) => String(place.id)));
    const relationships = (Array.isArray(input?.relationships) ? input.relationships : [])
      .map((raw, index) => normalizeRelationship(raw, index, temporal))
      .filter((relationship) =>
        relationship &&
        entityIds.has(String(relationship.subjectId)) &&
        entityIds.has(String(relationship.objectId)) &&
        (!relationship.placeId || placeIds.has(String(relationship.placeId)))
      );
    return { entities, places, relationships };
  }

  function validateGraphInput(input, spatial = globalThis.TimelineSpatial) {
    const errors = [];
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
      rawEvidence
        .map((record) => [text(record?.id, 120), record])
        .filter(([id]) => Boolean(id))
    );

    const addContextualEndpoints = (itemId, subjectId, objectId) => {
      if (!itemId || !subjectId || !objectId) return;
      if (!contextualEntityIdsByItem.has(itemId)) contextualEntityIdsByItem.set(itemId, new Set());
      const endpoints = contextualEntityIdsByItem.get(itemId);
      endpoints.add(subjectId);
      endpoints.add(objectId);
    };
  
    const registerId = (rawId, kind, label) => {
      const id = text(rawId, 120);
      if (!id) {
        errors.push(`${label}: a stable explicit ID is required; generated positional IDs are not canonical.`);
        return "";
      }
      const previous = canonicalIds.get(id);
      if (previous) {
        errors.push(`ID “${id}” is reused by ${previous} and ${kind}. Canonical entity, place, chronology, story, and relationship IDs must be unique.`);
      } else {
        canonicalIds.set(id, kind);
      }
      return id;
    };
  
    rawItems.forEach((item, index) => registerId(item?.id, `chronology item ${index + 1}`, `Chronology item ${index + 1}`));
    rawStories.forEach((story, index) => registerId(story?.id, `story ${index + 1}`, `Story ${index + 1}`));
  
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
        errors.push(`${label}: graph/place records cannot carry timeline category/group taxonomy (${taxonomyKeys.join(", ")}). Categories classify chronology items only.`);
      }
      let normalized = null;
      try {
        normalized = spatial?.normalizePlace?.(raw, index) || null;
      } catch (error) {
        errors.push(`${label}: ${error instanceof Error ? error.message : "invalid geometry."}`);
      }
      if (!normalized?.geometry) {
        errors.push(`${label}: canonical place requires Point coordinates or Polygon/MultiPolygon area geometry.`);
      }
      const icon = text(raw.icon || raw.marker?.icon || raw.attributes?.icon, 48);
      if (icon && Array.isArray(spatial?.PLACE_ICON_NAMES) && !spatial.PLACE_ICON_NAMES.includes(icon)) {
        errors.push(`${label}: unsupported semantic icon “${icon}”. Choose a registered semantic icon.`);
      }
      const markerShape = text(raw.markerShape || raw.marker?.shape || raw.attributes?.markerShape, 24);
      if (markerShape && Array.isArray(spatial?.PLACE_MARKER_SHAPES) && !spatial.PLACE_MARKER_SHAPES.includes(markerShape)) {
        errors.push(`${label}: unsupported marker shape “${markerShape}”.`);
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
        errors.push(`${label}: entity nodes cannot carry timeline category/group taxonomy (${taxonomyKeys.join(", ")}). Categories classify chronology items only.`);
      }
      if (id && itemIds.has(id)) errors.push(`${label}: entity IDs cannot collide with chronology item IDs.`);
      if (id && storyIds.has(id)) errors.push(`${label}: entity IDs cannot collide with story IDs.`);
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
      const taxonomyKeys = graphTaxonomyKeys(raw);
      if (taxonomyKeys.length) {
        errors.push(`${label}: relationships cannot carry timeline category/group taxonomy (${taxonomyKeys.join(", ")}). Categories classify chronology items only.`);
      }
  
      const predicateKey = semanticKey(predicate);
      for (const place of rawPlaces) {
        const placeName = semanticKey(place?.name);
        if (placeName && placeName.length >= 4 && predicateKey.includes(placeName)) {
          errors.push(`${label}: predicate must not embed place name “${place.name}”; use placeId.`);
          break;
        }
      }
  
      const subjectId = text(raw.subjectId || raw.start || raw.source, 120);
      const objectId = text(raw.objectId || raw.end || raw.target, 120);
      if (subjectId && objectId && subjectId === objectId) {
        errors.push(`${label}: source and target must be different entity nodes. Self-loop relationships are not permitted.`);
      }
      if (!entityIds.has(subjectId)) errors.push(`${label}: subject/source must reference an entity node.`);
      if (!entityIds.has(objectId)) errors.push(`${label}: object/target must reference an entity node.`);
  
      const placeId = text(raw.placeId, 120);
      if (placeId && !placeIds.has(placeId)) errors.push(`${label}: placeId must reference one canonical place record.`);
  
      const attributes = raw.attributes && typeof raw.attributes === "object" && !Array.isArray(raw.attributes)
        ? raw.attributes
        : raw.properties && typeof raw.properties === "object" && !Array.isArray(raw.properties)
          ? raw.properties
          : {};
      const duplicateKeys = Object.keys(attributes).filter(contextPropertyKey);
      if (duplicateKeys.length) {
        errors.push(`${label}: generic edge attributes duplicates canonical spatiotemporal context (${duplicateKeys.join(", ")}). Use edge.time and edge.placeId.`);
      }
  
      const validEndpoints =
        Boolean(id) &&
        entityIds.has(subjectId) &&
        entityIds.has(objectId) &&
        subjectId !== objectId &&
        predicateResult.valid;
      if (validEndpoints) relationshipById.set(id, { subjectId, objectId });

      for (const itemId of Array.isArray(raw.itemIds) ? raw.itemIds : []) {
        const contextId = String(itemId);
        if (!itemIds.has(contextId)) {
          errors.push(`${label}: itemIds must reference chronology records, not create graph endpoints.`);
        } else if (validEndpoints) {
          addContextualEndpoints(contextId, subjectId, objectId);
        }
      }
    });
  
    const audit = auditGraphStructure(input);
    for (const ids of audit.duplicateFactGroups) {
      errors.push(`Edges ${ids.join(", ")} duplicate one directed action fact (same source, action, target, and temporal extent). Keep one canonical edge and merge itemIds, sourceIds, place, confidence, and other properties onto it.`);
    }
    for (const [first, second] of audit.mirroredFactPairs) {
      errors.push(`Edges ${first} and ${second} mirror the same action and temporal extent in opposite directions. Do not create a reverse copy to simulate bidirectionality; add a reverse edge only for a genuinely distinct reverse action.`);
    }
    for (const id of audit.orphanEntityIds) {
      errors.push(`Node ${id}: canonical entity is orphaned. Navigation containers, stories, categories, roles, and labels stay outside graph topology; a durable entity belongs in the graph only when it participates in at least one meaningful action edge.`);
    }
  
    for (const item of rawItems) {
      const itemId = text(item?.id, 120);
      for (const change of Array.isArray(item?.relationChanges) ? item.relationChanges : []) {
        if (change?.operation === "update" && change.predicate) {
          const result = validateActionPredicate(change.predicate);
          if (!result.valid) errors.push(`Relation change ${itemId || "item"}: ${result.message}`);
        }
        const relationshipId = text(change?.relationshipId || change?.edgeId, 120);
        const relationship = relationshipById.get(relationshipId);
        if (itemId && relationship) {
          addContextualEndpoints(itemId, relationship.subjectId, relationship.objectId);
        }
      }

      if (!itemId) continue;
      const contextualEntityIds = contextualEntityIdsByItem.get(itemId) || new Set();
      for (const mention of namedEntityMentions(item, rawEntities, evidenceById)) {
        if (mention.entityIds.some((entityId) => contextualEntityIds.has(entityId))) continue;
        errors.push(
          `Item ${itemId}: narrative context names canonical entity “${mention.label}”, but no meaningful action edge linked to this event includes that entity. Create/reuse the entity and connect it as subject or target through relationship.itemIds or relationChanges.`
        );
      }
    }
  
    return errors;
  }

  function stripLegacySpatialPredicate(value) {
    let predicate = text(value, 120);
    const replacements = [
      [/Toward$/, ""],
      [/Along$/, ""],
      [/Near$/, ""],
      [/During$/, ""],
      [/Via$/, ""],
      [/From$/, ""],
      [/Into$/, ""],
      [/Onto$/, ""],
      [/At$/, ""],
      [/In$/, ""],
      [/To$/, ""]
    ];
    for (const [pattern, replacement] of replacements) {
      if (pattern.test(predicate)) {
        predicate = predicate.replace(pattern, replacement);
        break;
      }
    }
    return predicate || text(value, 120);
  }

  function placeIdentityKey(place) {
    const geometry = place?.geometry ? JSON.stringify(place.geometry) : "";
    return `${semanticKey(place?.name)}|${geometry}`;
  }

  function migrateLegacySpatialModel(input, spatial = globalThis.TimelineSpatial) {
    const migrated = cloneJson(input) || {};
    const rawEntities = Array.isArray(migrated.entities) ? migrated.entities : [];
    const legacyPlaceEntities = rawEntities.filter((entity) => ["place", "location"].includes(semanticKey(entity?.type)));
    const places = spatial?.normalizePlaces?.(migrated.places) || [];
    const placeByKey = new Map(places.map((place) => [placeIdentityKey(place), place]));
    const placeByLegacyId = new Map();

    const addPlace = (raw, preferredId = "") => {
      if (!spatial?.normalizePlace) return null;
      const candidate = spatial.normalizePlace({
        id: preferredId || raw?.id,
        name: raw?.name || raw?.label || "Place",
        geographicIdentifier: raw?.geographicIdentifier || raw?.attributes?.geographicIdentifier,
        address: raw?.address || raw?.attributes?.address,
        geometry: raw?.geometry || raw?.attributes?.geometry,
        radiusMeters: raw?.radiusMeters ?? raw?.attributes?.radiusMeters ?? raw?.attributes?.accuracyMeters,
        icon: raw?.icon || raw?.attributes?.icon || "place",
        markerShape: raw?.markerShape || raw?.attributes?.markerShape || "pin",
        attributes: raw?.attributes || {}
      }, places.length);
      if (!candidate) return null;
      const key = placeIdentityKey(candidate);
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

    const itemPlaceIds = new Map();
    migrated.items = (Array.isArray(migrated.items) ? migrated.items : []).map((item) => {
      if (!item || typeof item !== "object") return item;
      const copy = { ...item };
      if (copy.location) {
        const place = addPlace(copy.location);
        if (place && copy.id) itemPlaceIds.set(String(copy.id), place.id);
        delete copy.location;
      }
      return copy;
    });

    migrated.entities = rawEntities.filter((entity) => !["place", "location"].includes(semanticKey(entity?.type)));
    const entityIds = new Set(migrated.entities.map((entity) => String(entity?.id || "")));

    migrated.relationships = (Array.isArray(migrated.relationships) ? migrated.relationships : []).map((raw) => {
      if (!raw || typeof raw !== "object") return raw;
      const relationship = { ...raw };
      let subjectId = text(relationship.subjectId ?? relationship.start ?? relationship.source, 120);
      let objectId = text(relationship.objectId ?? relationship.end ?? relationship.target, 120);
      let placeId = text(relationship.placeId || relationship.locationId, 120);
      let usedPlaceEndpoint = false;

      if (placeByLegacyId.has(subjectId)) {
        placeId ||= placeByLegacyId.get(subjectId);
        subjectId = objectId;
        usedPlaceEndpoint = true;
      }
      if (placeByLegacyId.has(objectId)) {
        placeId ||= placeByLegacyId.get(objectId);
        objectId = subjectId;
        usedPlaceEndpoint = true;
      }

      const contexts = textList(relationship.itemIds || relationship.contextItemIds || relationship.eventIds, { maxItems: 96, maxLength: 120 });
      if (!placeId) {
        for (const itemId of contexts) {
          const contextualPlaceId = itemPlaceIds.get(String(itemId));
          if (contextualPlaceId) {
            placeId = contextualPlaceId;
            break;
          }
        }
      }

      if (usedPlaceEndpoint) relationship.predicate = stripLegacySpatialPredicate(relationship.predicate || relationship.label || relationship.type);
      relationship.subjectId = subjectId;
      relationship.objectId = objectId;
      relationship.placeId = placeId || "";
      delete relationship.locationId;
      return relationship;
    }).filter((relationship) =>
      relationship &&
      entityIds.has(String(relationship.subjectId || "")) &&
      entityIds.has(String(relationship.objectId || ""))
    );

    migrated.places = places;
    return migrated;
  }

  function toOrbGraph({ entities = [], relationships = [] } = {}) {
    const nodes = [];
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
          attributes: cloneJson(entity.attributes || {})
        }
      });
    }

    const edges = relationships
      .filter((relationship) =>
        seen.has(String(relationship.subjectId)) &&
        seen.has(String(relationship.objectId)) &&
        String(relationship.subjectId) !== String(relationship.objectId) &&
        validateActionPredicate(relationship.predicate).valid
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
        attributes: cloneJson(relationship.attributes || {})
      }
    }));

    return { nodes, edges };
  }

  function relationshipWindowState(relationship, viewport, temporal = globalThis.TimelineTemporal) {
    if (!relationship) return "inactive";
    if (!relationship.time || !temporal) return "timeless";
    const bounds = temporal.extentBounds?.(relationship.time);
    if (!bounds?.locatable) return "unknown";
    if (!viewport || !Number.isFinite(viewport.start) || !Number.isFinite(viewport.end)) return "active";
    return bounds.end >= viewport.start && bounds.start <= viewport.end ? "active" : "inactive";
  }

  function graphForWindow(input, viewport, temporal = globalThis.TimelineTemporal) {
    const entities = Array.isArray(input?.entities) ? input.entities : [];
    const relationships = Array.isArray(input?.relationships) ? input.relationships : [];
    const graphData = toOrbGraph({ entities, relationships });
    const states = new Map();
    const relationshipById = new Map(
      relationships.map((relationship) => [String(relationship.id), relationship])
    );
    const changesByRelationship = relationChangeIndex(input, temporal);

    for (const relationship of relationships) {
      const derived = relationshipStateAt(
        input,
        relationship,
        viewport,
        temporal,
        changesByRelationship.get(String(relationship.id)) || []
      );
      states.set(String(relationship.id), derived);
    }

    const edges = graphData.edges.map((edge) => {
      const relationship = relationshipById.get(String(edge.id));
      const state = states.get(String(edge.id));
      if (!relationship || !state) return { ...edge, temporalState: "inactive" };

      const structurallyTimeless =
        !relationship.time &&
        state.changes.length === 0 &&
        state.active;
      const explicitWindowState = relationshipWindowState(relationship, viewport, temporal);
      const temporalState = state.changedInWindow
        ? "changed"
        : structurallyTimeless
          ? "timeless"
          : relationship.time
            ? explicitWindowState === "unknown" && state.active
              ? "unknown"
              : explicitWindowState === "active" && state.active
                ? "active"
                : "inactive"
            : state.active
              ? "active"
              : "inactive";

      return {
        ...edge,
        label: state.predicate,
        temporalState,
        properties: {
          ...edge.properties,
          role: state.role,
          attributes: cloneJson(state.attributes),
          lastChange: state.lastChange ? cloneJson(state.lastChange) : null,
          changes: cloneJson(state.changes)
        }
      };
    }).filter((edge) => edge.temporalState !== "inactive");

    const hasViewport =
      viewport &&
      Number.isFinite(viewport.start) &&
      Number.isFinite(viewport.end);
    if (!hasViewport) return { ...graphData, edges };

    const visibleNodeIds = new Set();
    for (const edge of edges) {
      visibleNodeIds.add(String(edge.start));
      visibleNodeIds.add(String(edge.end));
    }

    return {
      nodes: graphData.nodes.filter((node) => visibleNodeIds.has(String(node.id))),
      edges
    };
  }

  function neighborhoodGraph(input, rootId, viewport, { depth = 1, limit = 36 } = {}) {
    const data = graphForWindow(input, viewport);
    const nodeById = new Map(data.nodes.map((node) => [String(node.id), node]));
    const root = String(rootId || "");
    if (!root) return { nodes: [], edges: [] };

    const rootItem = (Array.isArray(input?.items) ? input.items : []).find(
      (item) => String(item.id) === root
    );
    const rootChangeIds = new Set(
      normalizeRelationChanges(rootItem?.relationChanges).map((change) => String(change.relationshipId))
    );
    const contextEdges = data.edges.filter((edge) =>
      (Array.isArray(edge.properties?.itemIds) && edge.properties.itemIds.some((id) => String(id) === root)) ||
      rootChangeIds.has(String(edge.id))
    );

    const selected = new Set();
    if (nodeById.has(root)) selected.add(root);
    for (const edge of contextEdges) {
      selected.add(String(edge.start));
      selected.add(String(edge.end));
    }
    if (!selected.size) return { nodes: [], edges: [] };

    const relevantEdges = data.edges.filter((edge) =>
      edge.temporalState !== "inactive" ||
      contextEdges.some((candidate) => String(candidate.id) === String(edge.id))
    );

    let frontier = new Set(selected);
    for (let level = 0; level < Math.max(0, depth); level += 1) {
      const next = new Set();
      for (const edge of relevantEdges) {
        const start = String(edge.start);
        const end = String(edge.end);
        if (frontier.has(start) && !selected.has(end)) next.add(end);
        if (frontier.has(end) && !selected.has(start)) next.add(start);
      }
      for (const id of next) {
        if (selected.size >= limit) break;
        selected.add(id);
      }
      frontier = next;
      if (!frontier.size || selected.size >= limit) break;
    }

    const nodes = [...selected].map((id) => nodeById.get(id)).filter(Boolean);
    const edges = relevantEdges.filter(
      (edge) => selected.has(String(edge.start)) && selected.has(String(edge.end))
    );
    return { nodes, edges };
  }

  function temporalRelationProjection(relationships, temporal = globalThis.TimelineTemporal) {
    const projected = [];
    for (const relationship of Array.isArray(relationships) ? relationships : []) {
      if (!relationship?.time?.start || !temporal) continue;
      const start = temporal.sortKey(relationship.time.start);
      const end = relationship.time.end ? temporal.sortKey(relationship.time.end) : start;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      projected.push({
        id: relationship.id,
        subjectId: relationship.subjectId,
        objectId: relationship.objectId,
        predicate: relationship.predicate,
        role: relationship.role,
        placeId: relationship.placeId || "",
        itemIds: cloneJson(relationship.itemIds || []),
        start,
        end
      });
    }
    return projected;
  }

  globalThis.TimelineGraph = Object.freeze({
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
    neighborhoodGraph,
    relationshipStateAt,
    relationshipWindowState,
    temporalRelationProjection,
    toOrbGraph
  });
})();
