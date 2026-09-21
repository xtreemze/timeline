(() => {
  "use strict";

  const DB_NAME = "timeline-evidence";
  const DB_VERSION = 1;
  const STORE = "blobs";
  const TYPES = Object.freeze(["article", "pdf", "image", "note", "document"]);
  const RECORD_CLASSES = Object.freeze(["source", "acquired-copy", "derived-artifact"]);
  const DIGEST_ALGORITHMS = Object.freeze(["sha-256", "sha-384", "sha-512"]);
  const CUSTODY_ACTION_TYPES = Object.freeze([
    "identified",
    "collected",
    "acquired",
    "received",
    "transferred",
    "stored",
    "examined",
    "returned",
    "released",
    "disposed",
    "other"
  ]);

  function text(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function textList(value, max = 120, limit = 64) {
    const seen = new Set();
    const result = [];
    for (const raw of Array.isArray(value) ? value : []) {
      const normalized = text(raw, max);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
      if (result.length >= limit) break;
    }
    return result;
  }

  function safeUrl(value) {
    const source = text(value, 2000);
    if (!source) return "";
    try {
      const url = new URL(source, globalThis.document?.baseURI || "https://example.invalid/");
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function normalizeDigest(raw) {
    if (!raw || typeof raw !== "object") return null;
    const algorithm = text(raw.algorithm, 40).toLowerCase();
    const value = text(raw.value ?? raw.digest, 2048);
    if (!algorithm || !value) return null;
    const digest = { algorithm, value };
    const encoding = text(raw.encoding, 24).toLowerCase();
    if (encoding) digest.encoding = encoding;
    return digest;
  }

  function normalizeDigests(value) {
    const seen = new Set();
    const digests = [];
    for (const raw of Array.isArray(value) ? value : []) {
      const digest = normalizeDigest(raw);
      if (!digest) continue;
      const key = `${digest.algorithm}\u0000${digest.encoding || ""}\u0000${digest.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      digests.push(digest);
      if (digests.length >= 16) break;
    }
    return digests;
  }

  function normalizeForensic(raw) {
    if (!raw || typeof raw !== "object") return null;

    const recordClass = RECORD_CLASSES.includes(raw.recordClass) ? raw.recordClass : "";
    const sourceFilename = text(raw.sourceFilename, 260);
    const sourceLocator = text(raw.sourceLocator, 2000);
    const exhibitNumber = text(raw.exhibitNumber, 160);
    const rootExhibitNumber = text(raw.rootExhibitNumber, 160);
    const acquiredAt = text(raw.acquiredAt, 80);
    const acquiredByEntityId = text(raw.acquiredByEntityId, 120);
    const acquisitionMethod = text(raw.acquisitionMethod, 500);
    const acquisitionPlaceEntityId = text(raw.acquisitionPlaceEntityId, 120);
    const sourceItemId = text(raw.sourceItemId, 120);
    const digests = normalizeDigests(raw.digests);
    const derivedFromIds = textList(raw.derivedFromIds, 120, 64);

    const toolName = text(raw.tool?.name, 160);
    const toolVersion = text(raw.tool?.version, 120);
    const tool = toolName || toolVersion ? { name: toolName, version: toolVersion } : null;

    if (
      !recordClass &&
      !sourceFilename &&
      !sourceLocator &&
      !exhibitNumber &&
      !rootExhibitNumber &&
      !acquiredAt &&
      !acquiredByEntityId &&
      !acquisitionMethod &&
      !acquisitionPlaceEntityId &&
      !sourceItemId &&
      !digests.length &&
      !derivedFromIds.length &&
      !tool
    ) {
      return null;
    }

    return {
      recordClass,
      sourceFilename,
      sourceLocator,
      exhibitNumber,
      rootExhibitNumber,
      acquiredAt,
      acquiredByEntityId,
      acquisitionMethod,
      acquisitionPlaceEntityId,
      sourceItemId,
      tool,
      digests,
      derivedFromIds
    };
  }

  function normalizeExtraction(raw) {
    if (!raw || typeof raw !== "object") return null;
    const external = globalThis.TimelineEvidenceExtraction?.normalizeExtraction?.(raw);
    if (external) return external;
    const segments = (Array.isArray(raw.segments) ? raw.segments : [])
      .map((segment, index) => {
        const content = text(segment?.text, 20000);
        const locator = segment?.locator && typeof segment.locator === "object"
          ? {
              kind: segment.locator.kind === "page" ? "page" : "image",
              ...(segment.locator.kind === "page"
                ? { page: Math.max(1, Number(segment.locator.page) || 1) }
                : { index: Math.max(1, Number(segment.locator.index) || 1) })
            }
          : null;
        if (!content || !locator) return null;
        return {
          id: text(segment?.id, 120) || `segment-${index + 1}`,
          locator,
          method: text(segment?.method, 80) || "pdf-text",
          text: content,
          confidence:
            segment?.confidence === null || segment?.confidence === undefined
              ? null
              : Number.isFinite(Number(segment.confidence))
                ? Math.max(0, Math.min(1, Number(segment.confidence)))
                : null
        };
      })
      .filter(Boolean)
      .slice(0, 120);
    const unresolved = (Array.isArray(raw.unresolved) ? raw.unresolved : [])
      .map((entry) => ({
        locator: entry?.locator && typeof entry.locator === "object" ? { ...entry.locator } : null,
        reason: text(entry?.reason, 500)
      }))
      .filter((entry) => entry.locator && entry.reason)
      .slice(0, 120);
    if (!segments.length && !unresolved.length) return null;
    return {
      schemaVersion: text(raw.schemaVersion, 80) || "timeline-evidence-extraction-v1",
      status: text(raw.status, 40) || (unresolved.length ? "partial" : "complete"),
      mimeType: text(raw.mimeType, 120),
      generatedAt: text(raw.generatedAt, 80),
      tool: {
        name: text(raw.tool?.name, 120) || "Timeline Evidence Extraction",
        version: text(raw.tool?.version, 80) || "1"
      },
      segments,
      unresolved
    };
  }

  function normalizeRecord(raw, index = 0) {
    if (!raw || typeof raw !== "object") return null;
    const type = TYPES.includes(raw.type) ? raw.type : "note";
    const id = text(raw.id, 120) || `evidence-${index + 1}`;
    const title = text(raw.title, 180);
    if (!title) return null;
    const record = {
      id,
      type,
      title,
      sourceName: text(raw.sourceName, 160),
      url: safeUrl(raw.url),
      note: text(raw.note, 5000),
      publishedAt: text(raw.publishedAt, 40),
      file: null
    };
    if (raw.file && typeof raw.file === "object") {
      record.file = {
        blobKey: text(raw.file.blobKey, 160) || id,
        name: text(raw.file.name, 260),
        mimeType: text(raw.file.mimeType, 120) || (type === "image" ? "image/*" : "application/pdf"),
        size: Number.isFinite(Number(raw.file.size)) ? Math.max(0, Number(raw.file.size)) : 0
      };
    }
    const forensic = normalizeForensic(raw.forensic);
    if (forensic) record.forensic = forensic;
    const extraction = normalizeExtraction(raw.extraction);
    if (extraction) record.extraction = extraction;
    return record;
  }

  function normalizeRecords(value) {
    const source = Array.isArray(value) ? value : [];
    const seen = new Set();
    const records = [];
    source.forEach((raw, index) => {
      const record = normalizeRecord(raw, index);
      if (!record || seen.has(record.id)) return;
      seen.add(record.id);
      records.push(record);
    });
    return records;
  }

  function normalizeCustodyAction(raw, index = 0) {
    if (!raw || typeof raw !== "object") return null;
    const evidenceIds = textList(raw.evidenceIds, 120, 64);
    const occurredAt = text(raw.occurredAt, 80);
    if (!evidenceIds.length || !occurredAt) return null;

    const id = text(raw.id, 120) || `custody-${index + 1}`;
    const actionType = text(raw.actionType, 80).toLowerCase() || "other";
    return {
      id,
      actionType,
      evidenceIds,
      occurredAt,
      fromEntityId: text(raw.fromEntityId, 120),
      toEntityId: text(raw.toEntityId, 120),
      placeEntityId: text(raw.placeEntityId, 120),
      recorderEntityId: text(raw.recorderEntityId, 120),
      reason: text(raw.reason, 1000),
      note: text(raw.note, 5000),
      sourceEvidenceIds: textList(raw.sourceEvidenceIds, 120, 32)
    };
  }

  function normalizeCustodyActions(value) {
    const seen = new Set();
    const actions = [];
    (Array.isArray(value) ? value : []).forEach((raw, index) => {
      const action = normalizeCustodyAction(raw, index);
      if (!action || seen.has(action.id)) return;
      seen.add(action.id);
      actions.push(action);
    });
    return actions;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error("IndexedDB is unavailable."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open evidence storage."));
    });
  }

  async function withStore(mode, callback) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        let result;
        try {
          result = callback(store);
        } catch (error) {
          reject(error);
          return;
        }
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error || new Error("Evidence storage transaction failed."));
        transaction.onabort = () => reject(transaction.error || new Error("Evidence storage transaction aborted."));
      });
    } finally {
      db.close();
    }
  }

  async function putBlob(key, blob) {
    if (!(blob instanceof Blob)) throw new TypeError("Evidence upload must be a Blob.");
    await withStore("readwrite", (store) => store.put(blob, key));
    return key;
  }

  async function getBlob(key) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("Could not read evidence file."));
      });
    } finally {
      db.close();
    }
  }

  async function deleteBlob(key) {
    if (!key) return;
    await withStore("readwrite", (store) => store.delete(key));
  }

  globalThis.TimelineEvidence = Object.freeze({
    TYPES,
    RECORD_CLASSES,
    DIGEST_ALGORITHMS,
    CUSTODY_ACTION_TYPES,
    normalizeDigest,
    normalizeDigests,
    normalizeForensic,
    normalizeExtraction,
    normalizeRecord,
    normalizeRecords,
    normalizeCustodyAction,
    normalizeCustodyActions,
    putBlob,
    getBlob,
    deleteBlob,
    safeUrl
  });
})();
