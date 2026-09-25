import {
  deserializeProjectSnapshot,
  type ProjectMigration,
  type ProjectRepository,
  ProjectRevisionConflictError,
  type ProjectSnapshot,
  type SaveProjectRequest,
  serializeProjectSnapshot,
} from "../../src/application/project-repository.ts";

const DEFAULT_DATABASE_NAME = "lum-projects";
const DATABASE_VERSION = 1;
const LATEST_STORE = "latest";
const CHECKPOINT_STORE = "checkpoints";

export interface IndexedDbProjectRepositoryOptions {
  readonly databaseName?: string;
  readonly indexedDB?: IDBFactory;
  readonly migrations?: readonly ProjectMigration[];
}

function normalizeDatabaseName(value: string | undefined): string {
  const normalized = value?.trim() || DEFAULT_DATABASE_NAME;
  if (!normalized) {
    throw new Error("IndexedDB project database name must not be empty.");
  }
  return normalized;
}

function requireFactory(factory: IDBFactory | undefined): IDBFactory {
  if (!factory) {
    throw new Error("IndexedDB is unavailable.");
  }
  return factory;
}

function openDatabase(factory: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, DATABASE_VERSION);
    let blocked = false;

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LATEST_STORE)) {
        database.createObjectStore(LATEST_STORE);
      }
      if (!database.objectStoreNames.contains(CHECKPOINT_STORE)) {
        database.createObjectStore(CHECKPOINT_STORE);
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open the IndexedDB project database."));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("IndexedDB project database upgrade is blocked by another connection."));
    };
  });
}

function rawSnapshot(value: unknown, label: string): string | null {
  if (value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${label} contains an invalid persisted project record.`);
  }
  return value;
}

async function readStore(
  factory: IDBFactory,
  databaseName: string,
  storeName: typeof LATEST_STORE | typeof CHECKPOINT_STORE,
  projectKey: string,
): Promise<string | null> {
  const database = await openDatabase(factory, databaseName);

  return new Promise((resolve, reject) => {
    let result: string | null = null;
    let failure: unknown = null;
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(projectKey);

    request.onsuccess = () => {
      try {
        result = rawSnapshot(request.result, storeName);
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    request.onerror = () => {
      failure = request.error ?? new Error(`Could not read project "${projectKey}".`);
    };

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onabort = () => {
      database.close();
      reject(failure ?? transaction.error ?? new Error("IndexedDB project read was aborted."));
    };
    transaction.onerror = () => {
      failure ??= transaction.error ?? new Error("IndexedDB project read failed.");
    };
  });
}

function expectedRevision(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Expected project revision must be a non-negative integer.");
  }
  return value;
}

function normalizedProjectKey(value: string): string {
  const key = value.trim();
  if (!key) {
    throw new Error("Project key must be a non-empty string.");
  }
  return key;
}

export function createIndexedDbProjectRepository(
  options: IndexedDbProjectRepositoryOptions = {},
): ProjectRepository {
  const factory = requireFactory(options.indexedDB ?? globalThis.indexedDB);
  const databaseName = normalizeDatabaseName(options.databaseName);
  const migrations = options.migrations ?? [];

  return Object.freeze({
    async load(projectKey: string): Promise<ProjectSnapshot | null> {
      const key = normalizedProjectKey(projectKey);
      const serialized = await readStore(factory, databaseName, LATEST_STORE, key);
      return serialized ? deserializeProjectSnapshot(serialized, migrations) : null;
    },

    async save(request: SaveProjectRequest): Promise<ProjectSnapshot> {
      const key = normalizedProjectKey(request.projectKey);
      const expected = expectedRevision(request.expectedRevision);
      const next: ProjectSnapshot = {
        projectKey: key,
        revision: expected + 1,
        savedAt: request.savedAt,
        project: request.project,
      };
      const serializedNext = serializeProjectSnapshot(next);
      const database = await openDatabase(factory, databaseName);

      return new Promise((resolve, reject) => {
        let failure: unknown = null;
        const transaction = database.transaction([LATEST_STORE, CHECKPOINT_STORE], "readwrite");
        const latestStore = transaction.objectStore(LATEST_STORE);
        const checkpointStore = transaction.objectStore(CHECKPOINT_STORE);
        const readCurrent = latestStore.get(key);

        readCurrent.onerror = () => {
          failure = readCurrent.error ?? new Error(`Could not read project "${key}" before save.`);
        };

        readCurrent.onsuccess = () => {
          try {
            const currentRaw = rawSnapshot(readCurrent.result, LATEST_STORE);
            const current = currentRaw ? deserializeProjectSnapshot(currentRaw, migrations) : null;
            const actual = current?.revision ?? 0;

            if (actual !== expected) {
              failure = new ProjectRevisionConflictError(key, expected, actual);
              transaction.abort();
              return;
            }

            if (currentRaw) {
              checkpointStore.put(currentRaw, key);
            }
            latestStore.put(serializedNext, key);
          } catch (error) {
            failure = error;
            transaction.abort();
          }
        };

        transaction.oncomplete = () => {
          database.close();
          resolve(deserializeProjectSnapshot(serializedNext, migrations));
        };
        transaction.onabort = () => {
          database.close();
          reject(failure ?? transaction.error ?? new Error("IndexedDB project save was aborted."));
        };
        transaction.onerror = () => {
          failure ??= transaction.error ?? new Error("IndexedDB project save failed.");
        };
      });
    },

    async recover(projectKey: string): Promise<ProjectSnapshot | null> {
      const key = normalizedProjectKey(projectKey);
      const serialized = await readStore(factory, databaseName, CHECKPOINT_STORE, key);
      return serialized ? deserializeProjectSnapshot(serialized, migrations) : null;
    },
  });
}

export const INDEXED_DB_PROJECT_STORAGE = Object.freeze({
  databaseName: DEFAULT_DATABASE_NAME,
  version: DATABASE_VERSION,
  latestStore: LATEST_STORE,
  checkpointStore: CHECKPOINT_STORE,
});
