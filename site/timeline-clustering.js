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
    const startCounts = new Map();
    for (const item of items) {
      if (!item || !Number.isFinite(item.start)) continue;
      const key = String(item.start);
      startCounts.set(key, (startCounts.get(key) || 0) + 1);
    }

    const projected = items
      .map((item) => ({
        item,
        position: finite(positionFor(item), Number.NaN),
        coincident: Number.isFinite(item?.start) && (startCounts.get(String(item.start)) || 0) > 1
      }))
      .filter((entry) => Number.isFinite(entry.position))
      .sort((a, b) => a.position - b.position || String(a.item.id).localeCompare(String(b.item.id)));

    const groups = [];
    let current = null;

    for (const entry of projected) {
      if (entry.coincident) {
        if (current) {
          groups.push(current);
          current = null;
        }
        groups.push({ entries: [entry], centroid: entry.position });
        continue;
      }

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

  function dayKey(timeMs) {
    const date = new Date(Number(timeMs));
    if (!Number.isFinite(date.getTime())) return null;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function formatDayMonthYear(timeMs) {
    const date = new Date(Number(timeMs));
    if (!Number.isFinite(date.getTime())) return "";
    const year = date.getUTCFullYear();
    const yearLabel = year > 0 ? String(year) : `${1 - year} BCE`;
    return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${yearLabel}`;
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

  function dayAccents(items, { maxItemsPerDay = 3, limit = 18 } = {}) {
    const buckets = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || !Number.isFinite(item.start)) continue;
      const key = dayKey(item.start);
      if (!key) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(item);
    }

    const accents = [];
    for (const [key, bucket] of buckets) {
      if (bucket.length < 1 || bucket.length > maxItemsPerDay) continue;
      const center = bucket.reduce((sum, item) => sum + item.start, 0) / bucket.length;
      accents.push({
        key,
        count: bucket.length,
        time: center,
        label: formatDayMonthYear(center),
        itemIds: bucket.map((item) => String(item.id))
      });
    }

    accents.sort((a, b) => a.time - b.time);
    if (accents.length <= limit) return accents;

    const stride = Math.ceil(accents.length / limit);
    return accents.filter((_, index) => index % stride === 0).slice(0, limit);
  }

  function yearAccents(items, { limit = 18 } = {}) {
    const buckets = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || !Number.isFinite(item.start)) continue;
      const label = yearLabelForTime(item.start);
      if (!label) continue;
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label).push(item);
    }

    const accents = [...buckets.entries()].map(([label, bucket]) => ({
      key: label,
      kind: "year",
      label,
      count: bucket.length,
      time: bucket.reduce((sum, item) => sum + item.start, 0) / bucket.length,
      itemIds: bucket.map((item) => String(item.id))
    })).sort((a, b) => a.time - b.time);

    if (accents.length <= limit) return accents;
    const stride = Math.ceil(accents.length / limit);
    return accents.filter((_, index) => index % stride === 0).slice(0, limit);
  }

  const SUBDAY_UNITS = new Set(["millisecond", "second", "minute", "hour"]);
  const FINE_UNITS = new Set([...SUBDAY_UNITS, "day", "week"]);

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

  function nonOverlapping(
    candidates,
    extentFor,
    { min = 0, max = Number.POSITIVE_INFINITY, gap = 10, clampToBounds = true } = {}
  ) {
    const selected = [];
    let lastEnd = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      const extent = Math.max(1, Number(extentFor(candidate)) || 1);
      const rawPosition = Number(candidate.position);
      if (!Number.isFinite(rawPosition)) continue;
      if (clampToBounds && Number.isFinite(max) && max - min < extent) continue;
      const lower = min + extent / 2;
      const upper = Number.isFinite(max) ? max - extent / 2 : rawPosition;
      const position = clampToBounds && Number.isFinite(max)
        ? Math.min(upper, Math.max(lower, rawPosition))
        : rawPosition;
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
    const unit = spec?.unit || null;
    const dayContext = SUBDAY_UNITS.has(unit);
    if (unit === "year") {
      const yearExtent = orientation === "vertical" ? 110 : 132;
      const edgeAccents = nonOverlapping(
        yearAccents(items, { limit })
          .map((accent) => ({
            ...accent,
            position: projectedPosition(accent.time, viewport, usable, padding)
          }))
          .filter((accent) => Number.isFinite(accent.position))
          .sort((a, b) => a.position - b.position),
        () => yearExtent,
        { min: padding, max: padding + usable, gap: 16, clampToBounds: false }
      );
      return {
        mode: edgeAccents.length ? "year-edge" : "axis-only",
        edgeAccents,
        axisMonths: [],
        hasAmbientContext: edgeAccents.length > 0
      };
    }

    const sourceAccents = dayContext
      ? dayAccents(items, { maxItemsPerDay: maxItemsPerMonth, limit })
      : monthAccents(items, { maxItemsPerMonth, limit });
    const accents = sourceAccents
      .map((accent) => ({
        ...accent,
        position: projectedPosition(accent.time, viewport, usable, padding)
      }))
      .filter((accent) => Number.isFinite(accent.position))
      .sort((a, b) => a.position - b.position);

    if (!accents.length) {
      return { mode: "axis-only", edgeAccents: [], axisMonths: [], hasAmbientContext: false };
    }

    const fullExtent = dayContext
      ? (orientation === "vertical" ? 260 : 300)
      : (orientation === "vertical" ? 220 : 240);
    const fullKind = dayContext ? "day-month-year" : "month-year";
    const full = nonOverlapping(
      accents.map((accent) => ({ ...accent, kind: fullKind, label: accent.label })),
      () => fullExtent,
      { min: padding, max: padding + usable, gap: 14, clampToBounds: false }
    );

    if (FINE_UNITS.has(unit) && full.length === accents.length) {
      return {
        mode: dayContext ? "day-month-year-edge" : "month-year-edge",
        edgeAccents: full,
        axisMonths: [],
        hasAmbientContext: true
      };
    }

    if (dayContext) {
      const monthBuckets = new Map();
      for (const accent of accents) {
        const label = formatMonthYear(accent.time);
        if (!monthBuckets.has(label)) monthBuckets.set(label, []);
        monthBuckets.get(label).push(accent);
      }

      const monthCandidates = [...monthBuckets.entries()].map(([label, entries]) => ({
        kind: "month-year",
        label,
        time: entries.reduce((sum, entry) => sum + entry.time, 0) / entries.length,
        position: entries.reduce((sum, entry) => sum + entry.position, 0) / entries.length,
        count: entries.reduce((sum, entry) => sum + entry.count, 0)
      })).sort((a, b) => a.position - b.position);

      const monthExtent = orientation === "vertical" ? 220 : 240;
      const edgeAccents = nonOverlapping(
        monthCandidates,
        () => monthExtent,
        { min: padding, max: padding + usable, gap: 14, clampToBounds: false }
      );

      const dayExtent = orientation === "vertical" ? 34 : 38;
      const axisMonths = nonOverlapping(
        accents.map((accent) => ({
          kind: "day-axis",
          key: accent.key,
          label: String(new Date(accent.time).getUTCDate()).padStart(2, "0"),
          time: accent.time,
          position: accent.position,
          count: accent.count
        })),
        () => dayExtent,
        { min: padding, max: padding + usable, gap: 8 }
      );

      return {
        mode: "month-year-edge-day-axis",
        edgeAccents,
        axisMonths,
        hasAmbientContext: edgeAccents.length > 0 || axisMonths.length > 0
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
      { min: padding, max: padding + usable, gap: 16, clampToBounds: false }
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

  function clusterExpansionViewport(
    items,
    viewport,
    pixelLength,
    thresholdPx,
    { paddingRatio = 0.12, minSpanMs = 1 } = {}
  ) {
    const starts = (Array.isArray(items) ? items : [])
      .map((item) => Number(item?.start))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const start = Number(viewport?.start);
    const end = Number(viewport?.end);
    if (starts.length < 2 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return null;
    }

    const uniqueStarts = starts.filter((value, index) => index === 0 || value !== starts[index - 1]);
    if (uniqueStarts.length < 2) {
      return {
        viewport: { start, end },
        forceExpanded: true,
        itemCount: starts.length
      };
    }

    const span = Math.max(minSpanMs, end - start);
    const length = Math.max(1, Number(pixelLength) || 1);
    const threshold = Math.max(1, Number(thresholdPx) || 1);
    const padding = Math.min(0.4, Math.max(0, Number(paddingRatio) || 0));
    let minimumDelta = Number.POSITIVE_INFINITY;
    for (let index = 1; index < uniqueStarts.length; index += 1) {
      minimumDelta = Math.min(minimumDelta, uniqueStarts[index] - uniqueStarts[index - 1]);
    }

    const minimum = uniqueStarts[0];
    const maximum = uniqueStarts[uniqueStarts.length - 1];
    const range = Math.max(minSpanMs, maximum - minimum);
    const availableRatio = Math.max(0.2, 1 - padding * 2);
    const containingSpan = Math.max(minSpanMs, range / availableRatio);
    const desiredDistance = threshold * 1.12;
    const separatingSpan = Math.max(minSpanMs, minimumDelta * length / desiredDistance);
    const preferredSpan = Math.max(containingSpan, separatingSpan);
    const targetSpan = Math.max(containingSpan, Math.min(span * 0.96, preferredSpan));
    const center = minimum + (maximum - minimum) / 2;
    const achievedDistance = minimumDelta / targetSpan * length;

    return {
      viewport: {
        start: center - targetSpan / 2,
        end: center + targetSpan / 2
      },
      forceExpanded: achievedDistance <= threshold,
      itemCount: starts.length
    };
  }

  function focusContextViewport(
    items,
    focusedId,
    viewport,
    pixelLength,
    thresholdPx,
    { desiredContext = 2, paddingRatio = 0.14, minSpanMs = 1, preserveScale = false } = {}
  ) {
    const source = (Array.isArray(items) ? items : [])
      .filter((item) => item && Number.isFinite(item.start))
      .slice()
      .sort((a, b) => a.start - b.start || String(a.id).localeCompare(String(b.id)));
    const focused = source.find((item) => String(item.id) === String(focusedId));
    if (!focused || !viewport || !Number.isFinite(viewport.start) || !Number.isFinite(viewport.end)) {
      return null;
    }

    const span = Math.max(minSpanMs, viewport.end - viewport.start);
    const length = Math.max(1, Number(pixelLength) || 1);
    const threshold = Math.max(1, Number(thresholdPx) || 1);
    const padding = Math.min(0.4, Math.max(0, Number(paddingRatio) || 0));
    const availableRatio = Math.max(0.2, 1 - padding * 2);
    const focusedEnd = Number.isFinite(focused.end) ? focused.end : focused.start;
    const focusedCenter = focused.start + (focusedEnd - focused.start) / 2;
    const focusedContainingSpan = Math.max(
      minSpanMs,
      Math.abs(focusedEnd - focused.start) / availableRatio
    );
    const overlapsViewport = (item) => {
      const end = Number.isFinite(item.end) ? item.end : item.start;
      return end >= viewport.start && item.start <= viewport.end;
    };
    const visibleSource = source.filter(overlapsViewport);
    const positionFor = (item) => ((item.start - viewport.start) / span) * length;
    const representations = clusterProjectedItems(visibleSource, positionFor, threshold);
    const representation = representations.find((entry) =>
      entry.items.some((item) => String(item.id) === String(focused.id))
    );

    const coincidentIds = source
      .filter((item) =>
        String(item.id) !== String(focused.id) &&
        item.start === focused.start
      )
      .map((item) => String(item.id));

    if (representation?.kind === "cluster") {
      const deltas = representation.items
        .filter((item) => String(item.id) !== String(focused.id))
        .map((item) => Math.abs(item.start - focused.start))
        .filter((delta) => delta > 0);
      if (!deltas.length) {
        return {
          mode: "pin",
          viewport: { ...viewport },
          forceUnique: true,
          contextIds: coincidentIds
        };
      }
      const nearest = Math.min(...deltas);
      const targetDistance = threshold * 1.18;
      const separatingSpan = Math.max(minSpanMs, nearest * length / targetDistance);
      const minimumSpan = Math.min(span, focusedContainingSpan);
      const targetSpan = Math.max(
        minimumSpan,
        Math.min(span * 0.6, separatingSpan)
      );
      const achievedDistance = nearest / targetSpan * length;
      return {
        mode: "separate",
        viewport: {
          start: focusedCenter - targetSpan / 2,
          end: focusedCenter + targetSpan / 2
        },
        forceUnique: achievedDistance <= threshold,
        contextIds: coincidentIds
      };
    }

    // Previous/Next navigation should preserve the established focused scale.
    // It may still zoom further above when the target is collision-clustered.
    if (preserveScale) {
      return {
        mode: coincidentIds.length ? "coincident" : "keep",
        viewport: { ...viewport },
        forceUnique: false,
        contextIds: coincidentIds
      };
    }

    const distinctOthers = source.filter(
      (item) =>
        String(item.id) !== String(focused.id) &&
        item.start !== focused.start
    );
    const targetContextCount = Math.min(
      Math.max(0, desiredContext),
      distinctOthers.length
    );
    const before = distinctOthers
      .filter((item) => item.start < focused.start)
      .sort((a, b) => b.start - a.start);
    const after = distinctOthers
      .filter((item) => item.start > focused.start)
      .sort((a, b) => a.start - b.start);
    const selected = [];
    if (before[0]) selected.push(before[0]);
    if (after[0] && selected.length < targetContextCount) selected.push(after[0]);

    const remaining = distinctOthers
      .filter((item) =>
        !selected.some((candidate) => String(candidate.id) === String(item.id))
      )
      .sort((a, b) => Math.abs(a.start - focused.start) - Math.abs(b.start - focused.start));
    while (selected.length < targetContextCount && remaining.length) selected.push(remaining.shift());

    const values = [focused.start, focusedEnd];
    for (const item of selected) {
      values.push(item.start);
      if (Number.isFinite(item.end)) values.push(item.end);
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rawLocalSpan = Math.max(0, max - min);
    const localSpan = rawLocalSpan > 0 ? rawLocalSpan / availableRatio : 0;

    // Focus is a deliberate chronology zoom. Cap the first focused viewport to
    // 60% of the pre-focus span, while avoiding an excessive one-step jump below
    // 18%. Nearby events can make the target tighter; distant events never force
    // the viewport to expand.
    const minimumFocusSpan = Math.min(
      span,
      Math.max(minSpanMs, span * 0.18, focusedContainingSpan)
    );
    const maximumFocusSpan = Math.max(minimumFocusSpan, span * 0.6);
    const targetSpan = Math.min(
      span,
      Math.max(
        minimumFocusSpan,
        localSpan > 0 ? Math.min(maximumFocusSpan, localSpan) : maximumFocusSpan
      )
    );
    const localCenter = min + (max - min) / 2;
    const center = localSpan > 0 && localSpan <= targetSpan
      ? localCenter
      : focusedCenter;
    const targetViewport = {
      start: center - targetSpan / 2,
      end: center + targetSpan / 2
    };
    const contextualIds = selected
      .filter((item) => {
        const end = Number.isFinite(item.end) ? item.end : item.start;
        return end >= targetViewport.start && item.start <= targetViewport.end;
      })
      .map((item) => String(item.id));

    return {
      mode: coincidentIds.length ? "coincident" : "context",
      viewport: targetViewport,
      forceUnique: false,
      contextIds: [...coincidentIds, ...contextualIds]
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
    clusterExpansionViewport,
    compactTickLabel,
    dayAccents,
    dayKey,
    formatDayMonthYear,
    formatMonthYear,
    focusContextViewport,
    monthAccents,
    monthKey,
    planTemporalAccents,
    yearAccents,
    projectedPosition,
    yearLabelForTime,
    monthLabelForTime
  });
})();
