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
      attributes: raw.attributes && typeof raw.attributes === "object" ? cloneJson(raw.attributes) : {}
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
      time,
      attributes: raw.attributes && typeof raw.attributes === "object" ? cloneJson(raw.attributes) : {}
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

  function toOrbGraph({ entities = [], relationships = [], items = [] } = {}) {
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

    const edges = relationships.map((relationship) => ({
      id: relationship.id,
      start: relationship.subjectId,
      end: relationship.objectId,
      label: relationship.predicate,
      properties: {
        role: relationship.role || "",
        time: cloneJson(relationship.time || null),
        attributes: cloneJson(relationship.attributes || {})
      }
    }));

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
        start,
        end
      });
    }
    return projected;
  }

  globalThis.TimelineGraph = Object.freeze({
    normalizeGraphData,
    temporalRelationProjection,
    toOrbGraph
  });
})();
