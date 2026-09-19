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

      const distance = Math.abs(entry.position - current.centroid);
      const envelopeStart = current.entries[0].position;
      const envelopeEnd = entry.position;
      const envelopeWidth = envelopeEnd - envelopeStart;

      if (distance <= threshold && envelopeWidth <= threshold * 1.9) {
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
    monthKey
  });
})();
