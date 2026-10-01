export type OccurrenceContextMediaKind = "image" | "video" | "audio";

export interface OccurrenceContextMediaFrame {
  readonly kind?: OccurrenceContextMediaKind;
  readonly src?: string;
  readonly blob?: Blob;
  readonly mimeType?: string;
  readonly sha256?: string;
  readonly alt?: string;
  readonly caption?: string;
}

export type OccurrenceContextDeckFrame =
  | Readonly<{
      kind: OccurrenceContextMediaKind;
      src?: string;
      blob?: Blob;
      mimeType?: string;
      sha256?: string;
      alt?: string;
      caption?: string;
    }>
  | Readonly<{ kind: "context"; label: string; body: string }>;

/**
 * Canonical presentation projection for occurrence media + textual context.
 *
 * Timeline detail and the composer consume this same frame sequence so context is
 * not independently reimplemented or truncated when an occurrence enters editing.
 */
export function occurrenceContextDeckFrames(
  media: readonly OccurrenceContextMediaFrame[] | null | undefined,
  description: string | null | undefined,
): readonly OccurrenceContextDeckFrame[] {
  const frames: OccurrenceContextDeckFrame[] = (media ?? [])
    .filter(
      (entry) =>
        Boolean(entry?.src?.trim()) ||
        (typeof Blob !== "undefined" && entry?.blob instanceof Blob),
    )
    .map((entry) => {
      const kind: OccurrenceContextMediaKind =
        entry.kind === "video" || entry.kind === "audio" ? entry.kind : "image";
      return Object.freeze({
        kind,
        ...(entry.src?.trim() ? { src: entry.src } : {}),
        ...(typeof Blob !== "undefined" && entry.blob instanceof Blob
          ? { blob: entry.blob }
          : {}),
        ...(entry.mimeType?.trim() ? { mimeType: entry.mimeType } : {}),
        ...(entry.sha256?.trim() ? { sha256: entry.sha256 } : {}),
        alt: entry.alt,
        caption: entry.caption,
      });
    });

  const context = description?.trim();
  if (context) {
    frames.push(
      Object.freeze({
        kind: "context" as const,
        label: "Context",
        body: context,
      }),
    );
  }

  return Object.freeze(frames);
}
