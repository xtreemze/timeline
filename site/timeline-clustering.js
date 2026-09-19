(() => {
  "use strict";

  const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clusterProjectedItems(items, positionFor, thresholdPx = 120) {
    if (!Array.isArray(items)) return [];
    if (typeof positionFor !== "function") throw new TypeError("positionFor must be a function.");
    const threshold = Math.max(1, finite(thresholdPx, 120));
    const projected = items
      .map((item) => ({ item, position: finite(positionFor(item), Number.NaN) }))
      .filter((entry) => Number.isFinite(entry.position))
      .sort((a, b) => a.position - b.position || String(a.item.id).localeCompare(String(b.item.id)));

    const groups = [];
    let current = null;

    for (const entry of projected) {
      if (!current) {
        current = { entries: [entry], centroid: entry.position };
        continue;
      }

      const previousPosition = current.entries[current.entries.length - 1].position;
      const adjacentDistance = Math.abs(entry.position - previousPosition);
      const envelopeStart = current.entries[0].position;
      const envelopeEnd = entry.position;
      const envelopeWidth = envelopeEnd - envelopeStart;

      if (adjacentDistance <= threshold && envelopeWidth <= threshold * 1.9) {
        current.entries.push(entry);
        current.centroid =
          current.entries.reduce((sum, candidate) => sum + candidate.position, 0) /
          current.entries.length;
      } else {
        groups.push(current);
        current = { entries: [entry], centroid: entry.position };
      }
    }
    if (current) groups.push(current);

    return groups.map((group) => {
      if (group.entries.length === 1) {
        const only = group.entries[0];
        return {
          kind: "item",
          id: String(only.item.id),
          item: only.item,
          items: [only.item],
          position: only.position,
          start: only.item.start,
          end: Number.isFinite(only.item.end) ? only.item.end : only.item.start
        };
      }

      const groupedItems = group.entries.map((entry) => entry.item);
      const ids = groupedItems.map((item) => String(item.id)).sort();
      const start = Math.min(...groupedItems.map((item) => item.start));
      const end = Math.max(
        ...groupedItems.map((item) => Number.isFinite(item.end) ? item.end : item.start)
      );
      return {
        kind: "cluster",
        id: `cluster:${ids.join("|")}`,
        items: groupedItems,
        position: group.centroid,
        start,
        end
      };
    });
  }

  function monthKey(timeMs) {
    const date = new Date(Number(timeMs));
    if (!Number.isFinite(date.getTime())) return null;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }

  function formatMonthYear(timeMs) {
    const date = new Date(Number(timeMs));
    if (!Number.isFinite(date.getTime())) return "";
    const year = date.getUTCFullYear();
    const yearLabel = year > 0 ? String(year) : `${1 - year} BCE`;
    return `${MONTH_NAMES[date.getUTCMonth()]} ${yearLabel}`;
  }

  function monthAccents(items, { maxItemsPerMonth = 3, limit = 18 } = {}) {
    const buckets = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || !Number.isFinite(item.start)) continue;
      const key = monthKey(item.start);
      if (!key) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(item);
    }

    const accents = [];
    for (const [key, bucket] of buckets) {
      if (bucket.length < 1 || bucket.length > maxItemsPerMonth) continue;
      const center = bucket.reduce((sum, item) => sum + item.start, 0) / bucket.length;
      accents.push({
        key,
        count: bucket.length,
        time: center,
        label: formatMonthYear(center),
        itemIds: bucket.map((item) => String(item.id))
      });
    }

    accents.sort((a, b) => a.time - b.time);
    if (accents.length <= limit) return accents;

    const stride = Math.ceil(accents.length / limit);
    return accents.filter((_, index) => index % stride === 0).slice(0, limit);
  }

  const FINE_UNITS = new Set(["millisecond", "second", "minute", "hour", "day", "week"]);

  function yearLabelForTime(timeMs) {
    const date = new Date(Number(timeMs));
    if (!Number.isFinite(date.getTime())) return "";
    const year = date.getUTCFullYear();
    return year > 0 ? String(year) : `${1 - year} BCE`;
  }

  function monthLabelForTime(timeMs) {
    const date = new Date(Number(timeMs));
    if (!Number.isFinite(date.getTime())) return "";
    return MONTH_NAMES[date.getUTCMonth()];
  }

  function projectedPosition(timeMs, viewport, pixelLength, padding = 0) {
    const start = Number(viewport?.start);
    const end = Number(viewport?.end);
    const length = Number(pixelLength);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(length)) {
      return Number.NaN;
    }
    return padding + ((Number(timeMs) - start) / (end - start)) * length;
  }

  function nonOverlapping(candidates, extentFor, { min = 0, max = Number.POSITIVE_INFINITY, gap = 10 } = {}) {
    const selected = [];
    let lastEnd = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      const extent = Math.max(1, Number(extentFor(candidate)) || 1);
      if (Number.isFinite(max) && max - min < extent) continue;
      const lower = min + extent / 2;
      const upper = Number.isFinite(max) ? max - extent / 2 : candidate.position;
      const position = Number.isFinite(max)
        ? Math.min(upper, Math.max(lower, candidate.position))
        : Math.max(lower, candidate.position);
      const start = position - extent / 2;
      const end = position + extent / 2;
      if (start < lastEnd + gap) continue;
      selected.push({ ...candidate, position });
      lastEnd = end;
    }
    return selected;
  }

  function planTemporalAccents(
    items,
    {
      viewport,
      pixelLength,
      padding = 0,
      orientation = "horizontal",
      spec = null,
      maxItemsPerMonth = 3,
      limit = 18
    } = {}
  ) {
    const usable = Math.max(1, Number(pixelLength) || 1);
    const accents = monthAccents(items, { maxItemsPerMonth, limit })
      .map((accent) => ({
        ...accent,
        position: projectedPosition(accent.time, viewport, usable, padding)
      }))
      .filter((accent) => Number.isFinite(accent.position))
      .sort((a, b) => a.position - b.position);

    const unit = spec?.unit || null;
    if (!accents.length || unit === "year") {
      return { mode: "axis-only", edgeAccents: [], axisMonths: [], hasAmbientContext: false };
    }

    const fullExtent = orientation === "vertical" ? 220 : 240;
    const full = nonOverlapping(
      accents.map((accent) => ({ ...accent, kind: "month-year", label: accent.label })),
      () => fullExtent,
      { min: padding, max: padding + usable, gap: 14 }
    );

    if (FINE_UNITS.has(unit) && full.length === accents.length) {
      return {
        mode: "month-year-edge",
        edgeAccents: full,
        axisMonths: [],
        hasAmbientContext: true
      };
    }

    const yearBuckets = new Map();
    for (const accent of accents) {
      const label = yearLabelForTime(accent.time);
      if (!yearBuckets.has(label)) yearBuckets.set(label, []);
      yearBuckets.get(label).push(accent);
    }

    const yearCandidates = [...yearBuckets.entries()].map(([label, entries]) => ({
      kind: "year",
      label,
      time: entries.reduce((sum, entry) => sum + entry.time, 0) / entries.length,
      position: entries.reduce((sum, entry) => sum + entry.position, 0) / entries.length,
      count: entries.reduce((sum, entry) => sum + entry.count, 0)
    })).sort((a, b) => a.position - b.position);

    const yearExtent = orientation === "vertical" ? 110 : 132;
    const edgeAccents = nonOverlapping(
      yearCandidates,
      () => yearExtent,
      { min: padding, max: padding + usable, gap: 16 }
    );

    const monthExtent = orientation === "vertical" ? 44 : 48;
    const axisMonths = nonOverlapping(
      accents.map((accent) => ({
        kind: "month-axis",
        key: accent.key,
        label: monthLabelForTime(accent.time),
        time: accent.time,
        position: accent.position,
        count: accent.count
      })),
      () => monthExtent,
      { min: padding, max: padding + usable, gap: 8 }
    );

    return {
      mode: "year-edge-month-axis",
      edgeAccents,
      axisMonths,
      hasAmbientContext: edgeAccents.length > 0 || axisMonths.length > 0
    };
  }

  function compactTickLabel(timeMs, spec, hasAmbientMonth) {
    if (!hasAmbientMonth || !spec) return null;
    const date = new Date(Number(timeMs));
    if (!Number.isFinite(date.getTime())) return null;
    const pad = (value, width = 2) => String(Math.abs(value)).padStart(width, "0");

    if (spec.unit === "millisecond") {
      return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
    }
    if (spec.unit === "second") {
      return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
    }
    if (spec.unit === "minute") return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    if (spec.unit === "hour") return `${pad(date.getUTCHours())}:00`;
    if (spec.unit === "day" || spec.unit === "week") return pad(date.getUTCDate());
    if (spec.unit === "month") return "";
    return null;
  }

  globalThis.TimelineClustering = Object.freeze({
    clusterProjectedItems,
    compactTickLabel,
    formatMonthYear,
    monthAccents,
    monthKey,
    planTemporalAccents,
    projectedPosition,
    yearLabelForTime,
    monthLabelForTime
  });
})();
