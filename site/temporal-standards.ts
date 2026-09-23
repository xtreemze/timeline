/**
 * Timeline temporal standards module
 * Pure utility functions for parsing, normalizing, and representing temporal endpoints
 * No DOM dependencies, uses native Temporal API when available
 */

const ISO_PATTERN =
  /^([+-]?\d{4,6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/;

const PRECISIONS = new Set([
  "millennium",
  "century",
  "decade",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "millisecond",
] as const);

const CERTAINTIES = new Set(["exact", "approximate", "uncertain", "inferred", "unknown"] as const);

interface ParsedDate {
  source: string;
  year: number;
  month: number | null;
  day: number | null;
  hour: number | null;
  minute: number | null;
  second: number | null;
  fraction: string;
  millisecond: number;
  offset: string | null;
  hasTime: boolean;
  precision: typeof PRECISIONS extends Set<infer U> ? U : string;
}

interface Endpoint {
  value: string | null;
  precision: string | null;
  certainty: string;
  calendar: string;
  timeZone: string | null;
  utcOffset: string | null;
  sourceText: string | null;
  earliest?: string;
  latest?: string;
  referenceSystem?: string;
}

interface Extent {
  type: "instant" | "interval";
  start: Endpoint | null;
  end: Endpoint | null;
  openStart?: boolean;
  openEnd?: boolean;
}

interface Bounds {
  start: number;
  end: number;
  locatable: boolean;
}

interface FormParts {
  date: string;
  time: string;
  precision: string;
  certainty: string;
  timeZone: string;
}

function pad(value: number | string, width: number = 2): string {
  return String(value).padStart(width, "0");
}

function formatYear(year: number): string {
  if (year >= 0 && year <= 9999) return pad(year, 4);
  const absolute = String(Math.abs(year)).padStart(6, "0");
  return `${year < 0 ? "-" : "+"}${absolute}`;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function text(value: unknown, max: number = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function fractionalMilliseconds(fraction: string): number {
  if (!fraction) return 0;
  return Number(`${fraction}000`.slice(0, 3));
}

export function parse(value: unknown): ParsedDate | null {
  if (typeof value !== "string") return null;
  const source = value.trim();
  const match = ISO_PATTERN.exec(source);
  if (!match) return null;

  const year = Number(match[1]);
  const month = match[2] === undefined ? null : Number(match[2]);
  const day = match[3] === undefined ? null : Number(match[3]);
  const hour = match[4] === undefined ? null : Number(match[4]);
  const minute = match[5] === undefined ? null : Number(match[5]);
  const second = match[6] === undefined ? null : Number(match[6]);
  const fraction = match[7] || "";
  const offset = match[8] || null;

  if (!Number.isInteger(year)) return null;
  if (month !== null && (month < 1 || month > 12)) return null;
  if (day !== null && (month === null || day < 1 || day > daysInMonth(year, month))) return null;
  if (hour !== null && (day === null || hour < 0 || hour > 23)) return null;
  if (minute !== null && (hour === null || minute < 0 || minute > 59)) return null;
  if (second !== null && (minute === null || second < 0 || second > 59)) return null;
  if (fraction && second === null) return null;

  const precision: ParsedDate["precision"] =
    month === null
      ? "year"
      : day === null
        ? "month"
        : hour === null
          ? "day"
          : minute === null
            ? "hour"
            : second === null
              ? "minute"
              : fraction
                ? "millisecond"
                : "second";

  return {
    source,
    year,
    month,
    day,
    hour,
    minute,
    second,
    fraction,
    millisecond: fractionalMilliseconds(fraction),
    offset,
    hasTime: hour !== null,
    precision,
  };
}

function localValue(parts: ParsedDate, precision: string = parts.precision): string {
  const year = formatYear(parts.year);
  if (["millennium", "century", "decade", "year"].includes(precision)) return year;
  const month = `${year}-${pad(parts.month ?? 1)}`;
  if (precision === "month") return month;
  const date = `${month}-${pad(parts.day ?? 1)}`;
  if (precision === "day") return date;
  const hour = `${date}T${pad(parts.hour ?? 0)}`;
  if (precision === "hour") return hour;
  const time = `${hour}:${pad(parts.minute ?? 0)}`;
  if (precision === "minute") return time;
  const seconds = `${time}:${pad(parts.second ?? 0)}`;
  if (precision === "second") return seconds;
  return `${seconds}.${pad(parts.millisecond ?? 0, 3)}`;
}

function precisionFromForm(value: unknown): string {
  return PRECISIONS.has(value as any) ? (value as string) : "day";
}

function certaintyFromForm(value: unknown): string {
  return CERTAINTIES.has(value as any) ? (value as string) : "exact";
}

function normalizeTimeInput(time: unknown, precision: string): string {
  if (["millennium", "century", "decade", "year", "month", "day"].includes(precision)) return "";
  const match = /^(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(
    String(time || "").trim(),
  );
  if (!match) throw new Error("Choose a valid clock time.");
  const hour = Number(match[1]);
  const minute = match[2] === undefined ? null : Number(match[2]);
  const second = match[3] === undefined ? null : Number(match[3]);
  const millisecond = fractionalMilliseconds(match[4] || "");
  if (hour > 23 || (minute !== null && minute > 59) || (second !== null && second > 59)) {
    throw new Error("Choose a valid clock time.");
  }
  if (precision === "hour") return pad(hour);
  if (minute === null) throw new Error("Choose a clock time with minutes.");
  if (precision === "minute") return `${pad(hour)}:${pad(minute)}`;
  if (precision === "second") return `${pad(hour)}:${pad(minute)}:${pad(second ?? 0)}`;
  return `${pad(hour)}:${pad(minute)}:${pad(second ?? 0)}.${pad(millisecond, 3)}`;
}

function normalizeBound(value: unknown): string | null {
  const candidate = typeof value === "object" && value ? (value as any).value : value;
  const parsed = parse(text(candidate, 120));
  return parsed?.source || null;
}

function withEndpointMetadata(
  endpoint: Endpoint,
  metadata: Record<string, unknown> = {},
): Endpoint {
  const earliest = normalizeBound((metadata as any).earliest);
  const latest = normalizeBound((metadata as any).latest);
  if (earliest) endpoint.earliest = earliest;
  if (latest) endpoint.latest = latest;
  const referenceSystem = text((metadata as any).referenceSystem, 500);
  if (referenceSystem) endpoint.referenceSystem = referenceSystem;
  return endpoint;
}

export function buildEndpoint(options: {
  date: unknown;
  time?: unknown;
  precision: unknown;
  certainty: unknown;
  timeZone?: unknown;
  sourceText?: string | null;
  earliest?: unknown;
  latest?: unknown;
  referenceSystem?: unknown;
}): Endpoint {
  const normalizedPrecision = precisionFromForm(options.precision);
  const normalizedCertainty = certaintyFromForm(options.certainty);
  const dateValue = String(options.date || "").trim();
  const dateParts = parse(dateValue);
  if (!dateParts || dateParts.hasTime) throw new Error("Choose a valid calendar date.");

  if (["millennium", "century", "decade", "year", "month", "day"].includes(normalizedPrecision)) {
    return withEndpointMetadata(
      {
        value: localValue(dateParts, normalizedPrecision),
        precision: normalizedPrecision,
        certainty: normalizedCertainty,
        calendar: "gregorian",
        timeZone: null,
        utcOffset: null,
        sourceText: options.sourceText || null,
      },
      {
        earliest: options.earliest,
        latest: options.latest,
        referenceSystem: options.referenceSystem,
      },
    );
  }

  const normalizedTime = normalizeTimeInput(options.time, normalizedPrecision);
  const local = `${dateValue}T${normalizedTime}`;
  const parsedLocal = parse(local);
  if (!parsedLocal) throw new Error("Choose a valid date and clock time.");

  const zone = String(options.timeZone || "").trim();
  if (!zone) {
    return withEndpointMetadata(
      {
        value: local,
        precision: normalizedPrecision,
        certainty: normalizedCertainty,
        calendar: "gregorian",
        timeZone: null,
        utcOffset: null,
        sourceText: options.sourceText || null,
      },
      {
        earliest: options.earliest,
        latest: options.latest,
        referenceSystem: options.referenceSystem,
      },
    );
  }

  if (!(globalThis.Temporal as any)?.ZonedDateTime) {
    throw new Error(
      "This browser does not provide the Temporal API required for time-zone-aware dates.",
    );
  }

  let zoned: { offset: string };
  try {
    zoned = (globalThis.Temporal as any).ZonedDateTime.from(
      {
        timeZone: zone,
        year: parsedLocal.year,
        month: parsedLocal.month,
        day: parsedLocal.day,
        hour: parsedLocal.hour,
        minute: parsedLocal.minute,
        second: parsedLocal.second || 0,
        millisecond: parsedLocal.millisecond || 0,
      },
      { disambiguation: "reject" },
    );
  } catch {
    throw new Error("That local date/time does not exist uniquely in the selected time zone.");
  }

  return withEndpointMetadata(
    {
      value: `${local}${zoned.offset}`,
      precision: normalizedPrecision,
      certainty: normalizedCertainty,
      calendar: "gregorian",
      timeZone: zone,
      utcOffset: zoned.offset,
      sourceText: options.sourceText || null,
    },
    {
      earliest: options.earliest,
      latest: options.latest,
      referenceSystem: options.referenceSystem,
    },
  );
}

export function endpointFrom(
  value: unknown,
  metadata: Record<string, unknown> = {},
): Endpoint | null {
  const parsed = parse(value);
  if (!parsed) return null;
  const endpoint: Endpoint = {
    value: parsed.source,
    precision: PRECISIONS.has(metadata.precision as any)
      ? (metadata.precision as string)
      : parsed.precision,
    certainty: certaintyFromForm((metadata as any).certainty),
    calendar: (metadata as any).calendar === "gregorian" ? "gregorian" : "gregorian",
    timeZone:
      typeof (metadata as any).timeZone === "string" && (metadata as any).timeZone
        ? (metadata as any).timeZone
        : null,
    utcOffset:
      typeof (metadata as any).utcOffset === "string" && (metadata as any).utcOffset
        ? (metadata as any).utcOffset
        : parsed.offset,
    sourceText:
      typeof (metadata as any).sourceText === "string" && (metadata as any).sourceText
        ? (metadata as any).sourceText
        : null,
  };
  return withEndpointMetadata(endpoint, metadata);
}

export function unknownEndpoint(metadata: Record<string, unknown> = {}): Endpoint | null {
  if (!metadata || typeof metadata !== "object" || (metadata as any).certainty !== "unknown")
    return null;
  const endpoint = withEndpointMetadata(
    {
      value: null,
      precision: PRECISIONS.has((metadata as any).precision)
        ? ((metadata as any).precision as string)
        : null,
      certainty: "unknown",
      calendar: (metadata as any).calendar === "gregorian" ? "gregorian" : "gregorian",
      timeZone: null,
      utcOffset: null,
      sourceText: text((metadata as any).sourceText, 4000) || null,
    },
    metadata,
  );
  const earliest = endpoint.earliest ? sortKey(endpoint.earliest) : Number.NaN;
  const latest = endpoint.latest ? sortKey(endpoint.latest) : Number.NaN;
  if (Number.isFinite(earliest) && Number.isFinite(latest) && earliest > latest) return null;
  return endpoint;
}

function normalizeEndpointInput(raw: unknown, fallback: unknown): Endpoint | null {
  if (raw && typeof raw === "object") {
    if (typeof (raw as any).value === "string" && (raw as any).value.trim())
      return endpointFrom((raw as any).value, raw as Record<string, unknown>);
    if (
      ((raw as any).value === null ||
        (raw as any).value === undefined ||
        (raw as any).value === "") &&
      (raw as any).certainty === "unknown"
    ) {
      return unknownEndpoint(raw as Record<string, unknown>);
    }
    return null;
  }
  return endpointFrom(fallback, {
    sourceText: typeof fallback === "string" ? fallback : null,
  });
}

export function normalizeExtent(
  rawTime: unknown,
  start: unknown,
  end: unknown,
  kind: string,
): Extent | null {
  const source = rawTime && typeof rawTime === "object" ? rawTime : {};
  const interval = kind === "range" || (source as any).type === "interval";
  const openStart = interval && (source as any).openStart === true;
  const openEnd = interval && (source as any).openEnd === true;
  if (!interval && ((source as any).openStart === true || (source as any).openEnd === true))
    return null;

  const normalizedStart = openStart ? null : normalizeEndpointInput((source as any).start, start);
  if (!openStart && !normalizedStart) return null;

  const normalizedEnd = interval
    ? openEnd
      ? null
      : normalizeEndpointInput((source as any).end, end)
    : null;
  if (interval && !openEnd && !normalizedEnd) return null;

  if (
    interval &&
    normalizedStart &&
    normalizedEnd &&
    normalizedStart.certainty === "exact" &&
    normalizedEnd.certainty === "exact"
  ) {
    const startKey = sortKey(normalizedStart);
    const endKey = sortKey(normalizedEnd);
    if (Number.isFinite(startKey) && Number.isFinite(endKey) && startKey > endKey) return null;
  }

  return {
    type: interval ? "interval" : "instant",
    start: normalizedStart,
    end: normalizedEnd,
    ...(openStart ? { openStart: true } : {}),
    ...(openEnd ? { openEnd: true } : {}),
  };
}

function knownSortKey(value: string): number {
  const parsed = parse(value);
  if (!parsed) return Number.NaN;

  const probe = new Date(0);
  probe.setUTCFullYear(parsed.year, (parsed.month ?? 1) - 1, parsed.day ?? 1);
  probe.setUTCHours(
    parsed.hour ?? 0,
    parsed.minute ?? 0,
    parsed.second ?? 0,
    parsed.millisecond ?? 0,
  );
  let timestamp = probe.getTime();
  if (!Number.isFinite(timestamp)) return Number.NaN;

  if (parsed.offset && parsed.offset !== "Z") {
    const sign = parsed.offset[0] === "-" ? -1 : 1;
    const parts = parsed.offset.slice(1).split(":").map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    timestamp -= sign * ((hours * 60 + minutes) * 60_000);
  }
  return timestamp;
}

export function endpointBounds(endpointOrValue: unknown): Bounds {
  const endpoint =
    typeof endpointOrValue === "string"
      ? endpointFrom(endpointOrValue)
      : (endpointOrValue as Endpoint | null);
  if (!endpoint || typeof endpoint !== "object") {
    return { start: Number.NaN, end: Number.NaN, locatable: false };
  }
  const value = typeof endpoint.value === "string" ? knownSortKey(endpoint.value) : Number.NaN;
  const earliest = endpoint.earliest ? knownSortKey(endpoint.earliest) : Number.NaN;
  const latest = endpoint.latest ? knownSortKey(endpoint.latest) : Number.NaN;
  let start = Number.isFinite(earliest) ? earliest : value;
  let end = Number.isFinite(latest) ? latest : value;
  if (!Number.isFinite(start) && Number.isFinite(end)) start = end;
  if (!Number.isFinite(end) && Number.isFinite(start)) end = start;
  return {
    start,
    end,
    locatable: Number.isFinite(start) && Number.isFinite(end) && start <= end,
  };
}

export function extentBounds(extent: unknown): Bounds {
  if (!extent || typeof extent !== "object") {
    return { start: Number.NaN, end: Number.NaN, locatable: false };
  }
  const interval = (extent as any).type === "interval";
  const startBounds = endpointBounds((extent as any).start);
  if (!interval) return startBounds;

  const endBounds = endpointBounds((extent as any).end);
  const start = (extent as any).openStart === true ? Number.NEGATIVE_INFINITY : startBounds.start;
  const end = (extent as any).openEnd === true ? Number.POSITIVE_INFINITY : endBounds.end;
  const startKnown = start === Number.NEGATIVE_INFINITY || Number.isFinite(start);
  const endKnown = end === Number.POSITIVE_INFINITY || Number.isFinite(end);
  return {
    start,
    end,
    locatable: startKnown && endKnown && start <= end,
  };
}

export function sortKey(endpointOrValue: unknown): number {
  const endpoint =
    typeof endpointOrValue === "string"
      ? endpointFrom(endpointOrValue)
      : (endpointOrValue as Endpoint | null);
  if (!endpoint) return Number.NaN;
  if (typeof endpoint.value === "string" && endpoint.value) return knownSortKey(endpoint.value);
  const bounds = endpointBounds(endpoint);
  if (!bounds.locatable) return Number.NaN;
  return bounds.start + (bounds.end - bounds.start) / 2;
}

export function formParts(endpointOrValue: unknown): FormParts {
  const endpoint =
    typeof endpointOrValue === "string"
      ? endpointFrom(endpointOrValue)
      : (endpointOrValue as Endpoint | null);
  if (!endpoint) {
    return { date: "", time: "", precision: "day", certainty: "exact", timeZone: "" };
  }
  const parsed = parse(endpoint.value);
  if (!parsed) {
    return {
      date: "",
      time: "",
      precision: PRECISIONS.has(endpoint.precision as any) ? endpoint.precision! : "day",
      certainty: certaintyFromForm(endpoint.certainty),
      timeZone: "",
    };
  }
  const precision = PRECISIONS.has(endpoint.precision as any)
    ? endpoint.precision
    : parsed.precision;
  const date =
    parsed.day !== null
      ? localValue(parsed, "day")
      : parsed.month !== null
        ? `${localValue(parsed, "month")}-01`
        : `${localValue(parsed, "year")}-01-01`;
  let time = "";
  if (!["millennium", "century", "decade", "year", "month", "day"].includes(precision as string)) {
    const hour = pad(parsed.hour ?? 0);
    const hhmm = `${hour}:${pad(parsed.minute ?? 0)}`;
    time =
      precision === "hour"
        ? hour
        : precision === "minute"
          ? hhmm
          : precision === "second"
            ? `${hhmm}:${pad(parsed.second ?? 0)}`
            : `${hhmm}:${pad(parsed.second ?? 0)}.${pad(parsed.millisecond ?? 0, 3)}`;
  }
  return {
    date,
    time,
    precision: precision as string,
    certainty: certaintyFromForm(endpoint.certainty),
    timeZone: endpoint.timeZone || "",
  };
}

function endpointRepresentation(endpoint: Endpoint | null | undefined): string {
  if (endpoint?.value) return endpoint.value;
  if (endpoint?.certainty === "unknown") return endpoint.sourceText || "unknown";
  return "";
}

export function intervalRepresentation(extent: unknown): string {
  if (!extent || typeof extent !== "object") return "";
  if ((extent as any).type !== "interval") return endpointRepresentation((extent as any).start);
  const start =
    (extent as any).openStart === true ? "" : endpointRepresentation((extent as any).start);
  const end = (extent as any).openEnd === true ? "" : endpointRepresentation((extent as any).end);
  return `${start}/${end}`;
}

export function supportedTimeZones(): string[] {
  if (typeof (globalThis.Intl as any).supportedValuesOf !== "function") return [];
  try {
    return (globalThis.Intl as any).supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

// Export public API as frozen object for compatibility during migration
const TimelineTemporalObj = {
  CERTAINTIES: [...CERTAINTIES],
  PRECISIONS: [...PRECISIONS],
  buildEndpoint,
  endpointBounds,
  endpointFrom,
  extentBounds,
  formParts,
  intervalRepresentation,
  normalizeExtent,
  parse,
  sortKey,
  supportedTimeZones,
  unknownEndpoint,
} as const;

export const TimelineTemporal = Object.freeze(TimelineTemporalObj);
