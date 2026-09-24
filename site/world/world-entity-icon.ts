/**
 * Presentation mapping from a projected world instance's canonical
 * entity `kind` to a semantic icon name in the app's shared icon vocabulary
 * (site/event-presentation.ts). Unknown kinds deliberately map to no icon:
 * presentation must not invent meaning the canonical data does not carry.
 */

export type WorldEntityIconName = "person" | "group" | "object" | "evidence" | "place";

const KIND_ICONS: ReadonlyMap<string, WorldEntityIconName> = new Map([
  ["person", "person"],
  ["people", "person"],
  ["human", "person"],
  ["group", "group"],
  ["organization", "group"],
  ["organisation", "group"],
  ["team", "group"],
  ["company", "group"],
  ["object", "object"],
  ["artifact", "object"],
  ["artefact", "object"],
  ["thing", "object"],
  ["document", "evidence"],
  ["article", "evidence"],
  ["pdf", "evidence"],
  ["note", "evidence"],
  ["place", "place"],
  ["location", "place"],
]);

export function worldEntityIconName(kind: string | undefined): WorldEntityIconName | null {
  if (typeof kind !== "string") return null;
  return KIND_ICONS.get(kind.trim().toLowerCase()) ?? null;
}
