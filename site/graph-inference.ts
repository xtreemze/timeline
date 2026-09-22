const SCHEMA_VERSION = "timeline-graph-inference-v1";
const MAX_FRAGMENT_LENGTH = 5000;
const MAX_CONTEXT_CHARS = 24000;

function clone(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function text(value: unknown, max: number = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function confidence(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function semanticKey(value: unknown): string {
  return String(value || "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/['']s\b/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTextList(value: unknown, maxItems: number = 24, maxLength: number = 240): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => text(entry, maxLength)).filter(Boolean))].slice(0, maxItems);
}

export function responseSchema(): Record<string, any> {
  const sourceRefs = {
    type: "array",
    maxItems: 16,
    items: { type: "string", maxLength: 160 }
  };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      entities: {
        type: "array",
        maxItems: 48,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            key: { type: "string", maxLength: 80 },
            name: { type: "string", maxLength: 180 },
            type: { type: "string", maxLength: 60 },
            alternateNames: {
              type: "array",
              maxItems: 12,
              items: { type: "string", maxLength: 180 }
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            sourceRefs,
            rationale: { type: "string", maxLength: 400 }
          },
          required: ["key", "name", "type", "confidence", "sourceRefs", "rationale"]
        }
      },
      places: {
        type: "array",
        maxItems: 24,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            key: { type: "string", maxLength: 80 },
            name: { type: "string", maxLength: 180 },
            geographicIdentifier: { type: "string", maxLength: 300 },
            address: { type: "string", maxLength: 500 },
            latitude: { type: "number", minimum: -90, maximum: 90 },
            longitude: { type: "number", minimum: -180, maximum: 180 },
            coordinatesExplicit: { type: "boolean" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            sourceRefs,
            rationale: { type: "string", maxLength: 400 }
          },
          required: ["key", "name", "coordinatesExplicit", "confidence", "sourceRefs", "rationale"]
        }
      },
      relationships: {
        type: "array",
        maxItems: 64,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            key: { type: "string", maxLength: 80 },
            subjectKey: { type: "string", maxLength: 80 },
            predicate: { type: "string", maxLength: 120 },
            objectKey: { type: "string", maxLength: 80 },
            placeKey: { type: "string", maxLength: 80 },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            sourceRefs,
            rationale: { type: "string", maxLength: 400 }
          },
          required: ["key", "subjectKey", "predicate", "objectKey", "confidence", "sourceRefs", "rationale"]
        }
      },
      unresolved: {
        type: "array",
        maxItems: 32,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string", enum: ["entity", "place", "relationship", "evidence"] },
            label: { type: "string", maxLength: 200 },
            reason: { type: "string", maxLength: 500 },
            sourceRefs
          },
          required: ["kind", "label", "reason", "sourceRefs"]
        }
      }
    },
    required: ["entities", "places", "relationships", "unresolved"]
  };
}

export const SYSTEM_PROMPT = [
  "You extract candidate Timeline graph facts from supplied chronology context and evidence.",
  "Treat the supplied source fragments as the only factual basis. Do not add facts from general world knowledge.",
  "Return only the JSON required by the response schema.",
  "",
  "Graph rules:",
  "- entity candidates are durable people, organizations, groups, devices, accounts, documents, or physical/digital objects with independent identity;",
  "- never create nodes for actions, events, meetings, transactions, decisions, processes, places, dates, times, geometry, categories, stories, or roles;",
  "- a relationship connects two different entity candidates and its predicate is one concrete action verb, optionally followed by one grammatical particle;",
  "- never encode an entity name, place, time, instrument, role, cause, or other noun into the predicate;",
  "- never use generic associations such as relatedTo, associatedWith, connectedTo, partOf, memberOf, locatedAt, or presentAt;",
  "- do not invent a relationship merely to connect a named entity; put unsupported or ambiguous relations in unresolved;",
  "- include each edge endpoint in entities and refer to endpoints by the entity candidate key;",
  "- places are separate reusable spatial candidates, never entity nodes;",
  "- attach a placeKey to a relationship only when the source supports that action occurring at that place;",
  "- coordinatesExplicit may be true only when latitude/longitude are explicitly present in the supplied source fragments; never geocode from memory;",
  "- sourceRefs must cite the supplied fragment refs that support each candidate;",
  "- confidence reflects how directly the supplied fragments support the extraction.",
  "",
  "Prefer concise lower-camel action predicates such as called, warned, attacked, transferredTo, searchedFor, or dancesWith."
].join("\n");

interface Fragment {
  ref: string;
  kind?: string;
  text: string;
}

interface ExistingEntityRecord {
  id?: unknown;
  name?: unknown;
  alternateNames?: unknown;
  aliases?: unknown;
  attributes?: { storyId?: unknown };
  [key: string]: unknown;
}

interface ExistingPlaceRecord {
  id?: unknown;
  name?: unknown;
  geographicIdentifier?: unknown;
  address?: unknown;
  [key: string]: unknown;
}

interface ReconciledEntityCandidate {
  key: string;
  name: string;
  type: string;
  alternateNames: string[];
  confidence: number;
  sourceRefs: string[];
  rationale: string;
  status: "existing" | "new";
  entityId: string;
  existingEntityId: string;
  record: Record<string, unknown> | null;
}

interface ReconciledPlaceCandidate {
  key: string;
  name: string;
  geographicIdentifier: string;
  address: string;
  confidence: number;
  sourceRefs: string[];
  rationale: string;
  coordinatesExplicit: boolean;
  status: string;
  placeId: string;
  existingPlaceId: string;
  record: Record<string, unknown> | null;
}

interface AppliedInferenceCandidate {
  key: string;
  status: string;
  record?: Record<string, unknown> | null;
  subjectKey?: string;
  objectKey?: string;
  placeKey?: string;
  sourceRefs?: unknown;
  mergeIntoRelationshipId?: string;
  confidence?: number;
  relationship?: Record<string, unknown> & { placeId?: unknown };
}

export function inferenceInput(input: any = {}): Record<string, any> {
  const normalizeFragments = (fragments: any) => {
    const result: Fragment[] = [];
    let used = 0;
    for (const raw of Array.isArray(fragments) ? fragments : []) {
      const ref = text(raw?.ref, 160);
      const kind = text(raw?.kind, 80);
      const value = text(raw?.text, MAX_FRAGMENT_LENGTH);
      if (!ref || !value) continue;
      const remaining = MAX_CONTEXT_CHARS - used;
      if (remaining <= 0) break;
      const clipped = value.slice(0, remaining);
      result.push({ ref, kind, text: clipped });
      used += clipped.length;
    }
    return result;
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    graphContractVersion: text(input.graphContractVersion, 120),
    event: {
      id: text(input.event?.id, 120),
      start: text(input.event?.start, 120),
      end: text(input.event?.end, 120),
      time: clone(input.event?.time || null),
      storyIds: uniqueTextList(input.event?.storyIds, 12, 120)
    },
    fragments: normalizeFragments(input.fragments),
    existingEntities: (Array.isArray(input.existingEntities) ? input.existingEntities : [])
      .slice(0, 300)
      .map((entity: any) => ({
        id: text(entity?.id, 120),
        name: text(entity?.name, 180),
        type: text(entity?.type, 60),
        alternateNames: uniqueTextList(entity?.alternateNames || entity?.aliases, 24, 180),
        storyId: text(entity?.attributes?.storyId, 120)
      }))
      .filter((entity: any) => entity.id && entity.name),
    existingPlaces: (Array.isArray(input.existingPlaces) ? input.existingPlaces : [])
      .slice(0, 200)
      .map((place: any) => ({
        id: text(place?.id, 120),
        name: text(place?.name, 180),
        geographicIdentifier: text(place?.geographicIdentifier, 300),
        address: text(place?.address, 500)
      }))
      .filter((place: any) => place.id && place.name),
    instruction: "Extract durable entities, reusable places, and directly supported directed action relationships. Reuse concepts already present in existingEntities/existingPlaces when names clearly match; the application will perform final reconciliation."
  };
}

export async function availability(languageModel: any = (globalThis as any).LanguageModel): Promise<Record<string, any>> {
  if (!languageModel || typeof languageModel.availability !== "function") {
    return { available: false, state: "unavailable", reason: "LanguageModel API is unavailable in this browser." };
  }
  try {
    const state = await languageModel.availability();
    return {
      available: state !== "unavailable",
      state: String(state || "unknown"),
      reason: state === "unavailable" ? "The built-in language model cannot run on this device/browser." : ""
    };
  } catch (error) {
    return {
      available: false,
      state: "error",
      reason: error instanceof Error ? error.message : "Could not check built-in AI availability."
    };
  }
}

export async function infer(input: any, options: any = {}): Promise<Record<string, any>> {
  const languageModel = options.languageModel || (globalThis as any).LanguageModel;
  if (!languageModel || typeof languageModel.create !== "function") {
    throw new Error("Built-in LanguageModel is unavailable in this browser.");
  }
  const source = inferenceInput(input);
  if (!source.fragments.length) throw new Error("Add event context or evidence notes before running inference.");

  const session = await languageModel.create({
    initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
    signal: options.signal,
    monitor(monitor: any) {
      monitor.addEventListener("downloadprogress", (event: any) => {
        if (typeof options.onDownloadProgress === "function") {
          options.onDownloadProgress(Number(event.loaded) || 0);
        }
      });
    }
  });

  try {
    const response = await session.prompt(
      JSON.stringify(source),
      {
        responseConstraint: responseSchema(),
        omitResponseConstraintInput: true,
        signal: options.signal
      }
    );
    const parsed = JSON.parse(response);
    if (!parsed || typeof parsed !== "object") throw new Error("Built-in AI returned an invalid inference result.");
    return parsed;
  } finally {
    session.destroy?.();
  }
}

function entityLookup(entities: any, storyIds: any) {
  const byName = new Map<string, ExistingEntityRecord[]>();
  for (const entity of Array.isArray(entities) ? entities : []) {
    const labels = [entity?.name, ...(entity?.alternateNames || entity?.aliases || [])]
      .map(semanticKey)
      .filter(Boolean);
    for (const label of labels) {
      if (!byName.has(label)) byName.set(label, []);
      byName.get(label).push(entity);
    }
  }
  return (name: string, alternateNames: any = []) => {
    const candidates: ExistingEntityRecord[] = [];
    for (const label of [name, ...alternateNames].map(semanticKey).filter(Boolean)) {
      for (const entity of byName.get(label) || []) {
        if (!candidates.includes(entity)) candidates.push(entity);
      }
    }
    if (!candidates.length) return null;
    const stories = new Set((storyIds || []).map(String));
    if (stories.size) {
      const scoped = candidates.filter((entity) =>
        stories.has(String(entity.attributes?.storyId || "")),
      );
      if (scoped.length === 1) return scoped[0];
    }
    return candidates.length === 1 ? candidates[0] : null;
  };
}

function coordinatesExplicitInSources(candidate: any, fragments: any, sourceRefs: any): boolean {
  if (
    candidate?.coordinatesExplicit !== true ||
    !Number.isFinite(Number(candidate?.latitude)) ||
    !Number.isFinite(Number(candidate?.longitude))
  ) {
    return false;
  }
  const refs = new Set(uniqueTextList(sourceRefs, 16, 160));
  const latitude = Number(candidate.latitude);
  const longitude = Number(candidate.longitude);
  const matchesNumber = (value: number, target: number) => Math.abs(value - target) <= 1e-7;
  const normalizeFragments = (frags: any) => {
    const result: Fragment[] = [];
    let used = 0;
    for (const raw of Array.isArray(frags) ? frags : []) {
      const ref = text(raw?.ref, 160);
      const kind = text(raw?.kind, 80);
      const value = text(raw?.text, MAX_FRAGMENT_LENGTH);
      if (!ref || !value) continue;
      const remaining = MAX_CONTEXT_CHARS - used;
      if (remaining <= 0) break;
      const clipped = value.slice(0, remaining);
      result.push({ ref, kind, text: clipped });
      used += clipped.length;
    }
    return result;
  };
  for (const fragment of normalizeFragments(fragments)) {
    if (refs.size && !refs.has(fragment.ref)) continue;
    const numbers = (fragment.text.match(/-?\d+(?:\.\d+)?/g) || [])
      .map(Number)
      .filter(Number.isFinite);
    if (
      numbers.some((value) => matchesNumber(value, latitude)) &&
      numbers.some((value) => matchesNumber(value, longitude))
    ) {
      return true;
    }
  }
  return false;
}

function placeLookup(places: any) {
  const records = Array.isArray(places) ? places : [];
  return (candidate: any) => {
    const name = semanticKey(candidate?.name);
    const identifier = semanticKey(candidate?.geographicIdentifier);
    const address = semanticKey(candidate?.address);
    const matches = records.filter((place: any) => {
      if (name && semanticKey(place?.name) === name) return true;
      if (identifier && semanticKey(place?.geographicIdentifier) === identifier) return true;
      return Boolean(address && semanticKey(place?.address) === address);
    });
    return matches.length === 1 ? matches[0] : null;
  };
}

export function reconcileProposal(raw: any, context: any = {}, dependencies: any = {}): Record<string, any> {
  const graph = dependencies.graph || (globalThis as any).TimelineGraph;
  const spatial = dependencies.spatial || (globalThis as any).TimelineSpatial;
  const idFactory = dependencies.idFactory || ((prefix: string) => `${prefix}-inferred-${Math.random().toString(36).slice(2, 10)}`);
  if (!graph || !spatial) throw new Error("Timeline graph/spatial APIs are required for inference reconciliation.");

  const normalizeFragments = (fragments: any) => {
    const result: Fragment[] = [];
    let used = 0;
    for (const raw of Array.isArray(fragments) ? fragments : []) {
      const ref = text(raw?.ref, 160);
      const kind = text(raw?.kind, 80);
      const value = text(raw?.text, MAX_FRAGMENT_LENGTH);
      if (!ref || !value) continue;
      const remaining = MAX_CONTEXT_CHARS - used;
      if (remaining <= 0) break;
      const clipped = value.slice(0, remaining);
      result.push({ ref, kind, text: clipped });
      used += clipped.length;
    }
    return result;
  };

  const allowedSourceRefs = new Set(
    normalizeFragments(context.fragments).map((fragment: any) => fragment.ref)
  );
  const storyIds = uniqueTextList(context.event?.storyIds, 12, 120);
  const findEntity = entityLookup(context.existingEntities, storyIds);
  const findPlace = placeLookup(context.existingPlaces);
  const rejected: any[] = [];
  const entityByKey = new Map<string, ReconciledEntityCandidate>();
  const entities: ReconciledEntityCandidate[] = [];

  for (const candidate of Array.isArray(raw?.entities) ? raw.entities : []) {
    const key = text(candidate?.key, 80);
    const name = text(candidate?.name, 180);
    if (!key || !name || entityByKey.has(key)) continue;
    const alternateNames = uniqueTextList(candidate?.alternateNames, 24, 180);
    const type = text(candidate?.type, 60) || "entity";
    const validation = graph.validateEntityNode({ name, type, alternateNames, attributes: {} });
    if (!validation.valid) {
      rejected.push({ kind: "entity", label: name, reason: validation.message });
      continue;
    }
    const existing = findEntity(name, alternateNames);
    const record: Record<string, unknown> | null = existing ? null : {
      id: idFactory("entity"),
      type,
      name,
      alternateNames,
      identifiers: [],
      sourceIds: [],
      attributes: storyIds.length === 1 ? { storyId: storyIds[0] } : {}
    };
    const normalized: ReconciledEntityCandidate = {
      key,
      name,
      type,
      alternateNames,
      confidence: confidence(candidate?.confidence),
      sourceRefs: uniqueTextList(candidate?.sourceRefs, 16, 160).filter((ref: string) => allowedSourceRefs.has(ref)),
      rationale: text(candidate?.rationale, 400),
      status: existing ? "existing" : "new",
      entityId: String(existing?.id ?? record?.id ?? ""),
      existingEntityId: String(existing?.id ?? ""),
      record
    };
    entities.push(normalized);
    entityByKey.set(key, normalized);
  }

  const placeByKey = new Map<string, ReconciledPlaceCandidate>();
  const places: ReconciledPlaceCandidate[] = [];
  for (const candidate of Array.isArray(raw?.places) ? raw.places : []) {
    const key = text(candidate?.key, 80);
    const name = text(candidate?.name, 180);
    if (!key || !name || placeByKey.has(key)) continue;
    const existing = findPlace(candidate);
    let record: Record<string, unknown> | null = null;
    let status = "needs-geometry";
    if (existing) {
      status = "existing";
    } else if (
      coordinatesExplicitInSources(candidate, context.fragments, candidate?.sourceRefs)
    ) {
      try {
        record = spatial.normalizePlace({
          id: idFactory("place"),
          name,
          geographicIdentifier: text(candidate?.geographicIdentifier, 300),
          address: text(candidate?.address, 500),
          geometry: {
            type: "Point",
            coordinates: [Number(candidate.longitude), Number(candidate.latitude)]
          },
          icon: "place",
          markerShape: "pin",
          attributes: { inferenceSource: "explicit-coordinates" }
        });
        if (record?.geometry) status = "new";
      } catch {
        record = null;
      }
    }
    const normalized: ReconciledPlaceCandidate = {
      key,
      name,
      geographicIdentifier: text(candidate?.geographicIdentifier, 300),
      address: text(candidate?.address, 500),
      confidence: confidence(candidate?.confidence),
      sourceRefs: uniqueTextList(candidate?.sourceRefs, 16, 160).filter((ref: string) => allowedSourceRefs.has(ref)),
      rationale: text(candidate?.rationale, 400),
      coordinatesExplicit: candidate?.coordinatesExplicit === true,
      status,
      placeId: String(existing?.id ?? record?.id ?? ""),
      existingPlaceId: String(existing?.id ?? ""),
      record
    };
    places.push(normalized);
    placeByKey.set(key, normalized);
  }

  const relationships: any[] = [];
  const relationshipKeys = new Set();
  for (const candidate of Array.isArray(raw?.relationships) ? raw.relationships : []) {
    const key = text(candidate?.key, 80);
    const subject = entityByKey.get(text(candidate?.subjectKey, 80));
    const object = entityByKey.get(text(candidate?.objectKey, 80));
    if (!key || relationshipKeys.has(key)) continue;
    relationshipKeys.add(key);
    if (!subject || !object) {
      rejected.push({ kind: "relationship", label: key, reason: "Relationship endpoints must reference extracted entity candidates." });
      continue;
    }
    if (subject.entityId === object.entityId) {
      rejected.push({ kind: "relationship", label: key, reason: "Inference produced a self-loop; source and target must be different entities." });
      continue;
    }
    const predicate = text(candidate?.predicate, 120);
    const predicateValidation = graph.validateActionPredicate(predicate);
    if (!predicateValidation.valid) {
      rejected.push({ kind: "relationship", label: key, reason: predicateValidation.message });
      continue;
    }
    const place = placeByKey.get(text(candidate?.placeKey, 80)) || null;
    const allowedRelationshipSourceRefs = uniqueTextList(candidate?.sourceRefs, 16, 160)
      .filter((ref: string) => allowedSourceRefs.has(ref));
    if (!allowedRelationshipSourceRefs.length) {
      rejected.push({
        kind: "relationship",
        label: key,
        reason: "Inferred relationships require at least one valid source fragment reference."
      });
      continue;
    }
    const relationship = {
      id: idFactory("relationship"),
      subjectId: subject.entityId,
      predicate,
      objectId: object.entityId,
      role: "",
      placeId: place?.placeId || "",
      itemIds: [text(context.event?.id, 120)].filter(Boolean),
      initialState: "active",
      time: clone(context.event?.time || null),
      sourceIds: [],
      confidence: confidence(candidate?.confidence),
      attributes: {}
    };
    const duplicate = graph.findDuplicateRelationship(relationship, context.existingRelationships || []);
    const mirrored = graph.findMirroredRelationship(relationship, context.existingRelationships || []);
    const relStatus = duplicate ? "merge" : mirrored ? "mirrored" : "new";
    relationships.push({
      key,
      subjectKey: subject.key,
      objectKey: object.key,
      predicate,
      placeKey: place?.key || "",
      confidence: relationship.confidence,
      sourceRefs: allowedRelationshipSourceRefs,
      rationale: text(candidate?.rationale, 400),
      status: relStatus,
      mergeIntoRelationshipId: duplicate?.id || "",
      mirroredRelationshipId: mirrored?.id || "",
      relationship,
      selectedByDefault: !mirrored && confidence(candidate?.confidence) >= 0.55
    });
  }

  const unresolved = [
    ...(Array.isArray(raw?.unresolved) ? raw.unresolved : []).map((entry: any) => ({
      kind: text(entry?.kind, 40) || "relationship",
      label: text(entry?.label, 200),
      reason: text(entry?.reason, 500),
      sourceRefs: uniqueTextList(entry?.sourceRefs, 16, 160).filter((ref: string) => allowedSourceRefs.has(ref))
    })).filter((entry: any) => entry.label || entry.reason),
    ...rejected
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    entities,
    places,
    relationships,
    unresolved
  };
}

function sourceEvidenceIds(sourceRefs: any): string[] {
  const ids: string[] = [];
  for (const ref of sourceRefs || []) {
    const match = /^evidence:([^:]+):/.exec(String(ref));
    if (match?.[1] && !ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}

export function applyProposal(project: any, item: any, proposal: any, selectedRelationshipKeys: any = [], dependencies: any = {}): Record<string, any> {
  const graph = dependencies.graph || (globalThis as any).TimelineGraph;
  if (!graph) throw new Error("Timeline graph API is required to apply inference.");
  const draft = clone(project) as any;
  if (!draft || !item?.id) throw new Error("A draft project and stable item ID are required.");

  const selected = new Set<string>(Array.from(selectedRelationshipKeys || [], String));
  const proposalEntities: AppliedInferenceCandidate[] = Array.isArray(proposal?.entities)
    ? proposal.entities
    : [];
  const proposalPlaces: AppliedInferenceCandidate[] = Array.isArray(proposal?.places)
    ? proposal.places
    : [];
  const entityByKey = new Map<string, AppliedInferenceCandidate>(
    proposalEntities.map((candidate) => [String(candidate.key), candidate]),
  );
  const placeByKey = new Map<string, AppliedInferenceCandidate>(
    proposalPlaces.map((candidate) => [String(candidate.key), candidate]),
  );
  const requiredEntityKeys = new Set<string>();
  const requiredPlaceKeys = new Set<string>();

  const selectedRelationships = (proposal?.relationships || []).filter((candidate: any) => {
    if (!selected.has(String(candidate.key))) return false;
    if (candidate.status === "mirrored") return false;
    requiredEntityKeys.add(candidate.subjectKey);
    requiredEntityKeys.add(candidate.objectKey);
    if (candidate.placeKey) requiredPlaceKeys.add(candidate.placeKey);
    return true;
  });

  for (const key of requiredEntityKeys) {
    const candidate = entityByKey.get(key);
    if (!candidate) throw new Error(`Inference relationship references unknown entity candidate "${key}".`);
    if (candidate.status === "new" && candidate.record) {
      if (!draft.entities.some((entity: any) => String(entity.id) === String(candidate.record.id))) {
        draft.entities.push(clone(candidate.record));
      }
    }
  }

  for (const key of requiredPlaceKeys) {
    const candidate = placeByKey.get(key);
    if (!candidate) continue;
    if (candidate.status === "new" && candidate.record) {
      if (!draft.places.some((place: any) => String(place.id) === String(candidate.record.id))) {
        draft.places.push(clone(candidate.record));
      }
    }
  }

  for (const candidate of selectedRelationships) {
    const sourceIds = sourceEvidenceIds(candidate.sourceRefs);
    if (candidate.status === "merge" && candidate.mergeIntoRelationshipId) {
      const index = draft.relationships.findIndex(
        (relationship: any) => String(relationship.id) === String(candidate.mergeIntoRelationshipId)
      );
      if (index < 0) throw new Error("The relationship selected for inference merge no longer exists.");
      const current = draft.relationships[index];
      draft.relationships[index] = {
        ...current,
        itemIds: [...new Set([...(current.itemIds || []), item.id])],
        sourceIds: [...new Set([...(current.sourceIds || []), ...sourceIds])],
        placeId: current.placeId || candidate.relationship.placeId || "",
        confidence: Number.isFinite(current.confidence)
          ? Math.max(current.confidence, candidate.confidence)
          : candidate.confidence
      };
      continue;
    }

    const clonedRelationship = clone(candidate.relationship);
    const relationship = {
      ...(clonedRelationship && typeof clonedRelationship === "object"
        ? (clonedRelationship as Record<string, unknown>)
        : {}),
      itemIds: [item.id],
      sourceIds
    };
    const relationshipId =
      "id" in relationship ? String(relationship.id ?? "") : "";
    if (!draft.relationships.some((current: any) => String(current.id) === relationshipId)) {
      draft.relationships.push(relationship);
    }
  }

  const errors = graph.validateGraphInput(draft);
  if (errors.length) {
    throw new Error(`Inference result violates the graph contract:\n- ${errors.join("\n- ")}`);
  }
  return draft;
}

export function fingerprint(input: any): string {
  const normalized = inferenceInput(input);
  return JSON.stringify({
    event: normalized.event,
    fragments: normalized.fragments
  });
}

const TimelineGraphInferenceObj = {
  SCHEMA_VERSION,
  SYSTEM_PROMPT,
  responseSchema,
  inferenceInput,
  availability,
  infer,
  reconcileProposal,
  applyProposal,
  fingerprint
} as const;

export const TimelineGraphInference = Object.freeze(TimelineGraphInferenceObj);
