export interface LayoutRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LayoutInsets {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

export interface LayoutViewport extends LayoutRect {
  readonly safeInsets?: LayoutInsets;
}

export interface ProtectedRegion {
  readonly id: string;
  readonly rect: LayoutRect;
}

export interface ExclusionZone {
  readonly id: string;
  readonly rect: LayoutRect;
}

export interface Anchor {
  readonly x: number;
  readonly y: number;
}

export interface PlacementCandidate {
  readonly id: string;
  readonly rect: LayoutRect;
}

export type LayoutConstraint =
  | {
      readonly kind: "inside-viewport";
      readonly id?: string;
    }
  | {
      readonly kind: "avoid-protected";
      readonly regionId: string;
    }
  | {
      readonly kind: "avoid-exclusion";
      readonly zoneId: string;
    }
  | {
      readonly kind: "near-anchor";
      readonly anchor: Anchor;
    };

export interface EvaluatedPlacementCandidate {
  readonly id: string;
  readonly rect: LayoutRect;
  readonly sourceRect: LayoutRect;
  readonly violations: readonly string[];
  readonly overlapArea: number;
  readonly clampDistance: number;
  readonly anchorDistance: number;
}

export interface LayoutSnapshot {
  readonly viewport: LayoutViewport;
  readonly selected: EvaluatedPlacementCandidate | null;
  readonly candidates: readonly EvaluatedPlacementCandidate[];
  readonly constraints: readonly LayoutConstraint[];
  readonly fullySatisfiesConstraints: boolean;
}

export interface WorkspacePlacementInput {
  readonly viewport: LayoutViewport;
  readonly anchor?: Anchor | null;
  readonly protectedRegions?: readonly ProtectedRegion[];
  readonly exclusionZones?: readonly ExclusionZone[];
  readonly candidates: readonly PlacementCandidate[];
}

function finite(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value: unknown): number {
  return Math.max(0, finite(value));
}

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeRect(rect: LayoutRect): LayoutRect {
  return Object.freeze({
    x: finite(rect?.x),
    y: finite(rect?.y),
    width: nonNegative(rect?.width),
    height: nonNegative(rect?.height),
  });
}

function normalizeViewport(viewport: LayoutViewport): LayoutViewport {
  const rect = normalizeRect(viewport);
  const safeInsets = Object.freeze({
    top: nonNegative(viewport?.safeInsets?.top),
    right: nonNegative(viewport?.safeInsets?.right),
    bottom: nonNegative(viewport?.safeInsets?.bottom),
    left: nonNegative(viewport?.safeInsets?.left),
  });
  return Object.freeze({ ...rect, safeInsets });
}

function safeViewportRect(viewport: LayoutViewport): LayoutRect {
  const normalized = normalizeViewport(viewport);
  const top = normalized.safeInsets?.top ?? 0;
  const right = normalized.safeInsets?.right ?? 0;
  const bottom = normalized.safeInsets?.bottom ?? 0;
  const left = normalized.safeInsets?.left ?? 0;
  const width = Math.max(0, normalized.width - left - right);
  const height = Math.max(0, normalized.height - top - bottom);
  return Object.freeze({
    x: normalized.x + left,
    y: normalized.y + top,
    width,
    height,
  });
}

export function intersectionArea(left: LayoutRect, right: LayoutRect): number {
  const a = normalizeRect(left);
  const b = normalizeRect(right);
  const overlapWidth = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapHeight = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapWidth * overlapHeight;
}

export function clampRectToViewport(rect: LayoutRect, viewport: LayoutViewport): LayoutRect {
  const source = normalizeRect(rect);
  const safe = safeViewportRect(viewport);
  const width = Math.min(source.width, safe.width);
  const height = Math.min(source.height, safe.height);
  const maxX = safe.x + safe.width - width;
  const maxY = safe.y + safe.height - height;
  const x = Math.min(Math.max(source.x, safe.x), Math.max(safe.x, maxX));
  const y = Math.min(Math.max(source.y, safe.y), Math.max(safe.y, maxY));
  return Object.freeze({ x, y, width, height });
}

function center(rect: LayoutRect): Anchor {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function distance(left: Anchor, right: Anchor): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function normalizeRegions<T extends ProtectedRegion | ExclusionZone>(
  regions: readonly T[] | undefined,
): T[] {
  return (regions ?? [])
    .map((region) => ({
      ...region,
      id: normalizeId(region.id),
      rect: normalizeRect(region.rect),
    }))
    .filter((region) => region.id)
    .sort((left, right) => left.id.localeCompare(right.id)) as T[];
}

function evaluateCandidate(
  candidate: PlacementCandidate,
  viewport: LayoutViewport,
  anchor: Anchor | null,
  protectedRegions: readonly ProtectedRegion[],
  exclusionZones: readonly ExclusionZone[],
): EvaluatedPlacementCandidate {
  const sourceRect = normalizeRect(candidate.rect);
  const rect = clampRectToViewport(sourceRect, viewport);
  const violations: string[] = [];
  let overlapArea = 0;

  for (const region of protectedRegions) {
    const area = intersectionArea(rect, region.rect);
    if (area <= 0) continue;
    overlapArea += area;
    violations.push(`protected:${region.id}`);
  }

  for (const zone of exclusionZones) {
    const area = intersectionArea(rect, zone.rect);
    if (area <= 0) continue;
    overlapArea += area;
    violations.push(`exclusion:${zone.id}`);
  }

  const sourceCenter = center(sourceRect);
  const clampedCenter = center(rect);
  const clampDistance = distance(sourceCenter, clampedCenter);
  const anchorDistance = anchor ? distance(clampedCenter, anchor) : 0;

  return Object.freeze({
    id: normalizeId(candidate.id),
    rect,
    sourceRect,
    violations: Object.freeze(violations),
    overlapArea,
    clampDistance,
    anchorDistance,
  });
}

function candidateRank(
  left: EvaluatedPlacementCandidate,
  right: EvaluatedPlacementCandidate,
): number {
  return (
    left.violations.length - right.violations.length ||
    left.overlapArea - right.overlapArea ||
    left.clampDistance - right.clampDistance ||
    left.anchorDistance - right.anchorDistance ||
    left.id.localeCompare(right.id)
  );
}

export function planWorkspacePlacement(input: WorkspacePlacementInput): LayoutSnapshot {
  const viewport = normalizeViewport(input.viewport);
  const anchor = input.anchor
    ? Object.freeze({
        x: finite(input.anchor.x),
        y: finite(input.anchor.y),
      })
    : null;
  const protectedRegions = normalizeRegions(input.protectedRegions);
  const exclusionZones = normalizeRegions(input.exclusionZones);

  const candidates = input.candidates
    .map((candidate) => ({
      ...candidate,
      id: normalizeId(candidate.id),
    }))
    .filter((candidate) => candidate.id)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((candidate) =>
      evaluateCandidate(candidate, viewport, anchor, protectedRegions, exclusionZones),
    );

  const selected = candidates.length ? ([...candidates].sort(candidateRank)[0] ?? null) : null;

  const constraints: LayoutConstraint[] = [
    { kind: "inside-viewport", id: "safe-viewport" },
    ...protectedRegions.map(
      (region): LayoutConstraint => ({
        kind: "avoid-protected",
        regionId: region.id,
      }),
    ),
    ...exclusionZones.map(
      (zone): LayoutConstraint => ({
        kind: "avoid-exclusion",
        zoneId: zone.id,
      }),
    ),
    ...(anchor
      ? [
          {
            kind: "near-anchor",
            anchor,
          } satisfies LayoutConstraint,
        ]
      : []),
  ];

  return Object.freeze({
    viewport,
    selected,
    candidates: Object.freeze(candidates),
    constraints: Object.freeze(constraints),
    fullySatisfiesConstraints: Boolean(selected && selected.violations.length === 0),
  });
}
