import type { CanonicalOccurrence } from "../domain/occurrence.ts";
import type { CanonicalProject } from "../domain/project.ts";
import type { ProjectSnapshot } from "./project-repository.ts";

export const LUM_ICALENDAR_MEDIA_TYPE = "text/calendar;charset=utf-8";
export const LUM_ICALENDAR_FILE_EXTENSION = ".ics";
export const LUM_CALENDAR_PROJECTION_VERSION = 1;

export type CalendarProjectionErrorCode =
  | "calendar-occurrence-not-found"
  | "calendar-story-not-found"
  | "calendar-empty-selection"
  | "calendar-selector-conflict"
  | "calendar-time-missing"
  | "calendar-time-unknown"
  | "calendar-open-interval"
  | "calendar-temporal-certainty"
  | "calendar-temporal-precision"
  | "calendar-temporal-calendar"
  | "calendar-time-zone-unresolved"
  | "calendar-mixed-temporal-kind"
  | "calendar-invalid-time";

export class CalendarProjectionError extends Error {
  readonly code: CalendarProjectionErrorCode;
  readonly occurrenceId?: string;

  constructor(
    code: CalendarProjectionErrorCode,
    message: string,
    occurrenceId?: string,
  ) {
    super(message);
    this.name = "CalendarProjectionError";
    this.code = code;
    this.occurrenceId = occurrenceId;
  }
}

export interface CalendarProjectionMetadata {
  readonly projectKey: string;
  readonly occurrenceId: string;
  readonly revision: number;
  readonly startPrecision: string;
  readonly startCertainty: string;
  readonly endPrecision?: string;
  readonly endCertainty?: string;
  readonly timeZone?: string;
  readonly floating?: boolean;
  readonly canonicalDateEnd?: string;
}

export interface CalendarDateTemporalProjection {
  readonly kind: "date";
  readonly start: string;
  readonly end?: string;
}

export interface CalendarDateTimeTemporalProjection {
  readonly kind: "date-time";
  readonly start: string;
  readonly end?: string;
  readonly floating: boolean;
}

export interface CalendarProjectionEvent {
  readonly uid: string;
  readonly occurrenceId: string;
  readonly summary: string;
  readonly description?: string;
  readonly location?: string;
  readonly temporal: CalendarDateTemporalProjection | CalendarDateTimeTemporalProjection;
  readonly metadata: CalendarProjectionMetadata;
}

export interface CalendarProjection {
  readonly projectKey: string;
  readonly revision: number;
  readonly savedAt: string;
  readonly events: readonly CalendarProjectionEvent[];
}

export interface CalendarProjectionSelection {
  readonly occurrenceIds?: readonly string[];
  readonly storyId?: string;
}

interface EndpointProjection {
  readonly kind: "date" | "date-time";
  readonly value: string;
  readonly floating: boolean;
  readonly precision: string;
  readonly certainty: string;
  readonly timeZone?: string;
  readonly canonicalValue: string;
}

interface ParsedIsoDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number | null;
  readonly minute: number | null;
  readonly second: number | null;
  readonly millisecond: number;
  readonly offset: string | null;
  readonly precision: string;
}

const ISO_CALENDAR_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):?(\d{2})?(?::?(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/;

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseIsoCalendarValue(value: string): ParsedIsoDateTime | null {
  const match = ISO_CALENDAR_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? null : Number(match[4]);
  const minute = match[5] === undefined ? null : Number(match[5]);
  const second = match[6] === undefined ? null : Number(match[6]);
  const fraction = match[7] ?? "";
  const millisecond = fraction ? Number(fraction.padEnd(3, "0")) : 0;
  const offset = match[8] ?? null;

  if (
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null;
  }
  if (hour !== null && (hour < 0 || hour > 23)) return null;
  if (minute !== null && (minute < 0 || minute > 59)) return null;
  if (second !== null && (second < 0 || second > 59)) return null;
  if (hour !== null && minute === null) return null;
  if (offset && hour === null) return null;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    offset,
    precision:
      hour === null
        ? "day"
        : second === null
          ? "minute"
          : fraction
            ? "millisecond"
            : "second",
  };
}

function endpointRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function exactCertainty(record: Readonly<Record<string, unknown>>): string {
  return typeof record.certainty === "string" && record.certainty
    ? record.certainty
    : "exact";
}

function endpointPrecision(
  record: Readonly<Record<string, unknown>>,
  parsed: ParsedIsoDateTime,
): string {
  return typeof record.precision === "string" && record.precision
    ? record.precision
    : parsed.precision;
}

function offsetMinutes(offset: string): number {
  if (offset === "Z") return 0;
  const sign = offset[0] === "-" ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  return sign * (((hours ?? 0) * 60) + (minutes ?? 0));
}

function toUtcTimestamp(parts: ParsedIsoDateTime): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
    parts.millisecond,
  );
  return date.getTime() - offsetMinutes(parts.offset ?? "Z") * 60_000;
}

function basicUtcDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return [
    pad(date.getUTCFullYear(), 4),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function basicFloatingDateTime(parts: ParsedIsoDateTime): string {
  return [
    pad(parts.year, 4),
    pad(parts.month),
    pad(parts.day),
    "T",
    pad(parts.hour ?? 0),
    pad(parts.minute ?? 0),
    pad(parts.second ?? 0),
  ].join("");
}

function basicDate(parts: ParsedIsoDateTime): string {
  return `${pad(parts.year, 4)}${pad(parts.month)}${pad(parts.day)}`;
}

function addCalendarDays(value: string, days: number): string {
  const parsed = parseIsoCalendarValue(value);
  if (!parsed || parsed.hour !== null) {
    throw new CalendarProjectionError(
      "calendar-invalid-time",
      `Cannot adjust invalid calendar date "${value}".`,
    );
  }
  const date = new Date(0);
  date.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function projectEndpoint(
  raw: unknown,
  occurrenceId: string,
): EndpointProjection {
  const record = endpointRecord(raw);
  if (!record) {
    throw new CalendarProjectionError(
      "calendar-time-missing",
      "Calendar export requires a concrete temporal endpoint.",
      occurrenceId,
    );
  }

  const value = typeof record.value === "string" ? record.value.trim() : "";
  const certainty = exactCertainty(record);
  if (!value) {
    throw new CalendarProjectionError(
      certainty === "unknown" ? "calendar-time-unknown" : "calendar-time-missing",
      certainty === "unknown"
        ? "Unknown occurrence time cannot be exported to a calendar without choosing a date."
        : "Calendar export requires a concrete temporal value.",
      occurrenceId,
    );
  }

  if (certainty !== "exact") {
    throw new CalendarProjectionError(
      "calendar-temporal-certainty",
      `Calendar export will not promote ${certainty} occurrence time to an exact calendar event.`,
      occurrenceId,
    );
  }

  if (
    typeof record.calendar === "string" &&
    record.calendar &&
    record.calendar !== "gregorian"
  ) {
    throw new CalendarProjectionError(
      "calendar-temporal-calendar",
      `Calendar export currently supports Gregorian endpoints, not "${record.calendar}".`,
      occurrenceId,
    );
  }

  const parsed = parseIsoCalendarValue(value);
  if (!parsed) {
    throw new CalendarProjectionError(
      "calendar-invalid-time",
      `Occurrence time "${value}" is not representable by iCalendar v2.`,
      occurrenceId,
    );
  }

  const precision = endpointPrecision(record, parsed);
  if (!["day", "minute", "second"].includes(precision) || precision !== parsed.precision) {
    throw new CalendarProjectionError(
      "calendar-temporal-precision",
      `Calendar export will not silently promote ${precision} precision to a more exact calendar time.`,
      occurrenceId,
    );
  }

  const timeZone =
    typeof record.timeZone === "string" && record.timeZone.trim()
      ? record.timeZone.trim()
      : undefined;

  if (precision === "day") {
    return {
      kind: "date",
      value: basicDate(parsed),
      floating: false,
      precision,
      certainty,
      timeZone,
      canonicalValue: value,
    };
  }

  if (timeZone && !parsed.offset) {
    throw new CalendarProjectionError(
      "calendar-time-zone-unresolved",
      `Time zone "${timeZone}" has no canonical UTC offset for this occurrence.`,
      occurrenceId,
    );
  }

  return {
    kind: "date-time",
    value: parsed.offset ? basicUtcDateTime(toUtcTimestamp(parsed)) : basicFloatingDateTime(parsed),
    floating: parsed.offset === null,
    precision,
    certainty,
    timeZone,
    canonicalValue: value,
  };
}

function entityNameMap(project: CanonicalProject): ReadonlyMap<string, string> {
  return new Map(project.entities.map((entity) => [String(entity.id), entity.name]));
}

function relationshipText(
  project: CanonicalProject,
  occurrence: CanonicalOccurrence,
): readonly string[] {
  const names = entityNameMap(project);
  const byId = new Map(
    project.relationships.map((relationship) => [String(relationship.id), relationship]),
  );
  return occurrence.relationshipIds.flatMap((relationshipId) => {
    const relationship = byId.get(String(relationshipId));
    if (!relationship) return [];
    const subject = names.get(String(relationship.subjectId)) ?? "Unknown subject";
    const object = names.get(String(relationship.objectId)) ?? "Unknown object";
    return [`${subject} ${relationship.predicate} ${object}`];
  });
}

function eventSummary(project: CanonicalProject, occurrence: CanonicalOccurrence): string {
  const title = occurrence.title?.trim();
  if (title) return title;
  const relationships = relationshipText(project, occurrence);
  if (relationships.length === 1) return relationships[0] ?? "Occurrence";
  if (occurrence.occurrenceType?.trim()) return occurrence.occurrenceType.trim();
  return "Occurrence";
}

function eventDescription(
  project: CanonicalProject,
  occurrence: CanonicalOccurrence,
): string | undefined {
  const authored =
    typeof occurrence.attributes.description === "string"
      ? occurrence.attributes.description.trim()
      : "";
  const facts = relationshipText(project, occurrence);
  const lines = [
    ...(authored ? [authored] : []),
    ...(authored && facts.length ? [""] : []),
    ...facts,
  ];
  return lines.length ? lines.join("\n") : undefined;
}

function eventLocation(
  project: CanonicalProject,
  occurrence: CanonicalOccurrence,
): string | undefined {
  if (!occurrence.placeId) return undefined;
  const place = (project.places ?? []).find(
    (candidate) => String(candidate.id) === String(occurrence.placeId),
  );
  if (!place) return undefined;
  const name = place.name.trim();
  const address = place.address?.trim();
  if (name && address && name !== address) return `${name} — ${address}`;
  return name || address || undefined;
}

function stableUid(projectKey: string, occurrenceId: string): string {
  return `urn:lum:${encodeURIComponent(projectKey)}:occurrence:${encodeURIComponent(occurrenceId)}`;
}

function projectTemporal(
  occurrence: CanonicalOccurrence,
): {
  readonly temporal: CalendarProjectionEvent["temporal"];
  readonly metadata: Pick<
    CalendarProjectionMetadata,
    | "startPrecision"
    | "startCertainty"
    | "endPrecision"
    | "endCertainty"
    | "timeZone"
    | "floating"
    | "canonicalDateEnd"
  >;
} {
  const time = occurrence.time;
  if (!time) {
    throw new CalendarProjectionError(
      "calendar-time-missing",
      "Occurrence has no canonical time to export.",
      String(occurrence.id),
    );
  }
  if (
    time.type === "interval" &&
    (time.openStart === true || time.openEnd === true)
  ) {
    throw new CalendarProjectionError(
      "calendar-open-interval",
      "Open-ended occurrences require an explicit calendar boundary before export.",
      String(occurrence.id),
    );
  }

  const start = projectEndpoint(time.start, String(occurrence.id));
  const end =
    time.type === "interval"
      ? projectEndpoint(time.end, String(occurrence.id))
      : undefined;

  if (end && end.kind !== start.kind) {
    throw new CalendarProjectionError(
      "calendar-mixed-temporal-kind",
      "Calendar export requires interval endpoints with compatible temporal precision.",
      String(occurrence.id),
    );
  }

  const commonMetadata = {
    startPrecision: start.precision,
    startCertainty: start.certainty,
    ...(end
      ? {
          endPrecision: end.precision,
          endCertainty: end.certainty,
        }
      : {}),
    ...(start.timeZone ? { timeZone: start.timeZone } : {}),
  };

  if (start.kind === "date") {
    const canonicalDateEnd = end?.canonicalValue;
    return {
      temporal: {
        kind: "date",
        start: start.value,
        ...(end
          ? { end: basicDate(parseIsoCalendarValue(addCalendarDays(end.canonicalValue, 1))!) }
          : {}),
      },
      metadata: {
        ...commonMetadata,
        ...(canonicalDateEnd ? { canonicalDateEnd } : {}),
      },
    };
  }

  const floating = start.floating;
  if (end && end.floating !== floating) {
    throw new CalendarProjectionError(
      "calendar-mixed-temporal-kind",
      "Calendar export will not mix floating and absolute interval endpoints.",
      String(occurrence.id),
    );
  }

  return {
    temporal: {
      kind: "date-time",
      start: start.value,
      ...(end ? { end: end.value } : {}),
      floating,
    },
    metadata: {
      ...commonMetadata,
      ...(floating ? { floating: true } : {}),
    },
  };
}

export function projectOccurrenceToCalendarEvent(
  snapshot: Pick<ProjectSnapshot, "projectKey" | "revision" | "project">,
  occurrenceId: string,
): CalendarProjectionEvent {
  const occurrence = (snapshot.project.occurrences ?? []).find(
    (candidate) => String(candidate.id) === occurrenceId,
  );
  if (!occurrence) {
    throw new CalendarProjectionError(
      "calendar-occurrence-not-found",
      `Occurrence "${occurrenceId}" does not exist in this project.`,
      occurrenceId,
    );
  }

  const { temporal, metadata } = projectTemporal(occurrence);
  return Object.freeze({
    uid: stableUid(snapshot.projectKey, occurrenceId),
    occurrenceId,
    summary: eventSummary(snapshot.project, occurrence),
    ...(eventDescription(snapshot.project, occurrence)
      ? { description: eventDescription(snapshot.project, occurrence) }
      : {}),
    ...(eventLocation(snapshot.project, occurrence)
      ? { location: eventLocation(snapshot.project, occurrence) }
      : {}),
    temporal,
    metadata: Object.freeze({
      projectKey: snapshot.projectKey,
      occurrenceId,
      revision: snapshot.revision,
      ...metadata,
    }),
  });
}

function selectedOccurrenceIds(
  snapshot: Pick<ProjectSnapshot, "project">,
  selection: CalendarProjectionSelection,
): readonly string[] {
  if (selection.storyId && selection.occurrenceIds?.length) {
    throw new CalendarProjectionError(
      "calendar-selector-conflict",
      "Choose either a story or explicit occurrences for calendar export, not both.",
    );
  }

  if (selection.storyId) {
    const story = (snapshot.project.stories ?? []).find(
      (candidate) => String(candidate.id) === selection.storyId,
    );
    if (!story) {
      throw new CalendarProjectionError(
        "calendar-story-not-found",
        `Story "${selection.storyId}" does not exist in this project.`,
      );
    }
    return story.occurrenceIds.map(String);
  }

  if (selection.occurrenceIds?.length) {
    return [...new Set(selection.occurrenceIds.map(String))];
  }

  return (snapshot.project.occurrences ?? []).map((occurrence) => String(occurrence.id));
}

export function projectOccurrencesToCalendar(
  snapshot: ProjectSnapshot,
  selection: CalendarProjectionSelection = {},
): CalendarProjection {
  const occurrenceIds = selectedOccurrenceIds(snapshot, selection);
  if (occurrenceIds.length === 0) {
    throw new CalendarProjectionError(
      "calendar-empty-selection",
      "No canonical occurrences are available for calendar export.",
    );
  }

  const events = occurrenceIds.map((occurrenceId) =>
    projectOccurrenceToCalendarEvent(snapshot, occurrenceId),
  );

  return Object.freeze({
    projectKey: snapshot.projectKey,
    revision: snapshot.revision,
    savedAt: snapshot.savedAt,
    events: Object.freeze(events),
  });
}

function escapeICalendarText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldICalendarLine(line: string): readonly string[] {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let bytes = 0;

  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75 && current) {
      lines.push(current);
      current = ` ${character}`;
      bytes = 1 + size;
      continue;
    }
    current += character;
    bytes += size;
  }

  if (current || line === "") lines.push(current);
  return lines;
}

function timestampProperty(savedAt: string): string {
  const timestamp = Date.parse(savedAt);
  if (!Number.isFinite(timestamp)) {
    throw new CalendarProjectionError(
      "calendar-invalid-time",
      `Project savedAt "${savedAt}" cannot be represented as an iCalendar DTSTAMP.`,
    );
  }
  return basicUtcDateTime(timestamp);
}

function eventLines(
  calendar: CalendarProjection,
  event: CalendarProjectionEvent,
): readonly string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeICalendarText(event.uid)}`,
    `DTSTAMP:${timestampProperty(calendar.savedAt)}`,
  ];

  if (event.temporal.kind === "date") {
    lines.push(`DTSTART;VALUE=DATE:${event.temporal.start}`);
    if (event.temporal.end) {
      lines.push(`DTEND;VALUE=DATE:${event.temporal.end}`);
    }
  } else {
    lines.push(`DTSTART:${event.temporal.start}`);
    if (event.temporal.end) lines.push(`DTEND:${event.temporal.end}`);
  }

  lines.push(`SUMMARY:${escapeICalendarText(event.summary)}`);
  if (event.location) lines.push(`LOCATION:${escapeICalendarText(event.location)}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalendarText(event.description)}`);
  }

  lines.push(
    `X-LUM-PROJECT-KEY:${escapeICalendarText(event.metadata.projectKey)}`,
    `X-LUM-OCCURRENCE-ID:${escapeICalendarText(event.metadata.occurrenceId)}`,
    `X-LUM-REVISION:${event.metadata.revision}`,
    `X-LUM-START-PRECISION:${escapeICalendarText(event.metadata.startPrecision)}`,
    `X-LUM-START-CERTAINTY:${escapeICalendarText(event.metadata.startCertainty)}`,
  );
  if (event.metadata.endPrecision) {
    lines.push(`X-LUM-END-PRECISION:${escapeICalendarText(event.metadata.endPrecision)}`);
  }
  if (event.metadata.endCertainty) {
    lines.push(`X-LUM-END-CERTAINTY:${escapeICalendarText(event.metadata.endCertainty)}`);
  }
  if (event.metadata.timeZone) {
    lines.push(`X-LUM-TIME-ZONE:${escapeICalendarText(event.metadata.timeZone)}`);
  }
  if (event.metadata.floating) lines.push("X-LUM-FLOATING-TIME:TRUE");
  if (event.metadata.canonicalDateEnd) {
    lines.push(
      `X-LUM-CANONICAL-DATE-END:${escapeICalendarText(event.metadata.canonicalDateEnd)}`,
    );
  }

  lines.push("END:VEVENT");
  return lines;
}

export function serializeICalendar(calendar: CalendarProjection): string {
  const logicalLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lūm//Calendar Projection 1//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-LUM-PROJECT-KEY:${escapeICalendarText(calendar.projectKey)}`,
    `X-LUM-REVISION:${calendar.revision}`,
    ...calendar.events.flatMap((event) => eventLines(calendar, event)),
    "END:VCALENDAR",
  ];

  return `${logicalLines.flatMap(foldICalendarLine).join("\r\n")}\r\n`;
}
