import {
  queryTemporalItems,
  stableSceneKey,
  type TemporalItem,
  type TemporalWindow,
} from "../../packages/temporal-kernel/src/index.ts";

export type {
  RenderWindowOptions,
  TemporalRetentionState,
  TemporalWindow,
} from "../../packages/temporal-kernel/src/index.ts";
export {
  beginRetention,
  commitRetention,
  createRenderWindow,
  extendRetention,
  itemOverlapsWindow,
  normalizeWindow,
  unionWindows,
  visibleIntervalAnchor,
  windowSpan,
} from "../../packages/temporal-kernel/src/index.ts";

export interface TemporalOccurrence extends TemporalItem {}

export interface TemporalSceneTickIdentity {
  readonly unit: string;
  readonly value: number;
  readonly label?: string;
  readonly step?: number;
}

export interface TemporalSceneAccentIdentity {
  readonly kind: string;
  readonly time: number;
  readonly label?: string;
}

function canonicalSceneToken(value: string, message: string): string {
  const token = value.trim();
  if (!token) {
    throw new Error(message);
  }
  return token;
}

export function tickSceneKey(tick: TemporalSceneTickIdentity): string {
  const unit = canonicalSceneToken(
    String(tick?.unit || ""),
    "Tick scene keys require a semantic temporal unit.",
  );
  if (!Number.isFinite(tick?.value)) {
    throw new Error("Tick scene keys require a finite canonical temporal value.");
  }
  return `tick:${unit}:${Number(tick.value)}`;
}

export function temporalAccentSceneKey(accent: TemporalSceneAccentIdentity): string {
  const kind = canonicalSceneToken(
    String(accent?.kind || ""),
    "Temporal accent scene keys require a semantic accent kind.",
  );
  if (!Number.isFinite(accent?.time)) {
    throw new Error("Temporal accent scene keys require a finite canonical temporal value.");
  }
  return `accent:${kind}:${Number(accent.time)}`;
}

export function relationshipBandSceneKey(id: string): string {
  const canonicalId = canonicalSceneToken(
    String(id || ""),
    "Relationship-band scene keys require a stable canonical relationship id.",
  );
  return stableSceneKey("relationship-band", canonicalId);
}

export function queryOccurrences<T extends TemporalOccurrence>(
  occurrences: readonly T[],
  extent: TemporalWindow,
): T[] {
  return queryTemporalItems(occurrences, extent);
}

export function occurrenceSceneKey(id: string): string {
  const canonicalId = canonicalSceneToken(
    String(id || ""),
    "Occurrence scene keys require a stable canonical id.",
  );
  return stableSceneKey("occurrence", canonicalId);
}
