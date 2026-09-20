(() => {
  "use strict";

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

  function semanticKey(value) {
    return text(value, 120).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function contextPropertyKey(value) {
    return ENTITY_CONTEXT_KEYS.has(semanticKey(value));
  }

  function cleanContextFreeAttributes(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const cleaned = {};
    for (const [key, entry] of Object.entries(value)) {
      if (!contextPropertyKey(key)) cleaned[key] = cloneJson(entry);
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
    if (!subjectId || !objectId || !validateActionPredicate(predicate).valid) return null;

    let time = null;
    const sourceTime = raw.time && typeof raw.time === "object" ? raw.time : null;
    if (sourceTime && temporal) {
      const hasEnd = Boolean(sourceTime.end?.value);
      time = temporal.normalizeExtent(
        sourceTime,
        sourceTime.start?.value || "",
        hasEnd ? sourceTime.end?.value || "" : null,
        hasEnd ? "range" : "event"
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

    if (relationship.time?.start && temporal) {
      const start = temporal.sortKey(relationship.time.start);
      const end = relationship.time.end ? temporal.sortKey(relationship.time.end) : start;
      if (Number.isFinite(start) && Number.isFinite(end)) {
        active = hasViewport
          ? end >= viewport.start && start <= viewport.end
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
    const places = spatial?.normalizePlaces?.(rawPlaces) || [];
    const entityIds = new Set();
    const placeIds = new Set(places.map((place) => String(place.id)));
    const placeNames = places.map((place) => semanticKey(place.name)).filter((name) => name.length >= 4);
    const itemIds = new Set(rawItems.map((item) => text(item?.id, 120)).filter(Boolean));
    const storyIds = new Set(rawStories.map((story) => text(story?.id, 120)).filter(Boolean));

    rawPlaces.forEach((place, index) => {
      const id = text(place?.id, 120) || `place ${index + 1}`;
      let normalized = null;
      try {
        normalized = spatial?.normalizePlace?.(place, index) || null;
      } catch (error) {
        errors.push(`Place ${id}: ${error instanceof Error ? error.message : "invalid geometry."}`);
        return;
      }
      if (!normalized) {
        errors.push(`Place ${id}: a canonical place requires a name and point or area geometry.`);
        return;
      }
      if (!normalized.geometry) {
        errors.push(`Place ${id}: a canonical place requires Point coordinates or Polygon/MultiPolygon area geometry.`);
      }
      const icon = text(place?.icon || place?.marker?.icon || place?.attributes?.icon, 48);
      if (icon && Array.isArray(spatial?.PLACE_ICON_NAMES) && !spatial.PLACE_ICON_NAMES.includes(icon)) {
        errors.push(`Place ${id}: unsupported semantic icon “${icon}”. Choose a registered semantic icon.`);
      }
      const markerShape = text(place?.markerShape || place?.marker?.shape || place?.attributes?.markerShape, 24);
      if (markerShape && Array.isArray(spatial?.PLACE_MARKER_SHAPES) && !spatial.PLACE_MARKER_SHAPES.includes(markerShape)) {
        errors.push(`Place ${id}: unsupported marker shape “${markerShape}”.`);
      }
    });

    rawEntities.forEach((entity, index) => {
      const validation = validateEntityNode(entity);
      const id = text(entity?.id, 120);
      if (!validation.valid) errors.push(`Node ${id || index + 1}: ${validation.message}`);
      if (id && itemIds.has(id)) errors.push(`Node ${id}: entity IDs cannot collide with chronology item IDs.`);
      if (id && storyIds.has(id)) errors.push(`Node ${id}: entity IDs cannot collide with story IDs.`);
      if (id) entityIds.add(id);
    });

    rawRelationships.forEach((relationship, index) => {
      const id = text(relationship?.id, 120) || `relationship ${index + 1}`;
      const predicate = text(relationship?.predicate || relationship?.label || relationship?.type, 120);
      const validation = validateActionPredicate(predicate);
      if (!validation.valid) errors.push(`Edge ${id}: ${validation.message}`);
      const predicateKey = semanticKey(predicate);
      const embeddedPlace = placeNames.find((name) => predicateKey.includes(name));
      if (embeddedPlace) errors.push(`Edge ${id}: the action label must not contain a place name; select the reusable place through placeId.`);
      const subjectId = text(relationship?.subjectId ?? relationship?.start ?? relationship?.source, 120);
      const objectId = text(relationship?.objectId ?? relationship?.end ?? relationship?.target, 120);
      if (!entityIds.has(subjectId) || !entityIds.has(objectId)) {
        errors.push(`Edge ${id}: endpoints must both be entity nodes. Time and place are edge properties, never endpoint nodes.`);
      }
      const placeId = text(relationship?.placeId || relationship?.locationId, 120);
      if (placeId && !placeIds.has(placeId)) errors.push(`Edge ${id}: unknown placeId “${placeId}”. Create/reuse a canonical place record first.`);
      const relationshipAttributes =
        relationship?.properties && typeof relationship.properties === "object" ? relationship.properties :
        relationship?.attributes && typeof relationship.attributes === "object" ? relationship.attributes :
        {};
      const duplicateContextKey = Object.keys(relationshipAttributes).find(contextPropertyKey);
      if (duplicateContextKey) {
        errors.push(`Edge ${id}: property “${duplicateContextKey}” duplicates canonical spatiotemporal context. Use edge.time or edge.placeId.`);
      }
      const contextIds = textList(
        relationship?.itemIds || relationship?.contextItemIds || relationship?.eventIds,
        { maxItems: 96, maxLength: 120 }
      );
      for (const contextId of contextIds) {
        if (!itemIds.has(contextId)) errors.push(`Edge ${id}: unknown timeline context item “${contextId}”.`);
      }
    });

    rawItems.forEach((item, itemIndex) => {
      for (const change of Array.isArray(item?.relationChanges) ? item.relationChanges : []) {
        const predicate = text(change?.predicate, 120);
        if (!predicate) continue;
        const validation = validateActionPredicate(predicate);
        if (!validation.valid) {
          errors.push(`Item ${text(item?.id, 120) || itemIndex + 1} relation update: ${validation.message}`);
        }
      }
    });

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
    if (!relationship.time?.start || !temporal) return "timeless";
    const start = temporal.sortKey(relationship.time.start);
    const end = relationship.time.end ? temporal.sortKey(relationship.time.end) : start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "inactive";
    if (!viewport || !Number.isFinite(viewport.start) || !Number.isFinite(viewport.end)) return "active";
    return end >= viewport.start && start <= viewport.end ? "active" : "inactive";
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
        !relationship.time?.start &&
        state.changes.length === 0 &&
        state.active;
      const explicitWindowState = relationshipWindowState(relationship, viewport, temporal);
      const temporalState = state.changedInWindow
        ? "changed"
        : structurallyTimeless
          ? "timeless"
          : relationship.time?.start
            ? explicitWindowState === "active" && state.active
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
    graphForWindow,
    migrateLegacySpatialModel,
    normalizeGraphData,
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
