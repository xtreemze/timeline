import {
  LUM_PROJECT_INTERCHANGE_VERSION,
  LUM_PROJECT_SCHEMA_ID,
  validateProjectInterchange,
} from "../../src/application/project-interchange.ts";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "../../src/application/project-repository.ts";
import { LUM_CHANGE_PROPOSAL_SCHEMA_ID } from "./lum-agent-proposal.mjs";

const COLLECTIONS = Object.freeze([
  "entities",
  "relationships",
  "occurrences",
  "trajectories",
  "places",
  "sources",
  "categories",
  "stories",
]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function ids(value) {
  return list(value).filter((entry) => typeof entry === "string" && entry);
}

function optionValues(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (typeof value === "string" && value) values.push(value);
  }
  return values;
}

export function parseLumAgentSelectors(args) {
  const storyIds = optionValues(args, "--story");
  const occurrenceIds = optionValues(args, "--occurrence");
  const entityIds = optionValues(args, "--entity");
  const rawIds = optionValues(args, "--ids").flatMap((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  const rawDepth = optionValues(args, "--depth").at(-1);
  const depth = rawDepth === undefined ? undefined : Number(rawDepth);
  if (depth !== undefined && (!Number.isInteger(depth) || depth < 0 || depth > 3)) {
    throw new Error("Agent entity context depth must be an integer from 0 to 3.");
  }

  const modes = [
    storyIds.length ? "story" : null,
    occurrenceIds.length ? "occurrence" : null,
    entityIds.length ? "entity" : null,
    rawIds.length ? "ids" : null,
  ].filter(Boolean);
  if (modes.length > 1) {
    throw new Error(
      "Use one bounded agent selector mode at a time: --story, --occurrence, --entity, or --ids.",
    );
  }
  if (depth !== undefined && !entityIds.length) {
    throw new Error("--depth is only valid with --entity.");
  }

  if (storyIds.length) return { storyIds: Object.freeze(storyIds) };
  if (occurrenceIds.length) return { occurrenceIds: Object.freeze(occurrenceIds) };
  if (entityIds.length) {
    return {
      entityIds: Object.freeze(entityIds),
      ...(depth !== undefined ? { depth } : {}),
    };
  }
  if (rawIds.length) return { ids: Object.freeze(rawIds) };
  return {};
}

function compactEntity(record) {
  return {
    id: String(record.id),
    type: record.type,
    name: record.name,
    ...(record.identityResolution ? { identityResolution: record.identityResolution } : {}),
    sourceIds: ids(record.sourceIds),
  };
}

function compactRelationship(record) {
  return {
    id: String(record.id),
    subjectId: String(record.subjectId),
    predicate: record.predicate,
    objectId: String(record.objectId),
    ...(record.occurrenceType ? { occurrenceType: record.occurrenceType } : {}),
    ...(record.placeId ? { placeId: String(record.placeId) } : {}),
    sourceIds: ids(record.sourceIds),
    confidence: record.confidence ?? null,
    time: record.time ?? null,
  };
}

function compactOccurrence(record) {
  return {
    id: String(record.id),
    ...(record.title ? { title: record.title } : {}),
    ...(record.occurrenceType ? { occurrenceType: record.occurrenceType } : {}),
    time: record.time ?? null,
    ...(record.placeId ? { placeId: String(record.placeId) } : {}),
    participantContexts: list(record.participantContexts).map((participant) => ({
      entityId: String(participant.entityId),
      ...(participant.roleType ? { roleType: participant.roleType } : {}),
      ...(participant.representedEntityId
        ? { representedEntityId: String(participant.representedEntityId) }
        : {}),
      ...(participant.organizationId ? { organizationId: String(participant.organizationId) } : {}),
    })),
    relationshipIds: ids(record.relationshipIds),
    trajectoryIds: ids(record.trajectoryIds),
    sourceIds: ids(record.sourceIds),
    confidence: record.confidence ?? null,
  };
}

function compactTrajectory(record) {
  return {
    id: String(record.id),
    sourceIds: ids(record.sourceIds),
    observedEntityIds: ids(record.observedEntityIds),
    sampleCount: Number(record.sampleCount ?? 0),
    time: record.time ?? null,
    bounds: record.bounds ?? null,
  };
}

function compactPlace(record) {
  return {
    id: String(record.id),
    name: record.name,
    geometry: record.geometry,
    sourceIds: ids(record.sourceIds),
  };
}

function compactSource(record) {
  return {
    id: String(record.id),
    kind: record.kind,
    title: record.title,
    ...(record.sourceName ? { sourceName: record.sourceName } : {}),
    ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}),
  };
}

function compactCategory(record) {
  return {
    id: String(record.id),
    name: record.name,
    ...(record.color ? { color: record.color } : {}),
  };
}

function compactStory(record) {
  return {
    id: String(record.id),
    title: record.title,
    ...(record.description ? { description: record.description } : {}),
    occurrenceIds: ids(record.occurrenceIds),
    placeIds: ids(record.placeIds),
  };
}

const COMPACT = Object.freeze({
  entities: compactEntity,
  relationships: compactRelationship,
  occurrences: compactOccurrence,
  trajectories: compactTrajectory,
  places: compactPlace,
  sources: compactSource,
  categories: compactCategory,
  stories: compactStory,
});

function contextMode(selectors) {
  if (selectors.storyIds?.length) return "story";
  if (selectors.occurrenceIds?.length) return "occurrence";
  if (selectors.entityIds?.length) return "entity";
  if (selectors.ids?.length) return "ids";
  return "project";
}

export function buildLumAgentContext(source, selectors = {}) {
  const validation = validateProjectInterchange(source);
  if (!validation.valid) {
    const error = new Error("Cannot build agent context from an invalid Lūm project.");
    error.diagnostics = validation.diagnostics;
    throw error;
  }

  const snapshot = validation.snapshot;
  const project = snapshot.project;
  const arrays = Object.fromEntries(COLLECTIONS.map((name) => [name, list(project[name])]));
  const indexes = Object.fromEntries(
    COLLECTIONS.map((name) => [
      name,
      new Map(arrays[name].map((record) => [String(record.id), record])),
    ]),
  );
  const selected = Object.fromEntries(COLLECTIONS.map((name) => [name, new Set()]));
  const unresolved = [];
  const unresolvedKeys = new Set();
  const queue = [];

  const unresolvedRef = (collection, id, from) => {
    const key = `${collection}:${id}:${from}`;
    if (unresolvedKeys.has(key)) return;
    unresolvedKeys.add(key);
    unresolved.push({ collection, id: String(id), from });
  };

  const add = (collection, id, from, required = false) => {
    if (!id) return false;
    const key = String(id);
    const record = indexes[collection]?.get(key);
    if (!record) {
      if (required) throw new Error(`Unknown ${collection.slice(0, -1)} "${key}".`);
      unresolvedRef(collection, key, from);
      return false;
    }
    if (selected[collection].has(key)) return false;
    selected[collection].add(key);
    queue.push({ collection, record });
    return true;
  };

  const addCanonicalOccurrence = (id, from, required = false) => {
    if (!id) return false;
    const key = String(id);
    if (indexes.occurrences.has(key)) return add("occurrences", key, from, required);
    if (indexes.relationships.has(key)) return add("relationships", key, from, required);
    if (required) throw new Error(`Unknown occurrence "${key}".`);
    unresolvedRef("occurrences", key, from);
    return false;
  };

  const addSources = (values, from) => {
    for (const id of ids(values)) add("sources", id, from);
  };

  const addActorContext = (context, from) => {
    if (!context || typeof context !== "object") return;
    if (context.representedEntityId) add("entities", context.representedEntityId, from);
    if (context.organizationId) add("entities", context.organizationId, from);
    addSources(context.authoritySourceIds, from);
  };

  const closeRecord = ({ collection, record }) => {
    const from = `${collection}/${record.id}`;
    if (collection === "entities") {
      addSources(record.sourceIds, from);
      for (const identifier of list(record.identifiers)) addSources(identifier?.sourceIds, from);
      for (const appellation of list(record.appellations)) addSources(appellation?.sourceIds, from);
      return;
    }
    if (collection === "relationships") {
      add("entities", record.subjectId, from);
      add("entities", record.objectId, from);
      if (record.placeId) add("places", record.placeId, from);
      addSources(record.sourceIds, from);
      addActorContext(record.subjectContext, from);
      addActorContext(record.objectContext, from);
      return;
    }
    if (collection === "occurrences") {
      if (record.placeId) add("places", record.placeId, from);
      for (const id of ids(record.relationshipIds)) add("relationships", id, from);
      for (const id of ids(record.trajectoryIds)) add("trajectories", id, from);
      addSources(record.sourceIds, from);
      for (const participant of list(record.participantContexts)) {
        add("entities", participant?.entityId, from);
        addActorContext(participant, from);
      }
      return;
    }
    if (collection === "trajectories") {
      addSources(record.sourceIds, from);
      for (const id of ids(record.observedEntityIds)) add("entities", id, from);
      return;
    }
    if (collection === "places") {
      addSources(record.sourceIds, from);
      return;
    }
    if (collection === "stories") {
      for (const id of ids(record.occurrenceIds)) addCanonicalOccurrence(id, from);
      for (const id of ids(record.placeIds)) add("places", id, from);
    }
  };

  if (selectors.storyIds?.length) {
    for (const id of selectors.storyIds) add("stories", id, "selector", true);
  } else if (selectors.occurrenceIds?.length) {
    for (const id of selectors.occurrenceIds) addCanonicalOccurrence(id, "selector", true);
  } else if (selectors.entityIds?.length) {
    const depth = selectors.depth ?? 1;
    let frontier = new Set(selectors.entityIds.map(String));
    for (const id of frontier) add("entities", id, "selector", true);
    for (let hop = 0; hop < depth; hop += 1) {
      const next = new Set();
      for (const relationship of arrays.relationships) {
        const subject = String(relationship.subjectId);
        const object = String(relationship.objectId);
        if (!frontier.has(subject) && !frontier.has(object)) continue;
        add("relationships", relationship.id, `entity-depth-${hop + 1}`);
        const other = frontier.has(subject) ? object : subject;
        if (!selected.entities.has(other)) next.add(other);
        add("entities", other, `entity-depth-${hop + 1}`);
      }
      const relatedRelationshipIds = selected.relationships;
      for (const occurrence of arrays.occurrences) {
        const occurrenceRelationships = ids(occurrence.relationshipIds);
        const participantIds = list(occurrence.participantContexts).map((item) =>
          String(item?.entityId ?? ""),
        );
        if (
          occurrenceRelationships.some((id) => relatedRelationshipIds.has(id)) ||
          participantIds.some((id) => frontier.has(id))
        ) {
          add("occurrences", occurrence.id, `entity-depth-${hop + 1}`);
        }
      }
      frontier = next;
      if (!frontier.size) break;
    }
  } else if (selectors.ids?.length) {
    for (const id of selectors.ids) {
      let found = false;
      for (const collection of COLLECTIONS) {
        if (indexes[collection].has(String(id))) {
          add(collection, id, "selector");
          found = true;
        }
      }
      if (!found) throw new Error(`Unknown canonical ID "${id}".`);
    }
  } else {
    for (const collection of COLLECTIONS) {
      for (const record of arrays[collection]) add(collection, record.id, "project");
    }
  }

  while (queue.length) closeRecord(queue.shift());

  const compactProject = {
    projectKey: snapshot.projectKey,
    revision: snapshot.revision,
  };
  for (const collection of COLLECTIONS) {
    compactProject[collection] = arrays[collection]
      .filter((record) => selected[collection].has(String(record.id)))
      .map((record) => COMPACT[collection](record));
  }

  return Object.freeze({
    protocol: "lum-agent-context-v2",
    selector: Object.freeze({
      mode: contextMode(selectors),
      ...(selectors.storyIds?.length ? { storyIds: Object.freeze([...selectors.storyIds]) } : {}),
      ...(selectors.occurrenceIds?.length
        ? { occurrenceIds: Object.freeze([...selectors.occurrenceIds]) }
        : {}),
      ...(selectors.entityIds?.length
        ? {
            entityIds: Object.freeze([...selectors.entityIds]),
            depth: selectors.depth ?? 1,
          }
        : {}),
      ...(selectors.ids?.length ? { ids: Object.freeze([...selectors.ids]) } : {}),
    }),
    schema: Object.freeze({
      id: LUM_PROJECT_SCHEMA_ID,
      interchangeVersion: LUM_PROJECT_INTERCHANGE_VERSION,
      canonicalSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      proposalSchemaId: LUM_CHANGE_PROPOSAL_SCHEMA_ID,
    }),
    manifest: Object.freeze({
      counts: Object.freeze(
        Object.fromEntries(COLLECTIONS.map((name) => [name, arrays[name].length])),
      ),
      included: Object.freeze(
        Object.fromEntries(COLLECTIONS.map((name) => [name, selected[name].size])),
      ),
    }),
    project: Object.freeze(compactProject),
    unresolvedReferences: Object.freeze(unresolved),
    composer: Object.freeze({
      syntax:
        "SUBJECT ACTION OBJECT [at PLACE] [on INSTANT | from START to END] [[category: CATEGORY, tags: A|B]]",
      command: 'lum compose "<sentence>" --json',
      rule: "Composer output is a proposal. It must pass canonical validation before any project mutation.",
    }),
    proposalWorkflow: Object.freeze({
      schema: LUM_CHANGE_PROPOSAL_SCHEMA_ID,
      scaffold:
        "lum agent scaffold-proposal --project <project.lum.json> --output change.lum-proposal.json",
      validate:
        "lum agent validate-proposal change.lum-proposal.json --project <project.lum.json> --json",
      apply:
        "lum agent apply change.lum-proposal.json --project <project.lum.json> --output candidate.lum.json --json",
      rule: "Provider output is untrusted. Apply writes a separate candidate and never authorizes canonical replacement.",
    }),
    workflow: Object.freeze([
      "lum agent context <project.lum.json> --json",
      'lum compose "<occurrence sentence>" --json',
      "author a strict lum-change-proposal-v1 document against projectKey + revision",
      "lum agent validate-proposal <proposal.json> --project <project.lum.json> --json",
      "lum agent apply <proposal.json> --project <project.lum.json> --json",
      "lum lint <candidate.lum.json> --json",
      "require user verification before canonical replacement",
    ]),
  });
}
