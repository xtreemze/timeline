export interface WorldScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface WorldScreenClusterGroup<T> {
  readonly key: string;
  readonly members: readonly T[];
  readonly centroid: WorldScreenPoint;
}

export interface WorldScreenClusteringOptions<T> {
  project(item: T): WorldScreenPoint | null;
  radiusPx(item: T): number;
  key(item: T): string;
  /** Extra visual breathing room between node footprints. */
  gapPx?: number;
}

interface ProjectedItem<T> {
  readonly item: T;
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

function finitePoint(point: WorldScreenPoint | null): point is WorldScreenPoint {
  return (
    point !== null &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

/**
 * Renderer-neutral screen-space clustering. The input coordinate can come from
 * deck.gl today or direct common-space vec3 projection under WorldGraphLayer
 * later; no longitude/latitude assumption exists here.
 *
 * Groups are connected overlap components: if A overlaps B and B overlaps C,
 * all three cluster together. A spatial hash keeps the pass near-linear for
 * large scenes.
 */
export function clusterWorldScreenItems<T>(
  items: readonly T[],
  options: WorldScreenClusteringOptions<T>,
): readonly WorldScreenClusterGroup<T>[] {
  if (items.length === 0) return Object.freeze([]);

  const gap = Number.isFinite(options.gapPx) ? Math.max(0, options.gapPx ?? 0) : 0;
  const projected: ProjectedItem<T>[] = [];
  let maxRadius = 1;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === undefined) continue;
    const point = options.project(item);
    if (!finitePoint(point)) continue;
    const radiusValue = options.radiusPx(item);
    const radius = Number.isFinite(radiusValue) ? Math.max(1, radiusValue) : 1;
    maxRadius = Math.max(maxRadius, radius);
    projected.push({
      item,
      key: options.key(item),
      x: point.x,
      y: point.y,
      radius,
    });
  }

  if (projected.length === 0) return Object.freeze([]);

  const parents = projected.map((_, index) => index);
  const find = (start: number): number => {
    let root = start;
    for (;;) {
      const parent = parents[root];
      if (parent === undefined || parent === root) break;
      root = parent;
    }

    let cursor = start;
    while (cursor !== root) {
      const parent = parents[cursor];
      if (parent === undefined || parent === cursor) break;
      parents[cursor] = root;
      cursor = parent;
    }
    return root;
  };
  const union = (left: number, right: number) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parents[b] = a;
  };

  const cellSize = Math.max(1, maxRadius * 2 + gap);
  const grid = new Map<string, number[]>();
  const cellKey = (x: number, y: number) =>
    `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;

  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    if (!current) continue;
    const cellX = Math.floor(current.x / cellSize);
    const cellY = Math.floor(current.y / cellSize);

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const bucket = grid.get(`${cellX + dx}:${cellY + dy}`);
        if (!bucket) continue;
        for (const otherIndex of bucket) {
          const other = projected[otherIndex];
          if (!other) continue;
          const minimum = current.radius + other.radius + gap;
          if (Math.hypot(current.x - other.x, current.y - other.y) < minimum) {
            union(index, otherIndex);
          }
        }
      }
    }

    const key = cellKey(current.x, current.y);
    const bucket = grid.get(key);
    if (bucket) bucket.push(index);
    else grid.set(key, [index]);
  }

  const groups = new Map<number, ProjectedItem<T>[]>();
  for (let index = 0; index < projected.length; index += 1) {
    const root = find(index);
    const bucket = groups.get(root);
    const item = projected[index];
    if (!item) continue;
    if (bucket) bucket.push(item);
    else groups.set(root, [item]);
  }

  const result = [...groups.values()].map((members) => {
    members.sort((left, right) => left.key.localeCompare(right.key));
    const x = members.reduce((sum, member) => sum + member.x, 0) / members.length;
    const y = members.reduce((sum, member) => sum + member.y, 0) / members.length;
    return Object.freeze({
      key: members.map((member) => member.key).join("|"),
      members: Object.freeze(members.map((member) => member.item)),
      centroid: Object.freeze({ x, y }),
    });
  });

  result.sort((left, right) => left.key.localeCompare(right.key));
  return Object.freeze(result);
}
