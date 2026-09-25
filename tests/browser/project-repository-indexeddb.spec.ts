import { expect, test } from "@playwright/test";

test("IndexedDB ProjectRepository commits atomically and preserves recovery state", async ({
  page,
}) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const moduleUrl = new URL("/persistence/indexeddb-project-repository.ts", window.location.href)
      .href;
    const { createIndexedDbProjectRepository, INDEXED_DB_PROJECT_STORAGE } = await import(
      moduleUrl
    );

    const databaseName = `lum-project-test-${crypto.randomUUID()}`;
    const project = {
      schemaVersion: 3,
      entities: [
        {
          id: "alice",
          type: "person",
          name: "Alice",
          alternateNames: [],
          sourceIds: [],
          attributes: {},
        },
        {
          id: "bob",
          type: "person",
          name: "Bob",
          alternateNames: [],
          sourceIds: [],
          attributes: {},
        },
      ],
      relationships: [
        {
          id: "relationship-1",
          subjectId: "alice",
          objectId: "bob",
          predicate: "warned",
          itemIds: [],
          sourceIds: [],
          confidence: 0.8,
          time: null,
          attributes: {},
        },
      ],
    };

    const firstRepository = createIndexedDbProjectRepository({ databaseName });
    const first = await firstRepository.save({
      projectKey: "case-a",
      expectedRevision: 0,
      savedAt: "2026-09-25T02:30:00.000Z",
      project,
    });

    const reloadedRepository = createIndexedDbProjectRepository({ databaseName });
    const reloaded = await reloadedRepository.load("case-a");

    let staleError = "";
    try {
      await reloadedRepository.save({
        projectKey: "case-a",
        expectedRevision: 0,
        savedAt: "2026-09-25T02:31:00.000Z",
        project,
      });
    } catch (error) {
      staleError = error instanceof Error ? error.name : String(error);
    }

    const second = await reloadedRepository.save({
      projectKey: "case-a",
      expectedRevision: 1,
      savedAt: "2026-09-25T02:32:00.000Z",
      project: {
        ...project,
        entities: [
          ...project.entities,
          {
            id: "carol",
            type: "person",
            name: "Carol",
            alternateNames: [],
            sourceIds: [],
            attributes: {},
          },
        ],
      },
    });
    const checkpoint = await reloadedRepository.recover("case-a");

    await new Promise<void>((resolve, reject) => {
      const openRequest = indexedDB.open(databaseName, INDEXED_DB_PROJECT_STORAGE.version);
      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => {
        const database = openRequest.result;
        const transaction = database.transaction(
          INDEXED_DB_PROJECT_STORAGE.latestStore,
          "readwrite",
        );
        transaction.objectStore(INDEXED_DB_PROJECT_STORAGE.latestStore).put("{not-json", "case-a");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      };
    });

    let corruptLoadError = "";
    try {
      await reloadedRepository.load("case-a");
    } catch (error) {
      corruptLoadError = error instanceof Error ? error.message : String(error);
    }
    const recoveredAfterCorruption = await reloadedRepository.recover("case-a");

    await new Promise<void>((resolve) => {
      const deletion = indexedDB.deleteDatabase(databaseName);
      deletion.onsuccess = () => resolve();
      deletion.onerror = () => resolve();
      deletion.onblocked = () => resolve();
    });

    return {
      firstRevision: first.revision,
      reloadRevision: reloaded?.revision ?? null,
      staleError,
      secondRevision: second.revision,
      checkpointRevision: checkpoint?.revision ?? null,
      checkpointEntityCount: checkpoint?.project.entities.length ?? null,
      corruptLoadError,
      recoveredRevision: recoveredAfterCorruption?.revision ?? null,
    };
  });

  expect(result).toEqual({
    firstRevision: 1,
    reloadRevision: 1,
    staleError: "ProjectRevisionConflictError",
    secondRevision: 2,
    checkpointRevision: 1,
    checkpointEntityCount: 2,
    corruptLoadError: "Project snapshot is not valid JSON.",
    recoveredRevision: 1,
  });
});
