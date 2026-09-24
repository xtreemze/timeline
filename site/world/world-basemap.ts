import type { GeometryCollection, Topology } from "topojson-specification";
import type { WorldRenderPosition } from "../../src/layout/world-geographic-position.ts";

/**
 * Vector reference geography for the globe: graticule, coastlines and
 * country borders drawn as thin lines over a translucent earth. Purely
 * presentational orientation; never pickable and never part of the
 * evidence model (places stay the only canonical geography).
 */
export interface WorldBasemap {
  readonly coastlines: readonly (readonly WorldRenderPosition[])[];
  readonly borders: readonly (readonly WorldRenderPosition[])[];
}

/** Line altitude just above the earth fill so lines are not z-fought. */
const LINE_ALTITUDE_METERS = 0;
/** Longest edge kept straight; longer ones are split so chords hug the sphere. */
const MAX_SEGMENT_DEGREES = 2;

function densify(line: readonly (readonly [number, number])[]): WorldRenderPosition[] {
  const result: WorldRenderPosition[] = [];
  for (let index = 0; index < line.length; index += 1) {
    const current = line[index] as readonly [number, number];
    const next = line[index + 1];
    result.push([current[0], current[1], LINE_ALTITUDE_METERS]);
    if (!next || Math.abs(next[0] - current[0]) > 180) continue;
    const steps = Math.ceil(
      Math.max(Math.abs(next[0] - current[0]), Math.abs(next[1] - current[1])) /
        MAX_SEGMENT_DEGREES,
    );
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      result.push([
        current[0] + (next[0] - current[0]) * t,
        current[1] + (next[1] - current[1]) * t,
        LINE_ALTITUDE_METERS,
      ]);
    }
  }
  return result;
}

/** Parallels and meridians every `stepDegrees`, densified along the sphere. */
export function worldGraticule(stepDegrees = 15): readonly (readonly WorldRenderPosition[])[] {
  const lines: WorldRenderPosition[][] = [];
  for (let longitude = -180; longitude < 180; longitude += stepDegrees) {
    lines.push(
      densify([
        [longitude, -85],
        [longitude, 85],
      ]),
    );
  }
  for (let latitude = -75; latitude <= 75; latitude += stepDegrees) {
    lines.push(
      densify([
        [-180, latitude],
        [0, latitude],
        [180, latitude],
      ]),
    );
  }
  return Object.freeze(lines);
}

/**
 * Loads Natural Earth 1:110m coastlines and borders (public domain, via
 * world-atlas) on demand so the data stays out of the initial bundle.
 */
export async function loadWorldBasemap(): Promise<WorldBasemap> {
  const [{ mesh }, atlas] = await Promise.all([
    import("topojson-client"),
    import("world-atlas/countries-110m.json"),
  ]);
  const topology = ((atlas as { default?: unknown }).default ?? atlas) as Topology<{
    countries: GeometryCollection;
  }>;
  const countries = topology.objects.countries;
  const toLines = (geometry: { coordinates: number[][][] }) =>
    Object.freeze(
      geometry.coordinates.map((line) =>
        Object.freeze(
          densify(line.map((point): readonly [number, number] => [point[0] ?? 0, point[1] ?? 0])),
        ),
      ),
    );
  return Object.freeze({
    coastlines: toLines(mesh(topology, countries, (a, b) => a === b)),
    borders: toLines(mesh(topology, countries, (a, b) => a !== b)),
  });
}

export interface WorldLineBounds {
  readonly west: number;
  readonly east: number;
  readonly south: number;
  readonly north: number;
}

/**
 * Keeps only the runs of each line that fall inside `bounds` (plus the
 * neighbouring vertex so edges crossing the frame still reach it). Close to
 * the ground most of the world's geography is off screen; sending it anyway
 * makes every frame rasterise huge off-screen segments.
 */
export function clipWorldLines(
  lines: readonly (readonly WorldRenderPosition[])[],
  bounds: WorldLineBounds,
): readonly (readonly WorldRenderPosition[])[] {
  const inside = (point: WorldRenderPosition) =>
    point[1] >= bounds.south &&
    point[1] <= bounds.north &&
    (bounds.west <= bounds.east
      ? point[0] >= bounds.west && point[0] <= bounds.east
      : point[0] >= bounds.west || point[0] <= bounds.east);
  const clipped: WorldRenderPosition[][] = [];
  for (const line of lines) {
    let run: WorldRenderPosition[] | null = null;
    for (let index = 0; index < line.length; index += 1) {
      const point = line[index] as WorldRenderPosition;
      const keep =
        inside(point) ||
        (index > 0 && inside(line[index - 1] as WorldRenderPosition)) ||
        (index + 1 < line.length && inside(line[index + 1] as WorldRenderPosition));
      if (keep) {
        run ??= [];
        run.push(point);
      } else if (run) {
        if (run.length > 1) clipped.push(run);
        run = null;
      }
    }
    if (run && run.length > 1) clipped.push(run);
  }
  return Object.freeze(clipped);
}
