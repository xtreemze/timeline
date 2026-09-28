/**
 * Presentation mapping from a projected world instance's canonical entity
 * kind to the shared semantic icon vocabulary.
 */

import {
  type SemanticIconName,
  defaultSemanticIconForEntityType,
  normalizeSemanticIconName,
} from "../../src/presentation/semantic-icons.ts";

export type WorldEntityIconName = SemanticIconName;

export function worldEntityIconName(kind: string | undefined): WorldEntityIconName | null {
  return normalizeSemanticIconName(kind) ?? defaultSemanticIconForEntityType(kind);
}
