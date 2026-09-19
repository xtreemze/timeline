(() => {
  "use strict";

  const ISO_PATTERN = /^([+-]?\d{4,6})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?)?$/;
  const PRECISIONS = new Set(["day", "minute", "second", "millisecond"]);
  const CERTAINTIES = new Set(["exact", "approximate", "uncertain", "inferred", "unknown"]);

  function pad(value, width = 2) {
    return String(value).padStart(width, "0");
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
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = match[4] === undefined ? null : Number(match[4]);
    const minute = match[5] === undefined ? null : Number(match[5]);
    const second = match[6] === undefined ? null : Number(match[6]);
    const fraction = match[7] || "";
    const offset = match[8] || null;

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (hour !== null && (hour < 0 || hour > 23 || minute < 0 || minute > 59)) return null;
    if (second !== null && (second < 0 || second > 59)) return null;

    let validDate = false;
    if (globalThis.Temporal?.PlainDate) {
      try {
        Temporal.PlainDate.from({ year, month, day });
        validDate = true;
      } catch {
        validDate = false;
      }
    } else if (year >= 0 && year <= 9999) {
      const probe = new Date(0);
      probe.setUTCFullYear(year, month - 1, day);
      probe.setUTCHours(0, 0, 0, 0);
      validDate =
        probe.getUTCFullYear() === year &&
        probe.getUTCMonth() === month - 1 &&
        probe.getUTCDate() === day;
    }
    if (!validDate) return null;

    const precision =
      hour === null ? "day" :
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
    const date = `${pad(parts.year, Math.max(4, String(Math.abs(parts.year)).length))}-${pad(parts.month)}-${pad(parts.day)}`;
    if (precision === "day") return date;
    const time = `${pad(parts.hour ?? 0)}:${pad(parts.minute ?? 0)}`;
    if (precision === "minute") return `${date}T${time}`;
    const seconds = `${time}:${pad(parts.second ?? 0)}`;
    if (precision === "second") return `${date}T${seconds}`;
    return `${date}T${seconds}.${pad(parts.millisecond ?? 0, 3)}`;
  }

  function precisionFromForm(value) {
    return PRECISIONS.has(value) ? value : "day";
  }

  function certaintyFromForm(value) {
    return CERTAINTIES.has(value) ? value : "exact";
  }

  function normalizeTimeInput(time, precision) {
    if (precision === "day") return "";
    const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(String(time || "").trim());
    if (!match) throw new Error("Choose a valid clock time.");
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);
    const millisecond = fractionalMilliseconds(match[4] || "");
    if (hour > 23 || minute > 59 || second > 59) throw new Error("Choose a valid clock time.");
    if (precision === "minute") return `${pad(hour)}:${pad(minute)}`;
    if (precision === "second") return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
    return `${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;
  }

  function buildEndpoint({ date, time, precision, certainty, timeZone, sourceText = null }) {
    const normalizedPrecision = precisionFromForm(precision);
    const normalizedCertainty = certaintyFromForm(certainty);
    const dateValue = String(date || "").trim();
    const dateParts = parse(dateValue);
    if (!dateParts || dateParts.hasTime) throw new Error("Choose a valid calendar date.");

    if (normalizedPrecision === "day") {
      return {
        value: dateValue,
        precision: "day",
        certainty: normalizedCertainty,
        calendar: "gregorian",
        timeZone: null,
        utcOffset: null,
        sourceText: sourceText || null
      };
    }

    const normalizedTime = normalizeTimeInput(time, normalizedPrecision);
    const local = `${dateValue}T${normalizedTime}`;
    const parsedLocal = parse(local);
    if (!parsedLocal) throw new Error("Choose a valid date and clock time.");

    const zone = String(timeZone || "").trim();
    if (!zone) {
      return {
        value: local,
        precision: normalizedPrecision,
        certainty: normalizedCertainty,
        calendar: "gregorian",
        timeZone: null,
        utcOffset: null,
        sourceText: sourceText || null
      };
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

    return {
      value: `${local}${zoned.offset}`,
      precision: normalizedPrecision,
      certainty: normalizedCertainty,
      calendar: "gregorian",
      timeZone: zone,
      utcOffset: zoned.offset,
      sourceText: sourceText || null
    };
  }

  function endpointFrom(value, metadata = {}) {
    const parsed = parse(value);
    if (!parsed) return null;
    return {
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
  }

  function normalizeExtent(rawTime, start, end, kind) {
    const source = rawTime && typeof rawTime === "object" ? rawTime : {};
    const normalizedStart = source.start?.value
      ? endpointFrom(source.start.value, source.start)
      : endpointFrom(start, {});
    if (!normalizedStart) return null;

    const interval = kind === "range";
    const normalizedEnd = interval
      ? source.end?.value
        ? endpointFrom(source.end.value, source.end)
        : endpointFrom(end, {})
      : null;
    if (interval && !normalizedEnd) return null;

    return {
      type: interval ? "interval" : "instant",
      start: normalizedStart,
      end: normalizedEnd
    };
  }

  function sortKey(endpointOrValue) {
    const endpoint = typeof endpointOrValue === "string"
      ? endpointFrom(endpointOrValue)
      : endpointOrValue;
    if (!endpoint) return Number.NaN;
    const parsed = parse(endpoint.value);
    if (!parsed) return Number.NaN;

    if (parsed.offset) {
      if (globalThis.Temporal?.Instant) {
        try {
          return Number(Temporal.Instant.from(endpoint.value).epochMilliseconds);
        } catch {
          // Fall through to Date.parse for ordinary positive Gregorian years.
        }
      }
      const timestamp = Date.parse(endpoint.value);
      if (Number.isFinite(timestamp)) return timestamp;
    }

    const probe = new Date(0);
    probe.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
    probe.setUTCHours(
      parsed.hour || 0,
      parsed.minute || 0,
      parsed.second || 0,
      parsed.millisecond || 0
    );
    return probe.getTime();
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
      return { date: "", time: "", precision: "day", certainty: "exact", timeZone: "" };
    }
    const precision = PRECISIONS.has(endpoint.precision) ? endpoint.precision : parsed.precision;
    const date = localValue(parsed, "day");
    let time = "";
    if (precision !== "day") {
      const hhmm = `${pad(parsed.hour)}:${pad(parsed.minute)}`;
      time =
        precision === "minute" ? hhmm :
        precision === "second" ? `${hhmm}:${pad(parsed.second || 0)}` :
        `${hhmm}:${pad(parsed.second || 0)}.${pad(parsed.millisecond || 0, 3)}`;
    }
    return {
      date,
      time,
      precision,
      certainty: certaintyFromForm(endpoint.certainty),
      timeZone: endpoint.timeZone || ""
    };
  }

  function intervalRepresentation(extent) {
    if (!extent?.start?.value) return "";
    if (extent.type !== "interval" || !extent.end?.value) return extent.start.value;
    return `${extent.start.value}/${extent.end.value}`;
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
    endpointFrom,
    formParts,
    intervalRepresentation,
    normalizeExtent,
    parse,
    sortKey,
    supportedTimeZones
  });
})();
