export type OccurrenceDeckMediaKind = "image" | "video" | "audio";

export interface OccurrenceDeckMediaFrame {
  readonly kind: OccurrenceDeckMediaKind;
  readonly src?: string;
  readonly blob?: Blob;
  readonly mimeType?: string;
  readonly sha256?: string;
  readonly alt: string;
  readonly caption: string;
}

export type OccurrenceDeckImageFrame = OccurrenceDeckMediaFrame & Readonly<{ kind: "image" }>;

export interface OccurrenceDeckContextFrame {
  readonly kind: "context";
  readonly label: string;
  readonly body: string;
}

export type OccurrenceDeckFrame = OccurrenceDeckMediaFrame | OccurrenceDeckContextFrame;
export type OccurrenceDeckNavigationMode = "none" | "dots" | "counter";

export interface ResolveOccurrenceDeckIndexInput {
  readonly previousOccurrenceId: string | null;
  readonly nextOccurrenceId: string;
  readonly previousIndex: number;
  readonly requestedIndex: number;
  readonly frameCount: number;
}

function normalizedWholeNumber(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function clampedIndex(index: number, frameCount: number): number {
  const count = Math.max(0, normalizedWholeNumber(frameCount));
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, normalizedWholeNumber(index)));
}

export function normalizeOccurrenceDeckFrames(
  frames: readonly (
    | Readonly<{
        kind: OccurrenceDeckMediaKind;
        src?: string;
        blob?: Blob;
        mimeType?: string;
        sha256?: string;
        alt?: string;
        caption?: string;
      }>
    | Readonly<{ kind: "context"; label?: string; body?: string }>
  )[],
): readonly OccurrenceDeckFrame[] {
  const normalized: OccurrenceDeckFrame[] = [];

  for (const frame of frames) {
    if (frame.kind === "image" || frame.kind === "video" || frame.kind === "audio") {
      const src = frame.src?.trim() ?? "";
      const blob =
        typeof Blob !== "undefined" && frame.blob instanceof Blob ? frame.blob : undefined;
      if (!src && !blob) continue;
      const mimeType = frame.mimeType?.trim() ?? "";
      const sha256 = frame.sha256?.trim().toLowerCase() ?? "";
      normalized.push(
        Object.freeze({
          kind: frame.kind,
          ...(src ? { src } : {}),
          ...(blob ? { blob } : {}),
          ...(mimeType ? { mimeType } : {}),
          ...(sha256 ? { sha256 } : {}),
          alt: frame.alt ?? "",
          caption: frame.caption?.trim() ?? "",
        }),
      );
      continue;
    }

    const label = frame.label?.trim() ?? "";
    const body = frame.body?.trim() ?? "";
    if (!label && !body) continue;
    normalized.push(
      Object.freeze({
        kind: "context",
        label: label || "Context",
        body,
      }),
    );
  }

  return Object.freeze(normalized);
}

export function deckNavigationMode(frameCount: number): OccurrenceDeckNavigationMode {
  const count = Math.max(0, normalizedWholeNumber(frameCount));
  if (count <= 1) return "none";
  return count <= 5 ? "dots" : "counter";
}

export function stepOccurrenceDeckIndex(
  currentIndex: number,
  delta: number,
  frameCount: number,
): number {
  const count = Math.max(0, normalizedWholeNumber(frameCount));
  if (count <= 0) return 0;
  const current = clampedIndex(currentIndex, count);
  const step = normalizedWholeNumber(delta);
  return (((current + step) % count) + count) % count;
}

export function resolveOccurrenceDeckIndex(input: ResolveOccurrenceDeckIndexInput): number {
  if (input.frameCount <= 0) return 0;
  if (input.previousOccurrenceId === input.nextOccurrenceId) {
    return clampedIndex(input.previousIndex, input.frameCount);
  }
  return clampedIndex(input.requestedIndex, input.frameCount);
}
