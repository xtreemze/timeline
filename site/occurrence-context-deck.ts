export interface OccurrenceContextMediaFrame {
  readonly src?: string;
  readonly alt?: string;
  readonly caption?: string;
}

export type OccurrenceContextDeckFrame =
  | Readonly<{ kind: "image"; src?: string; alt?: string; caption?: string }>
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
    .filter((entry) => Boolean(entry?.src?.trim()))
    .map((entry) =>
      Object.freeze({
        kind: "image" as const,
        src: entry.src,
        alt: entry.alt,
        caption: entry.caption,
      }),
    );

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
