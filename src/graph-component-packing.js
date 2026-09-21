function nodeId(value) {
  if (value && typeof value === "object") return String(value.id ?? "");
  return value === null || value === undefined ? "" : String(value);
}

function edgeEndpoints(edge) {
  const start = nodeId(edge?.start ?? edge?.source ?? edge?.subjectId);
  const end = nodeId(edge?.end ?? edge?.target ?? edge?.objectId);
  return [start, end];
}

export function connectedGraphComponents(nodes = [], edges = []) {
  const ids = [...new Set((Array.isArray(nodes) ? nodes : [])
    .map(nodeId)
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  const adjacency = new Map(ids.map((id) => [id, new Set()]));
  for (const edge of Array.isArray(edges) ? edges : []) {
    const [start, end] = edgeEndpoints(edge);
    if (!start || !end || start === end) continue;
    if (!adjacency.has(start) || !adjacency.has(end)) continue;
    adjacency.get(start).add(end);
    adjacency.get(end).add(start);
  }

  const visited = new Set();
  const components = [];
  for (const id of ids) {
    if (visited.has(id)) continue;
    const stack = [id];
    const component = [];
    visited.add(id);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      const neighbors = [...adjacency.get(current)].sort((a, b) => b.localeCompare(a));
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
    component.sort((a, b) => a.localeCompare(b));
    components.push(component);
  }

  return components.sort((a, b) => (a[0] || "").localeCompare(b[0] || ""));
}

export function graphComponentTopologySignature(nodes = [], edges = []) {
  const ids = [...new Set((Array.isArray(nodes) ? nodes : [])
    .map(nodeId)
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const allowed = new Set(ids);
  const links = new Set();

  for (const edge of Array.isArray(edges) ? edges : []) {
    let [start, end] = edgeEndpoints(edge);
    if (!start || !end || start === end || !allowed.has(start) || !allowed.has(end)) continue;
    if (start.localeCompare(end) > 0) [start, end] = [end, start];
    links.add(`${start}\u0001${end}`);
  }

  return `${ids.join("\u0000")}|\u0002|${[...links].sort((a, b) => a.localeCompare(b)).join("\u0000")}`;
}

function normalizedRect(rect, index) {
  const minX = Number(rect?.minX);
  const maxX = Number(rect?.maxX);
  const minY = Number(rect?.minY);
  const maxY = Number(rect?.maxY);
  if (![minX, maxX, minY, maxY].every(Number.isFinite)) return null;
  const left = Math.min(minX, maxX);
  const right = Math.max(minX, maxX);
  const top = Math.min(minY, maxY);
  const bottom = Math.max(minY, maxY);
  return {
    ...rect,
    key: String(rect?.key ?? index),
    minX: left,
    maxX: right,
    minY: top,
    maxY: bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  };
}

function layoutForColumns(rects, columns, gap) {
  const rows = Math.ceil(rects.length / columns);
  const columnWidths = Array(columns).fill(0);
  const rowHeights = Array(rows).fill(0);

  rects.forEach((rect, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    columnWidths[column] = Math.max(columnWidths[column], rect.width);
    rowHeights[row] = Math.max(rowHeights[row], rect.height);
  });

  const width = columnWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, columns - 1) * gap;
  const height = rowHeights.reduce((sum, value) => sum + value, 0) + Math.max(0, rows - 1) * gap;
  return { columns, rows, columnWidths, rowHeights, width, height };
}

export function packComponentRects(rectangles = [], options = {}) {
  const gap = Math.max(0, Number(options.gap) || 0);
  const aspectRatio = Math.max(0.2, Math.min(5, Number(options.aspectRatio) || 1));
  const rects = (Array.isArray(rectangles) ? rectangles : [])
    .map(normalizedRect)
    .filter(Boolean)
    .sort((a, b) => a.key.localeCompare(b.key));

  if (!rects.length) {
    return { columns: 0, rows: 0, width: 0, height: 0, placements: [] };
  }

  let best = null;
  for (let columns = 1; columns <= rects.length; columns += 1) {
    const candidate = layoutForColumns(rects, columns, gap);
    const layoutAspect = Math.max(0.0001, candidate.width / Math.max(1, candidate.height));
    const shapePenalty = Math.abs(Math.log(layoutAspect / aspectRatio));
    const area = candidate.width * candidate.height;
    const score = shapePenalty + area * 1e-9;
    if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) <= 1e-9 && columns < best.columns)) {
      best = { ...candidate, score };
    }
  }

  const columnCenters = [];
  let x = -best.width / 2;
  for (const width of best.columnWidths) {
    columnCenters.push(x + width / 2);
    x += width + gap;
  }

  const rowCenters = [];
  let y = -best.height / 2;
  for (const height of best.rowHeights) {
    rowCenters.push(y + height / 2);
    y += height + gap;
  }

  const placements = rects.map((rect, index) => {
    const column = index % best.columns;
    const row = Math.floor(index / best.columns);
    const targetX = columnCenters[column];
    const targetY = rowCenters[row];
    return {
      key: rect.key,
      dx: targetX - rect.centerX,
      dy: targetY - rect.centerY,
      targetX,
      targetY
    };
  });

  return {
    columns: best.columns,
    rows: best.rows,
    width: best.width,
    height: best.height,
    placements
  };
}
