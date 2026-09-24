/**
 * Timeline v2 migration utilities
 * Handles legacy v2 timeline format detection and preservation
 */

const MIGRATION_NAMESPACE = "timelineMigration";
const ORIGINAL_V2_KEY = "originalV2";

type UnknownRecord = Record<string, unknown>;

function cloneJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function object(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function existingOriginalV2(input: unknown): unknown {
  const root = object(input);
  if (!root) return null;
  const extensions = object(root.extensions);
  const envelope = object(extensions?.[MIGRATION_NAMESPACE]);
  const original = object(envelope?.[ORIGINAL_V2_KEY]);
  return original ? cloneJson(original) : null;
}

export function isLegacyV2Timeline(input: unknown): boolean {
  const root = object(input);
  if (!root || !Array.isArray(root.items)) return false;
  return root.items.some((item) => {
    const record = object(item);
    if (!record || object(record.time)) return false;
    return typeof record.start === "string" || typeof record.end === "string";
  });
}

function withoutMigrationEnvelope(input: unknown): unknown {
  const copy = cloneJson(input);
  const root = object(copy);
  if (!root) return copy;
  const extensions = object(root.extensions);
  if (!extensions) return copy;
  delete extensions[MIGRATION_NAMESPACE];
  if (!Object.keys(extensions).length) delete root.extensions;
  return copy;
}

export function extensionsWithRetainedV2(input: unknown): Record<string, unknown> | undefined {
  const root = object(input);
  if (!root) return undefined;

  const sourceExtensions = object(root.extensions);
  const clonedExtensions = sourceExtensions ? cloneJson(sourceExtensions) : {};
  const extensions = object(clonedExtensions) ?? {};
  const existing = existingOriginalV2(input);

  if (existing) {
    extensions[MIGRATION_NAMESPACE] = {
      ...(object(extensions[MIGRATION_NAMESPACE]) || {}),
      sourceVersion: 2,
      temporalSchema: "v3",
      [ORIGINAL_V2_KEY]: existing,
    };
    return extensions;
  }

  if (!isLegacyV2Timeline(input)) {
    return Object.keys(extensions).length ? extensions : undefined;
  }

  extensions[MIGRATION_NAMESPACE] = {
    sourceVersion: 2,
    temporalSchema: "v3",
    [ORIGINAL_V2_KEY]: withoutMigrationEnvelope(input),
  };
  return extensions;
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
