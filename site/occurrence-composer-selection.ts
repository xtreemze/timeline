import type { ApplicationSelectionChange } from "../src/application/selection.ts";

/** A user-selected occurrence is the composer card's active context. */
export function shouldOpenComposerForSelection(change: ApplicationSelectionChange): boolean {
  return change.selection?.kind === "relationship" && change.source !== "app";
}
