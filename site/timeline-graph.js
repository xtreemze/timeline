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

  function normalizeEntity(raw, index) {
    if (!raw || typeof raw !== "object") return null;
    const id = text(raw.id, 120) || `entity-${index + 1}`;
    return {
      id,
      type: text(raw.type, 60) || "entity",
      name: text(raw.name || raw.label || raw.title, 180) || id,
      identifiers: Array.isArray(raw.identifiers) ? cloneJson(raw.identifiers) : [],
      attributes: raw.properties && typeof raw.properties === "object"
        ? cloneJson(raw.properties)
        : raw.attributes && typeof raw.attributes === "object"
          ? cloneJson(raw.attributes)
          : {}
    };
  }

  function normalizeRelationship(raw, index, temporal) {
    if (!raw || typeof raw !== "object") return null;
    const subjectId = text(raw.subjectId ?? raw.start ?? raw.source, 120);
    const objectId = text(raw.objectId ?? raw.end ?? raw.target, 120);
    if (!subjectId || !objectId) return null;

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
      predicate: text(raw.predicate || raw.label || raw.type, 120) || "relatedTo",
      role: text(raw.role, 120),
      initialState: raw.initialState === "inactive" ? "inactive" : "active",
      time,
      attributes: raw.properties && typeof raw.properties === "object"
        ? cloneJson(raw.properties)
        : raw.attributes && typeof raw.attributes === "object"
          ? cloneJson(raw.attributes)
          : {}
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
      return {
        relationshipId,
        operation,
        predicate: text(raw.predicate, 120),
        role: text(raw.role, 120),
        properties: raw.properties && typeof raw.properties === "object" && !Array.isArray(raw.properties)
          ? cloneJson(raw.properties)
          : {}
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
          ? relationship.time.end
            ? snapshotTime >= start && snapshotTime <= end
            : viewport.start <= start && start <= viewport.end
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

  function normalizeGraphData(input, temporal = globalThis.TimelineTemporal) {
    const entities = (Array.isArray(input?.entities) ? input.entities : [])
      .map(normalizeEntity)
      .filter(Boolean);
    const relationships = (Array.isArray(input?.relationships) ? input.relationships : [])
      .map((raw, index) => normalizeRelationship(raw, index, temporal))
      .filter(Boolean);
    return { entities, relationships };
  }

  function toOrbGraph({ entities = [], relationships = [], items = [], stories = [] } = {}) {
    const nodes = [];
    const seen = new Set();

    for (const entity of entities) {
      if (!entity?.id || seen.has(entity.id)) continue;
      seen.add(entity.id);
      nodes.push({
        id: entity.id,
        label: entity.name || entity.id,
        properties: {
          timelineType: entity.type || "entity",
          identifiers: cloneJson(entity.identifiers || []),
          attributes: cloneJson(entity.attributes || {})
        }
      });
    }

    for (const item of items) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      nodes.push({
        id: item.id,
        label: item.title || item.id,
        properties: {
          timelineType: "chronology-item",
          kind: item.kind || "event",
          time: cloneJson(item.time || null),
          location: cloneJson(item.location || null)
        }
      });
    }

    for (const story of stories) {
      if (!story?.id || seen.has(story.id)) continue;
      seen.add(story.id);
      nodes.push({
        id: story.id,
        label: story.title || story.id,
        properties: {
          timelineType: "story",
          description: story.description || "",
          itemIds: cloneJson(story.itemIds || [])
        }
      });
    }

    const edges = relationships.map((relationship) => ({
      id: relationship.id,
      start: relationship.subjectId,
      end: relationship.objectId,
      label: relationship.predicate,
      properties: {
        role: relationship.role || "",
        initialState: relationship.initialState || "active",
        time: cloneJson(relationship.time || null),
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
    const items = Array.isArray(input?.items) ? input.items : [];
    const stories = Array.isArray(input?.stories) ? input.stories : [];
    const graphData = toOrbGraph({ entities, relationships, items, stories });
    const states = new Map();
    const relationshipById = new Map(relationships.map((relationship) => [String(relationship.id), relationship]));
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

    return {
      ...graphData,
      edges: graphData.edges.map((edge) => {
        const state = states.get(String(edge.id));
        if (!state) return { ...edge, temporalState: "inactive" };
        const structurallyTimeless =
          !relationshipById.get(String(edge.id))?.time?.start &&
          state.changes.length === 0 &&
          state.active;
        return {
          ...edge,
          label: state.predicate,
          temporalState: state.changedInWindow
            ? "changed"
            : structurallyTimeless
              ? "timeless"
              : state.active
                ? "active"
                : "inactive",
          properties: {
            ...edge.properties,
            role: state.role,
            attributes: cloneJson(state.attributes),
            lastChange: state.lastChange ? cloneJson(state.lastChange) : null,
            changes: cloneJson(state.changes)
          }
        };
      })
    };
  }

  function neighborhoodGraph(input, rootId, viewport, { depth = 1, limit = 36 } = {}) {
    const data = graphForWindow(input, viewport);
    const nodeById = new Map(data.nodes.map((node) => [String(node.id), node]));
    const root = String(rootId || "");
    if (!root || !nodeById.has(root)) return { nodes: [], edges: [] };

    const selected = new Set([root]);
    const derivedEdges = [];
    const rootItem = (Array.isArray(input?.items) ? input.items : []).find(
      (item) => String(item.id) === root
    );
    for (const change of normalizeRelationChanges(rootItem?.relationChanges)) {
      const edge = data.edges.find((candidate) => String(candidate.id) === String(change.relationshipId));
      if (!edge) continue;
      selected.add(String(edge.start));
      selected.add(String(edge.end));
      derivedEdges.push({
        id: `change:${root}:${edge.id}`,
        start: root,
        end: String(edge.start),
        label:
          change.operation === "activate" ? "activates" :
          change.operation === "deactivate" ? "deactivates" :
          "updates",
        temporalState: "changed",
        properties: {
          timelineType: "relation-change",
          relationshipId: edge.id,
          operation: change.operation,
          attributes: cloneJson(change.properties || {})
        }
      });
    }

    let frontier = new Set(selected);
    for (let level = 0; level < Math.max(0, depth); level += 1) {
      const next = new Set();
      for (const edge of data.edges) {
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
    const edges = data.edges.filter(
      (edge) => selected.has(String(edge.start)) && selected.has(String(edge.end))
    );
    return { nodes, edges: [...edges, ...derivedEdges] };
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
        start,
        end
      });
    }
    return projected;
  }

  globalThis.TimelineGraph = Object.freeze({
    graphForWindow,
    normalizeGraphData,
    normalizeRelationChanges,
    neighborhoodGraph,
    relationshipStateAt,
    relationshipWindowState,
    temporalRelationProjection,
    toOrbGraph
  });
})();
