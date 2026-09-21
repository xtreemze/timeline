/**
 * Timeline v2 migration utilities
 * Handles legacy v2 timeline format detection and preservation
 */

const MIGRATION_NAMESPACE = "timelineMigration";
const ORIGINAL_V2_KEY = "originalV2";

function cloneJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as any) : null;
}

function existingOriginalV2(input: unknown): unknown {
  const extensions = object((input as any)?.extensions);
  const envelope = object(extensions?.[MIGRATION_NAMESPACE]);
  const original = object(envelope?.[ORIGINAL_V2_KEY]);
  return original ? cloneJson(original) : null;
}

export function isLegacyV2Timeline(input: unknown): boolean {
  if (!object(input) || !Array.isArray((input as any).items)) return false;
  return (input as any).items.some((item: any) => {
    if (!object(item) || object(item.time)) return false;
    return typeof item.start === "string" || typeof item.end === "string";
  });
}

function withoutMigrationEnvelope(input: unknown): unknown {
  const copy = cloneJson(input);
  const extensions = object((copy as any).extensions);
  if (!extensions) return copy;
  delete extensions[MIGRATION_NAMESPACE];
  if (!Object.keys(extensions).length) delete (copy as any).extensions;
  return copy;
}

export function extensionsWithRetainedV2(
  input: unknown,
): Record<string, unknown> | undefined {
  if (!object(input)) return undefined;
  const extensions = object((input as any).extensions)
    ? cloneJson((input as any).extensions)
    : {};
  const existing = existingOriginalV2(input);

  if (existing) {
    (extensions as any)[MIGRATION_NAMESPACE] = {
      ...(object((extensions as any)[MIGRATION_NAMESPACE]) || {}),
      sourceVersion: 2,
      temporalSchema: "v3",
      [ORIGINAL_V2_KEY]: existing,
    };
    return extensions as any;
  }

  if (!isLegacyV2Timeline(input)) {
    return Object.keys(extensions).length ? (extensions as any) : undefined;
  }

  (extensions as any)[MIGRATION_NAMESPACE] = {
    sourceVersion: 2,
    temporalSchema: "v3",
    [ORIGINAL_V2_KEY]: withoutMigrationEnvelope(input),
  };
  return extensions as any;
}

export function originalV2Payload(input: unknown): unknown {
  return existingOriginalV2(input);
}

// Export public API as frozen object for backward compatibility
const TimelineMigrationObj = {
  MIGRATION_NAMESPACE,
  ORIGINAL_V2_KEY,
  extensionsWithRetainedV2,
  isLegacyV2Timeline,
  originalV2Payload,
} as const;

export const TimelineMigration = Object.freeze(TimelineMigrationObj);
