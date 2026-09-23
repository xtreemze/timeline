import type { CanonicalTemporalExtent } from "../domain/relationship.ts";

export const ANALYTICAL_LENS_SCHEMA_VERSION = 1 as const;

export interface AnalyticalLensTimeWindow {
  readonly start: number;
  readonly end: number;
  readonly untimed: "include" | "exclude";
}

export interface AnalyticalLensNeighborhood {
  readonly seedEntityIds: readonly string[];
  readonly depth: number;
}

export interface AnalyticalLensFilters {
  readonly entityIds?: readonly string[];
  readonly entityMatch?: "either-endpoint" | "both-endpoints";
  readonly relationshipPredicates?: readonly string[];
  readonly categoryIds?: readonly string[];
  readonly placeIds?: readonly string[];
  readonly timeWindow?: AnalyticalLensTimeWindow;
  readonly neighborhood?: AnalyticalLensNeighborhood;
}

export interface AnalyticalLens {
  readonly schemaVersion: typeof ANALYTICAL_LENS_SCHEMA_VERSION;
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly filters: AnalyticalLensFilters;
  readonly storyId?: string;
}

export interface AnalyticalLensEntity {
  readonly id: string;
}

export interface AnalyticalLensRelationship {
  readonly id: string;
  readonly subjectId: string;
  readonly objectId: string;
  readonly predicate: string;
  readonly placeId?: string;
  readonly time?: CanonicalTemporalExtent | null;
}

export interface AnalyticalLensOccurrence {
  readonly id: string;
  readonly relationshipId?: string;
  readonly categoryId?: string;
  readonly placeId?: string;
  readonly entityIds?: readonly string[];
  readonly start?: number | null;
  readonly end?: number | null;
}

export interface AnalyticalLensDataset {
  readonly entities: readonly AnalyticalLensEntity[];
  readonly relationships: readonly AnalyticalLensRelationship[];
  readonly occurrences?: readonly AnalyticalLensOccurrence[];
}

export interface AnalyticalLensEvaluation {
  readonly entityIds: readonly string[];
  readonly relationshipIds: readonly string[];
  readonly occurrenceIds: readonly string[];
  readonly hidden: {
    readonly entities: number;
    readonly relationships: number;
    readonly occurrences: number;
  };
}

export interface AnalyticalLensParseResult {
  readonly lens: AnalyticalLens | null;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right)),
  );
}

function stringList(value: unknown, maxItems = 256): readonly string[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return uniqueSorted(
    value
      .slice(0, maxItems)
      .map((entry) => text(entry, 180))
      .filter(Boolean),
  );
}

function semanticKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseEndpoint(value: unknown): number | null {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (!value || typeof value !== "object") return null;

  const endpoint = value as Readonly<Record<string, unknown>>;
  const direct = endpoint["value"];
  if (typeof direct === "string") {
    const parsed = Date.parse(direct);
    if (Number.isFinite(parsed)) return parsed;
  }

  const earliest =
    typeof endpoint["earliest"] === "string" ? Date.parse(endpoint["earliest"]) : Number.NaN;
  const latest =
    typeof endpoint["latest"] === "string" ? Date.parse(endpoint["latest"]) : Number.NaN;
  if (Number.isFinite(earliest) && Number.isFinite(latest)) {
    return earliest + (latest - earliest) / 2;
  }
  if (Number.isFinite(earliest)) return earliest;
  if (Number.isFinite(latest)) return latest;
  return null;
}

function temporalBounds(
  time: CanonicalTemporalExtent | null | undefined,
): readonly [number, number] | null {
  if (!time || time.openStart) return null;
  const start = parseEndpoint(time.start);
  if (start === null) return null;
  if (time.type !== "interval" || time.openEnd) return [start, start];

  const end = parseEndpoint(time.end);
  if (end === null || end < start) return null;
  return [start, end];
}

function intersectsWindow(
  start: number | null | undefined,
  end: number | null | undefined,
  temporalRange: AnalyticalLensTimeWindow,
): boolean {
  if (start === null || start === undefined || !Number.isFinite(start)) {
    return temporalRange.untimed === "include";
  }
  const finish = end === null || end === undefined || !Number.isFinite(end) ? start : end;
  return start <= temporalRange.end && finish >= temporalRange.start;
}

function relationshipMatchesTime(
  relationship: AnalyticalLensRelationship,
  temporalRange: AnalyticalLensTimeWindow | undefined,
): boolean {
  if (!temporalRange) return true;
  const bounds = temporalBounds(relationship.time);
  if (!bounds) return temporalRange.untimed === "include";
  return intersectsWindow(bounds[0], bounds[1], temporalRange);
}

function intersects(values: readonly string[] | undefined, filter: ReadonlySet<string>): boolean {
  if (!values?.length) return false;
  return values.some((value) => filter.has(value));
}

function relationshipMatches(
  relationship: AnalyticalLensRelationship,
  filters: AnalyticalLensFilters,
): boolean {
  const entityIds = new Set(filters.entityIds ?? []);
  if (entityIds.size > 0) {
    const subject = entityIds.has(relationship.subjectId);
    const object = entityIds.has(relationship.objectId);
    if (filters.entityMatch === "both-endpoints" ? !(subject && object) : !(subject || object)) {
      return false;
    }
  }

  const predicates = new Set((filters.relationshipPredicates ?? []).map(semanticKey));
  if (predicates.size > 0 && !predicates.has(semanticKey(relationship.predicate))) return false;

  const placeIds = new Set(filters.placeIds ?? []);
  if (placeIds.size > 0 && (!(relationship.placeId && placeIds.has(relationship.placeId)))) {
    return false;
  }

  return relationshipMatchesTime(relationship, filters.timeWindow);
}

function neighborhoodEntityIds(
  relationships: readonly AnalyticalLensRelationship[],
  neighborhood: AnalyticalLensNeighborhood | undefined,
): ReadonlySet<string> | null {
  if (!neighborhood) return null;

  const seeds = uniqueSorted(neighborhood.seedEntityIds);
  const visited = new Set(seeds);
  if (seeds.length === 0 || neighborhood.depth <= 0) return visited;

  let frontier = [...seeds];
  for (let depth = 0; depth < neighborhood.depth && frontier.length > 0; depth += 1) {
    const frontierSet = new Set(frontier);
    const next = new Set<string>();
    for (const relationship of relationships) {
      if (frontierSet.has(relationship.subjectId) && !visited.has(relationship.objectId)) {
        next.add(relationship.objectId);
      }
      if (frontierSet.has(relationship.objectId) && !visited.has(relationship.subjectId)) {
        next.add(relationship.subjectId);
      }
    }
    for (const id of next) visited.add(id);
    frontier = [...next].sort((left, right) => left.localeCompare(right));
  }
  return visited;
}

function occurrenceMatches(
  occurrence: AnalyticalLensOccurrence,
  filters: AnalyticalLensFilters,
  visibleRelationshipIds: ReadonlySet<string>,
  visibleEntityIds: ReadonlySet<string>,
): boolean {
  if (occurrence.relationshipId && !visibleRelationshipIds.has(occurrence.relationshipId)) {
    return false;
  }

  const categories = new Set(filters.categoryIds ?? []);
  if (categories.size > 0 && (!(occurrence.categoryId && categories.has(occurrence.categoryId)))) {
    return false;
  }

  const places = new Set(filters.placeIds ?? []);
  if (places.size > 0 && (!(occurrence.placeId && places.has(occurrence.placeId)))) {
    return false;
  }

  const entities = new Set(filters.entityIds ?? []);
  if (entities.size > 0 && !intersects(occurrence.entityIds, entities)) return false;

  if (
    visibleEntityIds.size > 0 &&
    occurrence.entityIds?.length &&
    !intersects(occurrence.entityIds, visibleEntityIds)
  ) {
    return false;
  }

  return filters.timeWindow
    ? intersectsWindow(occurrence.start, occurrence.end, filters.timeWindow)
    : true;
}

export function validateAnalyticalLens(lens: AnalyticalLens): readonly string[] {
  const errors: string[] = [];
  if (lens.schemaVersion !== ANALYTICAL_LENS_SCHEMA_VERSION) {
    errors.push("Unsupported analytical lens schema version.");
  }
  if (!lens.id.trim()) errors.push("Analytical lens ID is required.");
  if (!lens.name.trim()) errors.push("Analytical lens name is required.");

  const temporalRange = lens.filters.timeWindow;
  if (
    temporalRange &&
    (!(Number.isFinite(temporalRange.start) &&
      Number.isFinite(temporalRange.end) ) ||
      temporalRange.end < temporalRange.start)
  ) {
    errors.push("Analytical lens temporal range must contain finite ordered bounds.");
  }

  const neighborhood = lens.filters.neighborhood;
  if (
    neighborhood &&
    (!Number.isInteger(neighborhood.depth) || neighborhood.depth < 0 || neighborhood.depth > 8)
  ) {
    errors.push("Analytical lens neighborhood depth must be an integer from 0 through 8.");
  }
  if (neighborhood && neighborhood.seedEntityIds.length === 0) {
    errors.push("Analytical lens neighborhood requires at least one seed entity.");
  }

  return Object.freeze(errors);
}

export function parseAnalyticalLens(input: unknown): AnalyticalLensParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      lens: null,
      errors: Object.freeze(["Analytical lens must be an object."]),
      warnings: Object.freeze([]),
    };
  }

  const record = input as Readonly<Record<string, unknown>>;
  const schemaVersion = parseFiniteNumber(record["schemaVersion"]);
  if (schemaVersion !== ANALYTICAL_LENS_SCHEMA_VERSION) {
    return {
      lens: null,
      errors: Object.freeze([
        "Unsupported analytical lens schema version: " +
          String(record["schemaVersion"] ?? "missing") +
          ".",
      ]),
      warnings: Object.freeze([]),
    };
  }

  const filterInput =
    record["filters"] && typeof record["filters"] === "object" && !Array.isArray(record["filters"])
      ? (record["filters"] as Readonly<Record<string, unknown>>)
      : {};

  const timeInput =
    filterInput["timeWindow"] &&
    typeof filterInput["timeWindow"] === "object" &&
    !Array.isArray(filterInput["timeWindow"])
      ? (filterInput["timeWindow"] as Readonly<Record<string, unknown>>)
      : null;

  const neighborhoodInput =
    filterInput["neighborhood"] &&
    typeof filterInput["neighborhood"] === "object" &&
    !Array.isArray(filterInput["neighborhood"])
      ? (filterInput["neighborhood"] as Readonly<Record<string, unknown>>)
      : null;

  const start = timeInput ? parseFiniteNumber(timeInput["start"]) : null;
  const end = timeInput ? parseFiniteNumber(timeInput["end"]) : null;
  const untimed = timeInput?.["untimed"] === "exclude" ? "exclude" : "include";
  const neighborhoodDepth = neighborhoodInput
    ? parseFiniteNumber(neighborhoodInput["depth"])
    : null;

  const entityIds = stringList(filterInput["entityIds"]);
  const relationshipPredicates = uniqueSorted(
    stringList(filterInput["relationshipPredicates"]).map(semanticKey),
  );
  const categoryIds = stringList(filterInput["categoryIds"]);
  const placeIds = stringList(filterInput["placeIds"]);

  const filters: AnalyticalLensFilters = {
    ...(entityIds.length ? { entityIds } : {}),
    ...(filterInput["entityMatch"] === "both-endpoints"
      ? { entityMatch: "both-endpoints" as const }
      : filterInput["entityMatch"] === "either-endpoint"
        ? { entityMatch: "either-endpoint" as const }
        : {}),
    ...(relationshipPredicates.length ? { relationshipPredicates } : {}),
    ...(categoryIds.length ? { categoryIds } : {}),
    ...(placeIds.length ? { placeIds } : {}),
    ...(timeInput && start !== null && end !== null ? { timeWindow: { start, end, untimed } } : {}),
    ...(neighborhoodInput && neighborhoodDepth !== null
      ? {
          neighborhood: {
            seedEntityIds: stringList(neighborhoodInput["seedEntityIds"]),
            depth: Math.trunc(neighborhoodDepth),
          },
        }
      : {}),
  };

  const description = text(record["description"], 1000);
  const storyId = text(record["storyId"], 120);
  const lens: AnalyticalLens = {
    schemaVersion: ANALYTICAL_LENS_SCHEMA_VERSION,
    id: text(record["id"], 120),
    name: text(record["name"], 180),
    ...(description ? { description } : {}),
    filters,
    ...(storyId ? { storyId } : {}),
  };

  const errors = validateAnalyticalLens(lens);
  const warnings: string[] = [];
  if (timeInput && (start === null || end === null)) {
    warnings.push("Invalid temporal range was discarded.");
  }
  if (neighborhoodInput && neighborhoodDepth === null) {
    warnings.push("Invalid neighborhood depth was discarded.");
  }

  return {
    lens: errors.length ? null : lens,
    errors,
    warnings: Object.freeze(warnings),
  };
}

export function serializeAnalyticalLens(lens: AnalyticalLens): string {
  const errors = validateAnalyticalLens(lens);
  if (errors.length) throw new Error(errors.join(" "));
  return JSON.stringify(lens);
}

export function evaluateAnalyticalLens(
  lens: AnalyticalLens,
  dataset: AnalyticalLensDataset,
): AnalyticalLensEvaluation {
  const errors = validateAnalyticalLens(lens);
  if (errors.length) throw new Error(errors.join(" "));

  const semanticRelationships = dataset.relationships.filter((relationship) =>
    relationshipMatches(relationship, lens.filters),
  );

  const neighborhood = neighborhoodEntityIds(semanticRelationships, lens.filters.neighborhood);

  const visibleRelationships = neighborhood
    ? semanticRelationships.filter(
        (relationship) =>
          neighborhood.has(relationship.subjectId) && neighborhood.has(relationship.objectId),
      )
    : semanticRelationships;

  const visibleRelationshipIds = new Set(
    visibleRelationships.map((relationship) => relationship.id),
  );
  const explicitEntityIds = new Set(lens.filters.entityIds ?? []);
  const visibleEntityIds = new Set<string>();

  if (
    !((((lens.filters.entityIds?.length ||
    lens.filters.relationshipPredicates?.length ) ||
    lens.filters.placeIds?.length ) ||
    lens.filters.timeWindow ) ||
    lens.filters.neighborhood)
  ) {
    for (const entity of dataset.entities) visibleEntityIds.add(entity.id);
  }

  for (const id of explicitEntityIds) visibleEntityIds.add(id);
  if (neighborhood) {
    for (const id of neighborhood) visibleEntityIds.add(id);
  }
  for (const relationship of visibleRelationships) {
    visibleEntityIds.add(relationship.subjectId);
    visibleEntityIds.add(relationship.objectId);
  }

  const occurrences = dataset.occurrences ?? [];
  const visibleOccurrences = occurrences.filter((occurrence) =>
    occurrenceMatches(occurrence, lens.filters, visibleRelationshipIds, visibleEntityIds),
  );

  for (const occurrence of visibleOccurrences) {
    for (const id of occurrence.entityIds ?? []) visibleEntityIds.add(id);
  }

  const entityIds = uniqueSorted(
    dataset.entities.map((entity) => entity.id).filter((id) => visibleEntityIds.has(id)),
  );
  const relationshipIds = uniqueSorted(visibleRelationships.map((relationship) => relationship.id));
  const occurrenceIds = uniqueSorted(visibleOccurrences.map((occurrence) => occurrence.id));

  return Object.freeze({
    entityIds,
    relationshipIds,
    occurrenceIds,
    hidden: Object.freeze({
      entities: Math.max(0, dataset.entities.length - entityIds.length),
      relationships: Math.max(0, dataset.relationships.length - relationshipIds.length),
      occurrences: Math.max(0, occurrences.length - occurrenceIds.length),
    }),
  });
}

export interface AnalyticalLensCatalog {
  readonly lenses: readonly AnalyticalLens[];
}

function canonicalLensCopy(lens: AnalyticalLens): AnalyticalLens {
  const parsed = parseAnalyticalLens(JSON.parse(serializeAnalyticalLens(lens)));
  if (!parsed.lens) throw new Error(parsed.errors.join(" "));
  return Object.freeze(parsed.lens);
}

export function saveAnalyticalLens(
  catalog: AnalyticalLensCatalog,
  lens: AnalyticalLens,
): AnalyticalLensCatalog {
  if (catalog.lenses.some((existing) => existing.id === lens.id)) {
    throw new Error("Analytical lens ID already exists.");
  }

  return Object.freeze({
    lenses: Object.freeze([...catalog.lenses, canonicalLensCopy(lens)]),
  });
}

export function replaceAnalyticalLens(
  catalog: AnalyticalLensCatalog,
  lens: AnalyticalLens,
): AnalyticalLensCatalog {
  const index = catalog.lenses.findIndex((existing) => existing.id === lens.id);
  if (index < 0) throw new Error("Analytical lens does not exist.");

  const replacement = canonicalLensCopy(lens);
  return Object.freeze({
    lenses: Object.freeze(
      catalog.lenses.map((existing, current) => (current === index ? replacement : existing)),
    ),
  });
}

export function duplicateAnalyticalLens(
  catalog: AnalyticalLensCatalog,
  sourceId: string,
  newId: string,
  newName: string,
): AnalyticalLensCatalog {
  const source = catalog.lenses.find((lens) => lens.id === sourceId);
  if (!source) throw new Error("Source analytical lens does not exist.");

  const copy: AnalyticalLens = {
    ...source,
    id: newId.trim(),
    name: newName.trim(),
  };
  return saveAnalyticalLens(catalog, copy);
}

export function deleteAnalyticalLens(
  catalog: AnalyticalLensCatalog,
  lensId: string,
): AnalyticalLensCatalog {
  if (!catalog.lenses.some((lens) => lens.id === lensId)) {
    throw new Error("Analytical lens does not exist.");
  }

  return Object.freeze({
    lenses: Object.freeze(catalog.lenses.filter((lens) => lens.id !== lensId)),
  });
}
