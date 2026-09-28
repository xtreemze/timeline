import { normalizeSemanticIconName } from "../src/presentation/semantic-icons.ts";
import { worldNodeStyle, type WorldGraphPalette } from "../src/layout/world-graph-style.ts";
import { worldNodeMarker } from "./world/world-node-marker.ts";
import {
  composerEditableSections,
  parseOccurrenceSentence,
  type ComposerEntityOption,
  type ComposerPlaceOption,
  type ComposerSuggestion,
} from "./occurrence-composer-model.ts";

export interface ComposerPreviewNode {
  readonly label: string;
  readonly icon: string;
  readonly entityId?: string;
  readonly style?: Readonly<Record<string, string>>;
}

/** Share the renderer's marker geometry, authored styling and semantic glyph. */
export function composerWorldNodeMarker(
  node: ComposerPreviewNode,
  entities: readonly ComposerEntityOption[],
  palette: WorldGraphPalette,
) {
  const entity = entities.find((candidate) =>
    node.entityId ? candidate.id === node.entityId : candidate.name === node.label,
  );
  const authoredStyle = entity?.attributes?.style;
  const style = typeof authoredStyle === "object" && authoredStyle !== null && !Array.isArray(authoredStyle)
    ? authoredStyle as Readonly<Record<string, unknown>>
    : {};
  return worldNodeMarker(worldNodeStyle({
    type: entity?.type ?? "person",
    attributes: { style: { ...style, ...node.style, icon: node.icon } },
  }, palette));
}

export interface ComposerPreview {
  readonly subject: ComposerPreviewNode | null;
  readonly edge: { readonly label: string } | null;
  readonly object: ComposerPreviewNode | null;
  readonly category: string | null;
  readonly tags: readonly string[];
  readonly place: {
    readonly label: string;
    readonly longitude: number | null;
    readonly latitude: number | null;
  } | null;
}

function previewNode(
  name: string | undefined,
  properties: Readonly<Record<string, string>> | undefined,
  entities: readonly ComposerEntityOption[],
  suggestedIcon: string | null,
): ComposerPreviewNode | null {
  if (!name) return null;
  const matched = entities.find(
    (entity) =>
      name === `@${entity.id}` || name.toLocaleLowerCase() === entity.name.toLocaleLowerCase(),
  );
  const icon =
    (suggestedIcon && normalizeSemanticIconName(suggestedIcon)) ||
    normalizeSemanticIconName(properties?.icon) ||
    normalizeSemanticIconName(matched?.icon) ||
    "person";
  const style = Object.fromEntries(
    ["shape", "color", "fill", "border", "borderWidth", "image", "size", "radius"]
      .filter((key) => properties?.[key])
      .map((key) => [key, properties![key]]),
  );
  return Object.freeze({
    label: matched?.name ?? name.replace(/^@/, ""),
    icon,
    ...(matched ? { entityId: matched.id } : {}),
    ...(Object.keys(style).length ? { style: Object.freeze(style) } : {}),
  });
}

export function projectComposerPreview(
  input: string,
  entities: readonly ComposerEntityOption[],
  suggestion?: ComposerSuggestion | null,
  places: readonly ComposerPlaceOption[] = [],
): ComposerPreview {
  const parsed = parseOccurrenceSentence(input);
  const iconSuggestion =
    suggestion?.kind === "property" && /^icon:\s*/i.test(suggestion.insertText)
      ? suggestion.insertText.replace(/^icon:\s*/i, "").trim()
      : null;
  const iconOffset = input.lastIndexOf("icon:");
  const sections = composerEditableSections(input);
  const iconSection = sections.find(
    (section) => iconOffset >= section.start && iconOffset < section.end,
  );
  const previewSubjectIcon = iconSection?.kind === "subject" ? iconSuggestion : null;
  const previewObjectIcon = iconSection?.kind === "object" ? iconSuggestion : null;
  const place = parsed.place?.name
    ? places.find(
        (candidate) =>
          candidate.name.toLocaleLowerCase() === parsed.place?.name.toLocaleLowerCase() ||
          `@${candidate.id}` === parsed.place?.name,
      )
    : null;
  const previewTags = parsed.options.tags.length
    ? [...parsed.options.tags]
    : sections.filter((section) => section.kind === "tag").map((section) => section.text);
  if (suggestion?.kind === "tag") {
    const current = sections.findLast((section) => section.kind === "tag");
    if (current && previewTags.length) previewTags[previewTags.length - 1] = suggestion.insertText;
    else previewTags.push(suggestion.insertText);
  }
  return Object.freeze({
    subject: previewNode(
      parsed.subject?.name ?? sections.find((section) => section.kind === "subject")?.text,
      parsed.subject?.properties,
      entities,
      previewSubjectIcon,
    ),
    edge: parsed.predicate ? Object.freeze({ label: parsed.predicate }) : null,
    object: previewNode(
      parsed.object?.name ?? sections.find((section) => section.kind === "object")?.text,
      parsed.object?.properties,
      entities,
      previewObjectIcon,
    ),
    category: suggestion?.kind === "category"
      ? suggestion.insertText
      : parsed.options.category ?? sections.find((section) => section.kind === "category")?.text ?? null,
    tags: Object.freeze(previewTags),
    place: parsed.place
      ? Object.freeze({
          label: place?.name ?? parsed.place.name,
          longitude: Number.isFinite(place?.longitude) ? place!.longitude! : null,
          latitude: Number.isFinite(place?.latitude) ? place!.latitude! : null,
        })
      : null,
  });
}

export interface InvestigativeQualifier {
  readonly kind: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly normalizedText: string;
  readonly scope: "section" | "sentence" | "ambiguous";
  readonly interpretations: readonly string[];
}

export function proposeInvestigationQuestion(input: string): {
  readonly collection: "questions";
  readonly record: { readonly text: string; readonly status: "open" };
} | null {
  if (!projectInvestigativeQualifiers(input).length) return null;
  return Object.freeze({
    collection: "questions",
    record: Object.freeze({
      text: `What is unresolved in “${input.trim()}”?`,
      status: "open",
    }),
  });
}

export function proposeInvestigationAction(
  input: string,
  action: string,
): {
  readonly collection: "questions" | "assumptions" | "linesOfEnquiry" | "informationReviews";
  readonly record: Readonly<Record<string, string>>;
} | null {
  const question = proposeInvestigationQuestion(input);
  if (!question) return null;
  const context = input.trim();
  switch (action) {
    case "question":
      return question;
    case "assumption":
      return Object.freeze({
        collection: "assumptions",
        record: Object.freeze({
          text: `Assumption to examine: ${context}`,
          status: "open",
        }),
      });
    case "enquiry":
    case "falsify":
      return Object.freeze({
        collection: "linesOfEnquiry",
        record: Object.freeze({
          text:
            action === "falsify"
              ? `Seek evidence that would disconfirm: ${context}`
              : `Investigate: ${context}`,
          status: "proposed",
          testType: action === "falsify" ? "falsify" : "discover",
        }),
      });
    case "information-review":
      return Object.freeze({
        collection: "informationReviews",
        record: Object.freeze({
          text: `Review the information quality for: ${context}`,
          finding: "unknown",
          methodId: "quality-of-information-check",
        }),
      });
    default:
      return null;
  }
}

/** This projection is ephemeral. It never writes an entity or a reasoning record. */
export function projectInvestigativeQualifiers(input: string): readonly InvestigativeQualifier[] {
  const investigation = parseOccurrenceSentence(input).investigation;
  return Object.freeze(
    investigation.qualifiers.map((qualifier) => {
      const kind = qualifier.section === "sentence" ? "question" : qualifier.section;
      return Object.freeze({
        kind,
        start: qualifier.start,
        end: qualifier.end,
        text: qualifier.rawText,
        normalizedText: qualifier.normalizedText,
        scope: qualifier.scope,
        interpretations: Object.freeze(
          qualifier.section === "subject" || qualifier.section === "object"
            ? ["entity type", "property", "identity", "descriptor"]
            : qualifier.section === "sentence"
              ? ["open question"]
              : ["candidate value", "unresolved constraint"],
        ),
      });
    }),
  );
}
