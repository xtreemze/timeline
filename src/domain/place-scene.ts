import type { PlaceId } from "./ids.ts";

export const PLACE_SCENE_REPRESENTATIONS = Object.freeze([
  "model",
  "composite",
  "interior",
  "procedural-area",
  "procedural-route",
  "instanced",
  "landmark",
] as const);

export type PlaceSceneRepresentation = (typeof PLACE_SCENE_REPRESENTATIONS)[number];
export type PlaceSceneScaleBasis = "fictional-plausible" | "sourced";
export type PlaceSceneLodLevel = 0 | 1 | 2 | 3;
export type MeterVector3 = readonly [number, number, number];

export interface PlaceSceneSemanticAnchor {
  readonly id: string;
  readonly kind:
    | "entrance"
    | "path-connector"
    | "interior-entry"
    | "interaction"
    | "camera-focus"
    | "ground";
  readonly positionMeters: MeterVector3;
}

export interface PlaceSceneLod {
  readonly level: PlaceSceneLodLevel;
  readonly uri: string;
  readonly triangleCount: number;
  readonly byteLength: number;
}

export interface CanonicalPlaceScene3D {
  readonly placeId: PlaceId;
  readonly representation: PlaceSceneRepresentation;
  readonly units: "meters";
  readonly scaleBasis: PlaceSceneScaleBasis;
  readonly localPositionMeters: MeterVector3;
  readonly headingDegrees: number;
  readonly dimensionsMeters?: MeterVector3;
  readonly assetId?: string;
  readonly rootScale: readonly [1, 1, 1];
  readonly lods: readonly PlaceSceneLod[];
  readonly anchors: readonly PlaceSceneSemanticAnchor[];
}

function finiteVector3(value: readonly number[]): boolean {
  return value.length === 3 && value.every((entry) => Number.isFinite(entry));
}

export function validatePlaceScene3D(scene: CanonicalPlaceScene3D): readonly string[] {
  const findings: string[] = [];

  if (!String(scene.placeId).trim()) findings.push("3D place scene requires a canonical place ID.");
  if (!PLACE_SCENE_REPRESENTATIONS.includes(scene.representation)) {
    findings.push("3D place scene representation is unsupported.");
  }
  if (scene.units !== "meters") findings.push("3D place scene units must be meters.");
  if (!["fictional-plausible", "sourced"].includes(scene.scaleBasis)) {
    findings.push("3D place scene scale basis must be fictional-plausible or sourced.");
  }
  if (!finiteVector3(scene.localPositionMeters)) {
    findings.push("3D place scene local position must contain three finite meter values.");
  }
  if (!Number.isFinite(scene.headingDegrees)) {
    findings.push("3D place scene heading must be finite.");
  }
  if (scene.rootScale.some((value) => value !== 1)) {
    findings.push("3D place scene root scale must remain [1, 1, 1].");
  }

  const assetBacked = ["model", "composite", "interior", "landmark"].includes(
    scene.representation,
  );
  if (assetBacked && !scene.assetId?.trim()) {
    findings.push("Asset-backed 3D place scenes require an asset ID.");
  }
  if (assetBacked && (!scene.dimensionsMeters || !finiteVector3(scene.dimensionsMeters))) {
    findings.push("Asset-backed 3D place scenes require finite meter dimensions.");
  }
  if (
    scene.dimensionsMeters &&
    scene.dimensionsMeters.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    findings.push("3D place scene dimensions must be positive meters.");
  }

  const lodLevels = new Set<number>();
  let previousTriangles = Number.POSITIVE_INFINITY;
  for (const lod of [...scene.lods].sort((left, right) => left.level - right.level)) {
    if (lodLevels.has(lod.level)) findings.push(`Duplicate 3D place LOD level ${lod.level}.`);
    lodLevels.add(lod.level);
    if (!lod.uri.trim()) findings.push(`LOD ${lod.level} requires an asset URI.`);
    if (!Number.isInteger(lod.triangleCount) || lod.triangleCount < 0) {
      findings.push(`LOD ${lod.level} triangle count must be a non-negative integer.`);
    }
    if (!Number.isInteger(lod.byteLength) || lod.byteLength < 0) {
      findings.push(`LOD ${lod.level} byte length must be a non-negative integer.`);
    }
    if (lod.triangleCount > previousTriangles) {
      findings.push("3D place LOD triangle counts must not increase at lower detail.");
    }
    previousTriangles = lod.triangleCount;
  }
  if (assetBacked && scene.lods.length === 0) {
    findings.push("Asset-backed 3D place scenes require at least one LOD.");
  }

  const anchorIds = new Set<string>();
  for (const anchor of scene.anchors) {
    if (!anchor.id.trim()) findings.push("3D place semantic anchor ID is required.");
    if (anchorIds.has(anchor.id)) findings.push(`Duplicate 3D place anchor ID ${anchor.id}.`);
    anchorIds.add(anchor.id);
    if (!finiteVector3(anchor.positionMeters)) {
      findings.push(`3D place anchor ${anchor.id} must use finite meter coordinates.`);
    }
  }

  return Object.freeze(findings);
}
