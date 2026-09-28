import {
  applyProjectTransaction,
  type ProjectTransactionOperation,
} from "./project-transaction.ts";

export interface ProjectCommandMetadata {
  readonly id: string;
  readonly type: string;
  readonly operations: readonly ProjectTransactionOperation[];
  readonly timestamp?: string;
  readonly author?: string;
  readonly source?: string;
}

export interface ProjectCommandHistoryEntry<TProject> {
  readonly id: string;
  readonly type: string;
  readonly operations: readonly ProjectTransactionOperation[];
  readonly timestamp: string | null;
  readonly author: string | null;
  readonly source: string | null;
  readonly before: TProject;
  readonly after: TProject;
}

export interface ProjectCommandJournalSnapshot<TProject> {
  readonly project: TProject;
  readonly history: readonly ProjectCommandHistoryEntry<TProject>[];
  readonly cursor: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface ProjectCommandJournalOptions<TProject> {
  readonly maxEntries?: number;
  readonly validate?: (project: TProject) => TProject;
}

function cloneValue<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function normalizedText(value: unknown, label: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${label} must be a non-empty string.`);
  return text;
}

function boundedMaxEntries(value: number | undefined): number {
  if (value === undefined) return 100;
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw new Error("Command history maxEntries must be an integer from 1 through 1000.");
  }
  return value;
}

export function createProjectCommandJournal<TProject>(
  initialProject: TProject,
  options: ProjectCommandJournalOptions<TProject> = {},
) {
  const maxEntries = boundedMaxEntries(options.maxEntries);
  const validate = options.validate ?? ((project: TProject) => project);
  let project = cloneValue(validate(cloneValue(initialProject)));
  let history: ProjectCommandHistoryEntry<TProject>[] = [];
  let cursor = 0;
  const seenTransactionIds = new Set<string>();

  const snapshot = (): ProjectCommandJournalSnapshot<TProject> =>
    Object.freeze({
      project: cloneValue(project),
      history: Object.freeze(
        history.map((entry) =>
          Object.freeze({
            ...entry,
            operations: Object.freeze(entry.operations.map((operation) => Object.freeze(cloneValue(operation)))),
            before: cloneValue(entry.before),
            after: cloneValue(entry.after),
          }),
        ),
      ),
      cursor,
      canUndo: cursor > 0,
      canRedo: cursor < history.length,
    });

  const commit = (command: ProjectCommandMetadata): ProjectCommandJournalSnapshot<TProject> => {
    const id = normalizedText(command?.id, "Transaction id");
    const type = normalizedText(command?.type, "Command type");
    if (seenTransactionIds.has(id)) {
      throw new Error(`Transaction id "${id}" has already been used in this command journal.`);
    }

    const before = cloneValue(project);
    const operations = Object.freeze(
      (Array.isArray(command.operations) ? command.operations : []).map((operation) =>
        Object.freeze(cloneValue(operation)),
      ),
    );

    // applyProjectTransaction and validate both operate on isolated values.
    // Nothing below mutates current state until the full transaction succeeds.
    const applied = applyProjectTransaction(before, operations);
    const after = cloneValue(validate(applied));

    const nextHistory = history.slice(0, cursor);
    nextHistory.push(
      Object.freeze({
        id,
        type,
        operations,
        timestamp: typeof command.timestamp === "string" ? command.timestamp : null,
        author: typeof command.author === "string" ? command.author : null,
        source: typeof command.source === "string" ? command.source : null,
        before,
        after: cloneValue(after),
      }),
    );

    if (nextHistory.length > maxEntries) {
      nextHistory.splice(0, nextHistory.length - maxEntries);
    }

    project = after;
    history = nextHistory;
    cursor = history.length;
    seenTransactionIds.add(id);
    return snapshot();
  };

  const undo = (): ProjectCommandJournalSnapshot<TProject> => {
    if (cursor <= 0) return snapshot();
    const entry = history[cursor - 1];
    if (!entry) return snapshot();
    project = cloneValue(entry.before);
    cursor -= 1;
    return snapshot();
  };

  const redo = (): ProjectCommandJournalSnapshot<TProject> => {
    if (cursor >= history.length) return snapshot();
    const entry = history[cursor];
    if (!entry) return snapshot();
    project = cloneValue(entry.after);
    cursor += 1;
    return snapshot();
  };

  const reset = (nextProject: TProject): ProjectCommandJournalSnapshot<TProject> => {
    project = cloneValue(validate(cloneValue(nextProject)));
    history = [];
    cursor = 0;
    seenTransactionIds.clear();
    return snapshot();
  };

  return Object.freeze({
    snapshot,
    commit,
    undo,
    redo,
    reset,
  });
}
