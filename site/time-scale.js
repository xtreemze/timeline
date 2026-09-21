(() => {
  const FIXED_UNITS = {
    millisecond: 1,
    second: 1000,
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
  };

  const CANDIDATES = [
    ["millisecond", 1],
    ["millisecond", 2],
    ["millisecond", 5],
    ["millisecond", 10],
    ["millisecond", 20],
    ["millisecond", 50],
    ["millisecond", 100],
    ["millisecond", 200],
    ["millisecond", 500],
    ["second", 1],
    ["second", 2],
    ["second", 5],
    ["second", 10],
    ["second", 15],
    ["second", 30],
    ["minute", 1],
    ["minute", 2],
    ["minute", 5],
    ["minute", 10],
    ["minute", 15],
    ["minute", 30],
    ["hour", 1],
    ["hour", 2],
    ["hour", 3],
    ["hour", 6],
    ["hour", 12],
    ["day", 1],
    ["day", 2],
    ["week", 1],
    ["week", 2],
    ["month", 1],
    ["month", 3],
    ["month", 6],
    ["year", 1],
    ["year", 2],
    ["year", 5],
    ["year", 10],
    ["year", 20],
    ["year", 50],
    ["year", 100],
    ["year", 200],
    ["year", 500],
  ].map(([unit, step]) => ({ unit, step, approxMs: approximateMilliseconds(unit, step) }));

  function approximateMilliseconds(unit, step) {
    if (FIXED_UNITS[unit]) return FIXED_UNITS[unit] * step;
    if (unit === "month") return 30.436875 * FIXED_UNITS.day * step;
    if (unit === "year") return 365.2425 * FIXED_UNITS.day * step;
    throw new Error(`Unknown temporal unit: ${unit}`);
  }

  function assertFinite(value, name) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
  }

  function normalizeViewport(viewport) {
    if (!viewport || typeof viewport !== "object")
      throw new TypeError("Expected a viewport object.");
    const start = Number(viewport.start);
    const end = Number(viewport.end);
    assertFinite(start, "viewport.start");
    assertFinite(end, "viewport.end");
    if (end <= start) throw new RangeError("viewport.end must be greater than viewport.start.");
    return { start, end };
  }

  function pan(viewport, deltaMs) {
    const value = normalizeViewport(viewport);
    assertFinite(deltaMs, "deltaMs");
    return { start: value.start + deltaMs, end: value.end + deltaMs };
  }

  function zoom(viewport, factor, anchorMs = null, minSpanMs = 1) {
    const value = normalizeViewport(viewport);
    assertFinite(factor, "factor");
    if (factor <= 0) throw new RangeError("factor must be greater than zero.");
    assertFinite(minSpanMs, "minSpanMs");
    if (minSpanMs <= 0) throw new RangeError("minSpanMs must be greater than zero.");

    const span = value.end - value.start;
    const anchor = anchorMs === null ? value.start + span / 2 : Number(anchorMs);
    assertFinite(anchor, "anchorMs");

    const nextSpan = Math.max(minSpanMs, span * factor);
    const ratio = span === 0 ? 0.5 : (anchor - value.start) / span;
    const start = anchor - nextSpan * ratio;
    return { start, end: start + nextSpan };
  }

  function fit(values, { paddingRatio = 0.08, minSpanMs = 1000 } = {}) {
    if (!Array.isArray(values) || values.length === 0)
      throw new TypeError("fit() requires at least one temporal coordinate.");
    const numeric = values.map(Number);
    numeric.forEach((value, index) => assertFinite(value, `values[${index}]`));
    let start = Math.min(...numeric);
    let end = Math.max(...numeric);
    const rawSpan = Math.max(end - start, minSpanMs);
    const padding = rawSpan * Math.max(0, paddingRatio);
    if (start === end) {
      start -= rawSpan / 2;
      end += rawSpan / 2;
    }
    return { start: start - padding, end: end + padding };
  }

  function coordinateFor(timeMs, viewport, pixelLength) {
    const value = normalizeViewport(viewport);
    assertFinite(timeMs, "timeMs");
    assertFinite(pixelLength, "pixelLength");
    return ((timeMs - value.start) / (value.end - value.start)) * pixelLength;
  }

  function selectTickSpec(viewport, pixelLength, targetPixelSpacing = 96) {
    const value = normalizeViewport(viewport);
    assertFinite(pixelLength, "pixelLength");
    assertFinite(targetPixelSpacing, "targetPixelSpacing");
    if (pixelLength <= 0 || targetPixelSpacing <= 0)
      throw new RangeError("Pixel lengths must be greater than zero.");

    const desired = (value.end - value.start) / Math.max(1, pixelLength / targetPixelSpacing);
    const builtIn = CANDIDATES.find((candidate) => candidate.approxMs >= desired);
    if (builtIn) return { ...builtIn };

    const approximateYears = desired / approximateMilliseconds("year", 1);
    const exponent = Math.floor(Math.log10(approximateYears));
    const base = 10 ** exponent;
    const multiplier = [1, 2, 5, 10].find((value) => value * base >= approximateYears) || 10;
    const step = Math.max(1, multiplier * base);
    return { unit: "year", step, approxMs: approximateMilliseconds("year", step) };
  }

  function createUtcDate(
    year,
    monthIndex = 0,
    day = 1,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
  ) {
    const date = new Date(0);
    date.setUTCFullYear(year, monthIndex, day);
    date.setUTCHours(hour, minute, second, millisecond);
    return date;
  }

  function ceilFixedTick(start, stepMs) {
    return Math.ceil(start / stepMs) * stepMs;
  }

  function firstCalendarTick(start, spec) {
    const date = new Date(start);
    if (spec.unit === "month") {
      const absoluteMonth = date.getUTCFullYear() * 12 + date.getUTCMonth();
      let tickMonth = Math.floor(absoluteMonth / spec.step) * spec.step;
      let year = Math.floor(tickMonth / 12);
      let month = ((tickMonth % 12) + 12) % 12;
      let tick = createUtcDate(year, month, 1).getTime();
      while (tick < start) {
        tickMonth += spec.step;
        year = Math.floor(tickMonth / 12);
        month = ((tickMonth % 12) + 12) % 12;
        tick = createUtcDate(year, month, 1).getTime();
      }
      return tick;
    }

    let year = Math.floor(date.getUTCFullYear() / spec.step) * spec.step;
    let tick = createUtcDate(year, 0, 1).getTime();
    while (tick < start) {
      year += spec.step;
      tick = createUtcDate(year, 0, 1).getTime();
    }
    return tick;
  }

  function nextCalendarTick(current, spec) {
    const date = new Date(current);
    if (spec.unit === "month") {
      const absoluteMonth = date.getUTCFullYear() * 12 + date.getUTCMonth() + spec.step;
      const year = Math.floor(absoluteMonth / 12);
      const month = ((absoluteMonth % 12) + 12) % 12;
      return createUtcDate(year, month, 1).getTime();
    }
    return createUtcDate(date.getUTCFullYear() + spec.step, 0, 1).getTime();
  }

  function generateTicks(viewport, pixelLength, targetPixelSpacing = 96, limit = 2000) {
    const value = normalizeViewport(viewport);
    const spec = selectTickSpec(value, pixelLength, targetPixelSpacing);
    const ticks = [];

    if (FIXED_UNITS[spec.unit]) {
      const stepMs = FIXED_UNITS[spec.unit] * spec.step;
      let tick = ceilFixedTick(value.start, stepMs);
      while (tick <= value.end && ticks.length < limit) {
        ticks.push({ value: tick, label: formatTick(tick, spec), spec });
        tick += stepMs;
      }
      return ticks;
    }

    let tick = firstCalendarTick(value.start, spec);
    while (tick <= value.end && ticks.length < limit) {
      ticks.push({ value: tick, label: formatTick(tick, spec), spec });
      tick = nextCalendarTick(tick, spec);
    }
    return ticks;
  }

  function pad(value, width = 2) {
    return String(Math.abs(value)).padStart(width, "0");
  }

  function formatYear(year) {
    if (year > 0) return String(year);
    return `${1 - year} BCE`;
  }

  function formatTick(timeMs, spec) {
    const date = new Date(timeMs);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const millisecond = date.getUTCMilliseconds();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (spec.unit === "millisecond")
      return `${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;
    if (spec.unit === "second") return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
    if (spec.unit === "minute") return `${pad(hour)}:${pad(minute)}`;
    if (spec.unit === "hour") return `${pad(day)} ${monthNames[month]} ${pad(hour)}:00`;
    if (spec.unit === "day" || spec.unit === "week")
      return `${pad(day)} ${monthNames[month]} ${formatYear(year)}`;
    if (spec.unit === "month") return `${monthNames[month]} ${formatYear(year)}`;
    return formatYear(year);
  }

  globalThis.TimelineScale = Object.freeze({
    FIXED_UNITS: Object.freeze({ ...FIXED_UNITS }),
    approximateMilliseconds,
    coordinateFor,
    createUtcDate,
    fit,
    formatTick,
    generateTicks,
    normalizeViewport,
    pan,
    selectTickSpec,
    zoom,
  });
})();
