(() => {
  "use strict";

  const ISO_PATTERN = /^([+-]?\d{4,6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/;
  const PRECISIONS = new Set([
    "millennium", "century", "decade", "year", "month",
    "day", "hour", "minute", "second", "millisecond"
  ]);
  const CERTAINTIES = new Set(["exact", "approximate", "uncertain", "inferred", "unknown"]);

  function pad(value, width = 2) {
    return String(value).padStart(width, "0");
  }

  function formatYear(year) {
    if (year >= 0 && year <= 9999) return pad(year, 4);
    const absolute = String(Math.abs(year)).padStart(6, "0");
    return `${year < 0 ? "-" : "+"}${absolute}`;
  }

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function daysInMonth(year, month) {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  }

  function text(value, max = 4000) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function fractionalMilliseconds(fraction) {
    if (!fraction) return 0;
    return Number((fraction + "000").slice(0, 3));
  }

  function parse(value) {
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

    const precision =
      month === null ? "year" :
      day === null ? "month" :
      hour === null ? "day" :
      minute === null ? "hour" :
      second === null ? "minute" :
      fraction ? "millisecond" :
      "second";

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
      precision
    };
  }

  function localValue(parts, precision = parts.precision) {
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

  function precisionFromForm(value) {
    return PRECISIONS.has(value) ? value : "day";
  }

  function certaintyFromForm(value) {
    return CERTAINTIES.has(value) ? value : "exact";
  }

  function normalizeTimeInput(time, precision) {
    if (["millennium", "century", "decade", "year", "month", "day"].includes(precision)) return "";
    const match = /^(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(String(time || "").trim());
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

  function normalizeBound(value) {
    const candidate = typeof value === "object" && value ? value.value : value;
    const parsed = parse(text(candidate, 120));
    return parsed?.source || null;
  }

  function withEndpointMetadata(endpoint, metadata = {}) {
    const earliest = normalizeBound(metadata.earliest);
    const latest = normalizeBound(metadata.latest);
    if (earliest) endpoint.earliest = earliest;
    if (latest) endpoint.latest = latest;
    const referenceSystem = text(metadata.referenceSystem, 500);
    if (referenceSystem) endpoint.referenceSystem = referenceSystem;
    return endpoint;
  }

  function buildEndpoint({ date, time, precision, certainty, timeZone, sourceText = null, earliest = null, latest = null, referenceSystem = null }) {
    const normalizedPrecision = precisionFromForm(precision);
    const normalizedCertainty = certaintyFromForm(certainty);
    const dateValue = String(date || "").trim();
    const dateParts = parse(dateValue);
    if (!dateParts || dateParts.hasTime) throw new Error("Choose a valid calendar date.");

    if (["millennium", "century", "decade", "year", "month", "day"].includes(normalizedPrecision)) {
      return withEndpointMetadata({
        value: localValue(dateParts, normalizedPrecision),
        precision: normalizedPrecision,
        certainty: normalizedCertainty,
        calendar: "gregorian",
        timeZone: null,
        utcOffset: null,
        sourceText: sourceText || null
      }, { earliest, latest, referenceSystem });
    }

    const normalizedTime = normalizeTimeInput(time, normalizedPrecision);
    const local = `${dateValue}T${normalizedTime}`;
    const parsedLocal = parse(local);
    if (!parsedLocal) throw new Error("Choose a valid date and clock time.");

    const zone = String(timeZone || "").trim();
    if (!zone) {
      return withEndpointMetadata({
        value: local,
        precision: normalizedPrecision,
        certainty: normalizedCertainty,
        calendar: "gregorian",
        timeZone: null,
        utcOffset: null,
        sourceText: sourceText || null
      }, { earliest, latest, referenceSystem });
    }

    if (!globalThis.Temporal?.ZonedDateTime) {
      throw new Error("This browser does not provide the Temporal API required for time-zone-aware dates.");
    }

    let zoned;
    try {
      zoned = Temporal.ZonedDateTime.from(
        {
          timeZone: zone,
          year: parsedLocal.year,
          month: parsedLocal.month,
          day: parsedLocal.day,
          hour: parsedLocal.hour,
          minute: parsedLocal.minute,
          second: parsedLocal.second || 0,
          millisecond: parsedLocal.millisecond || 0
        },
        { disambiguation: "reject" }
      );
    } catch {
      throw new Error("That local date/time does not exist uniquely in the selected time zone.");
    }

    return withEndpointMetadata({
      value: `${local}${zoned.offset}`,
      precision: normalizedPrecision,
      certainty: normalizedCertainty,
      calendar: "gregorian",
      timeZone: zone,
      utcOffset: zoned.offset,
      sourceText: sourceText || null
    }, { earliest, latest, referenceSystem });
  }

  function endpointFrom(value, metadata = {}) {
    const parsed = parse(value);
    if (!parsed) return null;
    const endpoint = {
      value: parsed.source,
      precision: PRECISIONS.has(metadata.precision) ? metadata.precision : parsed.precision,
      certainty: certaintyFromForm(metadata.certainty),
      calendar: metadata.calendar === "gregorian" ? "gregorian" : "gregorian",
      timeZone: typeof metadata.timeZone === "string" && metadata.timeZone ? metadata.timeZone : null,
      utcOffset: typeof metadata.utcOffset === "string" && metadata.utcOffset
        ? metadata.utcOffset
        : parsed.offset,
      sourceText: typeof metadata.sourceText === "string" && metadata.sourceText ? metadata.sourceText : null
    };
    return withEndpointMetadata(endpoint, metadata);
  }

  function unknownEndpoint(metadata = {}) {
    if (!metadata || typeof metadata !== "object" || metadata.certainty !== "unknown") return null;
    const endpoint = withEndpointMetadata({
      value: null,
      precision: PRECISIONS.has(metadata.precision) ? metadata.precision : null,
      certainty: "unknown",
      calendar: metadata.calendar === "gregorian" ? "gregorian" : "gregorian",
      timeZone: null,
      utcOffset: null,
      sourceText: text(metadata.sourceText, 4000) || null
    }, metadata);
    const earliest = endpoint.earliest ? sortKey(endpoint.earliest) : Number.NaN;
    const latest = endpoint.latest ? sortKey(endpoint.latest) : Number.NaN;
    if (Number.isFinite(earliest) && Number.isFinite(latest) && earliest > latest) return null;
    return endpoint;
  }

  function normalizeEndpointInput(raw, fallback) {
    if (raw && typeof raw === "object") {
      if (typeof raw.value === "string" && raw.value.trim()) return endpointFrom(raw.value, raw);
      if ((raw.value === null || raw.value === undefined || raw.value === "") && raw.certainty === "unknown") {
        return unknownEndpoint(raw);
      }
      return null;
    }
    return endpointFrom(fallback, { sourceText: typeof fallback === "string" ? fallback : null });
  }

  function normalizeExtent(rawTime, start, end, kind) {
    const source = rawTime && typeof rawTime === "object" ? rawTime : {};
    const interval = kind === "range" || source.type === "interval";
    const openStart = interval && source.openStart === true;
    const openEnd = interval && source.openEnd === true;
    if (!interval && (source.openStart === true || source.openEnd === true)) return null;

    const normalizedStart = openStart ? null : normalizeEndpointInput(source.start, start);
    if (!openStart && !normalizedStart) return null;

    const normalizedEnd = interval
      ? openEnd
        ? null
        : normalizeEndpointInput(source.end, end)
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
      ...(openEnd ? { openEnd: true } : {})
    };
  }

  function knownSortKey(value) {
    const parsed = parse(value);
    if (!parsed) return Number.NaN;

    const probe = new Date(0);
    probe.setUTCFullYear(parsed.year, (parsed.month ?? 1) - 1, parsed.day ?? 1);
    probe.setUTCHours(
      parsed.hour ?? 0,
      parsed.minute ?? 0,
      parsed.second ?? 0,
      parsed.millisecond ?? 0
    );
    let timestamp = probe.getTime();
    if (!Number.isFinite(timestamp)) return Number.NaN;

    if (parsed.offset && parsed.offset !== "Z") {
      const sign = parsed.offset[0] === "-" ? -1 : 1;
      const [hours, minutes] = parsed.offset.slice(1).split(":").map(Number);
      timestamp -= sign * ((hours * 60 + minutes) * 60_000);
    }
    return timestamp;
  }

  function endpointBounds(endpointOrValue) {
    const endpoint = typeof endpointOrValue === "string"
      ? endpointFrom(endpointOrValue)
      : endpointOrValue;
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
      locatable: Number.isFinite(start) && Number.isFinite(end) && start <= end
    };
  }

  function extentBounds(extent) {
    if (!extent || typeof extent !== "object") {
      return { start: Number.NaN, end: Number.NaN, locatable: false };
    }
    const interval = extent.type === "interval";
    const startBounds = endpointBounds(extent.start);
    if (!interval) return startBounds;

    const endBounds = endpointBounds(extent.end);
    const start = extent.openStart === true ? Number.NEGATIVE_INFINITY : startBounds.start;
    const end = extent.openEnd === true ? Number.POSITIVE_INFINITY : endBounds.end;
    const startKnown = start === Number.NEGATIVE_INFINITY || Number.isFinite(start);
    const endKnown = end === Number.POSITIVE_INFINITY || Number.isFinite(end);
    return {
      start,
      end,
      locatable: startKnown && endKnown && start <= end
    };
  }

  function sortKey(endpointOrValue) {
    const endpoint = typeof endpointOrValue === "string"
      ? endpointFrom(endpointOrValue)
      : endpointOrValue;
    if (!endpoint) return Number.NaN;
    if (typeof endpoint.value === "string" && endpoint.value) return knownSortKey(endpoint.value);
    const bounds = endpointBounds(endpoint);
    if (!bounds.locatable) return Number.NaN;
    return bounds.start + (bounds.end - bounds.start) / 2;
  }

  function formParts(endpointOrValue) {
    const endpoint = typeof endpointOrValue === "string"
      ? endpointFrom(endpointOrValue)
      : endpointOrValue;
    if (!endpoint) {
      return { date: "", time: "", precision: "day", certainty: "exact", timeZone: "" };
    }
    const parsed = parse(endpoint.value);
    if (!parsed) {
      return {
        date: "",
        time: "",
        precision: PRECISIONS.has(endpoint.precision) ? endpoint.precision : "day",
        certainty: certaintyFromForm(endpoint.certainty),
        timeZone: ""
      };
    }
    const precision = PRECISIONS.has(endpoint.precision) ? endpoint.precision : parsed.precision;
    const date = parsed.day !== null
      ? localValue(parsed, "day")
      : parsed.month !== null
        ? `${localValue(parsed, "month")}-01`
        : `${localValue(parsed, "year")}-01-01`;
    let time = "";
    if (!["millennium", "century", "decade", "year", "month", "day"].includes(precision)) {
      const hour = pad(parsed.hour ?? 0);
      const hhmm = `${hour}:${pad(parsed.minute ?? 0)}`;
      time =
        precision === "hour" ? hour :
        precision === "minute" ? hhmm :
        precision === "second" ? `${hhmm}:${pad(parsed.second ?? 0)}` :
        `${hhmm}:${pad(parsed.second ?? 0)}.${pad(parsed.millisecond ?? 0, 3)}`;
    }
    return {
      date,
      time,
      precision,
      certainty: certaintyFromForm(endpoint.certainty),
      timeZone: endpoint.timeZone || ""
    };
  }

  function endpointRepresentation(endpoint) {
    if (endpoint?.value) return endpoint.value;
    if (endpoint?.certainty === "unknown") return endpoint.sourceText || "unknown";
    return "";
  }

  function intervalRepresentation(extent) {
    if (!extent || typeof extent !== "object") return "";
    if (extent.type !== "interval") return endpointRepresentation(extent.start);
    const start = extent.openStart === true ? "" : endpointRepresentation(extent.start);
    const end = extent.openEnd === true ? "" : endpointRepresentation(extent.end);
    return `${start}/${end}`;
  }

  function supportedTimeZones() {
    if (typeof Intl.supportedValuesOf !== "function") return [];
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }

  globalThis.TimelineTemporal = Object.freeze({
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
    unknownEndpoint
  });
})();
