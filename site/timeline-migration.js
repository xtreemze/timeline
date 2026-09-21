(() => {
  const MIGRATION_NAMESPACE = "timelineMigration";
  const ORIGINAL_V2_KEY = "originalV2";

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function existingOriginalV2(input) {
    const extensions = object(input?.extensions);
    const envelope = object(extensions?.[MIGRATION_NAMESPACE]);
    const original = object(envelope?.[ORIGINAL_V2_KEY]);
    return original ? cloneJson(original) : null;
  }

  function isLegacyV2Timeline(input) {
    if (!object(input) || !Array.isArray(input.items)) return false;
    return input.items.some((item) => {
      if (!object(item) || object(item.time)) return false;
      return typeof item.start === "string" || typeof item.end === "string";
    });
  }

  function withoutMigrationEnvelope(input) {
    const copy = cloneJson(input);
    const extensions = object(copy.extensions);
    if (!extensions) return copy;
    delete extensions[MIGRATION_NAMESPACE];
    if (!Object.keys(extensions).length) delete copy.extensions;
    return copy;
  }

  function extensionsWithRetainedV2(input) {
    if (!object(input)) return undefined;
    const extensions = object(input.extensions) ? cloneJson(input.extensions) : {};
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

  function originalV2Payload(input) {
    return existingOriginalV2(input);
  }

  globalThis.TimelineMigration = Object.freeze({
    MIGRATION_NAMESPACE,
    ORIGINAL_V2_KEY,
    extensionsWithRetainedV2,
    isLegacyV2Timeline,
    originalV2Payload,
  });
})();
