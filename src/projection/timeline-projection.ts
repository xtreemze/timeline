export interface TimelineProjectionEntity {
  readonly id: string;
  readonly name: string;
}

export interface TimelineProjectionEndpoint {
  readonly value?: unknown;
  readonly earliest?: unknown;
  readonly latest?: unknown;
  readonly sourceText?: unknown;
}

export interface TimelineProjectionTemporalExtent {
  readonly type?: unknown;
  readonly start?: TimelineProjectionEndpoint | string | null;
  readonly end?: TimelineProjectionEndpoint | string | null;
  readonly openStart?: boolean;
  readonly openEnd?: boolean;
}

export interface TimelineProjectionRelationship {
  readonly id: string;
  readonly subjectId: string;
  readonly objectId: string;
  readonly predicate: string;
  readonly role?: string;
  readonly placeId?: string;
  readonly itemIds?: readonly string[];
  readonly sourceIds?: readonly string[];
  readonly confidence?: number | null;
  readonly time?: TimelineProjectionTemporalExtent | null;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface TimelineProjectionProject {
  readonly entities?: readonly TimelineProjectionEntity[];
  readonly relationships?: readonly TimelineProjectionRelationship[];
}

export interface TimelineOccurrenceProjection {
  readonly occurrenceId: string;
  readonly relationshipId: string;
  readonly subjectId: string;
  readonly objectId: string;
  readonly subjectName: string;
  readonly objectName: string;
  readonly predicate: string;
  readonly role: string;
  readonly placeId: string;
  readonly itemIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly confidence: number | null;
  readonly start: number;
  readonly end: number | null;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly title: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

function text(value: unknown, max = 240): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function endpointLabel(endpoint: TimelineProjectionEndpoint | string | null | undefined): string {
  if (typeof endpoint === "string") return text(endpoint, 120);
  if (!endpoint || typeof endpoint !== "object") return "";
  return text(endpoint.value, 120) || text(endpoint.sourceText, 120);
}

function utcDate(
  year: number,
  monthIndex = 0,
  day = 1,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

function parseCanonicalTime(value: unknown): number {
  const source = text(value, 160);
  if (!source) return Number.NaN;

  const year = /^([+-]?\d{1,6})$/.exec(source);
  if (year) return utcDate(Number(year[1]), 0, 1);

  const month = /^([+-]?\d{1,6})-(\d{2})$/.exec(source);
  if (month) return utcDate(Number(month[1]), Number(month[2]) - 1, 1);

  const day = /^([+-]?\d{1,6})-(\d{2})-(\d{2})$/.exec(source);
  if (day) return utcDate(Number(day[1]), Number(day[2]) - 1, Number(day[3]));

  const timestamp = Date.parse(source);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function endpointTime(endpoint: TimelineProjectionEndpoint | string | null | undefined): number {
  if (typeof endpoint === "string") return parseCanonicalTime(endpoint);
  if (!endpoint || typeof endpoint !== "object") return Number.NaN;

  const exact = parseCanonicalTime(endpoint.value);
  if (Number.isFinite(exact)) return exact;

  const earliest = parseCanonicalTime(endpoint.earliest);
  const latest = parseCanonicalTime(endpoint.latest);
  if (Number.isFinite(earliest) && Number.isFinite(latest)) {
    return earliest + (latest - earliest) / 2;
  }
  if (Number.isFinite(earliest)) return earliest;
  if (Number.isFinite(latest)) return latest;
  return Number.NaN;
}

function normalizedConfidence(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : null;
}

function occurrenceFor(
  relationship: TimelineProjectionRelationship,
  entityNames: ReadonlyMap<string, string>,
): TimelineOccurrenceProjection | null {
  const id = text(relationship.id, 120);
  const subjectId = text(relationship.subjectId, 120);
  const objectId = text(relationship.objectId, 120);
  const predicate = text(relationship.predicate, 120);
  if (!(id && subjectId && objectId && predicate && relationship.time)) return null;
  if (relationship.time.openStart) return null;

  const start = endpointTime(relationship.time.start);
  if (!Number.isFinite(start)) return null;

  const isInterval = relationship.time.type === "interval";
  let end: number | null = null;
  if (isInterval && !relationship.time.openEnd) {
    const parsedEnd = endpointTime(relationship.time.end);
    if (Number.isFinite(parsedEnd)) end = parsedEnd;
  }
  if (end !== null && end < start) return null;

  const subjectName = entityNames.get(subjectId) || subjectId;
  const objectName = entityNames.get(objectId) || objectId;
  const startLabel = endpointLabel(relationship.time.start);
  const endLabel = end === null ? "" : endpointLabel(relationship.time.end);

  return Object.freeze({
    occurrenceId: id,
    relationshipId: id,
    subjectId,
    objectId,
    subjectName,
    objectName,
    predicate,
    role: text(relationship.role, 120),
    placeId: text(relationship.placeId, 120),
    itemIds: Object.freeze(
      (Array.isArray(relationship.itemIds) ? relationship.itemIds : [])
        .map((value) => text(value, 120))
        .filter(Boolean),
    ),
    sourceIds: Object.freeze(
      (Array.isArray(relationship.sourceIds) ? relationship.sourceIds : [])
        .map((value) => text(value, 120))
        .filter(Boolean),
    ),
    confidence: normalizedConfidence(relationship.confidence),
    start,
    end,
    startLabel,
    endLabel,
    title: `${subjectName} ${predicate} ${objectName}`,
    attributes:
      relationship.attributes && typeof relationship.attributes === "object"
        ? Object.freeze({ ...relationship.attributes })
        : Object.freeze({}),
  });
}

export function projectTimelineOccurrences(
  project: TimelineProjectionProject,
): readonly TimelineOccurrenceProjection[] {
  const entityNames = new Map(
    (Array.isArray(project?.entities) ? project.entities : [])
      .map((entity) => [text(entity?.id, 120), text(entity?.name, 180)] as const)
      .filter(([id, name]) => Boolean(id && name)),
  );

  return Object.freeze(
    (Array.isArray(project?.relationships) ? project.relationships : [])
      .map((relationship) => occurrenceFor(relationship, entityNames))
      .filter((occurrence): occurrence is TimelineOccurrenceProjection => occurrence !== null)
      .sort(
        (left, right) =>
          left.start - right.start ||
          (left.end ?? left.start) - (right.end ?? right.start) ||
          left.occurrenceId.localeCompare(right.occurrenceId),
      ),
  );
}
