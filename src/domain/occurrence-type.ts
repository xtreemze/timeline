import type { ExternalSemanticMapping } from "./semantics.ts";

export type OccurrenceTypeFamily =
  | "general"
  | "life"
  | "institutional"
  | "organization"
  | "provenance";

export interface OccurrenceTypeDefinition {
  readonly id: string;
  readonly label: string;
  readonly family: OccurrenceTypeFamily;
  readonly semanticParent?: string;
  readonly expectedParticipantRoles: readonly string[];
  readonly supportsPlace: boolean;
  readonly supportsRange: boolean;
  readonly externalMappings: readonly ExternalSemanticMapping[];
}

function iso21127(
  identifier: string,
  relation: ExternalSemanticMapping["relation"] = "exact",
): ExternalSemanticMapping {
  return {
    scheme: "ISO 21127",
    version: "2023",
    identifier,
    relation,
  };
}

export const OCCURRENCE_TYPE_DEFINITIONS: readonly OccurrenceTypeDefinition[] = Object.freeze([
  {
    id: "event",
    label: "Event",
    family: "general",
    expectedParticipantRoles: [],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E5")],
  },
  {
    id: "activity",
    label: "Activity",
    family: "general",
    semanticParent: "event",
    expectedParticipantRoles: ["actor"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7")],
  },
  {
    id: "birth",
    label: "Birth",
    family: "life",
    semanticParent: "event",
    expectedParticipantRoles: ["born-person", "parent"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E67")],
  },
  {
    id: "death",
    label: "Death",
    family: "life",
    semanticParent: "event",
    expectedParticipantRoles: ["deceased"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E69")],
  },
  {
    id: "adoption",
    label: "Adoption",
    family: "life",
    semanticParent: "activity",
    expectedParticipantRoles: ["adopted-person", "adoptive-parent"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "marriage",
    label: "Marriage or partnership",
    family: "life",
    semanticParent: "activity",
    expectedParticipantRoles: ["partner"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "education",
    label: "Education",
    family: "life",
    semanticParent: "activity",
    expectedParticipantRoles: ["student", "institution"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "employment",
    label: "Employment",
    family: "life",
    semanticParent: "activity",
    expectedParticipantRoles: ["worker", "employer"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "residence",
    label: "Residence",
    family: "life",
    semanticParent: "activity",
    expectedParticipantRoles: ["resident"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [],
  },
  {
    id: "migration",
    label: "Migration",
    family: "life",
    semanticParent: "activity",
    expectedParticipantRoles: ["migrant"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "name-change",
    label: "Name change",
    family: "life",
    semanticParent: "activity",
    expectedParticipantRoles: ["person-or-organization"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "citizenship-change",
    label: "Citizenship or nationality change",
    family: "life",
    semanticParent: "activity",
    expectedParticipantRoles: ["person"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "joining",
    label: "Joining",
    family: "institutional",
    semanticParent: "activity",
    expectedParticipantRoles: ["joining-actor", "group"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E85")],
  },
  {
    id: "leaving",
    label: "Leaving",
    family: "institutional",
    semanticParent: "activity",
    expectedParticipantRoles: ["leaving-actor", "group"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E86")],
  },
  {
    id: "appointment",
    label: "Appointment or assumption of office",
    family: "institutional",
    semanticParent: "activity",
    expectedParticipantRoles: ["appointee", "organization"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "representation",
    label: "Representation or mandate",
    family: "institutional",
    semanticParent: "activity",
    expectedParticipantRoles: ["representative", "represented-actor"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "formation",
    label: "Formation or founding",
    family: "organization",
    semanticParent: "event",
    expectedParticipantRoles: ["formed-group", "founder"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E66")],
  },
  {
    id: "dissolution",
    label: "Dissolution",
    family: "organization",
    semanticParent: "event",
    expectedParticipantRoles: ["dissolved-group"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E68")],
  },
  {
    id: "creation",
    label: "Creation",
    family: "provenance",
    semanticParent: "activity",
    expectedParticipantRoles: ["creator", "created-entity"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E65")],
  },
  {
    id: "acquisition",
    label: "Acquisition",
    family: "provenance",
    semanticParent: "activity",
    expectedParticipantRoles: ["acquirer", "transferred-entity"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E8")],
  },
  {
    id: "transfer-custody",
    label: "Transfer of custody",
    family: "provenance",
    semanticParent: "activity",
    expectedParticipantRoles: ["from", "to", "custodied-entity"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E10")],
  },
  {
    id: "meeting",
    label: "Meeting",
    family: "general",
    semanticParent: "activity",
    expectedParticipantRoles: ["participant"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "communication",
    label: "Communication",
    family: "general",
    semanticParent: "activity",
    expectedParticipantRoles: ["sender", "recipient"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "decision",
    label: "Decision",
    family: "general",
    semanticParent: "activity",
    expectedParticipantRoles: ["decision-maker"],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "publication",
    label: "Publication",
    family: "general",
    semanticParent: "activity",
    expectedParticipantRoles: ["publisher", "creator"],
    supportsPlace: true,
    supportsRange: false,
    externalMappings: [iso21127("E7", "broader")],
  },
  {
    id: "incident",
    label: "Incident",
    family: "general",
    semanticParent: "event",
    expectedParticipantRoles: [],
    supportsPlace: true,
    supportsRange: true,
    externalMappings: [iso21127("E5", "broader")],
  },
]);

const OCCURRENCE_TYPE_BY_ID = new Map(
  OCCURRENCE_TYPE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function occurrenceTypeDefinition(id: string): OccurrenceTypeDefinition | undefined {
  return OCCURRENCE_TYPE_BY_ID.get(id.trim().toLocaleLowerCase());
}

export function validateOccurrenceTypeId(value: unknown): string[] {
  if (value === undefined) return [];
  if (typeof value !== "string" || !value.trim()) {
    return ["Occurrence type must be a non-empty string when present."];
  }
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.trim())) {
    return ["Occurrence type must use a stable lowercase kebab-case identifier."];
  }
  return [];
}
