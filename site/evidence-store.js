(() => {
  "use strict";

  const DB_NAME = "timeline-evidence";
  const DB_VERSION = 1;
  const STORE = "blobs";
  const TYPES = Object.freeze(["article", "pdf", "note", "document"]);

  function text(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
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
        mimeType: text(raw.file.mimeType, 120) || "application/pdf",
        size: Number.isFinite(Number(raw.file.size)) ? Math.max(0, Number(raw.file.size)) : 0
      };
    }
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
    normalizeRecord,
    normalizeRecords,
    putBlob,
    getBlob,
    deleteBlob,
    safeUrl
  });
})();
