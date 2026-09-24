/**
 * Timeline application orchestrator
 * Main entry point coordinating all modules, UI state, and persistence
 */

import { planWorkspacePlacement } from "../src/layout/workspace-layout.ts";
import { projectTimelineOccurrences } from "../src/projection/timeline-projection.ts";
import { TimelineEvidence } from "./evidence-store.ts";
import { TimelineGraphInference } from "./graph-inference.ts";
import { TimelineInterchangeAdapter } from "./interchange-adapter.ts";
import { TimelineSpatial } from "./spatial.ts";
// Import ESM modules
import { TimelineTemporal } from "./temporal-standards.ts";
import { selectPrimarySpatialViewFactory } from "./world/world-view-selection.ts";

// Import globals that still use globalThis (not yet converted)
const graph = globalThis.TimelineGraph;
const presentation = globalThis.TimelinePresentation;
const dateRangeFactory = globalThis.TimelineDateRangePicker;
const navigationFactory = globalThis.TimelineNavigation;
const evidenceStore = TimelineEvidence;
const graphInference = TimelineGraphInference;
const temporalGraphFactory = selectPrimarySpatialViewFactory(
  Reflect.get(globalThis, "TimelineWorldView"),
  globalThis.TemporalGraphView,
);
const presentationLayout = globalThis.TimelinePresentationLayout;
const caseReasoning = globalThis.TimelineCaseReasoning;
const migration = globalThis.TimelineMigration;
const memgraphInterchange = globalThis.TimelineMemgraphInterchange;
const webMcp = globalThis.TimelineWebMCP;

if (!graph) throw new Error("TimelineGraph must load before app.ts.");
if (!presentation) throw new Error("TimelinePresentation must load before app.ts.");
if (!dateRangeFactory) throw new Error("TimelineDateRangePicker must load before app.ts.");
if (!navigationFactory) throw new Error("TimelineNavigation must load before app.ts.");
if (!evidenceStore) throw new Error("TimelineEvidence must load before app.ts.");
if (!presentationLayout) throw new Error("TimelinePresentationLayout must load before app.ts.");
if (!caseReasoning) throw new Error("TimelineCaseReasoning must load before app.ts.");
if (!migration) throw new Error("TimelineMigration must load before app.ts.");
if (!memgraphInterchange) throw new Error("TimelineMemgraphInterchange must load before app.ts.");
if (!webMcp) throw new Error("TimelineWebMCP must load before app.ts.");

const temporal = TimelineTemporal;
const spatial = TimelineSpatial;
const interchangeAdapter = TimelineInterchangeAdapter;

// Get sample data from globalThis, or fallback to blankTimeline if not available
function getSample() {
  return globalThis.TimelineSampleCase || null;
}

type TemporalExtent = NonNullable<ReturnType<typeof TimelineTemporal.normalizeExtent>>;
type EvidenceRecord = ReturnType<typeof TimelineEvidence.normalizeRecords>[number];
type CustodyAction = ReturnType<typeof TimelineEvidence.normalizeCustodyActions>[number];

interface CategoryRecord {
  id: string;
  name: string;
  color: string;
  extensions?: Record<string, unknown>;
}

interface MediaRecord {
  src: string;
  alt?: string;
  caption?: string;
}

interface TagRecord {
  label: string;
  icon?: string;
  hue?: number;
}

interface ItemPresentationRecord {
  variant: string;
  terminalShape: string;
  connectorStyle: string;
  connectorRouting: string;
  connectorWeight: string;
  connectorEndpoint: string;
  lane: number | null;
}

interface RelationChangeRecord {
  relationshipId: string;
  operation: string;
  predicate?: string;
  role?: string;
  properties?: Record<string, unknown>;
}

interface TimelineItemRecord {
  id: string;
  kind: "event" | "range";
  start: string;
  end: string | null;
  time: TemporalExtent;
  title: string;
  description: string;
  categoryId: string;
  media?: MediaRecord[];
  tags?: TagRecord[];
  presentation: ItemPresentationRecord;
  relationChanges: RelationChangeRecord[];
  evidenceIds: string[];
  extensions?: Record<string, unknown>;
  location?: Record<string, unknown>;
}

interface StoryRecord {
  id: string;
  title: string;
  description: string;
  itemIds: string[];
  placeIds: string[];
  extensions?: Record<string, unknown>;
}

interface EntityRecord {
  id: string;
  name: string;
  type?: string;
  alternateNames?: string[];
  identifiers?: unknown[];
  sourceIds?: string[];
  attributes?: Record<string, unknown>;
}

type PlaceRecord = NonNullable<ReturnType<typeof TimelineSpatial.placeFromForm>>;

interface RelationshipRecord {
  id: string;
  subjectId: string;
  objectId: string;
  predicate: string;
  role?: string;
  placeId?: string;
  itemIds?: string[];
  initialState?: "active" | "inactive";
  time?: TemporalExtent | null;
  sourceIds?: string[];
  confidence?: number | null;
  attributes?: Record<string, unknown>;
}

interface PresentationMapController {
  refresh?(): void;
  destroy?(): void;
}

interface AutoAdvanceState {
  running: boolean;
  paused: boolean;
  intervalMs: number;
  pauseReason: string;
}

interface AutoAdvanceController {
  running: boolean;
  paused: boolean;
  toggle(): void;
  resume(): void;
  pause(reason?: string): void;
  setIntervalMs(value: number): void;
}

interface NavigationControllerBundle {
  auto: AutoAdvanceController;
}

interface PresentationCommandMeta {
  source?: string;
  event?: KeyboardEvent;
}

interface TimelineState {
  version: number;
  title: string;
  categories: CategoryRecord[];
  items: TimelineItemRecord[];
  stories: StoryRecord[];
  entities: EntityRecord[];
  places: PlaceRecord[];
  relationships: RelationshipRecord[];
  evidence: EvidenceRecord[];
  custodyActions: CustodyAction[];
  reasoning: unknown;
  extensions?: Record<string, unknown>;
}

interface CategoryInputRecord {
  id?: unknown;
  name?: unknown;
  color?: unknown;
  extensions?: unknown;
  [key: string]: unknown;
}

interface TimelineItemInputRecord {
  id?: unknown;
  kind?: unknown;
  start?: unknown;
  end?: unknown;
  time?: {
    start?: { value?: unknown };
    end?: { value?: unknown };
    [key: string]: unknown;
  };
  title?: unknown;
  description?: unknown;
  categoryId?: unknown;
  category?: unknown;
  media?: unknown;
  tags?: unknown;
  presentation?: {
    variant?: unknown;
    terminalShape?: unknown;
    connectorStyle?: unknown;
    connectorRouting?: unknown;
    connectorWeight?: unknown;
    connectorEndpoint?: unknown;
    lane?: unknown;
    [key: string]: unknown;
  };
  relationChanges?: unknown;
  evidenceIds?: unknown;
  extensions?: unknown;
  [key: string]: unknown;
}

interface LegacyEventInputRecord {
  id?: unknown;
  date?: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
}

interface StoryInputRecord {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  itemIds?: unknown;
  placeIds?: unknown;
  extensions?: unknown;
  [key: string]: unknown;
}

interface TimelineInputRecord {
  title?: unknown;
  categories?: Array<CategoryInputRecord | CategoryRecord>;
  items?: Array<TimelineItemInputRecord | TimelineItemRecord>;
  events?: LegacyEventInputRecord[];
  stories?: Array<StoryInputRecord | StoryRecord>;
  evidence?: unknown;
  custodyActions?: unknown;
  reasoning?: unknown;
  extensions?: unknown;
  entities?: unknown[];
  places?: unknown[];
  relationships?: unknown[];
  [key: string]: unknown;
}

// Application version constant
const VERSION = 2;
const STORAGE_KEY = "timeline:v2";
const LEGACY_STORAGE_KEY = "timeline:v1";
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_CATEGORIES: ReadonlyArray<CategoryRecord> = Object.freeze([
  { id: "incident", name: "Incident", color: "#b42318" },
  { id: "witness", name: "Witness / Interview", color: "#7a5af8" },
  { id: "communication", name: "Communication", color: "#2563eb" },
  { id: "evidence", name: "Evidence", color: "#027a48" },
  { id: "document", name: "Document / Record", color: "#667085" },
  { id: "decision", name: "Decision / Action", color: "#b54708" },
  { id: "transaction", name: "Transaction", color: "#0e7090" },
  { id: "observation", name: "Observation", color: "#475467" },
]);

type EvidenceExtractionDraft = NonNullable<
  ReturnType<(typeof TimelineEvidence)["normalizeExtraction"]>
>;

interface EvidenceExtractionProgress {
  phase?: string;
  page?: number;
  total?: number;
  loaded?: number;
  method?: string;
}

interface EvidenceExtractionApi {
  extract(
    blob: Blob,
    options?: {
      mimeType?: string;
      fileName?: string;
      onProgress?: (progress: EvidenceExtractionProgress) => void;
    },
  ): Promise<EvidenceExtractionDraft | null>;
}

interface ItemInferenceDraft {
  fingerprint: string;
  graphContractVersion: string;
  proposal: ReturnType<(typeof TimelineGraphInference)["reconcileProposal"]>;
}

const evidenceExtraction = Reflect.get(globalThis, "TimelineEvidenceExtraction") as
  | EvidenceExtractionApi
  | undefined;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required Timeline UI element is missing: ${selector}`);
  return element;
}

function requiredElements<T extends Element>(selector: string): T[] {
  return [...document.querySelectorAll<T>(selector)];
}

function requiredDescendant<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Required Timeline UI descendant is missing: ${selector}`);
  return element;
}

function eventTargetElement(event: Event): HTMLElement | null {
  return event.target instanceof HTMLElement ? event.target : null;
}

function closestEventTarget<T extends HTMLElement>(event: Event, selector: string): T | null {
  return eventTargetElement(event)?.closest<T>(selector) ?? null;
}

const els = {
  title: requiredElement<HTMLInputElement>("#timeline-title"),
  heading: requiredElement<HTMLElement>("#timeline-heading"),
  itemCount: requiredElement<HTMLElement>("#item-count"),
  storyCount: requiredElement<HTMLElement>("#story-count"),
  categoryCount: requiredElement<HTMLElement>("#category-count"),
  visibleCount: requiredElement<HTMLElement>("#visible-count"),
  appShell: requiredElement<HTMLElement>("#app-shell"),
  appToolDock: requiredElement<HTMLElement>(".app-tool-dock"),
  controlPanel: requiredElement<HTMLElement>("#control-panel"),
  controlPanelClose: requiredElement<HTMLButtonElement>("#control-panel-close"),
  editorToggle: requiredElement<HTMLButtonElement>("#editor-toggle"),
  editorSurfaceTitle: requiredElement<HTMLElement>("#editor-surface-title"),
  panelOpeners: requiredElements<HTMLElement>("[data-open-panel]"),
  semanticIconTargets: requiredElements<HTMLElement>("[data-semantic-icon]"),
  projectMenu: requiredElement<HTMLElement>("#project-menu"),
  projectMenuToggle: requiredElement<HTMLButtonElement>("#project-menu-toggle"),
  importJsonTrigger: requiredElement<HTMLButtonElement>("#import-json-trigger"),
  importInterchangeTrigger: requiredElement<HTMLButtonElement>("#import-interchange-trigger"),
  browserSheet: requiredElement<HTMLElement>("#timeline-browser-sheet"),
  browserToggle: requiredElement<HTMLButtonElement>("#timeline-browser-toggle"),
  browserClose: requiredElement<HTMLButtonElement>("#timeline-browser-close"),
  browserStoryList: requiredElement<HTMLElement>("#browser-story-list"),
  browserStoryCount: requiredElement<HTMLElement>("#browser-story-count"),
  viewControls: requiredElement<HTMLElement>("#timeline-view-toolbar"),
  viewControlsToggle: requiredElement<HTMLButtonElement>("#timeline-view-controls-toggle"),
  loadSample: requiredElement<HTMLButtonElement>("#load-sample"),
  importJson: requiredElement<HTMLInputElement>("#import-json"),
  importInterchange: requiredElement<HTMLInputElement>("#import-interchange"),
  exportJson: requiredElement<HTMLButtonElement>("#export-json"),
  exportInterchange: requiredElement<HTMLButtonElement>("#export-interchange"),
  exportMarkdown: requiredElement<HTMLButtonElement>("#export-markdown"),
  clear: requiredElement<HTMLButtonElement>("#clear-timeline"),
  tabs: requiredElements<HTMLElement>(".tab"),
  panels: requiredElements<HTMLElement>(".editor-section"),

  itemForm: requiredElement<HTMLFormElement>("#item-form"),
  itemId: requiredElement<HTMLInputElement>("#item-id"),
  itemKind: requiredElement<HTMLSelectElement>("#item-kind"),
  itemCategory: requiredElement<HTMLSelectElement>("#item-category"),
  itemLayoutVariant: requiredElement<HTMLSelectElement>("#item-layout-variant"),
  itemTerminalShape: requiredElement<HTMLSelectElement>("#item-terminal-shape"),
  itemConnectorStyle: requiredElement<HTMLSelectElement>("#item-connector-style"),
  itemConnectorRouting: requiredElement<HTMLSelectElement>("#item-connector-routing"),
  itemConnectorWeight: requiredElement<HTMLSelectElement>("#item-connector-weight"),
  itemConnectorEndpoint: requiredElement<HTMLSelectElement>("#item-connector-endpoint"),
  itemLane: requiredElement<HTMLInputElement>("#item-lane"),
  itemDateRange: requiredElement<HTMLInputElement>("#item-date-range"),
  itemCalendarPopover: requiredElement<HTMLElement>("#item-calendar-popover"),
  itemCalendarGrid: requiredElement<HTMLElement>("#item-calendar-grid"),
  itemCalendarMonth: requiredElement<HTMLElement>("#item-calendar-month"),
  itemCalendarYear: requiredElement<HTMLInputElement>("#item-calendar-year"),
  itemCalendarPrev: requiredElement<HTMLButtonElement>("#item-calendar-prev"),
  itemCalendarNext: requiredElement<HTMLButtonElement>("#item-calendar-next"),
  itemCalendarClear: requiredElement<HTMLButtonElement>("#item-calendar-clear"),
  itemStartDate: requiredElement<HTMLInputElement>("#item-start-date"),
  itemStartTime: requiredElement<HTMLInputElement>("#item-start-time"),
  itemStartPrecision: requiredElement<HTMLSelectElement>("#item-start-precision"),
  itemStartCertainty: requiredElement<HTMLSelectElement>("#item-start-certainty"),
  itemStartZone: requiredElement<HTMLInputElement>("#item-start-zone"),
  itemStartTimeField: requiredElement<HTMLLabelElement>("#item-start-time-field"),
  itemStartZoneField: requiredElement<HTMLLabelElement>("#item-start-zone-field"),
  itemEndDate: requiredElement<HTMLInputElement>("#item-end-date"),
  itemEndTime: requiredElement<HTMLInputElement>("#item-end-time"),
  itemEndPrecision: requiredElement<HTMLSelectElement>("#item-end-precision"),
  itemEndCertainty: requiredElement<HTMLSelectElement>("#item-end-certainty"),
  itemEndZone: requiredElement<HTMLInputElement>("#item-end-zone"),
  itemEndTimeField: requiredElement<HTMLLabelElement>("#item-end-time-field"),
  itemEndZoneField: requiredElement<HTMLLabelElement>("#item-end-zone-field"),
  timeZoneOptions: requiredElement<HTMLDataListElement>("#time-zone-options"),
  endField: requiredElement<HTMLElement>("#end-field"),
  itemTitle: requiredElement<HTMLInputElement>("#item-title"),
  itemDescription: requiredElement<HTMLTextAreaElement>("#item-description"),
  itemMediaDetails: requiredElement<HTMLDetailsElement>("#item-media-details"),
  itemMediaRows: requiredElements<HTMLElement>("[data-media-slot]"),
  itemTagsDetails: requiredElement<HTMLDetailsElement>("#item-tags-details"),
  itemTagRows: requiredElements<HTMLElement>("[data-tag-slot]"),
  itemRelationChangesDetails: requiredElement<HTMLDetailsElement>("#item-relation-changes-details"),
  itemRelationChangeRows: requiredElements<HTMLElement>("[data-relation-change-slot]"),
  itemEvidenceDetails: requiredElement<HTMLDetailsElement>("#item-evidence-details"),
  itemEvidenceRows: requiredElements<HTMLElement>("[data-evidence-slot]"),
  itemInferenceDetails: requiredElement<HTMLDetailsElement>("#item-inference-details"),
  itemInferenceRun: requiredElement<HTMLButtonElement>("#item-inference-run"),
  itemInferenceClear: requiredElement<HTMLButtonElement>("#item-inference-clear"),
  itemInferenceStatus: requiredElement<HTMLParagraphElement>("#item-inference-status"),
  itemInferenceResults: requiredElement<HTMLElement>("#item-inference-results"),
  itemLocationDetails: requiredElement<HTMLDetailsElement>("#item-location-details"),
  itemLocationName: requiredElement<HTMLInputElement>("#item-location-name"),
  itemLocationIdentifier: requiredElement<HTMLInputElement>("#item-location-identifier"),
  itemLocationAddress: requiredElement<HTMLInputElement>("#item-location-address"),
  itemLocationLatitude: requiredElement<HTMLInputElement>("#item-location-latitude"),
  itemLocationLongitude: requiredElement<HTMLInputElement>("#item-location-longitude"),
  itemLocationSource: requiredElement<HTMLInputElement>("#item-location-source"),
  itemLocationAccuracy: requiredElement<HTMLInputElement>("#item-location-accuracy"),
  itemGeolocation: requiredElement<HTMLElement>("#item-geolocation"),
  itemLocationClear: requiredElement<HTMLButtonElement>("#item-location-clear"),
  itemLocationMap: requiredElement<HTMLElement>("#item-location-map"),
  itemFormError: requiredElement<HTMLParagraphElement>("#item-form-error"),
  saveItem: requiredElement<HTMLButtonElement>("#save-item"),
  cancelItemEdit: requiredElement<HTMLButtonElement>("#cancel-item-edit"),
  deleteItemEdit: requiredElement<HTMLButtonElement>("#delete-item-edit"),

  storyForm: requiredElement<HTMLFormElement>("#story-form"),
  storyId: requiredElement<HTMLInputElement>("#story-id"),
  storyTitle: requiredElement<HTMLInputElement>("#story-title"),
  storyDescription: requiredElement<HTMLTextAreaElement>("#story-description"),
  storyPicker: requiredElement<HTMLElement>("#story-picker"),
  storyPickerCount: requiredElement<HTMLElement>("#story-picker-count"),
  storySequence: requiredElement<HTMLOListElement>("#story-sequence"),
  storySequenceCount: requiredElement<HTMLElement>("#story-sequence-count"),
  storyPlacePicker: requiredElement<HTMLElement>("#story-place-picker"),
  storyPlacePickerCount: requiredElement<HTMLElement>("#story-place-picker-count"),
  storyFormError: requiredElement<HTMLParagraphElement>("#story-form-error"),
  saveStory: requiredElement<HTMLButtonElement>("#save-story"),
  cancelStoryEdit: requiredElement<HTMLButtonElement>("#cancel-story-edit"),
  storyList: requiredElement<HTMLElement>("#story-list"),
  savedStoryCount: requiredElement<HTMLElement>("#saved-story-count"),

  categoryForm: requiredElement<HTMLFormElement>("#category-form"),
  categoryId: requiredElement<HTMLInputElement>("#category-id"),
  categoryName: requiredElement<HTMLInputElement>("#category-name"),
  categoryColor: requiredElement<HTMLInputElement>("#category-color"),
  categoryFormError: requiredElement<HTMLParagraphElement>("#category-form-error"),
  saveCategory: requiredElement<HTMLButtonElement>("#save-category"),
  cancelCategoryEdit: requiredElement<HTMLButtonElement>("#cancel-category-edit"),
  categoryList: requiredElement<HTMLElement>("#category-list"),

  graphNodeForm: requiredElement<HTMLFormElement>("#graph-node-form"),
  graphNodeId: requiredElement<HTMLInputElement>("#graph-node-id"),
  graphNodeName: requiredElement<HTMLInputElement>("#graph-node-name"),
  graphNodeType: requiredElement<HTMLInputElement>("#graph-node-type"),
  graphNodeAlternateNames: requiredElement<HTMLTextAreaElement>("#graph-node-alternate-names"),
  graphNodeIdentifiers: requiredElement<HTMLTextAreaElement>("#graph-node-identifiers"),
  graphNodeSourceIds: requiredElement<HTMLTextAreaElement>("#graph-node-source-ids"),
  graphNodeProperties: requiredElement<HTMLTextAreaElement>("#graph-node-properties"),
  graphNodeError: requiredElement<HTMLParagraphElement>("#graph-node-error"),
  saveGraphNode: requiredElement<HTMLButtonElement>("#save-graph-node"),
  cancelGraphNodeEdit: requiredElement<HTMLButtonElement>("#cancel-graph-node-edit"),
  graphNodeList: requiredElement<HTMLElement>("#graph-node-list"),
  graphNodeCount: requiredElement<HTMLElement>("#graph-node-count"),
  graphPlaceForm: requiredElement<HTMLFormElement>("#graph-place-form"),
  graphPlaceId: requiredElement<HTMLInputElement>("#graph-place-id"),
  graphPlaceName: requiredElement<HTMLInputElement>("#graph-place-name"),
  graphPlaceIdentifier: requiredElement<HTMLInputElement>("#graph-place-identifier"),
  graphPlaceAddress: requiredElement<HTMLInputElement>("#graph-place-address"),
  graphPlaceLatitude: requiredElement<HTMLInputElement>("#graph-place-latitude"),
  graphPlaceLongitude: requiredElement<HTMLInputElement>("#graph-place-longitude"),
  graphPlaceRadius: requiredElement<HTMLInputElement>("#graph-place-radius"),
  graphPlaceIcon: requiredElement<HTMLSelectElement>("#graph-place-icon"),
  graphPlaceMarkerShape: requiredElement<HTMLSelectElement>("#graph-place-marker-shape"),
  graphPlaceMarkerColor: requiredElement<HTMLInputElement>("#graph-place-marker-color"),
  graphPlaceMarkerFillColor: requiredElement<HTMLInputElement>("#graph-place-marker-fill-color"),
  graphPlaceMarkerOpacity: requiredElement<HTMLInputElement>("#graph-place-marker-opacity"),
  graphPlaceMarkerSize: requiredElement<HTMLInputElement>("#graph-place-marker-size"),
  graphPlaceMarkerWeight: requiredElement<HTMLInputElement>("#graph-place-marker-weight"),
  graphPlacePathStroke: requiredElement<HTMLSelectElement>("#graph-place-path-stroke"),
  graphPlacePathColor: requiredElement<HTMLInputElement>("#graph-place-path-color"),
  graphPlacePathWeight: requiredElement<HTMLInputElement>("#graph-place-path-weight"),
  graphPlacePathOpacity: requiredElement<HTMLInputElement>("#graph-place-path-opacity"),
  graphPlacePathDashArray: requiredElement<HTMLInputElement>("#graph-place-path-dash-array"),
  graphPlacePathDashOffset: requiredElement<HTMLInputElement>("#graph-place-path-dash-offset"),
  graphPlacePathLineCap: requiredElement<HTMLSelectElement>("#graph-place-path-line-cap"),
  graphPlacePathLineJoin: requiredElement<HTMLSelectElement>("#graph-place-path-line-join"),
  graphPlaceAreaFill: requiredElement<HTMLSelectElement>("#graph-place-area-fill"),
  graphPlaceAreaFillColor: requiredElement<HTMLInputElement>("#graph-place-area-fill-color"),
  graphPlaceAreaFillOpacity: requiredElement<HTMLInputElement>("#graph-place-area-fill-opacity"),
  graphPlaceAreaFillRule: requiredElement<HTMLSelectElement>("#graph-place-area-fill-rule"),
  graphPlaceArea: requiredElement<HTMLTextAreaElement>("#graph-place-area"),
  graphPlaceError: requiredElement<HTMLParagraphElement>("#graph-place-error"),
  saveGraphPlace: requiredElement<HTMLButtonElement>("#save-graph-place"),
  cancelGraphPlaceEdit: requiredElement<HTMLButtonElement>("#cancel-graph-place-edit"),
  graphPlaceList: requiredElement<HTMLElement>("#graph-place-list"),
  graphPlaceCount: requiredElement<HTMLElement>("#graph-place-count"),
  graphEdgeForm: requiredElement<HTMLFormElement>("#graph-edge-form"),
  graphEdgeId: requiredElement<HTMLInputElement>("#graph-edge-id"),
  graphEdgeSubject: requiredElement<HTMLSelectElement>("#graph-edge-subject"),
  graphEdgePredicate: requiredElement<HTMLInputElement>("#graph-edge-predicate"),
  graphEdgeObject: requiredElement<HTMLSelectElement>("#graph-edge-object"),
  graphEdgePlace: requiredElement<HTMLSelectElement>("#graph-edge-place"),
  graphEdgeItemIds: requiredElement<HTMLSelectElement>("#graph-edge-item-ids"),
  graphEdgeRole: requiredElement<HTMLInputElement>("#graph-edge-role"),
  graphEdgeInitialState: requiredElement<HTMLSelectElement>("#graph-edge-initial-state"),
  graphEdgeSourceIds: requiredElement<HTMLTextAreaElement>("#graph-edge-source-ids"),
  graphEdgeConfidence: requiredElement<HTMLInputElement>("#graph-edge-confidence"),
  graphEdgeProperties: requiredElement<HTMLTextAreaElement>("#graph-edge-properties"),
  graphEdgeTimeKind: requiredElement<HTMLSelectElement>("#graph-edge-time-kind"),
  graphEdgeDateField: requiredElement<HTMLLabelElement>("#graph-edge-date-field"),
  graphEdgeDateRange: requiredElement<HTMLInputElement>("#graph-edge-date-range"),
  graphEdgeCalendarPopover: requiredElement<HTMLElement>("#graph-edge-calendar-popover"),
  graphEdgeCalendarGrid: requiredElement<HTMLElement>("#graph-edge-calendar-grid"),
  graphEdgeCalendarMonth: requiredElement<HTMLElement>("#graph-edge-calendar-month"),
  graphEdgeCalendarYear: requiredElement<HTMLInputElement>("#graph-edge-calendar-year"),
  graphEdgeCalendarPrev: requiredElement<HTMLButtonElement>("#graph-edge-calendar-prev"),
  graphEdgeCalendarNext: requiredElement<HTMLButtonElement>("#graph-edge-calendar-next"),
  graphEdgeCalendarClear: requiredElement<HTMLButtonElement>("#graph-edge-calendar-clear"),
  graphEdgeStartDate: requiredElement<HTMLInputElement>("#graph-edge-start-date"),
  graphEdgeEndDate: requiredElement<HTMLInputElement>("#graph-edge-end-date"),
  graphEdgeError: requiredElement<HTMLParagraphElement>("#graph-edge-error"),
  saveGraphEdge: requiredElement<HTMLButtonElement>("#save-graph-edge"),
  cancelGraphEdgeEdit: requiredElement<HTMLButtonElement>("#cancel-graph-edge-edit"),
  graphEdgeList: requiredElement<HTMLElement>("#graph-edge-list"),
  graphEdgeCount: requiredElement<HTMLElement>("#graph-edge-count"),
  graphViewRoot: requiredElement<HTMLElement>("#temporal-graph-view"),
  graphLens: requiredElement<HTMLElement>("#graph-lens"),
  presentationStage: requiredElement<HTMLElement>("#presentation-stage"),
  presentationFullscreenToggle: requiredElement<HTMLButtonElement>(
    "#presentation-fullscreen-toggle",
  ),
  presentationMapPanel: requiredElement<HTMLElement>("#presentation-map-panel"),
  presentationMap: requiredElement<HTMLElement>("#presentation-map"),
  presentationMapLabel: requiredElement<HTMLElement>("#presentation-map-label"),

  search: requiredElement<HTMLInputElement>("#timeline-search"),
  categoryFilter: requiredElement<HTMLSelectElement>("#category-filter"),
  clearFilters: requiredElement<HTMLButtonElement>("#clear-filters"),
  timelineViewRoot: requiredElement<HTMLElement>("#timeline-view"),
  autoToggle: requiredElement<HTMLButtonElement>("#timeline-auto-toggle"),
  autoSeconds: requiredElement<HTMLInputElement>("#timeline-auto-seconds"),
  autoStatus: requiredElement<HTMLElement>("#timeline-auto-status"),
  storyFocus: requiredElement<HTMLElement>("#story-focus"),
  storyFocusTitle: requiredElement<HTMLElement>("#story-focus-title"),
  storyFocusDescription: requiredElement<HTMLElement>("#story-focus-description"),
  storyFocusPosition: requiredElement<HTMLElement>("#story-focus-position"),
  storyPrev: requiredElement<HTMLButtonElement>("#story-prev"),
  storyNext: requiredElement<HTMLButtonElement>("#story-next"),
  storyExit: requiredElement<HTMLButtonElement>("#story-exit"),
  empty: requiredElement<HTMLElement>("#empty-state"),
  filteredEmpty: requiredElement<HTMLElement>("#filtered-empty-state"),
  list: requiredElement<HTMLElement>("#timeline-list"),
  status: requiredElement<HTMLElement>("#status"),
};

let state = loadState();
let storyDraftIds: string[] = [];
let storyDraftPlaceIds: string[] = [];
const evidenceExtractionDrafts = new Map<string, EvidenceExtractionDraft>();
let itemInferenceDraft: ItemInferenceDraft | null = null;
let inferenceAbortController: AbortController | null = null;
let statusTimer = 0;
let navigationController: NavigationControllerBundle | null = null;
const ui = {
  activePanel: "items",
  search: "",
  categoryFilter: "all",
  activeStoryId: null,
  storyCursor: 0,
  mode: "view",
  editorOpen: false,
  browserOpen: false,
  collapsedCategoryIds: new Set(state.categories.map((category) => category.id)),
};

function decorateSemanticControls() {
  for (const element of els.semanticIconTargets) {
    if (element.querySelector(":scope > .semantic-icon")) continue;
    const iconName = element.dataset.semanticIcon || "note";
    element.prepend(presentation.createIcon(iconName, { size: 22 }));
  }
}

function setSemanticControlIcon(element, iconName, label) {
  if (!element) return;
  const icon = presentation.createIcon(iconName, { size: 22 });
  const currentIcon = element.querySelector(":scope > .semantic-icon");
  if (currentIcon) currentIcon.replaceWith(icon);
  else element.prepend(icon);
  element.dataset.semanticIcon = iconName;
  element.setAttribute("aria-label", label);
  element.title = label;
  const accessibleLabel = element.querySelector(":scope > .sr-only");
  if (accessibleLabel) accessibleLabel.textContent = label;
}

decorateSemanticControls();

const timelineView = globalThis.TimelineView?.create(els.timelineViewRoot) || null;
let temporalGraphView: ReturnType<typeof temporalGraphFactory.create> | null = null;
try {
  temporalGraphView = temporalGraphFactory.create(els.graphViewRoot);
} catch (error) {
  console.error("Failed to initialize TemporalGraphView:", error);
}
const dateRangePicker = dateRangeFactory.create({
  input: els.itemDateRange,
  popover: els.itemCalendarPopover,
  grid: els.itemCalendarGrid,
  heading: els.itemCalendarMonth,
  yearInput: els.itemCalendarYear,
  previousButton: els.itemCalendarPrev,
  nextButton: els.itemCalendarNext,
  clearButton: els.itemCalendarClear,
  startInput: els.itemStartDate,
  endInput: els.itemEndDate,
  mode: "event",
});
const graphEdgeDatePicker = dateRangeFactory.create({
  input: els.graphEdgeDateRange,
  popover: els.graphEdgeCalendarPopover,
  grid: els.graphEdgeCalendarGrid,
  heading: els.graphEdgeCalendarMonth,
  yearInput: els.graphEdgeCalendarYear,
  previousButton: els.graphEdgeCalendarPrev,
  nextButton: els.graphEdgeCalendarNext,
  clearButton: els.graphEdgeCalendarClear,
  startInput: els.graphEdgeStartDate,
  endInput: els.graphEdgeEndDate,
  mode: "range",
});
let presentationResizeObserver: ResizeObserver | null = null;
let viewControlsResizeObserver: ResizeObserver | null = null;
let presentationResizeFrame = 0;
let timelineOrientationBeforeFullscreen = null;
let presentationMap: PresentationMapController | null = null;
let presentationMapKey = "";
let focusedGraphContextAvailable = false;

const presentationMapAnchor = document.createComment("timeline-map-home");
els.presentationMap.after(presentationMapAnchor);

const appToolDockAnchor = document.createComment("timeline-tool-dock-home");
els.appToolDock.after(appToolDockAnchor);

function workspaceToolViewport() {
  const visualViewport = window.visualViewport;
  const layoutWidth = Math.max(
    1,
    document.documentElement.clientWidth || window.innerWidth || visualViewport?.width || 1,
  );
  const layoutHeight = Math.max(
    1,
    document.documentElement.clientHeight || window.innerHeight || visualViewport?.height || 1,
  );
  return {
    width: Math.max(1, Math.min(layoutWidth, visualViewport?.width || layoutWidth)),
    height: Math.max(1, Math.min(layoutHeight, visualViewport?.height || layoutHeight)),
    left: Math.max(0, Math.min(visualViewport?.offsetLeft || 0, layoutWidth - 1)),
    top: Math.max(0, Math.min(visualViewport?.offsetTop || 0, layoutHeight - 1)),
  };
}

function clearViewControlsPosition() {
  if (!els.viewControls) return;
  for (const property of [
    "--view-controls-left",
    "--view-controls-top",
    "--view-controls-right",
    "--view-controls-bottom",
    "--view-controls-inline-size",
    "--view-controls-block-size",
    "width",
    "max-width",
    "max-height",
  ]) {
    els.viewControls.style.removeProperty(property);
  }
}

function positionViewControls() {
  if (!viewControlsAreOpen()) return;

  if (presentationIsFullscreen()) {
    clearViewControlsPosition();
    els.viewControls.dataset.anchorPlacement = "fullscreen";
    return;
  }

  const triggerRect = els.viewControlsToggle.getBoundingClientRect();
  const toolbarRect = els.viewControls.getBoundingClientRect();
  const dockRect = els.appToolDock.getBoundingClientRect();
  const titleRect = els.timelineViewRoot
    .querySelector<HTMLElement>(".timeline-project-heading")
    ?.getBoundingClientRect();
  const viewport = workspaceToolViewport();
  const gap = 8;
  const edge = 8;
  const availableWidth = Math.max(1, viewport.width - edge * 2);
  const availableHeight = Math.max(1, viewport.height - edge * 2);
  const measuredWidth = Math.min(
    availableWidth,
    Math.max(1, toolbarRect.width || els.viewControls.offsetWidth || 1),
  );
  const measuredHeight = Math.min(
    availableHeight,
    Math.max(1, toolbarRect.height || els.viewControls.offsetHeight || 1),
  );
  const anchor = {
    x: triggerRect.left + triggerRect.width / 2,
    y: triggerRect.top + triggerRect.height / 2,
  };

  const candidates = [
    {
      id: "above",
      rect: {
        x: anchor.x - measuredWidth / 2,
        y: dockRect.top - gap - measuredHeight,
        width: Math.min(measuredWidth, Math.max(1, viewport.width - edge * 2)),
        height: Math.min(measuredHeight, Math.max(1, dockRect.top - gap - (viewport.top + edge))),
      },
    },
  ];

  const snapshot = planWorkspacePlacement({
    viewport: {
      x: viewport.left,
      y: viewport.top,
      width: viewport.width,
      height: viewport.height,
      safeInsets: { top: edge, right: edge, bottom: edge, left: edge },
    },
    anchor,
    exclusionZones: [
      {
        id: "app-tool-dock",
        rect: {
          x: dockRect.left,
          y: dockRect.top,
          width: dockRect.width,
          height: dockRect.height,
        },
      },
      ...(titleRect
        ? [
            {
              id: "timeline-project-heading",
              rect: {
                x: titleRect.left,
                y: titleRect.top,
                width: titleRect.width,
                height: titleRect.height,
              },
            },
          ]
        : []),
    ],
    candidates,
  });
  const selected = snapshot.selected;
  if (!selected) return;

  const primaryCandidate = candidates[0];
  if (!primaryCandidate) return;

  const boundedInlineSize = Math.floor(
    Math.min(availableWidth, Math.max(1, primaryCandidate.rect.width)),
  );
  const boundedBlockSize = Math.floor(
    Math.min(availableHeight, Math.max(1, primaryCandidate.rect.height)),
  );

  els.viewControls.style.setProperty("--view-controls-inline-size", `${boundedInlineSize}px`);
  els.viewControls.style.setProperty("--view-controls-block-size", `${boundedBlockSize}px`);
  // Inline size is authoritative over orientation-specific max-content rules.
  els.viewControls.style.width = `${boundedInlineSize}px`;
  els.viewControls.style.maxWidth = `${availableWidth}px`;
  els.viewControls.style.maxHeight = `${availableHeight}px`;

  // Measure the actual border box after applying constraints. Flex content and
  // native top-layer sizing may otherwise make the final box larger than the
  // candidate rect used by the placement planner.
  const constrainedRect = els.viewControls.getBoundingClientRect();
  const actualInlineSize = Math.min(availableWidth, Math.max(1, constrainedRect.width));
  const actualBlockSize = Math.min(availableHeight, Math.max(1, constrainedRect.height));
  const minLeft = viewport.left + edge;
  const minTop = viewport.top + edge;
  const maxLeft = Math.max(minLeft, viewport.left + viewport.width - edge - actualInlineSize);
  const maxTop = Math.max(minTop, viewport.top + viewport.height - edge - actualBlockSize);
  const boundedLeft = Math.min(maxLeft, Math.max(minLeft, anchor.x - actualInlineSize / 2));
  const boundedTop = Math.min(maxTop, Math.max(minTop, dockRect.top - gap - actualBlockSize));

  els.viewControls.dataset.anchorPlacement = selected.id;
  els.viewControls.dataset.placementValid = String(snapshot.fullySatisfiesConstraints);
  els.viewControls.style.setProperty("--view-controls-left", `${Math.round(boundedLeft)}px`);
  els.viewControls.style.setProperty("--view-controls-top", `${Math.round(boundedTop)}px`);
  els.viewControls.style.setProperty("--view-controls-right", "auto");
  els.viewControls.style.setProperty("--view-controls-bottom", "auto");
}

function mountFullscreenToolDock() {
  if (!els.appToolDock || !els.presentationStage) return;
  if (els.appToolDock.parentNode !== els.presentationStage) {
    els.presentationStage.append(els.appToolDock);
  }
}

function restoreToolDock() {
  if (!els.appToolDock || !appToolDockAnchor?.parentNode) return;
  if (els.appToolDock.parentNode !== appToolDockAnchor.parentNode) {
    appToolDockAnchor.parentNode.insertBefore(els.appToolDock, appToolDockAnchor);
  }
}

function restoreMapSurface() {
  if (!els.presentationMap || !presentationMapAnchor?.parentNode) return;
  if (els.presentationMap.parentNode !== presentationMapAnchor.parentNode) {
    presentationMapAnchor.parentNode.insertBefore(els.presentationMap, presentationMapAnchor);
  }
}

function mountMapBackdrop() {
  const slot = els.timelineViewRoot?.querySelector("[data-focus-map-slot]");
  if (!slot || !els.presentationMap) {
    restoreMapSurface();
    return false;
  }
  const moved = els.presentationMap.parentNode !== slot;
  if (moved) slot.replaceChildren(els.presentationMap);
  els.presentationMap.setAttribute("role", "application");
  if (moved) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => presentationMap?.refresh?.());
    });
  }
  return true;
}

function destroyPresentationMap() {
  presentationMap?.destroy?.();
  presentationMap = null;
  presentationMapKey = "";
  restoreMapSurface();
  if (els.presentationMap) {
    els.presentationMap.replaceChildren();
    els.presentationMap.setAttribute("role", "img");
  }
  if (els.presentationMapPanel) els.presentationMapPanel.hidden = true;
}

function focusedPresentationItem() {
  const id = timelineView?.focusedItemId?.();
  return id ? getItem(id) : null;
}

function renderPresentationMap() {
  const item = focusedPresentationItem();
  const mapApi = globalThis.TimelineLocationMap;
  const place = item ? placeForItem(item.id) : null;
  if (!item || !place || !mapApi?.hasRenderableGeometry?.(place)) {
    destroyPresentationMap();
    return false;
  }

  const narrativeExtension = state.extensions?.narrative;
  const spatialReferenceFrame =
    narrativeExtension &&
    typeof narrativeExtension === "object" &&
    !Array.isArray(narrativeExtension)
      ? (narrativeExtension as Record<string, unknown>).spatialReferenceFrame
      : null;
  const fictionalReferenceFrame =
    spatialReferenceFrame &&
    typeof spatialReferenceFrame === "object" &&
    !Array.isArray(spatialReferenceFrame) &&
    (spatialReferenceFrame as Record<string, unknown>).fictional === true;
  const mapKey = JSON.stringify({
    id: item.id,
    place,
    fictionalReferenceFrame,
  });

  if (presentationMap && presentationMapKey === mapKey) {
    if (!mountMapBackdrop()) return false;
    requestAnimationFrame(() => presentationMap?.refresh?.());
    return true;
  }

  destroyPresentationMap();
  if (!mountMapBackdrop()) return false;

  const name = place.name || place.geographicIdentifier || place.address || item.title;
  if (els.presentationMapLabel) els.presentationMapLabel.textContent = name;
  const category = getCategory(item.categoryId);
  presentationMap =
    mapApi.createReadOnly?.({
      container: els.presentationMap,
      location: place,
      color: category?.color || "#315fbd",
      iconName: place.icon || "place",
      markerShape: place.markerShape || "pin",
      label: name,
      interactive: true,
      countryContextIntro: true,
      fictionalReferenceFrame,
    }) || null;
  presentationMapKey = presentationMap ? mapKey : "";
  return Boolean(presentationMap);
}

function syncContextualPresentationPanels() {
  const focused = Boolean(timelineView?.hasFocusedItem?.());
  const mapVisible = focused ? renderPresentationMap() : (destroyPresentationMap(), false);

  if (els.graphLens) els.graphLens.hidden = false;
  if (els.presentationMapPanel) els.presentationMapPanel.hidden = true;

  if (els.presentationStage) {
    els.presentationStage.dataset.eventFocused = String(focused);
    els.presentationStage.dataset.hasContextGraph = String(
      Boolean(focused && focusedGraphContextAvailable),
    );
    els.presentationStage.dataset.hasContextMap = String(Boolean(mapVisible));
  }
  return { graphVisible: Boolean(els.graphLens), mapVisible: Boolean(mapVisible) };
}

function presentationIsFullscreen() {
  return document.fullscreenElement === els.presentationStage;
}

function presentationModeActive() {
  return ui.mode !== "edit";
}

function runApplicationViewTransition(update) {
  const reducedMotion =
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canTransition =
    !reducedMotion &&
    typeof document.startViewTransition === "function" &&
    !document.activeViewTransition;
  if (!canTransition) {
    update();
    return null;
  }
  try {
    return document.startViewTransition(update);
  } catch {
    update();
    return null;
  }
}

function updatePresentationStageLayout() {
  if (!els.presentationStage) return false;
  const rect = els.presentationStage.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const nextShape = presentationLayout.classifyStageShape(width, height, {
    fullscreen: presentationIsFullscreen(),
  });
  const viewportOrientation = presentationLayout.physicalOrientation(width, height);
  if (presentationIsFullscreen() && timelineView?.hasFocusedItem?.()) {
    const fullscreenOrientation = viewportOrientation === "portrait" ? "vertical" : "horizontal";
    timelineView?.setOrientation?.(fullscreenOrientation, { persist: false, focus: false });
  }
  const orientation = timelineView?.getOrientation?.() || "horizontal";
  const changed =
    els.presentationStage.dataset.stageShape !== nextShape ||
    els.presentationStage.dataset.timelineOrientation !== orientation ||
    els.presentationStage.dataset.viewportOrientation !== viewportOrientation;
  els.presentationStage.dataset.stageShape = nextShape;
  els.presentationStage.dataset.timelineOrientation = orientation;
  els.presentationStage.dataset.viewportOrientation = viewportOrientation;
  return changed;
}

function refreshPresentationGeometry({ recenterGraph = false } = {}) {
  updatePresentationStageLayout();
  timelineView?.refreshLayout?.();
  presentationMap?.refresh?.();
  positionViewControls();
  if (recenterGraph) temporalGraphView?.refreshLayout?.();
}

function schedulePresentationGeometryRefresh({ recenterGraph = false } = {}) {
  window.cancelAnimationFrame(presentationResizeFrame);
  presentationResizeFrame = window.requestAnimationFrame(() => {
    presentationResizeFrame = window.requestAnimationFrame(() => {
      refreshPresentationGeometry({ recenterGraph });
    });
  });
}

function syncPresentationFullscreenState() {
  const active = presentationIsFullscreen();
  runApplicationViewTransition(() => {
    els.presentationStage?.classList.toggle("is-fullscreen", active);
    if (active) {
      mountFullscreenToolDock();
    } else {
      restoreToolDock();
      if (timelineOrientationBeforeFullscreen) {
        timelineView?.setOrientation?.(timelineOrientationBeforeFullscreen, {
          persist: false,
          focus: false,
        });
        timelineOrientationBeforeFullscreen = null;
      }
    }
    if (els.presentationFullscreenToggle) {
      const label = active ? "Exit full screen" : "Enter full screen";
      els.presentationFullscreenToggle.setAttribute("aria-pressed", String(active));
      els.presentationFullscreenToggle.setAttribute("aria-label", label);
      els.presentationFullscreenToggle.title = label;
      const srLabel = els.presentationFullscreenToggle.querySelector(".sr-only");
      if (srLabel) srLabel.textContent = label;
      const icon = presentation.createIcon(active ? "minimize" : "fullscreen", { size: 20 });
      const currentIcon = els.presentationFullscreenToggle.querySelector(":scope > .semantic-icon");
      if (currentIcon) currentIcon.replaceWith(icon);
      else els.presentationFullscreenToggle.prepend(icon);
    }
    syncContextualPresentationPanels();
    syncViewControlsChrome();
    temporalGraphView?.setPresentationMode?.(presentationModeActive());
  });
  if (active && timelineView?.hasFocusedItem?.()) {
    requestAnimationFrame(() => {
      timelineView?.ensureFocusPopover?.();
      requestAnimationFrame(() => timelineView?.ensureFocusPopover?.());
    });
  }
  schedulePresentationGeometryRefresh({ recenterGraph: true });
}

async function togglePresentationFullscreen() {
  if (!els.presentationStage) return;
  if (presentationIsFullscreen()) {
    await document.exitFullscreen?.();
    return;
  }
  if (!ensurePresentationFocus()) {
    showStatus("No visible timeline items to present.");
    return;
  }
  if (
    !document.fullscreenEnabled ||
    typeof els.presentationStage.requestFullscreen !== "function"
  ) {
    showStatus("Full-screen presentation is not available in this browser.");
    return;
  }
  timelineOrientationBeforeFullscreen = timelineView?.getOrientation?.() || null;
  syncContextualPresentationPanels();
  try {
    await els.presentationStage.requestFullscreen({ navigationUI: "hide" });
  } catch {
    try {
      await els.presentationStage.requestFullscreen();
    } catch (error) {
      if (timelineOrientationBeforeFullscreen) {
        timelineView?.setOrientation?.(timelineOrientationBeforeFullscreen, {
          persist: false,
          focus: false,
        });
        timelineOrientationBeforeFullscreen = null;
      }
      console.warn("Could not enter full-screen presentation:", error);
      showStatus("Could not enter full-screen presentation.");
    }
  }
}

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
const locationMap =
  globalThis.TimelineLocationMap?.create({
    container: els.itemLocationMap,
    details: els.itemLocationDetails,
    latitude: els.itemLocationLatitude,
    longitude: els.itemLocationLongitude,
    accuracy: els.itemLocationAccuracy,
    source: els.itemLocationSource,
    geolocation: els.itemGeolocation,
    clearButton: els.itemLocationClear,
  }) || null;

function newId(prefix = "id") {
  const random =
    globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseJsonObject(value: unknown, label = "Properties"): Record<string, unknown> {
  const source = String(value || "").trim();
  if (!source) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function parseJsonArray(value: unknown, label = "Identifiers"): unknown[] {
  const source = String(value || "").trim();
  if (!source) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array.`);
  return parsed;
}

function parseLineList(
  value: unknown,
  { maxItems = 48, maxLength = 180 }: { maxItems?: number; maxLength?: number } = {},
): string[] {
  return [
    ...new Set(
      String(value || "")
        .split(/\r?\n/)
        .map((entry) => entry.trim().slice(0, maxLength))
        .filter(Boolean),
    ),
  ].slice(0, maxItems);
}

function normalizeExtensions(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  try {
    return clone(value as Record<string, unknown>);
  } catch {
    return undefined;
  }
}

function parseDate(value) {
  const parsed = temporal.parse(value);
  if (!parsed) return null;
  const sortKey = temporal.sortKey(value);
  if (!Number.isFinite(sortKey)) return null;
  return { ...parsed, sortKey };
}

function formatDateParts(value) {
  const parsed = parseDate(value);
  if (!parsed) return { date: value || "Unknown", time: "" };

  const dateObject = new Date(0);
  dateObject.setUTCFullYear(parsed.year, (parsed.month ?? 1) - 1, parsed.day ?? 1);
  dateObject.setUTCHours(
    parsed.hour || 0,
    parsed.minute || 0,
    parsed.second || 0,
    parsed.millisecond || 0,
  );

  const date = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateObject);

  let time = "";
  if (parsed.hasTime) {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    };
    if (parsed.precision === "second" || parsed.precision === "millisecond")
      options.second = "2-digit";
    if (parsed.precision === "millisecond") options.fractionalSecondDigits = 3;
    time = new Intl.DateTimeFormat(undefined, options).format(dateObject);
  }
  return { date, time };
}

function formatDateInline(value) {
  const parts = formatDateParts(value);
  return parts.time ? `${parts.date}, ${parts.time}` : parts.date;
}

function normalizeColor(value, fallback = "#667085") {
  return typeof value === "string" && COLOR_PATTERN.test(value) ? value.toLowerCase() : fallback;
}

function categoryLabelFromId(id) {
  return String(id || "Category")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 60);
}

function normalizedChoice(value: unknown, allowed: readonly string[], fallback: string): string {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function normalizeTimeline(
  input: TimelineInputRecord | TimelineState,
  { strictGraph = false }: { strictGraph?: boolean } = {},
): TimelineState {
  if (!input || typeof input !== "object") throw new Error("Expected a timeline object.");
  const retainedMigrationExtensions = migration.extensionsWithRetainedV2(input);
  input = graph.migrateLegacySpatialModel(input, spatial) as TimelineInputRecord;

  const categories: CategoryRecord[] = [];
  const categoryIds = new Set<string>();
  const sourceCategories: readonly (CategoryInputRecord | CategoryRecord)[] =
    Array.isArray(input.categories) && input.categories.length
      ? input.categories
      : DEFAULT_CATEGORIES;

  sourceCategories.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const fallbackId = `category-${index + 1}`;
    const id =
      String(raw.id || fallbackId)
        .trim()
        .slice(0, 80) || fallbackId;
    if (categoryIds.has(id)) return;
    const name =
      String(raw.name || categoryLabelFromId(id))
        .trim()
        .slice(0, 60) || categoryLabelFromId(id);
    const category: CategoryRecord = { id, name, color: normalizeColor(raw.color) };
    const extensions = normalizeExtensions(raw.extensions);
    if (extensions) category.extensions = extensions;
    categories.push(category);
    categoryIds.add(id);
  });

  if (!categories.length) {
    for (const category of DEFAULT_CATEGORIES) {
      categories.push({ ...category });
      categoryIds.add(category.id);
    }
  }

  const defaultCategory = categories[0];
  if (!defaultCategory) {
    throw new Error("Timeline normalization requires at least one category.");
  }

  const ensureCategory = (rawId: unknown): string => {
    const candidate =
      String(rawId || defaultCategory.id)
        .trim()
        .slice(0, 80) || defaultCategory.id;
    if (!categoryIds.has(candidate)) {
      categories.push({ id: candidate, name: categoryLabelFromId(candidate), color: "#667085" });
      categoryIds.add(candidate);
    }
    return candidate;
  };

  const evidence = evidenceStore.normalizeRecords(input.evidence);
  const evidenceIds = new Set(evidence.map((record) => record.id));
  const custodyActions = evidenceStore.normalizeCustodyActions(input.custodyActions);
  const reasoning = caseReasoning.normalizeReasoning(input.reasoning);

  const sourceItems: Array<TimelineItemInputRecord | TimelineItemRecord> = Array.isArray(
    input.items,
  )
    ? input.items
    : Array.isArray(input.events)
      ? input.events.map(
          (legacy): TimelineItemInputRecord => ({
            id: legacy.id,
            kind: "event",
            start: legacy.date,
            end: null,
            title: legacy.title,
            description: legacy.description,
            categoryId: legacy.category,
          }),
        )
      : [];

  const items: TimelineItemRecord[] = sourceItems.map((raw, index): TimelineItemRecord => {
    if (!raw || typeof raw !== "object") throw new Error(`Item ${index + 1} is not an object.`);
    const kind = raw.kind === "range" ? "range" : "event";
    const rawStart = raw.time?.start?.value ?? raw.start;
    const rawEnd = kind === "range" ? (raw.time?.end?.value ?? raw.end) : null;
    const start = typeof rawStart === "string" ? rawStart.trim() : "";
    const end = kind === "range" && typeof rawEnd === "string" ? rawEnd.trim() : null;
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
    const time = temporal.normalizeExtent(raw.time, start, end, kind);
    if (!time?.start?.value || !Number.isFinite(temporal.sortKey(time.start))) {
      throw new Error(
        `Item ${index + 1} requires a known, locatable ISO 8601 start value; open or unbounded-unknown chronology starts cannot be placed on the timeline.`,
      );
    }
    if (!title) throw new Error(`Item ${index + 1} is missing a title.`);
    if (kind === "range") {
      if (!time.end?.value || !Number.isFinite(temporal.sortKey(time.end))) {
        throw new Error(
          `Range ${index + 1} requires a known, locatable ISO 8601 end value; open or unbounded-unknown chronology ends are not rendered as finite ranges.`,
        );
      }
      if (temporal.sortKey(time.end) < temporal.sortKey(time.start)) {
        throw new Error(`Range ${index + 1} ends before it starts.`);
      }
    }

    const item: TimelineItemRecord = {
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : newId("item"),
      kind,
      start: time.start.value,
      end: kind === "range" ? (time.end?.value ?? null) : null,
      time,
      title,
      description: typeof raw.description === "string" ? raw.description.slice(0, 2000) : "",
      categoryId: ensureCategory(raw.categoryId || ("category" in raw ? raw.category : undefined)),
      presentation: {
        variant: "hero-split",
        terminalShape: "rounded",
        connectorStyle: "solid",
        connectorRouting: "straight",
        connectorWeight: "normal",
        connectorEndpoint: "none",
        lane: null,
      },
      relationChanges: [],
      evidenceIds: [],
    };
    const media = presentation.normalizeMedia(raw.media);
    const tags = presentation.normalizeTags(raw.tags);
    if (media.length) item.media = media;
    if (tags.length) item.tags = tags;
    const variant = normalizedChoice(
      raw.presentation?.variant,
      ["hero-split", "evidence-dossier", "editorial-mosaic"],
      "hero-split",
    );
    const terminalShape = normalizedChoice(
      raw.presentation?.terminalShape,
      ["rounded", "circle", "square", "diamond"],
      "rounded",
    );
    const connectorStyle = normalizedChoice(
      raw.presentation?.connectorStyle,
      ["solid", "dashed", "dotted"],
      "solid",
    );
    const connectorRouting = normalizedChoice(
      raw.presentation?.connectorRouting,
      ["straight", "orthogonal"],
      "straight",
    );
    const connectorWeight = normalizedChoice(
      raw.presentation?.connectorWeight,
      ["fine", "normal", "strong"],
      "normal",
    );
    const connectorEndpoint = normalizedChoice(
      raw.presentation?.connectorEndpoint,
      ["none", "dot", "arrow"],
      "none",
    );
    const laneCandidate = raw.presentation?.lane;
    const lane =
      laneCandidate === null || laneCandidate === undefined || laneCandidate === ""
        ? null
        : Number.isInteger(Number(laneCandidate)) &&
            Number(laneCandidate) >= 0 &&
            Number(laneCandidate) <= 31
          ? Number(laneCandidate)
          : null;
    item.presentation = {
      variant,
      terminalShape,
      connectorStyle,
      connectorRouting,
      connectorWeight,
      connectorEndpoint,
      lane,
    };
    item.relationChanges = graph.normalizeRelationChanges(raw.relationChanges);
    item.evidenceIds = (Array.isArray(raw.evidenceIds) ? raw.evidenceIds : [])
      .filter((id) => typeof id === "string" && evidenceIds.has(id))
      .slice(0, 12);
    const extensions = normalizeExtensions(raw.extensions);
    if (extensions) item.extensions = extensions;
    return item;
  });

  const itemIds = new Set<string>(items.map((item) => item.id));
  const seenStoryIds = new Set<string>();
  const storyIdsNeedingPlaceInference = new Set<string>();
  const stories = (Array.isArray(input.stories) ? input.stories : []).map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`Story ${index + 1} is not an object.`);
    let id =
      typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : newId("story");
    if (seenStoryIds.has(id)) id = newId("story");
    seenStoryIds.add(id);
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
    if (!title) throw new Error(`Story ${index + 1} is missing a title.`);
    const uniqueIds: string[] = [];
    const seenItems = new Set<string>();
    for (const itemId of Array.isArray(raw.itemIds) ? raw.itemIds : []) {
      if (typeof itemId === "string" && itemIds.has(itemId) && !seenItems.has(itemId)) {
        uniqueIds.push(itemId);
        seenItems.add(itemId);
      }
    }
    const hasExplicitPlaceIds = Array.isArray(raw.placeIds);
    if (!hasExplicitPlaceIds) storyIdsNeedingPlaceInference.add(id);
    const story: StoryRecord = {
      id,
      title,
      description: typeof raw.description === "string" ? raw.description.slice(0, 1500) : "",
      itemIds: uniqueIds,
      placeIds: hasExplicitPlaceIds
        ? [
            ...new Set(
              (raw.placeIds as unknown[])
                .filter(
                  (placeId): placeId is string =>
                    typeof placeId === "string" && Boolean(placeId.trim()),
                )
                .map((placeId) => placeId.trim().slice(0, 120)),
            ),
          ]
        : [],
    };
    const extensions = normalizeExtensions(raw.extensions);
    if (extensions) story.extensions = extensions;
    return story;
  });

  const graphErrors = graph.validateGraphInput({ ...input, items });
  if (strictGraph && graphErrors.length) {
    throw new Error(`Graph semantics are invalid: ${graphErrors[0]}`);
  }
  const graphData = graph.normalizeGraphData(input, temporal);
  const normalizedPlaceIds = new Set(graphData.places.map((place) => String(place.id)));
  for (const story of stories) {
    const inferredPlaceIds = storyIdsNeedingPlaceInference.has(story.id)
      ? graphData.places
          .filter((place) => String(place.attributes?.storyId || "") === story.id)
          .map((place) => String(place.id))
      : [];
    story.placeIds = [...new Set([...(story.placeIds || []), ...inferredPlaceIds])].filter(
      (placeId) => normalizedPlaceIds.has(String(placeId)),
    );
  }
  for (const relationship of graphData.relationships) {
    relationship.itemIds = (relationship.itemIds || []).filter((id) => itemIds.has(String(id)));
  }
  const graphEndpointIds = new Set(graphData.entities.map((entity) => entity.id));
  graphData.relationships = graphData.relationships.filter(
    (relationship) =>
      graphEndpointIds.has(relationship.subjectId) && graphEndpointIds.has(relationship.objectId),
  );
  const relationshipIds = new Set(graphData.relationships.map((relationship) => relationship.id));
  for (const item of items) {
    item.relationChanges = (item.relationChanges || []).filter((change) =>
      relationshipIds.has(change.relationshipId),
    );
  }
  const normalized: TimelineState = {
    version: VERSION,
    title: typeof input.title === "string" ? input.title.slice(0, 120) : "",
    categories,
    items,
    stories,
    entities: graphData.entities,
    places: graphData.places,
    relationships: graphData.relationships,
    evidence,
    custodyActions,
    reasoning,
  };
  const extensions = normalizeExtensions(retainedMigrationExtensions || input.extensions);
  if (extensions) normalized.extensions = extensions;
  return normalized;
}

function blankTimeline(): TimelineState {
  return {
    version: VERSION,
    title: "",
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    items: [],
    stories: [],
    entities: [],
    places: [],
    relationships: [],
    evidence: [],
    custodyActions: [],
    reasoning: caseReasoning.normalizeReasoning({}),
  };
}

function loadState(): TimelineState {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeTimeline(JSON.parse(current));

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = normalizeTimeline(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (error) {
    console.warn("Timeline state could not be restored:", error);
  }
  // A first launch should demonstrate the complete application rather than an empty shell.
  // Persisted current/legacy timelines still take precedence above this sample fallback.
  const sample = getSample();
  if (sample && sample.items && sample.items.length > 0) {
    return normalizeTimeline(clone(sample));
  }
  return blankTimeline();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Timeline state could not be saved:", error);
    showStatus("Changes are visible, but browser storage is unavailable.");
  }
}

function sortItems(items: TimelineItemRecord[] = state.items): TimelineItemRecord[] {
  return [...items].sort((a, b) => {
    const aStart = parseDate(a.start)?.sortKey ?? Number.POSITIVE_INFINITY;
    const bStart = parseDate(b.start)?.sortKey ?? Number.POSITIVE_INFINITY;
    const startDelta = aStart - bStart;
    if (startDelta) return startDelta;
    const aEnd = a.end ? (parseDate(a.end)?.sortKey ?? aStart) : aStart;
    const bEnd = b.end ? (parseDate(b.end)?.sortKey ?? bStart) : bStart;
    return aEnd - bEnd || a.title.localeCompare(b.title);
  });
}

function isTimelineItem(item: TimelineItemRecord | null): item is TimelineItemRecord {
  return item !== null;
}

function isEvidenceRecord(record: EvidenceRecord | undefined): record is EvidenceRecord {
  return record !== undefined;
}

function getCategory(id: string): CategoryRecord {
  const category = state.categories.find((candidate) => candidate.id === id) || state.categories[0];
  if (!category) throw new Error("Timeline state has no category.");
  return category;
}

function getStory(id: string | null): StoryRecord | null {
  return state.stories.find((story) => story.id === id) || null;
}

function getItem(id: string): TimelineItemRecord | null {
  return state.items.find((item) => item.id === id) || null;
}

function entityOrItemName(id: string): string {
  const entity = state.entities.find((candidate) => candidate.id === id);
  if (entity) return entity.name || entity.id;
  const item = getItem(id);
  if (item) return item.title || item.id;
  const story = getStory(id);
  return story?.title || id;
}

function storySpanLabel(story: StoryRecord): string {
  const items = story.itemIds.map(getItem).filter(isTimelineItem);
  if (!items.length) return "empty";
  const starts = items
    .map((item) => temporal.sortKey(item.time?.start || item.start))
    .filter(Number.isFinite);
  const ends = items
    .map((item) =>
      item.end
        ? temporal.sortKey(item.time?.end || item.end)
        : temporal.sortKey(item.time?.start || item.start),
    )
    .filter(Number.isFinite);
  if (!starts.length || !ends.length) return "unknown span";
  const spanMs = Math.max(...ends) - Math.min(...starts);
  const day = 86_400_000;
  if (spanMs < day) return "within one day";
  if (spanMs < day * 60) return `${Math.max(1, Math.round(spanMs / day))} days`;
  if (spanMs < day * 730) return `${Math.max(1, Math.round(spanMs / (day * 30.4375)))} months`;
  return `${(spanMs / (day * 365.2425)).toFixed(1)} years`;
}

function storyMembershipCount(itemId: string): number {
  return state.stories.reduce(
    (count, story) => count + (story.itemIds.includes(itemId) ? 1 : 0),
    0,
  );
}

function getVisibleItems() {
  const activeStory = getStory(ui.activeStoryId);
  let items = activeStory ? activeStory.itemIds.map(getItem).filter(isTimelineItem) : sortItems();

  if (ui.categoryFilter !== "all") {
    items = items.filter((item) => item.categoryId === ui.categoryFilter);
  }
  if (ui.search.trim()) {
    const needle = ui.search.trim().toLocaleLowerCase();
    items = items.filter((item) => {
      const tagText = (item.tags || []).map((tag) => tag.label).join(" ");
      const place = placeForItem(item.id);
      const locationText = place
        ? [place.name, place.geographicIdentifier, place.address].filter(Boolean).join(" ")
        : "";
      const evidenceText = (item.evidenceIds || [])
        .map((id) => state.evidence.find((record) => record.id === id))
        .filter(isEvidenceRecord)
        .map((record) => [record.title, record.sourceName, record.note].filter(Boolean).join(" "))
        .join(" ");
      return `${item.title}\n${item.description}\n${tagText}\n${locationText}\n${evidenceText}`
        .toLocaleLowerCase()
        .includes(needle);
    });
  }
  return items;
}

function setError(element, message = "") {
  element.textContent = message;
  element.hidden = !message;
}

function viewControlsAreOpen() {
  return Boolean(els.viewControls?.matches(":popover-open"));
}

function syncViewControlsChrome() {
  const open = viewControlsAreOpen();
  if (els.appShell) els.appShell.dataset.viewControlsOpen = String(open);
  if (els.viewControlsToggle) els.viewControlsToggle.setAttribute("aria-expanded", String(open));
  return open;
}

function closeViewControls() {
  if (!viewControlsAreOpen()) return;
  try {
    els.viewControls.hidePopover();
  } catch {
    // The native popover may already be transitioning; its toggle event will resync chrome.
  }
}
function syncApplicationSurfaces() {
  if (ui.mode !== "edit") ui.editorOpen = false;
  const editing = ui.mode === "edit";
  const viewControlsOpen = viewControlsAreOpen();
  if (els.appShell) {
    els.appShell.dataset.mode = ui.mode;
    els.appShell.dataset.editorOpen = String(ui.editorOpen);
    els.appShell.dataset.browserOpen = String(ui.browserOpen);
    els.appShell.dataset.graphOpen = "true";
    els.appShell.dataset.viewControlsOpen = String(viewControlsOpen);
  }

  if (els.controlPanel) {
    els.controlPanel.hidden = !ui.editorOpen;
    els.controlPanel.setAttribute("aria-hidden", String(!ui.editorOpen));
  }
  if (els.browserSheet) {
    els.browserSheet.hidden = !ui.browserOpen;
    els.browserSheet.setAttribute("aria-hidden", String(!ui.browserOpen));
  }
  if (els.title) {
    els.title.readOnly = !editing;
    els.title.tabIndex = editing ? 0 : -1;
    els.title.setAttribute("aria-readonly", String(!editing));
  }
  if (els.editorToggle) {
    els.editorToggle.setAttribute("aria-expanded", String(ui.editorOpen));
    els.editorToggle.setAttribute("aria-pressed", String(editing));
    const label = els.editorToggle.querySelector(".app-tool-label");
    if (label) label.textContent = editing ? "Done" : "Edit";
  }
  for (const control of [els.browserToggle, els.viewControlsToggle]) {
    if (control) control.disabled = editing;
  }
  for (const opener of els.panelOpeners) {
    opener.setAttribute("aria-expanded", String(ui.editorOpen));
  }
  if (els.browserToggle) els.browserToggle.setAttribute("aria-expanded", String(ui.browserOpen));
  if (els.viewControlsToggle) {
    els.viewControlsToggle.setAttribute("aria-expanded", String(viewControlsOpen));
  }

  temporalGraphView?.setPresentationMode?.(presentationModeActive());
  syncContextualPresentationPanels();
  schedulePresentationGeometryRefresh({ recenterGraph: true });
}

function closeLargeUtilitySurfaces(except = "") {
  if (except !== "editor") ui.editorOpen = false;
  if (except !== "browser") ui.browserOpen = false;
  if (except !== "view") closeViewControls();
}

function closeFocusedEventForUtility() {
  if (timelineView?.hasFocusedItem?.()) timelineView.closeFocus();
}

function setEditorSurfaceOpen(open) {
  const editing = Boolean(open);
  ui.mode = editing ? "edit" : "view";
  ui.editorOpen = editing;
  if (editing) {
    closeLargeUtilitySurfaces("editor");
    closeProjectMenu();
    closeFocusedEventForUtility();
  }
  syncApplicationSurfaces();
}

function setBrowserSurfaceOpen(open) {
  if (ui.mode === "edit") return;
  ui.browserOpen = Boolean(open);
  if (ui.browserOpen) {
    closeLargeUtilitySurfaces("browser");
    closeProjectMenu();
    closeFocusedEventForUtility();
  }
  syncApplicationSurfaces();
  if (ui.browserOpen) {
    requestAnimationFrame(() => {
      const firstStory = els.browserStoryList?.querySelector<HTMLElement>(".browser-story-card");
      const firstCategory = els.list?.querySelector<HTMLElement>(".timeline-category-summary");
      (firstStory || firstCategory || els.search)?.focus({ preventScroll: true });
    });
  }
}

function setActivePanel(name, { open = true } = {}) {
  ui.activePanel = name;
  const editorLabels = {
    items: "Events & ranges",
    stories: "Stories",
    categories: "Categories",
    graph: "Graph data",
  };
  if (els.editorSurfaceTitle) els.editorSurfaceTitle.textContent = editorLabels[name] || "Edit";
  for (const tab of els.tabs) {
    const active = tab.dataset.panel === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const panel of els.panels) panel.hidden = panel.id !== `panel-${name}`;
  if (open) setEditorSurfaceOpen(true);
}

function renderProjectMeta() {
  if (document.activeElement !== els.title) els.title.value = state.title;
  if (els.heading) els.heading.textContent = "Timeline items";
  els.itemCount.textContent = `${state.items.length} ${state.items.length === 1 ? "item" : "items"}`;
  els.storyCount.textContent = `${state.stories.length} ${state.stories.length === 1 ? "story" : "stories"}`;
  els.categoryCount.textContent = `${state.categories.length} ${state.categories.length === 1 ? "category" : "categories"}`;
}

function fillCategorySelect(
  select: HTMLSelectElement,
  includeAll: boolean,
  selected: string,
): void {
  const options: HTMLOptionElement[] = [];
  if (includeAll) {
    const option = document.createElement("option");
    option.value = "all";
    option.textContent = "All categories";
    options.push(option);
  }
  for (const category of state.categories) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    options.push(option);
  }
  select.replaceChildren(...options);
  const valid = [...select.options].some((option) => option.value === selected);
  select.value = valid ? selected : includeAll ? "all" : state.categories[0]?.id || "";
}

function renderCategoryOptions() {
  const itemSelected = els.itemCategory.value || state.categories[0]?.id || "";
  fillCategorySelect(els.itemCategory, false, itemSelected);
  fillCategorySelect(els.categoryFilter, true, ui.categoryFilter);
}

function renderBrowserStories() {
  if (!els.browserStoryList) return;
  if (els.browserStoryCount) els.browserStoryCount.textContent = String(state.stories.length);

  const cards: HTMLElement[] = state.stories.map((story): HTMLElement => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "browser-story-card";
    card.dataset.action = "focus-story";
    card.dataset.id = story.id;
    card.setAttribute("aria-label", `Focus story ${story.title}`);
    card.setAttribute("aria-current", String(story.id === ui.activeStoryId));

    const title = document.createElement("strong");
    title.textContent = story.title;
    const meta = document.createElement("span");
    meta.className = "browser-story-meta";
    meta.textContent = `${story.itemIds.length} ${story.itemIds.length === 1 ? "step" : "steps"} · ${storySpanLabel(story)}`;
    card.append(title, meta);

    if (story.description) {
      const description = document.createElement("span");
      description.className = "browser-story-description";
      description.textContent = story.description;
      card.append(description);
    }
    return card;
  });

  if (!cards.length) {
    const empty = document.createElement("p");
    empty.className = "browser-story-empty";
    empty.textContent = "No stories yet.";
    cards.push(empty);
  }
  els.browserStoryList.replaceChildren(...cards);
}

function renderTimelineList(visible: TimelineItemRecord[], activeStory: StoryRecord | null): void {
  if (activeStory) {
    const ordered = document.createElement("ol");
    ordered.className = "timeline-category-items story-order";
    ordered.replaceChildren(...visible.map((item) => renderItem(item, activeStory)));
    els.list.replaceChildren(ordered);
    return;
  }

  const groups: HTMLElement[] = [];
  for (const category of state.categories) {
    const items = visible.filter((item) => item.categoryId === category.id);
    if (!items.length) continue;
    const shell = document.createElement("div");
    shell.className = "timeline-category-shell";
    shell.dataset.categoryId = category.id;
    shell.style.setProperty("--category-color", category.color);

    const details = document.createElement("details");
    details.className = "timeline-category-group";
    details.dataset.categoryId = category.id;
    details.open = !ui.collapsedCategoryIds.has(category.id);
    details.style.setProperty("--category-color", category.color);

    const summary = document.createElement("summary");
    summary.className = "timeline-category-summary";
    const identity = document.createElement("span");
    identity.className = "timeline-category-summary-identity";
    const dot = document.createElement("span");
    dot.className = "category-dot";
    const name = document.createElement("strong");
    name.textContent = category.name;
    identity.append(dot, name);
    const count = document.createElement("span");
    count.className = "timeline-category-summary-count";
    count.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
    summary.append(identity, count);

    const list = document.createElement("ol");
    list.className = "timeline-category-items";
    list.replaceChildren(...items.map((item) => renderItem(item, null)));
    details.append(summary, list);
    const focus = actionButton("Focus", "focus-category", `Focus category ${category.name}`);
    focus.classList.add("timeline-category-focus");
    shell.append(details, focus);
    groups.push(shell);
  }
  els.list.replaceChildren(...groups);
}

function renderTimeline() {
  renderBrowserStories();
  const activeStory = getStory(ui.activeStoryId);
  const visible = getVisibleItems();
  els.visibleCount.textContent = `${visible.length} shown`;
  els.empty.hidden = state.items.length > 0;
  els.filteredEmpty.hidden = state.items.length === 0 || visible.length > 0;
  els.list.hidden = visible.length === 0;

  if (activeStory) {
    ui.storyCursor = Math.max(
      0,
      Math.min(ui.storyCursor, Math.max(activeStory.itemIds.length - 1, 0)),
    );
    els.storyFocus.hidden = false;
    els.storyFocusTitle.textContent = activeStory.title;
    els.storyFocusDescription.textContent =
      activeStory.description ||
      "Only the items selected for this story are shown, in narrative order.";
    els.storyFocusPosition.textContent = activeStory.itemIds.length
      ? `${ui.storyCursor + 1} / ${activeStory.itemIds.length}`
      : "0 / 0";
    els.storyPrev.disabled = ui.storyCursor <= 0;
    els.storyNext.disabled = ui.storyCursor >= activeStory.itemIds.length - 1;
  } else {
    els.storyFocus.hidden = true;
  }

  renderTimelineList(visible, activeStory);

  const storyCurrentId = activeStory?.itemIds[ui.storyCursor] || null;
  const graphInput = {
    entities: state.entities,
    relationships: state.relationships,
    items: state.items,
    stories: state.stories,
  };
  const relationshipById = new Map(
    state.relationships.map((relationship) => [relationship.id, relationship]),
  );
  const representedRelationshipIds = new Set(
    state.relationships
      .filter((relationship) =>
        (relationship.itemIds || []).some((itemId) =>
          state.items.some((item) => String(item.id) === String(itemId)),
        ),
      )
      .map((relationship) => String(relationship.id)),
  );
  const relationshipOccurrences = projectTimelineOccurrences({
    entities: state.entities,
    relationships: state.relationships,
  });
  const searchNeedle = ui.search.trim().toLocaleLowerCase();
  const derivedTimelineOccurrences =
    activeStory || ui.categoryFilter !== "all"
      ? []
      : relationshipOccurrences.filter((occurrence) => {
          if (representedRelationshipIds.has(occurrence.relationshipId)) return false;
          if (!searchNeedle) return true;
          return [
            occurrence.title,
            occurrence.predicate,
            occurrence.subjectName,
            occurrence.objectName,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(searchNeedle);
        });

  const allTimelineCoordinates = [
    ...state.items.flatMap((item) => {
      const coordinates = [temporal.sortKey(item.time?.start || item.start)];
      if (item.end || item.time?.end)
        coordinates.push(temporal.sortKey(item.time?.end || item.end));
      return coordinates.filter(Number.isFinite);
    }),
    ...relationshipOccurrences.flatMap((occurrence) =>
      occurrence.end === null ? [occurrence.start] : [occurrence.start, occurrence.end],
    ),
  ].filter(Number.isFinite);

  try {
    timelineView?.setItems(
      [
        ...visible.map((item) => {
          const category = getCategory(item.categoryId);
          const itemTime = temporal.sortKey(item.time?.start || item.start);
          const eventViewport = Number.isFinite(itemTime)
            ? { start: itemTime, end: itemTime }
            : timelineView?.getViewport?.();
          return {
            id: item.id,
            kind: item.kind,
            title: item.title,
            description: item.description,
            categoryName: category.name,
            color: category.color,
            start: temporal.sortKey(item.time?.start || item.start),
            end: item.end ? temporal.sortKey(item.time?.end || item.end) : null,
            startLabel: formatDateInline(item.start),
            endLabel: item.end ? formatDateInline(item.end) : "",
            locationName:
              placeForItem(item.id)?.name || placeForItem(item.id)?.geographicIdentifier || "",
            location: placeForItem(item.id) || null,
            media: item.media || [],
            tags: item.tags || [],
            layoutVariant: item.presentation?.variant || "hero-split",
            terminalShape: item.presentation?.terminalShape || "rounded",
            connectorStyle: item.presentation?.connectorStyle || "solid",
            connectorRouting: item.presentation?.connectorRouting || "straight",
            connectorWeight: item.presentation?.connectorWeight || "normal",
            connectorEndpoint: item.presentation?.connectorEndpoint || "none",
            lane: Number.isInteger(item.presentation?.lane) ? item.presentation.lane : null,
            evidence: (item.evidenceIds || [])
              .map((id) => state.evidence.find((record) => record.id === id))
              .filter(Boolean),
            relations: state.relationships
              .filter((relationship) =>
                (relationship.itemIds || []).some((id) => String(id) === String(item.id)),
              )
              .map((relationship) => ({
                id: relationship.id,
                predicate: relationship.predicate,
                role: relationship.role || "",
                subjectId: relationship.subjectId,
                objectId: relationship.objectId,
                subjectName: entityOrItemName(relationship.subjectId),
                objectName: entityOrItemName(relationship.objectId),
                time: relationship.time || null,
              })),
            relationChanges: (item.relationChanges || []).map((change) => {
              const relationship = relationshipById.get(change.relationshipId);
              return {
                ...change,
                predicate: change.predicate || relationship?.predicate || "",
                subjectName: relationship ? entityOrItemName(relationship.subjectId) : "",
                objectName: relationship ? entityOrItemName(relationship.objectId) : "",
              };
            }),
            graphContext: (() => {
              try {
                return graph.neighborhoodGraph(graphInput, item.id, eventViewport, {
                  depth: 1,
                  limit: 28,
                });
              } catch (error) {
                console.error("Failed to generate neighborhood graph:", error);
                return { nodes: [], edges: [] };
              }
            })(),
          };
        }),
        ...derivedTimelineOccurrences.map((occurrence) => {
          const relationship = relationshipById.get(occurrence.relationshipId);
          const place = occurrence.placeId
            ? state.places.find((candidate) => String(candidate.id) === occurrence.placeId) || null
            : null;
          const eventViewport = {
            start: occurrence.start,
            end: occurrence.end ?? occurrence.start,
          };
          return {
            id: occurrence.occurrenceId,
            kind: occurrence.end === null ? "event" : "range",
            title: occurrence.title,
            description: relationship?.role
              ? `${occurrence.subjectName} ${occurrence.predicate} ${occurrence.objectName} · ${relationship.role}`
              : `${occurrence.subjectName} ${occurrence.predicate} ${occurrence.objectName}`,
            categoryName: "Relation",
            color: "var(--accent)",
            start: occurrence.start,
            end: occurrence.end,
            startLabel: occurrence.startLabel,
            endLabel: occurrence.endLabel,
            locationName: place?.name || place?.geographicIdentifier || "",
            location: place,
            media: [],
            tags: [],
            layoutVariant: "hero-split",
            terminalShape: "rounded",
            connectorStyle: "solid",
            connectorRouting: "straight",
            connectorWeight: "normal",
            connectorEndpoint: "none",
            lane: null,
            editable: false,
            evidence: [],
            relations: relationship
              ? [
                  {
                    id: relationship.id,
                    predicate: relationship.predicate,
                    role: relationship.role || "",
                    subjectId: relationship.subjectId,
                    objectId: relationship.objectId,
                    subjectName: occurrence.subjectName,
                    objectName: occurrence.objectName,
                    time: relationship.time || null,
                  },
                ]
              : [],
            relationChanges: [],
            graphContext: (() => {
              try {
                return graph.neighborhoodGraph(
                  graphInput,
                  occurrence.relationshipId,
                  eventViewport,
                  { depth: 1, limit: 28 },
                );
              } catch (error) {
                console.error("Failed to generate relationship occurrence graph:", error);
                return { nodes: [], edges: [] };
              }
            })(),
          };
        }),
      ],
      {
        focusId: storyCurrentId,
        allCoordinates: allTimelineCoordinates,
        relationships: (() => {
          try {
            return graph.temporalRelationProjection(state.relationships, temporal);
          } catch (error) {
            console.error("Failed to generate temporal relation projection:", error);
            return [];
          }
        })(),
      },
    );
  } catch (error) {
    console.error("Failed to set timeline items:", error);
  }
}

function renderItem(item, activeStory) {
  const category = getCategory(item.categoryId);
  const li = document.createElement("li");
  li.className = `timeline-item${item.kind === "range" ? " is-range" : ""}`;
  li.dataset.id = item.id;
  li.style.setProperty("--category-color", category.color);

  let storyIndex = -1;
  if (activeStory) {
    storyIndex = activeStory.itemIds.indexOf(item.id);
    const currentId = activeStory.itemIds[ui.storyCursor];
    li.classList.toggle("is-current", item.id === currentId);
    li.classList.toggle("story-dimmed", item.id !== currentId);
  }

  const dateWrap = document.createElement("div");
  dateWrap.className = "timeline-date";
  const start = formatDateParts(item.start);
  const startDate = document.createElement("strong");
  startDate.textContent = start.date;
  dateWrap.append(startDate);
  const detail = document.createElement("span");
  if (item.kind === "range") {
    detail.textContent = `${start.time ? `${start.time} · ` : ""}→ ${formatDateInline(item.end)}`;
    detail.className = "range-end";
  } else {
    detail.textContent = start.time;
  }
  if (detail.textContent) dateWrap.append(detail);

  const marker = document.createElement("div");
  marker.className = "timeline-marker";
  marker.setAttribute("aria-hidden", "true");

  const card = document.createElement("article");
  card.className = "timeline-card";

  const top = document.createElement("div");
  top.className = "timeline-card-top";
  const heading = document.createElement("h3");
  heading.textContent = item.title;
  const actions = document.createElement("div");
  actions.className = "card-actions";

  if (activeStory && storyIndex !== ui.storyCursor) {
    const focus = actionButton("Focus", "story-focus", `Focus ${item.title}`);
    focus.dataset.storyIndex = String(storyIndex);
    actions.append(focus);
  }
  actions.append(actionButton("Focus", "focus-item", `Focus ${item.title}`));
  top.append(heading, actions);

  const firstMedia = item.media?.[0];
  if (firstMedia) {
    const thumb = document.createElement("img");
    thumb.className = "timeline-card-media";
    thumb.src = firstMedia.src;
    thumb.alt = firstMedia.alt || "";
    thumb.loading = "lazy";
    card.append(thumb);
  }
  card.append(top);

  if (item.description) {
    const description = document.createElement("p");
    description.textContent = item.description;
    card.append(description);
  }

  const meta = document.createElement("div");
  meta.className = "card-meta";
  const categoryBadge = document.createElement("span");
  categoryBadge.className = "category";
  categoryBadge.style.setProperty("--category-color", category.color);
  categoryBadge.textContent = category.name;
  const kindBadge = document.createElement("span");
  kindBadge.className = "kind-badge";
  kindBadge.textContent = item.kind;
  meta.append(categoryBadge, kindBadge);

  const itemPlace = placeForItem(item.id);
  const locationLabel = itemPlace?.name || itemPlace?.geographicIdentifier;
  if (locationLabel) {
    const placeBadge = document.createElement("span");
    placeBadge.className = "location-badge";
    placeBadge.textContent = locationLabel;
    meta.append(placeBadge);
  }

  for (const tag of item.tags || []) {
    const tagElement = presentation.createTag(tag);
    if (tagElement) meta.append(tagElement);
  }

  const evidenceCount = item.evidenceIds?.length || 0;
  if (evidenceCount) {
    const evidenceBadge = document.createElement("span");
    evidenceBadge.className = "evidence-count-badge";
    evidenceBadge.textContent = `${evidenceCount} ${evidenceCount === 1 ? "source" : "sources"}`;
    meta.append(evidenceBadge);
  }

  if (activeStory && storyIndex >= 0) {
    const step = document.createElement("span");
    step.className = "story-step";
    step.textContent = `Story step ${storyIndex + 1}`;
    meta.append(step);
  } else {
    const memberships = storyMembershipCount(item.id);
    if (memberships) {
      const membership = document.createElement("span");
      membership.className = "story-membership";
      membership.textContent = `In ${memberships} ${memberships === 1 ? "story" : "stories"}`;
      meta.append(membership);
    }
  }
  card.append(meta);
  li.append(dateWrap, marker, card);
  return li;
}

function actionButton(label, action, ariaLabel, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${extraClass}`.trim();
  button.dataset.action = action;
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  return button;
}

function fillTimeZoneOptions() {
  const zones = temporal.supportedTimeZones();
  const options = zones.map((zone) => {
    const option = document.createElement("option");
    option.value = zone;
    return option;
  });
  els.timeZoneOptions.replaceChildren(...options);
}

function configureTemporalEndpoint(prefix) {
  const precision = els[`item${prefix}Precision`].value;
  const timeField = els[`item${prefix}TimeField`];
  const zoneField = els[`item${prefix}ZoneField`];
  const timeInput = els[`item${prefix}Time`];
  const hasClock = !["millennium", "century", "decade", "year", "month", "day"].includes(precision);

  timeField.hidden = !hasClock;
  zoneField.hidden = !hasClock;
  timeInput.required = hasClock;
  timeInput.step = precision === "millisecond" ? "0.001" : precision === "second" ? "1" : "60";

  if (!hasClock) {
    timeInput.value = "";
  } else if (!els[`item${prefix}Zone`].value && localTimeZone) {
    els[`item${prefix}Zone`].value = localTimeZone;
  }
}

function endpointFromForm(prefix) {
  return temporal.buildEndpoint({
    date: els[`item${prefix}Date`].value,
    time: els[`item${prefix}Time`].value,
    precision: els[`item${prefix}Precision`].value,
    certainty: els[`item${prefix}Certainty`].value,
    timeZone: els[`item${prefix}Zone`].value,
  });
}

function setEndpointForm(prefix, endpointOrValue) {
  const parts = temporal.formParts(endpointOrValue);
  els[`item${prefix}Date`].value = parts.date;
  els[`item${prefix}Time`].value = parts.time;
  els[`item${prefix}Precision`].value = parts.precision;
  els[`item${prefix}Certainty`].value = parts.certainty;
  els[`item${prefix}Zone`].value = parts.timeZone;
  configureTemporalEndpoint(prefix);
}

function mediaRowParts(row) {
  const inputs = [...row.querySelectorAll("input")];
  return {
    src: inputs.find((input) => input.type === "url"),
    alt: inputs.find((input) => input.id.endsWith("-alt")),
    caption: inputs.find((input) => input.id.endsWith("-caption")),
  };
}

function tagRowParts(row) {
  return {
    label: row.querySelector('input[type="text"]'),
    icon: row.querySelector("select"),
    hue: row.querySelector('input[type="range"]'),
    output: row.querySelector("output"),
  };
}

function collectMediaForm() {
  const media: MediaRecord[] = [];
  for (const row of els.itemMediaRows) {
    const parts = mediaRowParts(row);
    const src = parts.src.value.trim();
    const alt = parts.alt.value.trim();
    const caption = parts.caption.value.trim();
    if (!src) continue;
    if (!alt) throw new Error("Every event photo needs alt text.");
    media.push({ src, alt, caption });
  }
  const normalized = presentation.normalizeMedia(media);
  if (normalized.length !== media.length) {
    throw new Error("One or more event photo URLs are not supported.");
  }
  return normalized;
}

function fillMediaForm(media) {
  const normalized = presentation.normalizeMedia(media);
  els.itemMediaRows.forEach((row, index) => {
    const parts = mediaRowParts(row);
    const entry = normalized[index];
    parts.src.value = entry?.src || "";
    parts.alt.value = entry?.alt || "";
    parts.caption.value = entry?.caption || "";
  });
  els.itemMediaDetails.open = normalized.length > 0;
}

function collectTagForm() {
  const tags: TagRecord[] = [];
  for (const row of els.itemTagRows) {
    const parts = tagRowParts(row);
    const label = parts.label.value.trim();
    if (!label) continue;
    tags.push({
      label,
      icon: parts.icon.value,
      hue: Number(parts.hue.value),
    });
  }
  return presentation.normalizeTags(tags);
}

function updateTagHuePreview(row) {
  const parts = tagRowParts(row);
  const hue = presentation.normalizeHue(parts.hue.value);
  parts.output.value = `${hue}°`;
  row.style.setProperty("--tag-hue", String(hue));
}

function fillTagForm(tags) {
  const normalized = presentation.normalizeTags(tags);
  els.itemTagRows.forEach((row, index) => {
    const parts = tagRowParts(row);
    const entry = normalized[index];
    parts.label.value = entry?.label || "";
    parts.icon.value = entry?.icon || "note";
    parts.hue.value = String(entry?.hue ?? Number(parts.hue.defaultValue || 30));
    updateTagHuePreview(row);
  });
  els.itemTagsDetails.open = normalized.length > 0;
}

function relationChangeRowParts(row: HTMLElement) {
  return {
    relationship: requiredDescendant<HTMLSelectElement>(row, 'select[id$="-relation"]'),
    operation: requiredDescendant<HTMLSelectElement>(row, 'select[id$="-operation"]'),
    predicate: requiredDescendant<HTMLInputElement>(row, 'input[id$="-predicate"]'),
    role: requiredDescendant<HTMLInputElement>(row, 'input[id$="-role"]'),
    properties: requiredDescendant<HTMLTextAreaElement>(row, 'textarea[id$="-properties"]'),
  };
}

function fillRelationChangeOptions(select, selected = "") {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "No relation change";
  const options = [placeholder];
  for (const relationship of state.relationships) {
    const option = document.createElement("option");
    option.value = relationship.id;
    option.textContent = `${entityOrItemName(relationship.subjectId)} —${relationship.predicate}→ ${entityOrItemName(relationship.objectId)}`;
    options.push(option);
  }
  select.replaceChildren(...options);
  select.value = options.some((option) => option.value === selected) ? selected : "";
}

function collectRelationChangeForm() {
  const changes: RelationChangeRecord[] = [];
  const seen = new Set();
  for (const row of els.itemRelationChangeRows) {
    const parts = relationChangeRowParts(row);
    const relationshipId = parts.relationship.value;
    if (!relationshipId) continue;
    if (seen.has(relationshipId))
      throw new Error("An event can define only one change per relation.");
    seen.add(relationshipId);
    const operation = ["activate", "deactivate", "update"].includes(parts.operation.value)
      ? parts.operation.value
      : "update";
    const change = {
      relationshipId,
      operation,
      predicate: "",
      role: "",
      properties: {},
    };
    if (operation === "update") {
      change.predicate = parts.predicate.value.trim().slice(0, 120);
      if (change.predicate) {
        const predicateValidation = graph.validateActionPredicate(change.predicate);
        if (!predicateValidation.valid) throw new Error(predicateValidation.message);
      }
      change.role = parts.role.value.trim().slice(0, 120);
      change.properties = parseJsonObject(parts.properties.value, "Relation property patch");
      const duplicateContextKey = Object.keys(change.properties).find(graph.contextPropertyKey);
      if (duplicateContextKey) {
        throw new Error(
          `Relation property “${duplicateContextKey}” duplicates structured context. Time and place must use the edge's canonical fields.`,
        );
      }
    }
    changes.push(change);
  }
  const existing = getItem(els.itemId.value)?.relationChanges || [];
  const overflow = existing.slice(els.itemRelationChangeRows.length);
  return graph.normalizeRelationChanges([...changes, ...overflow]);
}

function fillRelationChangeForm(item) {
  const changes = graph.normalizeRelationChanges(item?.relationChanges);
  els.itemRelationChangeRows.forEach((row, index) => {
    const parts = relationChangeRowParts(row);
    const change = changes[index];
    fillRelationChangeOptions(parts.relationship, change?.relationshipId || "");
    parts.operation.value = change?.operation || "activate";
    parts.predicate.value = change?.predicate || "";
    parts.role.value = change?.role || "";
    parts.properties.value = JSON.stringify(change?.properties || {}, null, 2);
  });
  els.itemRelationChangesDetails.open = changes.length > 0;
}

function evidenceRowParts(row) {
  return {
    id: row.querySelector('input[type="hidden"]'),
    type: row.querySelector("select"),
    title: row.querySelector('input[id$="-title"]'),
    sourceName: row.querySelector('input[id$="-source"]'),
    publishedAt: row.querySelector('input[id$="-published"]'),
    url: row.querySelector('input[type="url"]'),
    note: row.querySelector("textarea"),
    file: row.querySelector('input[type="file"]'),
    fileStatus: row.querySelector(".evidence-file-status"),
    extractText: row.querySelector(".evidence-extract-text"),
    extractionStatus: row.querySelector(".evidence-extraction-status"),
    extractionPreview: row.querySelector(".evidence-extraction-preview"),
    extractionText: row.querySelector(".evidence-extraction-preview pre"),
  };
}

function supportedEvidenceFile(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase();
  const name = "name" in file ? String(file.name || "") : "";
  return (
    mime === "application/pdf" ||
    mime.startsWith("image/") ||
    /\.(?:pdf|png|jpe?g|webp|gif)$/i.test(name)
  );
}

function evidenceExtractionLabel(extraction) {
  if (!extraction) return "No extracted text";
  const segments = extraction.segments || [];
  const native = segments.filter((segment) => segment.method === "pdf-text").length;
  const ocr = segments.length - native;
  const parts = [
    `${segments.length} ${segments.length === 1 ? "segment" : "segments"}`,
    native ? `${native} embedded-text` : "",
    ocr ? `${ocr} OCR` : "",
  ].filter(Boolean);
  if (extraction.unresolved?.length) {
    parts.push(`${extraction.unresolved.length} unresolved`);
  }
  return parts.join(" · ");
}

function renderEvidenceExtraction(parts, extraction) {
  if (!parts.extractionStatus || !parts.extractionPreview || !parts.extractionText) return;
  parts.extractionStatus.textContent = extraction ? evidenceExtractionLabel(extraction) : "";
  const lines: string[] = [];
  for (const segment of extraction?.segments || []) {
    const locator =
      segment.locator?.kind === "page"
        ? `Page ${segment.locator.page}`
        : `Image ${segment.locator?.index || 1}`;
    lines.push(`[${locator} · ${segment.method}]\n${segment.text}`);
  }
  for (const unresolved of extraction?.unresolved || []) {
    const locator =
      unresolved.locator?.kind === "page"
        ? `Page ${unresolved.locator.page}`
        : `Image ${unresolved.locator?.index || 1}`;
    lines.push(`[${locator} · unresolved]\n${unresolved.reason}`);
  }
  parts.extractionText.textContent = lines.join("\n\n");
  parts.extractionPreview.hidden = !lines.length;
}

async function evidenceBlobForRow(row) {
  const parts = evidenceRowParts(row);
  const selected = parts.file.files?.[0] || null;
  if (selected) {
    return { blob: selected, fileName: selected.name, mimeType: selected.type };
  }
  const id = parts.id.value.trim();
  const existing = state.evidence.find((record) => record.id === id);
  if (!existing?.file?.blobKey) return null;
  const blob = await evidenceStore.getBlob(existing.file.blobKey);
  return blob
    ? {
        blob,
        fileName: existing.file.name || "",
        mimeType: existing.file.mimeType || blob.type || "",
      }
    : null;
}

async function extractEvidenceRow(row, { quiet = false } = {}) {
  const parts = evidenceRowParts(row);
  const title = parts.title.value.trim();
  if (!title) {
    if (!quiet) setError(els.itemFormError, "Add an evidence title before extracting text.");
    return null;
  }
  if (!parts.id.value) parts.id.value = newId("evidence");
  const id = parts.id.value;
  const source = await evidenceBlobForRow(row);
  if (!source) {
    if (!quiet) setError(els.itemFormError, "Attach a PDF or image before extracting text.");
    return null;
  }
  if (!supportedEvidenceFile(source.blob)) {
    if (!quiet) setError(els.itemFormError, "Text extraction supports PDF and image evidence.");
    return null;
  }
  if (!evidenceExtraction?.extract) {
    const message = "Evidence extraction is unavailable in this build.";
    if (parts.extractionStatus) parts.extractionStatus.textContent = message;
    if (!quiet) setError(els.itemFormError, message);
    return null;
  }

  if (parts.extractText) parts.extractText.disabled = true;
  if (parts.extractionStatus) parts.extractionStatus.textContent = "Preparing extraction…";
  try {
    const extraction = await evidenceExtraction.extract(source.blob, {
      mimeType: source.mimeType || source.blob.type,
      fileName: source.fileName,
      onProgress(progress) {
        if (!parts.extractionStatus) return;
        if (progress.phase === "pdf-page") {
          parts.extractionStatus.textContent = `Reading page ${progress.page} of ${progress.total}…`;
        } else if (progress.phase === "model-download") {
          parts.extractionStatus.textContent = `Preparing local vision model… ${Math.round((progress.loaded || 0) * 100)}%`;
        } else if (progress.phase === "ocr") {
          parts.extractionStatus.textContent =
            progress.method === "text-detector"
              ? "Running native OCR…"
              : "Running built-in AI OCR…";
        } else {
          parts.extractionStatus.textContent = "Extracting text…";
        }
      },
    });
    if (extraction) {
      evidenceExtractionDrafts.set(id, extraction);
      renderEvidenceExtraction(parts, extraction);
      markInferenceStale();
    } else {
      evidenceExtractionDrafts.delete(id);
      renderEvidenceExtraction(parts, null);
    }
    return extraction;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evidence text extraction failed.";
    if (parts.extractionStatus) parts.extractionStatus.textContent = message;
    if (!quiet) setError(els.itemFormError, message);
    return null;
  } finally {
    if (parts.extractText) parts.extractText.disabled = false;
  }
}

async function ensureEvidenceExtractionForInference() {
  for (const row of els.itemEvidenceRows) {
    const parts = evidenceRowParts(row);
    if (!parts.title.value.trim()) continue;
    if (!parts.id.value && parts.file.files?.[0]) parts.id.value = newId("evidence");
    const id = parts.id.value.trim();
    if (!id) continue;
    const existing = state.evidence.find((record) => record.id === id);
    const hasNewFile = Boolean(parts.file.files?.[0]);
    const extraction = hasNewFile
      ? evidenceExtractionDrafts.get(id)
      : evidenceExtractionDrafts.get(id) || existing?.extraction || null;
    const hasFile = hasNewFile || Boolean(existing?.file?.blobKey);
    if (hasFile && !extraction) await extractEvidenceRow(row, { quiet: true });
  }
}

async function collectEvidenceForm() {
  const records: EvidenceRecord[] = [];
  for (const row of els.itemEvidenceRows) {
    const parts = evidenceRowParts(row);
    const title = parts.title.value.trim();
    if (!title) continue;
    const id = parts.id.value || newId("evidence");
    parts.id.value = id;
    const existing = state.evidence.find((record) => record.id === id);
    const file = parts.file.files?.[0] || null;
    let fileMetadata = existing?.file || null;
    if (file) {
      if (!supportedEvidenceFile(file)) {
        throw new Error("Evidence uploads must be PDF or image files.");
      }
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
      const sizeLimit = isPdf ? 25_000_000 : 15_000_000;
      if (file.size > sizeLimit) {
        throw new Error(
          `Evidence files are limited to ${Math.round(sizeLimit / 1_000_000)} MB for this format.`,
        );
      }
      const blobKey = `evidence:${id}`;
      await evidenceStore.putBlob(blobKey, file);
      fileMetadata = {
        blobKey,
        name: file.name.slice(0, 260),
        mimeType: file.type || (parts.type.value === "image" ? "image/*" : "application/pdf"),
        size: file.size,
      };
    }
    const extraction =
      evidenceExtractionDrafts.get(id) || (file ? null : existing?.extraction || null);
    const record = evidenceStore.normalizeRecord({
      id,
      type: parts.type.value,
      title,
      sourceName: parts.sourceName.value,
      publishedAt: parts.publishedAt.value,
      url: parts.url.value,
      note: parts.note.value,
      file: fileMetadata,
      forensic: existing?.forensic || null,
      extraction,
    });
    if (record) records.push(record);
  }
  return records;
}

function fillEvidenceForm(item) {
  evidenceExtractionDrafts.clear();
  const attached = (item?.evidenceIds || [])
    .map((id) => state.evidence.find((record) => record.id === id))
    .filter(Boolean)
    .slice(0, els.itemEvidenceRows.length);
  els.itemEvidenceRows.forEach((row, index) => {
    const parts = evidenceRowParts(row);
    const record = attached[index];
    parts.id.value = record?.id || "";
    parts.type.value = record?.type || "article";
    parts.title.value = record?.title || "";
    parts.sourceName.value = record?.sourceName || "";
    parts.publishedAt.value = record?.publishedAt || "";
    parts.url.value = record?.url || "";
    parts.note.value = record?.note || "";
    parts.file.value = "";
    parts.fileStatus.textContent = record?.file?.name ? `Stored locally: ${record.file.name}` : "";
    if (record?.extraction) evidenceExtractionDrafts.set(record.id, record.extraction);
    renderEvidenceExtraction(parts, record?.extraction || null);
  });
  els.itemEvidenceDetails.open = attached.length > 0;
}

function inferenceStoryIds(itemId) {
  if (!itemId) return [];
  return state.stories
    .filter((story) => (story.itemIds || []).some((id) => String(id) === String(itemId)))
    .map((story) => story.id);
}

function inferenceEventTime() {
  if (!els.itemStartDate.value) return null;
  try {
    const start = endpointFromForm("Start");
    const isRange = els.itemKind.value === "range" && Boolean(els.itemEndDate.value);
    const end = isRange ? endpointFromForm("End") : null;
    return {
      type: isRange ? "interval" : "instant",
      start,
      end,
    };
  } catch {
    return null;
  }
}

function ensureInferenceEvidenceIds() {
  for (const row of els.itemEvidenceRows) {
    const parts = evidenceRowParts(row);
    const title = parts.title.value.trim();
    const existing = parts.id.value
      ? state.evidence.find((record) => record.id === parts.id.value)
      : null;
    const hasSemanticContent =
      Boolean(parts.note.value.trim()) ||
      Boolean(parts.file.files?.[0]) ||
      Boolean(existing?.file?.blobKey) ||
      Boolean(parts.id.value && evidenceExtractionDrafts.get(parts.id.value));
    if (!title || !hasSemanticContent) continue;
    if (!parts.id.value) parts.id.value = newId("evidence");
  }
}

function inferenceInputFromForm({ ensureIds = true } = {}) {
  if (ensureIds && !els.itemId.value) els.itemId.value = newId("item");
  if (ensureIds) ensureInferenceEvidenceIds();

  const fragments: Array<{ ref: string; kind: string; text: string }> = [];
  const addFragment = (ref, kind, value) => {
    const content = String(value || "").trim();
    if (content) fragments.push({ ref, kind, text: content });
  };

  addFragment("event:title", "event-title", els.itemTitle.value);
  addFragment("event:description", "event-description", els.itemDescription.value);

  els.itemMediaRows.forEach((row, index) => {
    const parts = mediaRowParts(row);
    addFragment(`media:${index + 1}:alt`, "media-alt", parts.alt.value);
  });

  els.itemEvidenceRows.forEach((row) => {
    const parts = evidenceRowParts(row);
    const id = parts.id.value.trim();
    const title = parts.title.value.trim();
    if (!id || !title) return;
    addFragment(`evidence:${id}:note`, "evidence-note", parts.note.value);
    const existing = state.evidence.find((record) => record.id === id);
    const extraction = evidenceExtractionDrafts.get(id) || existing?.extraction || null;
    for (const segment of extraction?.segments || []) {
      const locator =
        segment.locator?.kind === "page"
          ? `page:${segment.locator.page}`
          : `image:${segment.locator?.index || 1}`;
      addFragment(
        `evidence:${id}:${locator}`,
        segment.method === "pdf-text" ? "evidence-pdf-text" : "evidence-ocr",
        segment.text,
      );
    }
  });

  const locationParts = [
    els.itemLocationName.value.trim() ? `Name: ${els.itemLocationName.value.trim()}` : "",
    els.itemLocationIdentifier.value.trim()
      ? `Geographic identifier: ${els.itemLocationIdentifier.value.trim()}`
      : "",
    els.itemLocationAddress.value.trim() ? `Address: ${els.itemLocationAddress.value.trim()}` : "",
  ];
  const latitude = els.itemLocationLatitude.value.trim();
  const longitude = els.itemLocationLongitude.value.trim();
  if (latitude && longitude) locationParts.push(`Coordinates: ${latitude}, ${longitude}`);
  addFragment("location:form", "explicit-location", locationParts.filter(Boolean).join("\n"));

  const itemId = els.itemId.value.trim();
  const time = inferenceEventTime();
  return {
    graphContractVersion:
      graph.GRAPH_CONTRACT_VERSION || graph.getGraphContract?.().version || "unknown",
    event: {
      id: itemId,
      start: time?.start?.value || els.itemStartDate.value || "",
      end: time?.end?.value || els.itemEndDate.value || "",
      time,
      storyIds: inferenceStoryIds(itemId),
    },
    fragments,
    existingEntities: state.entities,
    existingPlaces: state.places,
    existingRelationships: state.relationships,
  };
}

function inferenceStatus(message, kind = "") {
  if (!els.itemInferenceStatus) return;
  els.itemInferenceStatus.textContent = message;
  els.itemInferenceStatus.dataset.kind = kind;
}

function clearInferenceDraft({ keepAvailability = false } = {}) {
  inferenceAbortController?.abort();
  inferenceAbortController = null;
  itemInferenceDraft = null;
  els.itemInferenceResults?.replaceChildren();
  if (els.itemInferenceClear) els.itemInferenceClear.hidden = true;
  if (els.itemInferenceDetails) delete els.itemInferenceDetails.dataset.stale;
  if (!keepAvailability) void syncInferenceAvailability();
}

function inferenceMeta(parts) {
  const meta = document.createElement("span");
  meta.className = "inference-candidate-meta";
  meta.textContent = parts.filter(Boolean).join(" · ");
  return meta;
}

function inferenceSources(sourceRefs) {
  const refs = Array.isArray(sourceRefs) ? sourceRefs : [];
  return refs.length ? `Sources: ${refs.join(", ")}` : "No source reference returned";
}

function renderInferenceDraft() {
  const proposal = itemInferenceDraft?.proposal;
  if (!proposal || !els.itemInferenceResults) return;
  const elements: HTMLElement[] = [];

  const summary = document.createElement("p");
  summary.className = "inference-summary";
  summary.textContent = `${proposal.entities.length} entities · ${proposal.places.length} places · ${proposal.relationships.length} actions`;
  elements.push(summary);

  if (proposal.entities.length) {
    const heading = document.createElement("h4");
    heading.textContent = "Entities";
    elements.push(heading);
    for (const candidate of proposal.entities) {
      const row = document.createElement("div");
      row.className = "inference-candidate";
      const title = document.createElement("strong");
      title.textContent = candidate.name;
      row.append(
        title,
        inferenceMeta([
          candidate.status === "existing" ? "Existing node" : "New node",
          candidate.type,
          `${Math.round(candidate.confidence * 100)}% confidence`,
        ]),
      );
      const support = document.createElement("small");
      support.textContent = `${inferenceSources(candidate.sourceRefs)}${candidate.rationale ? ` · ${candidate.rationale}` : ""}`;
      row.append(support);
      elements.push(row);
    }
  }

  if (proposal.places.length) {
    const heading = document.createElement("h4");
    heading.textContent = "Places";
    elements.push(heading);
    for (const candidate of proposal.places) {
      const row = document.createElement("div");
      row.className = "inference-candidate";
      const title = document.createElement("strong");
      title.textContent = candidate.name;
      const status =
        candidate.status === "existing"
          ? "Existing place"
          : candidate.status === "new"
            ? "New place with explicit coordinates"
            : "Needs coordinates before it can become a canonical place";
      row.append(
        title,
        inferenceMeta([status, `${Math.round(candidate.confidence * 100)}% confidence`]),
      );
      const support = document.createElement("small");
      support.textContent = `${[candidate.geographicIdentifier, candidate.address].filter(Boolean).join(" · ")}${candidate.rationale ? ` · ${candidate.rationale}` : ""}`;
      row.append(support);
      elements.push(row);
    }
  }

  if (proposal.relationships.length) {
    const heading = document.createElement("h4");
    heading.textContent = "Actions to apply on save";
    elements.push(heading);
    const entityByKey = new Map<string, (typeof proposal.entities)[number]>(
      proposal.entities.map((candidate): [string, (typeof proposal.entities)[number]] => [
        String(candidate.key),
        candidate,
      ]),
    );
    for (const candidate of proposal.relationships) {
      const label = document.createElement("label");
      label.className = "inference-action-candidate";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.inferenceRelationship = candidate.key;
      checkbox.checked = Boolean(candidate.selectedByDefault);
      checkbox.disabled = candidate.status === "mirrored";
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      const subject = entityByKey.get(candidate.subjectKey)?.name || candidate.subjectKey;
      const object = entityByKey.get(candidate.objectKey)?.name || candidate.objectKey;
      title.textContent = `${subject} —${candidate.predicate}→ ${object}`;
      const status =
        candidate.status === "merge"
          ? "Merge context into existing action"
          : candidate.status === "mirrored"
            ? "Rejected mirrored action"
            : "New action";
      copy.append(
        title,
        inferenceMeta([status, `${Math.round(candidate.confidence * 100)}% confidence`]),
      );
      const support = document.createElement("small");
      support.textContent = `${inferenceSources(candidate.sourceRefs)}${candidate.rationale ? ` · ${candidate.rationale}` : ""}`;
      copy.append(support);
      label.append(checkbox, copy);
      elements.push(label);
    }
  }

  if (proposal.unresolved.length) {
    const heading = document.createElement("h4");
    heading.textContent = "Needs review";
    elements.push(heading);
    const list = document.createElement("ul");
    list.className = "inference-unresolved";
    for (const entry of proposal.unresolved) {
      const item = document.createElement("li");
      item.textContent = `${entry.label || entry.kind}: ${entry.reason}`;
      list.append(item);
    }
    elements.push(list);
  }

  els.itemInferenceResults.replaceChildren(...elements);
  if (els.itemInferenceDetails) els.itemInferenceDetails.open = true;
  if (els.itemInferenceClear) els.itemInferenceClear.hidden = false;
}

function selectedInferenceRelationshipKeys() {
  return [
    ...(els.itemInferenceResults?.querySelectorAll<HTMLInputElement>(
      "input[data-inference-relationship]:checked",
    ) || []),
  ]
    .map((input) => input.dataset.inferenceRelationship)
    .filter((key): key is string => Boolean(key));
}

async function syncInferenceAvailability() {
  if (!els.itemInferenceRun) return;
  if (!graphInference?.availability) {
    els.itemInferenceRun.disabled = true;
    inferenceStatus("Built-in AI inference is unavailable in this build.", "unavailable");
    return;
  }
  const result = await graphInference.availability();
  els.itemInferenceRun.disabled = !result.available;
  if (!result.available) {
    inferenceStatus(result.reason || "Built-in AI is unavailable in this browser.", "unavailable");
    return;
  }
  const message =
    result.state === "available"
      ? "Built-in AI is ready. Inference stays on-device."
      : result.state === "downloading"
        ? "Built-in AI model is downloading."
        : "Built-in AI is available; the browser may download its local model on first use.";
  inferenceStatus(message, result.state);
}

async function runItemInference() {
  setError(els.itemFormError);
  ensureInferenceEvidenceIds();
  await ensureEvidenceExtractionForInference();
  const input = inferenceInputFromForm({ ensureIds: true });
  if (!input.fragments.length) {
    setError(
      els.itemFormError,
      "Add a title, description, image description, evidence note/file, or explicit location before inference.",
    );
    return;
  }
  const availability = await graphInference.availability();
  if (!availability.available) {
    inferenceStatus(availability.reason || "Built-in AI is unavailable.", "unavailable");
    return;
  }

  inferenceAbortController?.abort();
  inferenceAbortController = new AbortController();
  els.itemInferenceRun.disabled = true;
  inferenceStatus(
    availability.state === "available"
      ? "Extracting graph candidates with the built-in model…"
      : "Preparing the browser's built-in model…",
    "running",
  );

  try {
    const raw = await graphInference.infer(input, {
      signal: inferenceAbortController.signal,
      onDownloadProgress(progress) {
        inferenceStatus(
          `Downloading built-in model… ${Math.round(progress * 100)}%`,
          "downloading",
        );
      },
    });
    const proposal = graphInference.reconcileProposal(raw, input, {
      graph,
      spatial,
      idFactory: newId,
    });
    itemInferenceDraft = {
      fingerprint: graphInference.fingerprint(input),
      graphContractVersion: input.graphContractVersion,
      proposal,
    };
    renderInferenceDraft();
    inferenceStatus(
      `Inference ready: ${proposal.relationships.length} action ${proposal.relationships.length === 1 ? "candidate" : "candidates"}. Review selections, then save the item.`,
      "ready",
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.warn("Built-in graph inference failed:", error);
    inferenceStatus(
      error instanceof Error ? error.message : "Built-in graph inference failed.",
      "error",
    );
  } finally {
    inferenceAbortController = null;
    await syncInferenceAvailability();
  }
}

function markInferenceStale(event: Event | null = null) {
  if (
    event?.target instanceof HTMLInputElement &&
    event.target.dataset.inferenceRelationship !== undefined
  ) {
    return;
  }
  if (!itemInferenceDraft || !els.itemInferenceDetails) return;
  els.itemInferenceDetails.dataset.stale = "true";
  inferenceStatus(
    "Event context changed after inference. Rerun or clear inference before saving inferred graph facts.",
    "stale",
  );
}

function resetLocationForm() {
  els.itemLocationName.value = "";
  els.itemLocationIdentifier.value = "";
  els.itemLocationAddress.value = "";
  els.itemLocationLatitude.value = "";
  els.itemLocationLongitude.value = "";
  els.itemLocationSource.value = "manual";
  els.itemLocationAccuracy.value = "";
  els.itemLocationDetails.open = false;
  locationMap?.clear?.();
}

function fillLocationForm(location) {
  const parts = spatial.formParts(location);
  els.itemLocationName.value = String(parts.name ?? "");
  els.itemLocationIdentifier.value = String(parts.geographicIdentifier ?? "");
  els.itemLocationAddress.value = String(parts.address ?? "");
  els.itemLocationLatitude.value = String(parts.latitude ?? "");
  els.itemLocationLongitude.value = String(parts.longitude ?? "");
  els.itemLocationSource.value = String(parts.source ?? "");
  els.itemLocationAccuracy.value = String(parts.accuracyMeters ?? "");
  els.itemLocationDetails.open = Boolean(location);
  if (location) locationMap?.refresh();
}

function resetItemForm() {
  clearInferenceDraft();
  els.itemForm.reset();
  els.itemId.value = "";
  els.itemKind.value = "event";
  dateRangePicker.setMode("event");
  dateRangePicker.clear();
  els.endField.hidden = true;
  els.itemStartPrecision.value = "day";
  els.itemEndPrecision.value = "day";
  els.itemStartCertainty.value = "exact";
  els.itemEndCertainty.value = "exact";
  els.itemStartZone.value = localTimeZone;
  els.itemEndZone.value = localTimeZone;
  configureTemporalEndpoint("Start");
  configureTemporalEndpoint("End");
  fillMediaForm([]);
  fillTagForm([]);
  fillRelationChangeForm(null);
  fillEvidenceForm(null);
  els.itemLayoutVariant.value = "hero-split";
  els.itemTerminalShape.value = "rounded";
  els.itemConnectorStyle.value = "solid";
  els.itemConnectorRouting.value = "straight";
  els.itemConnectorWeight.value = "normal";
  els.itemConnectorEndpoint.value = "none";
  els.itemLane.value = "";
  resetLocationForm();
  fillCategorySelect(els.itemCategory, false, state.categories[0]?.id || "");
  els.saveItem.textContent = "Add item";
  els.cancelItemEdit.hidden = true;
  els.deleteItemEdit.hidden = true;
  setError(els.itemFormError);
}

function beginItemEdit(id) {
  const item = getItem(id);
  if (!item) return;
  clearInferenceDraft();
  setActivePanel("items");
  els.itemId.value = item.id;
  els.itemKind.value = item.kind;
  dateRangePicker.setMode(item.kind);
  setEndpointForm("Start", item.time?.start || item.start);
  setEndpointForm("End", item.time?.end || item.end || "");
  const startParts = temporal.formParts(item.time?.start || item.start);
  const endParts = temporal.formParts(item.time?.end || item.end || "");
  dateRangePicker.setRange(startParts.date, item.kind === "range" ? endParts.date : "");
  els.endField.hidden = item.kind !== "range";
  fillCategorySelect(els.itemCategory, false, item.categoryId);
  els.itemTitle.value = item.title;
  els.itemDescription.value = item.description;
  fillMediaForm(item.media || []);
  fillTagForm(item.tags || []);
  fillRelationChangeForm(item);
  fillEvidenceForm(item);
  els.itemLayoutVariant.value = item.presentation?.variant || "hero-split";
  els.itemTerminalShape.value = item.presentation?.terminalShape || "rounded";
  els.itemConnectorStyle.value = item.presentation?.connectorStyle || "solid";
  els.itemConnectorRouting.value = item.presentation?.connectorRouting || "straight";
  els.itemConnectorWeight.value = item.presentation?.connectorWeight || "normal";
  els.itemConnectorEndpoint.value = item.presentation?.connectorEndpoint || "none";
  els.itemLane.value = Number.isInteger(item.presentation?.lane)
    ? String(item.presentation.lane)
    : "";
  fillLocationForm(null);
  els.saveItem.textContent = "Save changes";
  els.cancelItemEdit.hidden = false;
  els.deleteItemEdit.hidden = false;
  setError(els.itemFormError);
  els.itemTitle.focus();
  els.itemForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function removeItem(id) {
  const item = getItem(id);
  if (!item) return;
  const affectedStories = state.stories.filter((story) => story.itemIds.includes(id)).length;
  const suffix = affectedStories
    ? ` It will also be removed from ${affectedStories} ${affectedStories === 1 ? "story" : "stories"}.`
    : "";
  if (!window.confirm(`Delete “${item.title}”?${suffix}`)) return;
  state.items = state.items.filter((candidate) => candidate.id !== id);
  state.stories = state.stories.map((story) => ({
    ...story,
    itemIds: story.itemIds.filter((itemId) => itemId !== id),
  }));
  state.relationships = state.relationships.map((relationship) => ({
    ...relationship,
    itemIds: (relationship.itemIds || []).filter((itemId) => itemId !== id),
  }));
  if (els.itemId.value === id) resetItemForm();
  if (storyDraftIds.includes(id)) storyDraftIds = storyDraftIds.filter((itemId) => itemId !== id);
  const activeStory = getStory(ui.activeStoryId);
  if (activeStory && !activeStory.itemIds.length) exitStoryFocus();
  persist();
  renderAll();
  showStatus("Timeline item deleted.");
}

function renderStoryBuilder() {
  els.storyPickerCount.textContent = `${state.items.length}`;
  els.storySequenceCount.textContent = `${storyDraftIds.length}`;
  if (els.storyPlacePickerCount) {
    els.storyPlacePickerCount.textContent = `${storyDraftPlaceIds.length}/${state.places.length}`;
  }

  if (els.storyPlacePicker) {
    const placeRows: HTMLElement[] = state.places.map((place) => {
      const label = document.createElement("label");
      label.className = "picker-row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = place.id;
      checkbox.checked = storyDraftPlaceIds.includes(place.id);
      const copy = document.createElement("span");
      copy.className = "picker-copy";
      const title = document.createElement("strong");
      title.textContent = place.name;
      const meta = document.createElement("span");
      meta.textContent = `${place.icon || "place"} · ${place.markerShape || "pin"} · map marker`;
      copy.append(title, meta);
      label.append(checkbox, copy);
      return label;
    });
    if (!placeRows.length) {
      const empty = document.createElement("p");
      empty.className = "privacy-note";
      empty.textContent =
        "Create reusable places in the graph editor, then add them to this story.";
      placeRows.push(empty);
    }
    els.storyPlacePicker.replaceChildren(...placeRows);
  }

  const pickerRows = sortItems().map((item) => {
    const label = document.createElement("label");
    label.className = "picker-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = item.id;
    checkbox.checked = storyDraftIds.includes(item.id);
    const copy = document.createElement("span");
    copy.className = "picker-copy";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const meta = document.createElement("span");
    meta.textContent = `${formatDateInline(item.start)} · ${getCategory(item.categoryId)?.name ?? item.categoryId}`;
    copy.append(title, meta);
    label.append(checkbox, copy);
    return label;
  });
  els.storyPicker.replaceChildren(...pickerRows);

  const sequenceRows = storyDraftIds
    .map((id, index) => {
      const item = getItem(id);
      if (!item) return null;
      const row = document.createElement("li");
      row.className = "sequence-row";
      row.dataset.id = id;
      const number = document.createElement("span");
      number.className = "sequence-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("span");
      title.className = "sequence-title";
      title.textContent = item.title;
      const actions = document.createElement("div");
      actions.className = "sequence-actions";
      const up = actionButton("↑", "story-up", `Move ${item.title} earlier`);
      const down = actionButton("↓", "story-down", `Move ${item.title} later`);
      const remove = actionButton("×", "story-remove", `Remove ${item.title} from story`, "delete");
      up.disabled = index === 0;
      down.disabled = index === storyDraftIds.length - 1;
      actions.append(up, down, remove);
      row.append(number, title, actions);
      return row;
    })
    .filter((row): row is HTMLLIElement => row !== null);
  els.storySequence.replaceChildren(...sequenceRows);
}

function resetStoryForm() {
  els.storyForm.reset();
  els.storyId.value = "";
  storyDraftIds = [];
  storyDraftPlaceIds = [];
  els.saveStory.textContent = "Create story";
  els.cancelStoryEdit.hidden = true;
  setError(els.storyFormError);
  renderStoryBuilder();
}

function beginStoryEdit(id) {
  const story = getStory(id);
  if (!story) return;
  setActivePanel("stories");
  els.storyId.value = story.id;
  els.storyTitle.value = story.title;
  els.storyDescription.value = story.description;
  storyDraftIds = [...story.itemIds];
  storyDraftPlaceIds = [...(story.placeIds || [])];
  els.saveStory.textContent = "Save story";
  els.cancelStoryEdit.hidden = false;
  setError(els.storyFormError);
  renderStoryBuilder();
  els.storyTitle.focus();
}

function removeStory(id) {
  const story = getStory(id);
  if (
    !story ||
    !window.confirm(`Delete story “${story.title}”? Timeline items will not be deleted.`)
  )
    return;
  const removedRelationshipIds = state.relationships
    .filter((relationship) => relationship.subjectId === id || relationship.objectId === id)
    .map((relationship) => relationship.id);
  state.stories = state.stories.filter((candidate) => candidate.id !== id);
  state.relationships = state.relationships.filter(
    (relationship) => relationship.subjectId !== id && relationship.objectId !== id,
  );
  pruneRelationChanges(removedRelationshipIds);
  if (els.storyId.value === id) resetStoryForm();
  if (ui.activeStoryId === id) exitStoryFocus(false);
  persist();
  renderAll();
  showStatus("Story deleted. Timeline items were preserved.");
}

function renderStories() {
  els.savedStoryCount.textContent = `${state.stories.length}`;
  const cards: HTMLElement[] = state.stories.map((story): HTMLElement => {
    const card = document.createElement("article");
    card.className = "story-card";
    card.dataset.id = story.id;
    const top = document.createElement("div");
    top.className = "story-card-top";
    const copy = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = story.title;
    copy.append(title);
    if (story.description) {
      const description = document.createElement("p");
      description.textContent = story.description;
      copy.append(description);
    }
    const actions = document.createElement("div");
    actions.className = "story-actions";
    actions.append(
      actionButton("Focus", "focus-story", `Focus story ${story.title}`),
      actionButton("Edit", "edit-story", `Edit story ${story.title}`),
      actionButton("Delete", "delete-story", `Delete story ${story.title}`, "delete"),
    );
    top.append(copy, actions);
    const meta = document.createElement("div");
    meta.className = "story-meta";
    const placeCount = story.placeIds?.length || 0;
    meta.textContent = `${story.itemIds.length} ${story.itemIds.length === 1 ? "step" : "steps"} · ${placeCount} ${placeCount === 1 ? "place" : "places"} · ${storySpanLabel(story)}`;
    card.append(top, meta);
    return card;
  });
  if (!cards.length) {
    const empty = document.createElement("p");
    empty.className = "privacy-note";
    empty.textContent =
      "No stories yet. Select timeline items above to create a focused narrative path.";
    cards.push(empty);
  }
  els.storyList.replaceChildren(...cards);
}

function focusCategory(id) {
  const category = getCategory(id);
  if (!category) return;
  const items = sortItems().filter((item) => item.categoryId === id);
  if (!items.length) {
    showStatus(`“${category.name}” has no timeline items yet.`);
    return;
  }

  ui.activeStoryId = null;
  ui.storyCursor = 0;
  ui.search = "";
  ui.categoryFilter = id;
  els.search.value = "";
  els.categoryFilter.value = id;
  setBrowserSurfaceOpen(false);
  renderTimeline();
  requestAnimationFrame(() => timelineView?.fitVisible?.());
  showStatus(`Focused category “${category.name}”.`);
}

function focusStory(id) {
  const story = getStory(id);
  if (!story) return;
  if (!story.itemIds.length) {
    showStatus("This story has no timeline items yet.");
    return;
  }
  ui.activeStoryId = id;
  ui.storyCursor = 0;
  ui.search = "";
  ui.categoryFilter = "all";
  els.search.value = "";
  els.categoryFilter.value = "all";
  closeLargeUtilitySurfaces();
  syncApplicationSurfaces();
  renderTimeline();
  focusCurrentStoryItem();
}

function focusCurrentStoryItem(openFocus = false, options: { direction?: number } = {}): void {
  const story = getStory(ui.activeStoryId);
  if (!story?.itemIds.length) return;
  const currentId = story.itemIds[ui.storyCursor];
  if (!currentId) return;
  if (openFocus) {
    timelineView?.focusItem(currentId, {
      direction: Number(options.direction ?? 1) < 0 ? -1 : 1,
    });
    return;
  }
  requestAnimationFrame(() => {
    const element = els.list.querySelector(`[data-id="${CSS.escape(currentId)}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function stepStory(delta: number, options: { focusEvent?: boolean } = {}): boolean {
  const story = getStory(ui.activeStoryId);
  if (!story) return false;
  const next = ui.storyCursor + (delta < 0 ? -1 : 1);
  if (next < 0 || next >= story.itemIds.length) return false;
  ui.storyCursor = next;
  renderTimeline();
  focusCurrentStoryItem(Boolean(options.focusEvent), {
    direction: delta < 0 ? -1 : 1,
  });
  return true;
}

function exitStoryFocus(render = true) {
  ui.activeStoryId = null;
  ui.storyCursor = 0;
  if (render) renderTimeline();
}

function resetCategoryForm() {
  els.categoryForm.reset();
  els.categoryId.value = "";
  els.categoryColor.value = "#667085";
  els.saveCategory.textContent = "Add category";
  els.cancelCategoryEdit.hidden = true;
  setError(els.categoryFormError);
}

function beginCategoryEdit(id) {
  const category = getCategory(id);
  if (!category) return;
  setActivePanel("categories");
  els.categoryId.value = category.id;
  els.categoryName.value = category.name;
  els.categoryColor.value = category.color;
  els.saveCategory.textContent = "Save category";
  els.cancelCategoryEdit.hidden = false;
  setError(els.categoryFormError);
  els.categoryName.focus();
}

function removeCategory(id) {
  const category = state.categories.find((candidate) => candidate.id === id);
  if (!category) return;
  if (state.categories.length <= 1) {
    showStatus("A timeline must keep at least one category.");
    return;
  }
  const usage = state.items.filter((item) => item.categoryId === id).length;
  const replacement = state.categories.find((candidate) => candidate.id !== id);
  if (!replacement) return;
  const detail = usage
    ? ` ${usage} ${usage === 1 ? "item" : "items"} will be reassigned to “${replacement.name}”.`
    : "";
  if (!window.confirm(`Delete category “${category.name}”?${detail}`)) return;
  state.categories = state.categories.filter((candidate) => candidate.id !== id);
  state.items = state.items.map((item) =>
    item.categoryId === id ? { ...item, categoryId: replacement.id } : item,
  );
  ui.collapsedCategoryIds.delete(id);
  if (ui.categoryFilter === id) ui.categoryFilter = "all";
  if (els.categoryId.value === id) resetCategoryForm();
  persist();
  renderAll();
  showStatus("Category deleted.");
}

function renderCategories() {
  const rows = state.categories.map((category) => {
    const usage = state.items.filter((item) => item.categoryId === category.id).length;
    const row = document.createElement("div");
    row.className = "category-row";
    row.dataset.id = category.id;
    row.style.setProperty("--category-color", category.color);
    const identity = document.createElement("div");
    identity.className = "category-identity";
    const dot = document.createElement("span");
    dot.className = "category-dot";
    const copy = document.createElement("span");
    copy.className = "category-copy";
    const name = document.createElement("strong");
    name.textContent = category.name;
    const meta = document.createElement("span");
    meta.textContent = `${usage} ${usage === 1 ? "item" : "items"}`;
    copy.append(name, meta);
    identity.append(dot, copy);
    const actions = document.createElement("div");
    actions.className = "category-actions-inline";
    actions.append(
      actionButton("Edit", "edit-category", `Edit category ${category.name}`),
      actionButton("Delete", "delete-category", `Delete category ${category.name}`, "delete"),
    );
    row.append(identity, actions);
    return row;
  });
  els.categoryList.replaceChildren(...rows);
}

function graphEndpointOptions(select, selected = "") {
  const groups: Array<[string, Array<{ id: string; label: string; type: string }>]> = [
    [
      "Entity nodes",
      state.entities.map((entity) => ({
        id: entity.id,
        label: entity.name,
        type: entity.type || "entity",
      })),
    ],
  ];
  const nodes: HTMLOptGroupElement[] = [];
  for (const [label, records] of groups) {
    if (!records.length) continue;
    const group = document.createElement("optgroup");
    group.label = label;
    for (const record of records) {
      const option = document.createElement("option");
      option.value = record.id;
      option.textContent = `${record.label} · ${record.type}`;
      group.append(option);
    }
    nodes.push(group);
  }
  select.replaceChildren(...nodes);
  const available = [...select.querySelectorAll("option")];
  select.value = available.some((option) => option.value === selected)
    ? selected
    : available[0]?.value || "";
}

function graphContextItemOptions(
  select: HTMLSelectElement | null,
  selected: readonly string[] = [],
): void {
  if (!select) return;
  const selectedIds = new Set(Array.from(selected || [], String));
  const options = sortItems().map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.title} · ${temporal.intervalRepresentation(item.time)}`;
    option.selected = selectedIds.has(String(item.id));
    return option;
  });
  select.replaceChildren(...options);
}

function resetGraphNodeForm() {
  els.graphNodeForm.reset();
  els.graphNodeId.value = "";
  els.graphNodeType.value = "entity";
  els.graphNodeAlternateNames.value = "";
  els.graphNodeIdentifiers.value = "[]";
  els.graphNodeSourceIds.value = "";
  els.graphNodeProperties.value = "{}";
  els.saveGraphNode.textContent = "Add node";
  els.cancelGraphNodeEdit.hidden = true;
  setError(els.graphNodeError);
}

function beginGraphNodeEdit(id) {
  const entity = state.entities.find((candidate) => candidate.id === id);
  if (!entity) return;
  setActivePanel("graph");
  els.graphNodeId.value = entity.id;
  els.graphNodeName.value = entity.name || entity.id;
  els.graphNodeType.value = entity.type || "entity";
  els.graphNodeAlternateNames.value = (entity.alternateNames || []).join("\n");
  els.graphNodeIdentifiers.value = JSON.stringify(entity.identifiers || [], null, 2);
  els.graphNodeSourceIds.value = (entity.sourceIds || []).join("\n");
  els.graphNodeProperties.value = JSON.stringify(entity.attributes || {}, null, 2);
  els.saveGraphNode.textContent = "Save node";
  els.cancelGraphNodeEdit.hidden = false;
  setError(els.graphNodeError);
  els.graphNodeName.focus();
}

function pruneRelationChanges(removedRelationshipIds) {
  const removed = new Set(Array.from(removedRelationshipIds || [], String));
  if (!removed.size) return;
  state.items = state.items.map((item) => ({
    ...item,
    relationChanges: (item.relationChanges || []).filter(
      (change) => !removed.has(String(change.relationshipId)),
    ),
  }));
}

function removeGraphNode(id) {
  const entity = state.entities.find((candidate) => candidate.id === id);
  if (!entity) return;
  const edgeCount = state.relationships.filter(
    (relationship) => relationship.subjectId === id || relationship.objectId === id,
  ).length;
  const suffix = edgeCount
    ? ` ${edgeCount} connected ${edgeCount === 1 ? "edge" : "edges"} will also be removed.`
    : "";
  if (!window.confirm(`Delete node “${entity.name}”?${suffix}`)) return;
  const removedRelationshipIds = state.relationships
    .filter((relationship) => relationship.subjectId === id || relationship.objectId === id)
    .map((relationship) => relationship.id);
  state.entities = state.entities.filter((candidate) => candidate.id !== id);
  state.relationships = state.relationships.filter(
    (relationship) => relationship.subjectId !== id && relationship.objectId !== id,
  );
  pruneRelationChanges(removedRelationshipIds);
  if (els.graphNodeId.value === id) resetGraphNodeForm();
  persist();
  renderAll();
  showStatus("Graph node deleted.");
}

function renderGraphNodes() {
  els.graphNodeCount.textContent = String(state.entities.length);
  const rows: HTMLElement[] = state.entities.map((entity) => {
    const row = document.createElement("article");
    row.className = "graph-record";
    row.dataset.id = entity.id;
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = entity.name;
    const meta = document.createElement("span");
    const propertyCount = Object.keys(entity.attributes || {}).length;
    meta.textContent = `${entity.type || "entity"} · ${propertyCount} ${propertyCount === 1 ? "property" : "properties"}`;
    copy.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "graph-record-actions";
    actions.append(
      actionButton("Edit", "edit-graph-node", `Edit node ${entity.name}`),
      actionButton("Delete", "delete-graph-node", `Delete node ${entity.name}`, "delete"),
    );
    row.append(copy, actions);
    return row;
  });
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "privacy-note";
    empty.textContent =
      "No graph nodes yet. Each node represents one entity such as a person, organization, device, account, document, or object. Places and time are edge context, not nodes.";
    rows.push(empty);
  }
  els.graphNodeList.replaceChildren(...rows);
}

function graphPlaceOptions(select, selected = "") {
  if (!select) return;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "No place";
  const options = [placeholder];
  for (const place of state.places) {
    const option = document.createElement("option");
    option.value = place.id;
    option.textContent = place.name;
    options.push(option);
  }
  select.replaceChildren(...options);
  select.value = options.some((option) => option.value === selected) ? selected : "";
}

function getPlace(id) {
  return state.places.find((place) => String(place.id) === String(id)) || null;
}

function relationshipsForItem(itemId) {
  return state.relationships.filter((relationship) =>
    (relationship.itemIds || []).some((id) => String(id) === String(itemId)),
  );
}

function placeForItem(itemId) {
  for (const relationship of relationshipsForItem(itemId)) {
    const place = getPlace(relationship.placeId);
    if (place) return place;
  }
  return null;
}

function resetGraphPlaceForm() {
  els.graphPlaceForm?.reset();
  if (!els.graphPlaceForm) return;
  els.graphPlaceId.value = "";
  els.graphPlaceIcon.value = "place";
  els.graphPlaceMarkerShape.value = "pin";
  els.graphPlaceMarkerColor.value = "";
  els.graphPlaceMarkerFillColor.value = "";
  els.graphPlaceMarkerOpacity.value = "";
  els.graphPlaceMarkerSize.value = "";
  els.graphPlaceMarkerWeight.value = "";
  els.graphPlacePathStroke.value = "";
  els.graphPlacePathColor.value = "";
  els.graphPlacePathWeight.value = "";
  els.graphPlacePathOpacity.value = "";
  els.graphPlacePathDashArray.value = "";
  els.graphPlacePathDashOffset.value = "";
  els.graphPlacePathLineCap.value = "";
  els.graphPlacePathLineJoin.value = "";
  els.graphPlaceAreaFill.value = "";
  els.graphPlaceAreaFillColor.value = "";
  els.graphPlaceAreaFillOpacity.value = "";
  els.graphPlaceAreaFillRule.value = "";
  els.graphPlaceArea.value = "";
  els.saveGraphPlace.textContent = "Add place";
  els.cancelGraphPlaceEdit.hidden = true;
  setError(els.graphPlaceError);
}

function beginGraphPlaceEdit(id) {
  const place = getPlace(id);
  if (!place) return;
  setActivePanel("graph");
  const parts = spatial.placeFormParts(place);
  els.graphPlaceId.value = place.id;
  els.graphPlaceName.value = String(parts.name ?? "");
  els.graphPlaceIdentifier.value = String(parts.geographicIdentifier ?? "");
  els.graphPlaceAddress.value = String(parts.address ?? "");
  els.graphPlaceLatitude.value = String(parts.latitude ?? "");
  els.graphPlaceLongitude.value = String(parts.longitude ?? "");
  els.graphPlaceRadius.value = String(parts.radiusMeters ?? "");
  els.graphPlaceIcon.value = presentation.ICON_NAMES.includes(String(parts.icon))
    ? String(parts.icon)
    : "place";
  els.graphPlaceMarkerShape.value = String(parts.markerShape ?? "");
  els.graphPlaceMarkerColor.value = String(parts.markerColor ?? "");
  els.graphPlaceMarkerFillColor.value = String(parts.markerFillColor ?? "");
  els.graphPlaceMarkerOpacity.value = String(parts.markerOpacity ?? "");
  els.graphPlaceMarkerSize.value = String(parts.markerSize ?? "");
  els.graphPlaceMarkerWeight.value = String(parts.markerWeight ?? "");
  els.graphPlacePathStroke.value = String(parts.pathStroke ?? "");
  els.graphPlacePathColor.value = String(parts.pathColor ?? "");
  els.graphPlacePathWeight.value = String(parts.pathWeight ?? "");
  els.graphPlacePathOpacity.value = String(parts.pathOpacity ?? "");
  els.graphPlacePathDashArray.value = String(parts.pathDashArray ?? "");
  els.graphPlacePathDashOffset.value = String(parts.pathDashOffset ?? "");
  els.graphPlacePathLineCap.value = String(parts.pathLineCap ?? "");
  els.graphPlacePathLineJoin.value = String(parts.pathLineJoin ?? "");
  els.graphPlaceAreaFill.value = String(parts.areaFill ?? "");
  els.graphPlaceAreaFillColor.value = String(parts.areaFillColor ?? "");
  els.graphPlaceAreaFillOpacity.value = String(parts.areaFillOpacity ?? "");
  els.graphPlaceAreaFillRule.value = String(parts.areaFillRule ?? "");
  els.graphPlaceArea.value = String(parts.areaGeometry ?? "");
  els.saveGraphPlace.textContent = "Save place";
  els.cancelGraphPlaceEdit.hidden = false;
  setError(els.graphPlaceError);
  els.graphPlaceName.focus();
}

function removeGraphPlace(id) {
  const place = getPlace(id);
  if (!place) return;
  const usage = state.relationships.filter((relationship) => relationship.placeId === id).length;
  const suffix = usage
    ? ` ${usage} ${usage === 1 ? "edge" : "edges"} will lose this spatial reference.`
    : "";
  if (!window.confirm(`Delete place “${place.name}”?${suffix}`)) return;
  state.places = state.places.filter((candidate) => candidate.id !== id);
  state.relationships = state.relationships.map((relationship) =>
    relationship.placeId === id ? { ...relationship, placeId: "" } : relationship,
  );
  if (els.graphPlaceId.value === id) resetGraphPlaceForm();
  persist();
  renderAll();
  showStatus("Place deleted.");
}

function renderGraphPlaces() {
  els.graphPlaceCount.textContent = String(state.places.length);
  const rows = state.places.map((place) => {
    const row = document.createElement("article");
    row.className = "graph-record graph-place-record";
    row.dataset.id = place.id;
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = place.name;
    const meta = document.createElement("span");
    const geometry = place.geometry?.type || "no geometry";
    const radius = Number.isFinite(place.radiusMeters) ? ` · ${place.radiusMeters} m radius` : "";
    const customStyle = place.style && Object.keys(place.style).length ? " · custom map style" : "";
    meta.textContent = `${geometry}${radius} · ${place.icon || "place"} · ${place.markerShape || "pin"}${customStyle}`;
    copy.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "graph-record-actions";
    actions.append(
      actionButton("Edit", "edit-graph-place", `Edit place ${place.name}`),
      actionButton("Delete", "delete-graph-place", `Delete place ${place.name}`, "delete"),
    );
    row.append(copy, actions);
    return row;
  });
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "privacy-note";
    empty.textContent =
      "No places yet. Create reusable point, radius, or area records here, then select them from edges.";
    rows.push(empty);
  }
  els.graphPlaceList.replaceChildren(...rows);
}

function configureGraphEdgeTime() {
  const kind = els.graphEdgeTimeKind.value;
  const timed = kind !== "timeless";
  els.graphEdgeDateField.hidden = !timed;
  graphEdgeDatePicker.setMode(kind === "range" ? "range" : "event");
  if (!timed) graphEdgeDatePicker.clear();
}

function resetGraphEdgeForm() {
  els.graphEdgeForm.reset();
  els.graphEdgeId.value = "";
  els.graphEdgeRole.value = "";
  els.graphEdgeInitialState.value = "active";
  els.graphEdgeSourceIds.value = "";
  els.graphEdgeConfidence.value = "";
  els.graphEdgeProperties.value = "{}";
  els.graphEdgeTimeKind.value = "event";
  graphEdgeDatePicker.setMode("event");
  graphEdgeDatePicker.clear();
  els.graphEdgeDateField.hidden = false;
  graphEndpointOptions(els.graphEdgeSubject);
  graphEndpointOptions(els.graphEdgeObject);
  graphPlaceOptions(els.graphEdgePlace);
  graphContextItemOptions(els.graphEdgeItemIds);
  els.saveGraphEdge.textContent = "Add edge";
  els.cancelGraphEdgeEdit.hidden = true;
  setError(els.graphEdgeError);
}

function buildGraphEdgeTime(): TemporalExtent | null {
  const kind = els.graphEdgeTimeKind.value;
  if (kind === "timeless") return null;
  const startDate = els.graphEdgeStartDate.value;
  const endDate = els.graphEdgeEndDate.value;
  if (!startDate) throw new Error("Choose an active date for this edge.");
  if (kind === "range" && !endDate) throw new Error("Choose both dates for the edge range.");
  const start = temporal.buildEndpoint({
    date: startDate,
    time: "",
    precision: "day",
    certainty: "exact",
    timeZone: "",
  });
  const end =
    kind === "range"
      ? temporal.buildEndpoint({
          date: endDate,
          time: "",
          precision: "day",
          certainty: "exact",
          timeZone: "",
        })
      : null;
  if (end && temporal.sortKey(end) < temporal.sortKey(start)) {
    throw new Error("The edge end cannot be earlier than its start.");
  }
  return {
    type: kind === "range" ? "interval" : "instant",
    start,
    end,
  };
}

function beginGraphEdgeEdit(id) {
  const relationship = state.relationships.find((candidate) => candidate.id === id);
  if (!relationship) return;
  setActivePanel("graph");
  els.graphEdgeId.value = relationship.id;
  graphEndpointOptions(els.graphEdgeSubject, relationship.subjectId);
  graphEndpointOptions(els.graphEdgeObject, relationship.objectId);
  graphPlaceOptions(els.graphEdgePlace, relationship.placeId || "");
  graphContextItemOptions(els.graphEdgeItemIds, relationship.itemIds || []);
  els.graphEdgePredicate.value = relationship.predicate || "";
  els.graphEdgeRole.value = relationship.role || "";
  els.graphEdgeInitialState.value =
    relationship.initialState === "inactive" ? "inactive" : "active";
  els.graphEdgeSourceIds.value = (relationship.sourceIds || []).join("\n");
  els.graphEdgeConfidence.value =
    relationship.confidence === null || relationship.confidence === undefined
      ? ""
      : String(relationship.confidence);
  els.graphEdgeProperties.value = JSON.stringify(relationship.attributes || {}, null, 2);
  const timeKind = relationship.time?.end
    ? "range"
    : relationship.time?.start
      ? "event"
      : "timeless";
  els.graphEdgeTimeKind.value = timeKind;
  configureGraphEdgeTime();
  if (relationship.time?.start) {
    const start = temporal.formParts(relationship.time.start);
    const end = temporal.formParts(relationship.time.end);
    graphEdgeDatePicker.setRange(start.date, timeKind === "range" ? end.date : "");
  }
  els.saveGraphEdge.textContent = "Save edge";
  els.cancelGraphEdgeEdit.hidden = false;
  setError(els.graphEdgeError);
  els.graphEdgePredicate.focus();
}

function removeGraphEdge(id) {
  const relationship = state.relationships.find((candidate) => candidate.id === id);
  if (!relationship) return;
  if (!window.confirm(`Delete edge “${relationship.predicate}”?`)) return;
  state.relationships = state.relationships.filter((candidate) => candidate.id !== id);
  pruneRelationChanges([id]);
  if (els.graphEdgeId.value === id) resetGraphEdgeForm();
  persist();
  renderAll();
  showStatus("Graph edge deleted.");
}

function renderGraphEdges() {
  els.graphEdgeCount.textContent = String(state.relationships.length);
  const rows = state.relationships.map((relationship) => {
    const row = document.createElement("article");
    row.className = "graph-record graph-edge-record";
    row.dataset.id = relationship.id;
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${entityOrItemName(relationship.subjectId)} —${relationship.predicate}→ ${entityOrItemName(relationship.objectId)}`;
    const meta = document.createElement("span");
    const when = relationship.time
      ? temporal.intervalRepresentation(relationship.time)
      : "event-driven / timeless";
    const propertyCount = Object.keys(relationship.attributes || {}).length;
    const contextCount = (relationship.itemIds || []).length;
    const place = getPlace(relationship.placeId);
    const where = place ? ` · @ ${place.name}` : "";
    meta.textContent = `${relationship.initialState === "inactive" ? "initially inactive" : "initially active"} · ${when}${where} · ${contextCount} timeline ${contextCount === 1 ? "context" : "contexts"} · ${propertyCount} ${propertyCount === 1 ? "property" : "properties"}`;
    copy.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "graph-record-actions";
    actions.append(
      actionButton("Edit", "edit-graph-edge", `Edit edge ${relationship.predicate}`),
      actionButton(
        "Delete",
        "delete-graph-edge",
        `Delete edge ${relationship.predicate}`,
        "delete",
      ),
    );
    row.append(copy, actions);
    return row;
  });
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "privacy-note";
    empty.textContent =
      "No graph edges yet. Edges connect two different entity nodes, use an action-only label, and carry structured time plus an optional reusable place reference.";
    rows.push(empty);
  }
  els.graphEdgeList.replaceChildren(...rows);
}

function renderGraphEditor() {
  const subject = els.graphEdgeSubject.value;
  const object = els.graphEdgeObject.value;
  graphEndpointOptions(els.graphEdgeSubject, subject);
  graphEndpointOptions(els.graphEdgeObject, object);
  const placeId = els.graphEdgePlace.value;
  graphPlaceOptions(els.graphEdgePlace, placeId);
  const contextItemIds = [...els.graphEdgeItemIds.selectedOptions].map((option) => option.value);
  graphContextItemOptions(els.graphEdgeItemIds, contextItemIds);
  renderGraphNodes();
  renderGraphPlaces();
  renderGraphEdges();
  for (const row of els.itemRelationChangeRows) {
    const parts = relationChangeRowParts(row);
    const selected = parts.relationship.value;
    fillRelationChangeOptions(parts.relationship, selected);
  }
  temporalGraphView?.setModel({
    entities: state.entities,
    // Places carry the canonical geography the WorldSurface anchors
    // occurrences to; without them nothing can be placed on the globe.
    places: state.places,
    relationships: state.relationships,
    items: state.items,
  });
}

if (els.presentationStage && "ResizeObserver" in globalThis) {
  presentationResizeObserver = new ResizeObserver(() => {
    const changed = updatePresentationStageLayout();
    timelineView?.refreshLayout?.();
    if (changed) {
      schedulePresentationGeometryRefresh({ recenterGraph: true });
    }
  });
  presentationResizeObserver.observe(els.presentationStage);
} else {
  window.addEventListener("resize", () => schedulePresentationGeometryRefresh());
}
if ("ResizeObserver" in globalThis && els.viewControls && els.viewControlsToggle) {
  viewControlsResizeObserver = new ResizeObserver(() => {
    if (viewControlsAreOpen()) positionViewControls();
  });
  viewControlsResizeObserver.observe(els.viewControls);
  viewControlsResizeObserver.observe(els.viewControlsToggle);
}

updatePresentationStageLayout();
requestAnimationFrame(() => {
  positionViewControls();
});
window.addEventListener("resize", positionViewControls);
window.visualViewport?.addEventListener("resize", positionViewControls);
window.visualViewport?.addEventListener("scroll", positionViewControls);

function collapseAllCategories() {
  ui.collapsedCategoryIds.clear();
  for (const category of state.categories) ui.collapsedCategoryIds.add(category.id);
}

function renderAll() {
  renderProjectMeta();
  renderCategoryOptions();
  renderStoryBuilder();
  renderStories();
  renderCategories();
  renderGraphEditor();
  renderTimeline();
}

function slug(value) {
  const result = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return result || "timeline";
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function toMarkdown() {
  const title = state.title.trim() || "Untitled timeline";
  const lines = [`# ${title}`, "", "## Chronology", ""];
  for (const item of sortItems()) {
    const category = getCategory(item.categoryId);
    const when =
      item.kind === "range"
        ? `${formatDateInline(item.start)} → ${formatDateInline(item.end)}`
        : formatDateInline(item.start);
    lines.push(
      `### ${when} — ${item.title}`,
      "",
      `Type: ${item.kind}  `,
      `Category: ${category.name}`,
    );
    const place = placeForItem(item.id);
    if (place) {
      const label = place.name || place.geographicIdentifier || place.address || "Coordinates";
      const coordinates = place.geometry?.type === "Point" ? place.geometry.coordinates : null;
      lines.push(
        `Location: ${label}${coordinates ? ` (${coordinates[1]}, ${coordinates[0]})` : ""}  `,
      );
    }
    if (item.tags?.length) lines.push(`Tags: ${item.tags.map((tag) => tag.label).join(", ")}  `);
    if (item.media?.length) {
      for (const media of item.media) {
        lines.push(`Media: ${media.src}${media.caption ? ` — ${media.caption}` : ""}  `);
      }
    }
    if (item.description) lines.push("", item.description);
    lines.push("");
  }

  if (state.stories.length) {
    lines.push("## Stories", "");
    for (const story of state.stories) {
      lines.push(`### ${story.title}`, "");
      if (story.description) lines.push(story.description, "");
      story.itemIds.forEach((itemId, index) => {
        const item = getItem(itemId);
        if (!item) return;
        const when =
          item.kind === "range"
            ? `${formatDateInline(item.start)} → ${formatDateInline(item.end)}`
            : formatDateInline(item.start);
        lines.push(`${index + 1}. **${item.title}** — ${when}`);
      });
      lines.push("");
    }
  }

  if (state.evidence.length) {
    lines.push("## Evidence", "");
    for (const record of state.evidence) {
      lines.push(`### ${record.title}`, "");
      lines.push(`Type: ${record.type}  `);
      if (record.sourceName) lines.push(`Source: ${record.sourceName}  `);
      if (record.publishedAt) lines.push(`Published / recorded: ${record.publishedAt}  `);
      if (record.url) lines.push(`URL: ${record.url}  `);
      if (record.file?.name)
        lines.push(`Local PDF metadata: ${record.file.name} (${record.file.size || 0} bytes)  `);
      if (record.note) lines.push("", record.note);
      const supported = state.items.filter((item) => item.evidenceIds?.includes(record.id));
      if (supported.length)
        lines.push("", `Supports: ${supported.map((item) => item.title).join("; ")}`);
      lines.push("");
    }
  }

  if (state.relationships.length) {
    lines.push("## Temporal relationships", "");
    for (const relationship of state.relationships) {
      const when = relationship.time
        ? temporal.intervalRepresentation(relationship.time)
        : "untimed";
      const place = getPlace(relationship.placeId);
      const spatialContext = place ? `; place: ${place.name}` : "";
      lines.push(
        `- ${relationship.subjectId} —${relationship.predicate}→ ${relationship.objectId} (time: ${when}${spatialContext})`,
      );
    }
    lines.push("");
  }

  lines.push("## Categories", "");
  for (const category of state.categories) {
    const usage = state.items.filter((item) => item.categoryId === category.id).length;
    lines.push(`- ${category.name} (${usage})`);
  }
  return `${lines.join("\n").trim()}\n`;
}

function showStatus(message) {
  window.clearTimeout(statusTimer);
  els.status.textContent = message;
  els.status.classList.add("visible");
  statusTimer = window.setTimeout(() => els.status.classList.remove("visible"), 2800);
}

function renderAutoAdvanceState(autoState: AutoAdvanceState): void {
  const seconds = Math.round(autoState.intervalMs / 1000);
  const playing = autoState.running && !autoState.paused;
  els.autoToggle.setAttribute("aria-pressed", String(playing));
  setSemanticControlIcon(
    els.autoToggle,
    playing ? "pause" : "play",
    playing ? "Pause slideshow" : "Play slideshow",
  );
  if (!autoState.running) {
    els.autoStatus.textContent = "Slideshow stopped";
    return;
  }
  if (autoState.paused) {
    els.autoStatus.textContent =
      autoState.pauseReason === "interaction"
        ? "Slideshow paused after interaction"
        : "Slideshow paused";
    return;
  }
  els.autoStatus.textContent = `Slideshow playing · ${seconds}s interval`;
}

function ensurePresentationFocus() {
  const story = getStory(ui.activeStoryId);
  if (story?.itemIds.length) {
    focusCurrentStoryItem(true);
    return true;
  }
  if (timelineView?.hasFocusedItem()) return true;
  return timelineView?.focusAdjacent(1) || false;
}

function advancePresentation(delta: number, options: { focusEvent?: boolean } = {}): boolean {
  const story = getStory(ui.activeStoryId);
  if (story) return stepStory(delta, { focusEvent: options.focusEvent !== false });
  return timelineView?.focusAdjacent(delta) || false;
}

function handlePresentationCommand(command: string, meta: PresentationCommandMeta = {}): boolean {
  if (!navigationController) return false;
  if (command === "toggle-auto") {
    if (!navigationController.auto.running || navigationController.auto.paused) {
      if (!ensurePresentationFocus()) {
        showStatus("No visible timeline items to present.");
        return true;
      }
    }
    navigationController.auto.toggle();
    return true;
  }
  if (command === "resume-auto") {
    if (!ensurePresentationFocus()) {
      showStatus("No visible timeline items to present.");
      return true;
    }
    navigationController.auto.resume();
    return true;
  }
  if (command === "pause-auto") {
    navigationController.auto.pause("manual");
    return true;
  }
  if (command === "next") {
    advancePresentation(1);
    return true;
  }
  if (command === "previous") {
    advancePresentation(-1);
    return true;
  }
  if (command === "next-media") {
    timelineView?.stepFocusMedia(1);
    return true;
  }
  if (command === "previous-media") {
    timelineView?.stepFocusMedia(-1);
    return true;
  }
  if (command === "back") {
    if (presentationIsFullscreen() && meta.source === "keyboard" && meta.event?.key === "Escape") {
      return false;
    }
    if (timelineView?.hasFocusedItem()) {
      timelineView.closeFocus();
      return true;
    }
    if (getStory(ui.activeStoryId)) {
      exitStoryFocus();
      return true;
    }
    return false;
  }
  if (command === "activate") {
    const active = document.activeElement;
    if (active instanceof HTMLButtonElement || active instanceof HTMLAnchorElement) {
      if (meta.source === "gamepad") {
        active.click();
        return true;
      }
      return false;
    }
    if (!ensurePresentationFocus()) return false;
    navigationController.auto.toggle();
    return true;
  }
  return false;
}

navigationController = navigationFactory.create({
  root: document.body,
  isNavigationActive: () => Boolean(getStory(ui.activeStoryId) || timelineView?.hasFocusedItem()),
  onCommand: (command, meta) => handlePresentationCommand(command, meta),
  auto: {
    intervalMs: Number(els.autoSeconds.value) * 1000,
    advance: () => advancePresentation(1),
    onStateChange: renderAutoAdvanceState,
  },
});

els.autoToggle.addEventListener("click", () => handlePresentationCommand("toggle-auto"));
els.autoSeconds.addEventListener("change", () => {
  const seconds = Math.max(2, Math.min(3600, Number(els.autoSeconds.value) || 10));
  els.autoSeconds.value = String(seconds);
  navigationController?.auto.setIntervalMs(seconds * 1000);
});

function closeProjectMenu() {
  if (els.projectMenu?.matches?.(":popover-open")) els.projectMenu.hidePopover();
}

els.importJsonTrigger?.addEventListener("click", () => {
  if (ui.mode !== "edit") return;
  els.importJson?.click();
});
els.importInterchangeTrigger?.addEventListener("click", () => {
  if (ui.mode !== "edit") return;
  els.importInterchange?.click();
});
function projectMenuViewport() {
  const visualViewport = window.visualViewport;
  const width = Math.max(
    1,
    visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || 1,
  );
  const height = Math.max(
    1,
    visualViewport?.height || document.documentElement.clientHeight || window.innerHeight || 1,
  );
  return {
    width,
    height,
    left: Math.max(0, visualViewport?.offsetLeft || 0),
    top: Math.max(0, visualViewport?.offsetTop || 0),
  };
}

function positionProjectMenu() {
  if (!els.projectMenu || !els.projectMenuToggle) return;
  const rect = els.projectMenuToggle.getBoundingClientRect();
  const viewport = projectMenuViewport();
  const gap = 8;
  const edge = 8;
  const minLeft = viewport.left + edge;
  const minTop = viewport.top + edge;
  const maxRight = viewport.left + viewport.width - edge;
  const maxBottom = viewport.top + viewport.height - edge;
  const availableWidth = Math.max(1, maxRight - minLeft);
  const availableHeight = Math.max(1, maxBottom - minTop);

  let menuWidth = Math.min(340, availableWidth);
  let menuHeight = Math.min(620, availableHeight);
  let left = minLeft;
  let top = minTop;
  let placement = "";

  const roomAbove = Math.max(0, rect.top - gap - minTop);
  const roomBelow = Math.max(0, maxBottom - rect.bottom - gap);
  const opensUpward = roomAbove >= roomBelow;
  const verticalRoom = Math.max(1, opensUpward ? roomAbove : roomBelow);
  menuHeight = Math.min(menuHeight, verticalRoom);
  const preferredLeft = rect.left + rect.width / 2 - menuWidth / 2;
  left = Math.min(Math.max(minLeft, preferredLeft), Math.max(minLeft, maxRight - menuWidth));
  const preferredTop = opensUpward ? rect.top - gap - menuHeight : rect.bottom + gap;
  top = Math.min(Math.max(minTop, preferredTop), Math.max(minTop, maxBottom - menuHeight));
  placement = opensUpward ? "above" : "below";

  els.projectMenu.style.setProperty("--project-menu-max-width", `${Math.floor(availableWidth)}px`);
  els.projectMenu.style.setProperty("--project-menu-max-height", `${Math.floor(verticalRoom)}px`);

  els.projectMenu.style.setProperty("--project-menu-left", `${Math.round(left)}px`);
  els.projectMenu.style.setProperty("--project-menu-top", `${Math.round(top)}px`);
  els.projectMenu.dataset.anchorPlacement = placement;

  if (els.projectMenu.matches(":popover-open")) {
    const menuRect = els.projectMenu.getBoundingClientRect();
    const clampedLeft = Math.min(
      Math.max(minLeft, menuRect.left),
      Math.max(minLeft, maxRight - menuRect.width),
    );
    const clampedTop = Math.min(
      Math.max(minTop, menuRect.top),
      Math.max(minTop, maxBottom - menuRect.height),
    );
    els.projectMenu.style.setProperty("--project-menu-left", `${Math.round(clampedLeft)}px`);
    els.projectMenu.style.setProperty("--project-menu-top", `${Math.round(clampedTop)}px`);
  }
}

function repositionOpenProjectMenu() {
  if (!els.projectMenu?.matches(":popover-open")) return;
  positionProjectMenu();
}

els.projectMenu?.addEventListener("beforetoggle", (event) => {
  if (event.newState === "open") positionProjectMenu();
});
els.projectMenu?.addEventListener("toggle", (event) => {
  const open = event.newState === "open";
  els.projectMenuToggle?.setAttribute("aria-expanded", String(open));
  if (!open) return;
  requestAnimationFrame(positionProjectMenu);
});
window.addEventListener("resize", repositionOpenProjectMenu);
window.visualViewport?.addEventListener("resize", repositionOpenProjectMenu);
window.visualViewport?.addEventListener("scroll", repositionOpenProjectMenu);

els.projectMenu?.addEventListener("click", (event) => {
  const action = eventTargetElement(event)?.closest("[data-project-menu-close]");
  if (!action) return;
  queueMicrotask(closeProjectMenu);
});

els.editorToggle?.addEventListener("click", () => setEditorSurfaceOpen(!ui.editorOpen));
els.panelOpeners.forEach((button) => {
  button.addEventListener("click", () => setActivePanel(button.dataset.openPanel));
});
els.controlPanelClose?.addEventListener("click", () => setEditorSurfaceOpen(false));
els.browserToggle?.addEventListener("click", () => setBrowserSurfaceOpen(!ui.browserOpen));
els.browserClose?.addEventListener("click", () => setBrowserSurfaceOpen(false));
els.viewControlsToggle?.addEventListener("click", () => {
  if (viewControlsAreOpen()) return;
  closeLargeUtilitySurfaces("view");
  closeProjectMenu();
  closeFocusedEventForUtility();
  syncApplicationSurfaces();
});
els.viewControls?.addEventListener("beforetoggle", (event) => {
  if (event.newState === "open" && ui.mode === "edit") event.preventDefault();
});
els.viewControls?.addEventListener("toggle", () => {
  const open = syncViewControlsChrome();
  if (open) {
    positionViewControls();
    requestAnimationFrame(positionViewControls);
  } else {
    clearViewControlsPosition();
  }
  schedulePresentationGeometryRefresh({ recenterGraph: false });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (ui.editorOpen) {
    event.preventDefault();
    setEditorSurfaceOpen(false);
    return;
  }
  if (ui.browserOpen) {
    event.preventDefault();
    setBrowserSurfaceOpen(false);
    return;
  }
  if (viewControlsAreOpen() && !presentationIsFullscreen()) {
    event.preventDefault();
    closeViewControls();
  }
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => setActivePanel(tab.dataset.panel));
  tab.addEventListener("keydown", (event) => {
    if (![/ArrowLeft/, /ArrowRight/].some((pattern) => pattern.test(event.key))) return;
    event.preventDefault();
    const current = els.tabs.indexOf(tab);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = els.tabs[(current + delta + els.tabs.length) % els.tabs.length];
    if (!next) return;
    setActivePanel(next.dataset.panel);
    next.focus();
  });
});

els.graphNodeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setError(els.graphNodeError);
  const name = els.graphNodeName.value.trim();
  const type = els.graphNodeType.value.trim() || "entity";
  if (!name) {
    setError(els.graphNodeError, "A node name is required.");
    els.graphNodeName.focus();
    return;
  }
  const nodeValidation = graph.validateEntityNode({ name, type });
  if (!nodeValidation.valid) {
    setError(els.graphNodeError, nodeValidation.message);
    els.graphNodeType.focus();
    return;
  }
  const alternateNames = parseLineList(els.graphNodeAlternateNames.value, {
    maxItems: 48,
    maxLength: 180,
  });
  const sourceIds = parseLineList(els.graphNodeSourceIds.value, { maxItems: 96, maxLength: 120 });
  let identifiers: ReturnType<typeof parseJsonArray>;
  let attributes: ReturnType<typeof parseJsonObject>;
  try {
    identifiers = parseJsonArray(els.graphNodeIdentifiers.value, "Node identifiers");
    attributes = parseJsonObject(els.graphNodeProperties.value, "Node properties");
  } catch (error) {
    setError(
      els.graphNodeError,
      error instanceof Error ? error.message : "Check the node identifiers and properties.",
    );
    return;
  }
  const entity = {
    id: els.graphNodeId.value || newId("entity"),
    type: type.slice(0, 60),
    name: name.slice(0, 180),
    alternateNames,
    identifiers,
    sourceIds,
    attributes,
  };
  const fullNodeValidation = graph.validateEntityNode(entity);
  if (!fullNodeValidation.valid) {
    setError(els.graphNodeError, fullNodeValidation.message);
    return;
  }
  const index = state.entities.findIndex((candidate) => candidate.id === entity.id);
  if (index >= 0) {
    state.entities[index] = entity;
    showStatus("Graph node updated.");
  } else {
    state.entities.push(entity);
    showStatus("Graph node added.");
  }
  persist();
  resetGraphNodeForm();
  renderAll();
});

els.cancelGraphNodeEdit.addEventListener("click", resetGraphNodeForm);

els.graphNodeList.addEventListener("click", (event) => {
  const button = closestEventTarget<HTMLButtonElement>(event, "button[data-action]");
  const row = closestEventTarget<HTMLElement>(event, ".graph-record");
  if (!button || !row) return;
  if (button.dataset.action === "edit-graph-node") beginGraphNodeEdit(row.dataset.id);
  if (button.dataset.action === "delete-graph-node") removeGraphNode(row.dataset.id);
});

els.graphPlaceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setError(els.graphPlaceError);
  if (!els.graphPlaceForm.checkValidity()) {
    els.graphPlaceForm.reportValidity();
    return;
  }
  try {
    const place = spatial.placeFromForm({
      id: els.graphPlaceId.value || newId("place"),
      name: els.graphPlaceName.value,
      geographicIdentifier: els.graphPlaceIdentifier.value,
      address: els.graphPlaceAddress.value,
      latitude: els.graphPlaceLatitude.value,
      longitude: els.graphPlaceLongitude.value,
      radiusMeters: els.graphPlaceRadius.value,
      icon: els.graphPlaceIcon.value,
      markerShape: els.graphPlaceMarkerShape.value,
      markerColor: els.graphPlaceMarkerColor.value,
      markerFillColor: els.graphPlaceMarkerFillColor.value,
      markerOpacity: els.graphPlaceMarkerOpacity.value,
      markerSize: els.graphPlaceMarkerSize.value,
      markerWeight: els.graphPlaceMarkerWeight.value,
      pathStroke: els.graphPlacePathStroke.value,
      pathColor: els.graphPlacePathColor.value,
      pathWeight: els.graphPlacePathWeight.value,
      pathOpacity: els.graphPlacePathOpacity.value,
      pathDashArray: els.graphPlacePathDashArray.value,
      pathDashOffset: els.graphPlacePathDashOffset.value,
      pathLineCap: els.graphPlacePathLineCap.value,
      pathLineJoin: els.graphPlacePathLineJoin.value,
      areaFill: els.graphPlaceAreaFill.value,
      areaFillColor: els.graphPlaceAreaFillColor.value,
      areaFillOpacity: els.graphPlaceAreaFillOpacity.value,
      areaFillRule: els.graphPlaceAreaFillRule.value,
      areaGeometry: els.graphPlaceArea.value.trim(),
    });
    if (!place) throw new Error("A place name is required.");
    if (!place.geometry) throw new Error("A place needs point coordinates or an area geometry.");
    const duplicate = state.places.find(
      (candidate) =>
        candidate.id !== place.id &&
        spatial.placeIdentity(candidate) === spatial.placeIdentity(place),
    );
    if (duplicate)
      throw new Error(
        `This location already exists as “${duplicate.name}”. Reuse it from the edge Place selector instead of creating a duplicate.`,
      );
    const index = state.places.findIndex((candidate) => candidate.id === place.id);
    if (index >= 0) {
      state.places[index] = place;
      showStatus("Place updated.");
    } else {
      state.places.push(place);
      showStatus("Place added.");
    }
    persist();
    resetGraphPlaceForm();
    renderAll();
  } catch (error) {
    setError(
      els.graphPlaceError,
      error instanceof Error ? error.message : "Check the place geometry.",
    );
  }
});

els.cancelGraphPlaceEdit.addEventListener("click", resetGraphPlaceForm);

els.graphPlaceList.addEventListener("click", (event) => {
  const button = closestEventTarget<HTMLButtonElement>(event, "button[data-action]");
  const row = closestEventTarget<HTMLElement>(event, ".graph-record");
  if (!button || !row) return;
  if (button.dataset.action === "edit-graph-place") beginGraphPlaceEdit(row.dataset.id);
  if (button.dataset.action === "delete-graph-place") removeGraphPlace(row.dataset.id);
});

els.graphEdgeTimeKind.addEventListener("change", () => {
  const start = els.graphEdgeStartDate.value;
  const end = els.graphEdgeEndDate.value;
  configureGraphEdgeTime();
  if (els.graphEdgeTimeKind.value !== "timeless") {
    graphEdgeDatePicker.setRange(start, els.graphEdgeTimeKind.value === "range" ? end : "");
  }
});

els.graphEdgeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setError(els.graphEdgeError);
  const subjectId = els.graphEdgeSubject.value;
  const objectId = els.graphEdgeObject.value;
  const predicate = els.graphEdgePredicate.value.trim();
  if (!subjectId || !objectId) {
    setError(els.graphEdgeError, "Choose both a subject and an object.");
    return;
  }
  if (subjectId === objectId) {
    setError(
      els.graphEdgeError,
      "Choose two different entities. An edge cannot originate from and target the same node.",
    );
    els.graphEdgeObject.focus();
    return;
  }
  const predicateValidation = graph.validateActionPredicate(predicate);
  if (!predicateValidation.valid) {
    setError(els.graphEdgeError, predicateValidation.message);
    els.graphEdgePredicate.focus();
    return;
  }
  const itemIds = [...els.graphEdgeItemIds.selectedOptions].map((option) => option.value);
  const sourceIds = parseLineList(els.graphEdgeSourceIds.value, { maxItems: 96, maxLength: 120 });
  const confidenceText = els.graphEdgeConfidence.value.trim();
  const confidence = confidenceText === "" ? null : Number(confidenceText);
  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
    setError(els.graphEdgeError, "Confidence must be between 0 and 1.");
    els.graphEdgeConfidence.focus();
    return;
  }
  let attributes: ReturnType<typeof parseJsonObject>;
  let time: ReturnType<typeof buildGraphEdgeTime>;
  try {
    attributes = parseJsonObject(els.graphEdgeProperties.value, "Edge properties");
    const duplicateContextKey = Object.keys(attributes).find(graph.contextPropertyKey);
    if (duplicateContextKey) {
      throw new Error(
        `Edge property “${duplicateContextKey}” duplicates structured context. Use the Time and Place fields instead.`,
      );
    }
    time = buildGraphEdgeTime();
  } catch (error) {
    setError(
      els.graphEdgeError,
      error instanceof Error ? error.message : "Check the edge properties and time.",
    );
    return;
  }

  const relationship: RelationshipRecord = {
    id: els.graphEdgeId.value || newId("relationship"),
    subjectId,
    objectId,
    predicate: predicate.slice(0, 120),
    role: els.graphEdgeRole.value.trim().slice(0, 120),
    placeId: els.graphEdgePlace.value,
    itemIds,
    initialState: els.graphEdgeInitialState.value === "inactive" ? "inactive" : "active",
    time,
    sourceIds,
    confidence,
    attributes,
  };
  const duplicateFact = graph.findDuplicateRelationship(
    relationship,
    state.relationships,
    relationship.id,
  );
  if (duplicateFact) {
    setError(
      els.graphEdgeError,
      `This action fact already exists as “${duplicateFact.id}”. Keep one canonical edge and add chronology, provenance, place, confidence, or other context to that edge instead of duplicating it.`,
    );
    return;
  }
  const mirroredFact = graph.findMirroredRelationship(
    relationship,
    state.relationships,
    relationship.id,
  );
  if (mirroredFact) {
    setError(
      els.graphEdgeError,
      `A reverse copy of this same action fact already exists as “${mirroredFact.id}”. Direction is part of the fact; create a reverse edge only when it describes a genuinely different reverse action.`,
    );
    return;
  }

  const index = state.relationships.findIndex((candidate) => candidate.id === relationship.id);
  if (index >= 0) {
    state.relationships[index] = relationship;
    showStatus("Graph edge updated.");
  } else {
    state.relationships.push(relationship);
    showStatus("Graph edge added.");
  }
  persist();
  resetGraphEdgeForm();
  renderAll();
});

els.cancelGraphEdgeEdit.addEventListener("click", resetGraphEdgeForm);

els.graphEdgeList.addEventListener("click", (event) => {
  const button = closestEventTarget<HTMLButtonElement>(event, "button[data-action]");
  const row = closestEventTarget<HTMLElement>(event, ".graph-record");
  if (!button || !row) return;
  if (button.dataset.action === "edit-graph-edge") beginGraphEdgeEdit(row.dataset.id);
  if (button.dataset.action === "delete-graph-edge") removeGraphEdge(row.dataset.id);
});

if (els.presentationFullscreenToggle) {
  if (
    !document.fullscreenEnabled ||
    typeof els.presentationStage?.requestFullscreen !== "function"
  ) {
    els.presentationFullscreenToggle.disabled = true;
    els.presentationFullscreenToggle.title =
      "Full-screen presentation is unavailable in this browser.";
  } else {
    els.presentationFullscreenToggle.addEventListener("click", () => {
      togglePresentationFullscreen();
    });
  }
}

document.addEventListener("fullscreenchange", syncPresentationFullscreenState);

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.toLowerCase() !== "f") return;
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  )
    return;
  const stageHasFocus = Boolean(
    presentationIsFullscreen() ||
      (active instanceof Element && els.presentationStage?.contains(active)),
  );
  if (!stageHasFocus) return;
  event.preventDefault();
  togglePresentationFullscreen();
});

els.itemStartPrecision.addEventListener("change", () => configureTemporalEndpoint("Start"));
els.itemEndPrecision.addEventListener("change", () => configureTemporalEndpoint("End"));

els.itemKind.addEventListener("change", () => {
  const isRange = els.itemKind.value === "range";
  const startDate = els.itemStartDate.value;
  const endDate = els.itemEndDate.value;
  dateRangePicker.setMode(isRange ? "range" : "event");
  dateRangePicker.setRange(startDate, isRange ? endDate : "");
  els.endField.hidden = !isRange;
  if (isRange && !els.itemEndDate.value && els.itemStartDate.value) {
    els.itemEndPrecision.value = els.itemStartPrecision.value;
    els.itemEndCertainty.value = els.itemStartCertainty.value;
    els.itemEndZone.value = els.itemStartZone.value;
    if (els.itemStartTime.value) els.itemEndTime.value = els.itemStartTime.value;
    configureTemporalEndpoint("End");
  }
});

for (const row of els.itemTagRows) {
  const parts = tagRowParts(row);
  parts.hue.addEventListener("input", () => updateTagHuePreview(row));
  updateTagHuePreview(row);
}

for (const row of els.itemEvidenceRows) {
  const parts = evidenceRowParts(row);
  parts.extractText?.addEventListener("click", () => {
    void extractEvidenceRow(row);
  });
  parts.file?.addEventListener("change", () => {
    const id = parts.id.value.trim();
    if (id) evidenceExtractionDrafts.delete(id);
    renderEvidenceExtraction(parts, null);
    markInferenceStale();
  });
}

els.itemInferenceRun?.addEventListener("click", () => {
  void runItemInference();
});
els.itemInferenceClear?.addEventListener("click", () => {
  clearInferenceDraft();
});
els.itemForm.addEventListener("input", markInferenceStale);
els.itemForm.addEventListener("change", markInferenceStale);

els.itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError(els.itemFormError);
  const kind = els.itemKind.value === "range" ? "range" : "event";
  const title = els.itemTitle.value.trim();

  let startEndpoint: ReturnType<typeof endpointFromForm>;
  let endEndpoint: ReturnType<typeof endpointFromForm> | null = null;
  let media: ReturnType<typeof collectMediaForm>;
  let tags: ReturnType<typeof collectTagForm>;
  let relationChanges: ReturnType<typeof collectRelationChangeForm>;
  let evidenceRecords: Awaited<ReturnType<typeof collectEvidenceForm>>;
  try {
    if (!els.itemStartDate.value) throw new Error("Choose a calendar date.");
    if (kind === "range" && !els.itemEndDate.value)
      throw new Error("Choose both dates for the range.");
    startEndpoint = endpointFromForm("Start");
    if (kind === "range") endEndpoint = endpointFromForm("End");
    if (endEndpoint && temporal.sortKey(endEndpoint) < temporal.sortKey(startEndpoint)) {
      throw new Error("The range end cannot be earlier than its start.");
    }
    media = collectMediaForm();
    tags = collectTagForm();
    relationChanges = collectRelationChangeForm();
    evidenceRecords = await collectEvidenceForm();
  } catch (error) {
    setError(
      els.itemFormError,
      error instanceof Error
        ? error.message
        : "Check the temporal, media, tag, or evidence values.",
    );
    els.itemDateRange.focus();
    return;
  }

  if (!title) {
    setError(els.itemFormError, "A title is required.");
    els.itemTitle.focus();
    return;
  }

  const laneText = els.itemLane.value.trim();
  const manualLane = laneText === "" ? null : Number(laneText);
  if (manualLane !== null && (!Number.isInteger(manualLane) || manualLane < 0 || manualLane > 31)) {
    setError(
      els.itemFormError,
      "Lane must be a whole number from 0 through 31, or left blank for automatic placement.",
    );
    els.itemLane.focus();
    return;
  }

  const startValue = startEndpoint.value;
  if (!startValue) {
    setError(els.itemFormError, "A timeline item requires a canonical start value.");
    return;
  }
  const endValue = kind === "range" ? (endEndpoint?.value ?? null) : null;
  if (kind === "range" && !endValue) {
    setError(els.itemFormError, "A range requires a canonical end value.");
    return;
  }

  const item: TimelineItemRecord = {
    id: els.itemId.value || newId("item"),
    kind,
    start: startValue,
    end: endValue,
    time: {
      type: kind === "range" ? "interval" : "instant",
      start: startEndpoint,
      end: kind === "range" ? endEndpoint : null,
    },
    title: title.slice(0, 160),
    description: els.itemDescription.value.trim().slice(0, 2000),
    categoryId: state.categories.some((category) => category.id === els.itemCategory.value)
      ? els.itemCategory.value
      : (state.categories[0]?.id ?? "incident"),
    presentation: {
      variant: els.itemLayoutVariant.value,
      terminalShape: els.itemTerminalShape.value,
      connectorStyle: els.itemConnectorStyle.value,
      connectorRouting: els.itemConnectorRouting.value,
      connectorWeight: els.itemConnectorWeight.value,
      connectorEndpoint: els.itemConnectorEndpoint.value,
      lane: manualLane,
    },
    relationChanges,
    evidenceIds: evidenceRecords.map((record) => record.id),
  };
  if (media.length) item.media = media;
  if (tags.length) item.tags = tags;
  const existingItem = state.items.find((candidate) => candidate.id === item.id);
  if (existingItem?.extensions) item.extensions = clone(existingItem.extensions);

  let draft = clone(state);
  const evidenceMap = new Map(draft.evidence.map((record) => [record.id, record]));
  for (const record of evidenceRecords) evidenceMap.set(record.id, record);
  draft.evidence = [...evidenceMap.values()];

  const draftItemIndex = draft.items.findIndex((candidate) => candidate.id === item.id);
  if (draftItemIndex >= 0) draft.items[draftItemIndex] = item;
  else draft.items.push(item);

  let inferredRelationshipCount = 0;
  try {
    if (itemInferenceDraft) {
      const currentInput = inferenceInputFromForm({ ensureIds: false });
      const currentFingerprint = graphInference.fingerprint(currentInput);
      if (
        itemInferenceDraft.graphContractVersion !==
        (graph.GRAPH_CONTRACT_VERSION || currentInput.graphContractVersion)
      ) {
        throw new Error(
          "The graph contract changed after inference. Rerun inference before saving.",
        );
      }
      if (itemInferenceDraft.fingerprint !== currentFingerprint) {
        throw new Error(
          "Event context changed after inference. Rerun or clear inference before saving inferred graph facts.",
        );
      }
      const selected = selectedInferenceRelationshipKeys();
      inferredRelationshipCount = selected.length;
      draft = normalizeTimeline(
        graphInference.applyProposal(draft, item, itemInferenceDraft.proposal, selected, {
          graph,
          spatial,
        }) as TimelineInputRecord,
        { strictGraph: true },
      );
    }
    state = normalizeTimeline(draft, { strictGraph: true });
  } catch (error) {
    setError(
      els.itemFormError,
      error instanceof Error
        ? error.message
        : "The event or inferred graph facts violate the graph contract.",
    );
    return;
  }

  showStatus(
    existingItem
      ? `Timeline item updated${inferredRelationshipCount ? ` with ${inferredRelationshipCount} inferred action ${inferredRelationshipCount === 1 ? "fact" : "facts"}` : ""}.`
      : `${kind === "range" ? "Range" : "Event"} added${inferredRelationshipCount ? ` with ${inferredRelationshipCount} inferred action ${inferredRelationshipCount === 1 ? "fact" : "facts"}` : ""}.`,
  );
  persist();
  resetItemForm();
  renderAll();
  els.itemDateRange.focus();
});

els.cancelItemEdit.addEventListener("click", resetItemForm);
els.deleteItemEdit.addEventListener("click", () => {
  if (ui.mode !== "edit" || !els.itemId.value) return;
  removeItem(els.itemId.value);
});

els.list.addEventListener(
  "toggle",
  (event) => {
    const details = closestEventTarget<HTMLDetailsElement>(event, ".timeline-category-group");
    if (!details) return;
    const categoryId = details.dataset.categoryId;
    if (!categoryId) return;
    if (details.open) ui.collapsedCategoryIds.delete(categoryId);
    else ui.collapsedCategoryIds.add(categoryId);
  },
  true,
);

els.list.addEventListener("click", (event) => {
  const button = closestEventTarget<HTMLButtonElement>(event, "button[data-action]");
  if (!button) return;

  if (button.dataset.action === "focus-category") {
    const group = closestEventTarget<HTMLElement>(event, ".timeline-category-shell");
    const categoryId = group?.dataset.categoryId;
    if (categoryId) focusCategory(categoryId);
    return;
  }

  const itemElement = closestEventTarget<HTMLElement>(event, ".timeline-item");
  if (!itemElement) return;
  if (button.dataset.action === "focus-item") {
    setBrowserSurfaceOpen(false);
    const itemId = itemElement.dataset.id;
    if (itemId) timelineView?.focusItem(itemId);
  }
  if (button.dataset.action === "story-focus") {
    ui.storyCursor = Number(button.dataset.storyIndex);
    renderTimeline();
    focusCurrentStoryItem();
  }
});

els.storyPicker.addEventListener("change", (event) => {
  const checkbox = closestEventTarget<HTMLInputElement>(event, 'input[type="checkbox"]');
  if (!checkbox) return;
  if (checkbox.checked && !storyDraftIds.includes(checkbox.value))
    storyDraftIds.push(checkbox.value);
  if (!checkbox.checked) storyDraftIds = storyDraftIds.filter((id) => id !== checkbox.value);
  renderStoryBuilder();
});

els.storyPlacePicker?.addEventListener("change", (event) => {
  const checkbox = closestEventTarget<HTMLInputElement>(event, 'input[type="checkbox"]');
  if (!checkbox) return;
  if (checkbox.checked && !storyDraftPlaceIds.includes(checkbox.value)) {
    storyDraftPlaceIds.push(checkbox.value);
  }
  if (!checkbox.checked) {
    storyDraftPlaceIds = storyDraftPlaceIds.filter((id) => id !== checkbox.value);
  }
  renderStoryBuilder();
});

els.storySequence.addEventListener("click", (event) => {
  const button = closestEventTarget<HTMLButtonElement>(event, "button[data-action]");
  const row = closestEventTarget<HTMLElement>(event, ".sequence-row");
  if (!button || !row) return;
  const rowId = row.dataset.id;
  if (!rowId) return;
  const index = storyDraftIds.indexOf(rowId);
  if (index < 0) return;
  if (button.dataset.action === "story-up" && index > 0) {
    const current = storyDraftIds[index];
    const previous = storyDraftIds[index - 1];
    if (current && previous) {
      storyDraftIds[index - 1] = current;
      storyDraftIds[index] = previous;
    }
  }
  if (button.dataset.action === "story-down" && index < storyDraftIds.length - 1) {
    const current = storyDraftIds[index];
    const next = storyDraftIds[index + 1];
    if (current && next) {
      storyDraftIds[index + 1] = current;
      storyDraftIds[index] = next;
    }
  }
  if (button.dataset.action === "story-remove") storyDraftIds.splice(index, 1);
  renderStoryBuilder();
});

els.storyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setError(els.storyFormError);
  const title = els.storyTitle.value.trim();
  if (!title) {
    setError(els.storyFormError, "A story title is required.");
    els.storyTitle.focus();
    return;
  }
  if (!storyDraftIds.length) {
    setError(els.storyFormError, "Select at least one timeline item for this story.");
    return;
  }
  const story = {
    id: els.storyId.value || newId("story"),
    title: title.slice(0, 160),
    description: els.storyDescription.value.trim().slice(0, 1500),
    itemIds: [...storyDraftIds],
    placeIds: [...storyDraftPlaceIds],
  };
  const index = state.stories.findIndex((candidate) => candidate.id === story.id);
  if (index >= 0) {
    state.stories[index] = story;
    showStatus("Story updated.");
  } else {
    state.stories.push(story);
    showStatus("Story created.");
  }
  persist();
  resetStoryForm();
  renderAll();
});

els.cancelStoryEdit.addEventListener("click", resetStoryForm);

els.storyList.addEventListener("click", (event) => {
  const button = closestEventTarget<HTMLButtonElement>(event, "button[data-action]");
  const card = closestEventTarget<HTMLElement>(event, ".story-card");
  if (!button || !card) return;
  const storyId = card.dataset.id;
  if (!storyId) return;
  if (button.dataset.action === "focus-story") focusStory(storyId);
  if (button.dataset.action === "edit-story") beginStoryEdit(storyId);
  if (button.dataset.action === "delete-story") removeStory(storyId);
});

els.browserStoryList?.addEventListener("click", (event) => {
  const card = closestEventTarget<HTMLElement>(event, ".browser-story-card[data-id]");
  if (!card) return;
  const storyId = card.dataset.id;
  if (storyId) focusStory(storyId);
});

els.categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setError(els.categoryFormError);
  const name = els.categoryName.value.trim();
  if (!name) {
    setError(els.categoryFormError, "A category name is required.");
    els.categoryName.focus();
    return;
  }
  const editingId = els.categoryId.value;
  const duplicate = state.categories.some(
    (category) =>
      category.id !== editingId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  if (duplicate) {
    setError(els.categoryFormError, "Category names must be unique.");
    els.categoryName.focus();
    return;
  }
  const category = {
    id: editingId || newId("category"),
    name: name.slice(0, 60),
    color: normalizeColor(els.categoryColor.value),
  };
  const index = state.categories.findIndex((candidate) => candidate.id === category.id);
  if (index >= 0) {
    state.categories[index] = category;
    showStatus("Category updated.");
  } else {
    state.categories.push(category);
    ui.collapsedCategoryIds.add(category.id);
    showStatus("Category added.");
  }
  persist();
  resetCategoryForm();
  renderAll();
});

els.cancelCategoryEdit.addEventListener("click", resetCategoryForm);

els.categoryList.addEventListener("click", (event) => {
  const button = closestEventTarget<HTMLButtonElement>(event, "button[data-action]");
  const row = closestEventTarget<HTMLElement>(event, ".category-row");
  if (!button || !row) return;
  if (button.dataset.action === "edit-category") beginCategoryEdit(row.dataset.id);
  if (button.dataset.action === "delete-category") removeCategory(row.dataset.id);
});

els.search.addEventListener("input", () => {
  ui.search = els.search.value;
  renderTimeline();
});

els.categoryFilter.addEventListener("change", () => {
  ui.categoryFilter = els.categoryFilter.value;
  renderTimeline();
});

els.clearFilters.addEventListener("click", () => {
  ui.search = "";
  ui.categoryFilter = "all";
  els.search.value = "";
  els.categoryFilter.value = "all";
  renderTimeline();
});

els.storyPrev.addEventListener("click", () => stepStory(-1));
els.storyNext.addEventListener("click", () => stepStory(1));
els.storyExit.addEventListener("click", () => exitStoryFocus());

els.timelineViewRoot.addEventListener("timelineviewportchange", (event) => {
  temporalGraphView?.setWindow(event.detail?.viewport || null);
});

els.timelineViewRoot.addEventListener("timelineorientationchange", (event) => {
  if (els.presentationStage) {
    els.presentationStage.dataset.timelineOrientation =
      event.detail?.orientation === "vertical" ? "vertical" : "horizontal";
  }
  schedulePresentationGeometryRefresh({ recenterGraph: presentationIsFullscreen() });
});

els.timelineViewRoot.addEventListener("timelinefocuschange", (event) => {
  const focused = Boolean(event.detail?.focused);
  if (focused && ui.mode === "edit") {
    requestAnimationFrame(() => timelineView?.closeFocus());
    return;
  }
  if (focused) {
    closeLargeUtilitySurfaces("focus");
    closeProjectMenu();
  }
  els.appShell.classList.toggle("is-event-focused", focused);
  temporalGraphView?.setFocus(focused ? event.detail?.id : null);
  focusedGraphContextAvailable = focused && Boolean(temporalGraphView?.hasContext?.());
  temporalGraphView?.setPresentationMode?.(presentationModeActive());
  syncContextualPresentationPanels();
  schedulePresentationGeometryRefresh({ recenterGraph: true });
});

els.timelineViewRoot.addEventListener("timelinefocusrender", () => {
  syncContextualPresentationPanels();
  schedulePresentationGeometryRefresh({ recenterGraph: true });
});

els.graphViewRoot.addEventListener("graphcontextchange", (event) => {
  focusedGraphContextAvailable = Boolean(event.detail?.hasContext);
  syncContextualPresentationPanels();
  schedulePresentationGeometryRefresh({ recenterGraph: true });
});
els.timelineViewRoot.addEventListener("timelinefocusedit", (event) => {
  if (!event.detail?.id) return;
  setEditorSurfaceOpen(true);
  beginItemEdit(event.detail.id);
});
els.timelineViewRoot.addEventListener("timelineevidenceopen", async (event) => {
  const id = event.detail?.id;
  const record = state.evidence.find((candidate) => candidate.id === id);
  if (!record?.file?.blobKey) return;
  try {
    const blob = await evidenceStore.getBlob(record.file.blobKey);
    if (!blob) {
      showStatus("The local PDF is not available in this browser.");
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    console.warn("Could not open local evidence:", error);
    showStatus("Could not open the local evidence file.");
  }
});

els.title.addEventListener("input", () => {
  if (ui.mode !== "edit") return;
  state.title = els.title.value.slice(0, 120);
  els.heading.textContent = state.title.trim() || "Untitled timeline";
  persist();
});

els.loadSample.addEventListener("click", () => {
  if (ui.mode !== "edit") return;
  if (
    (state.items.length || state.stories.length) &&
    !window.confirm("Replace the current timeline with the example dataset?")
  )
    return;
  timelineView?.closeFocus();
  const sample = getSample();
  if (!sample) {
    alert("Sample data is not available");
    return;
  }
  state = normalizeTimeline(clone(sample), { strictGraph: true });
  collapseAllCategories();
  ui.search = "";
  ui.categoryFilter = "all";
  ui.activeStoryId = null;
  ui.storyCursor = 0;
  els.search.value = "";
  resetItemForm();
  resetStoryForm();
  resetCategoryForm();
  resetGraphNodeForm();
  resetGraphEdgeForm();
  persist();
  renderAll();
  showStatus("Example timeline loaded.");
});

function applyImportedTimeline(imported, statusPrefix = "Imported", warningCount = 0) {
  state = normalizeTimeline(imported, { strictGraph: true });
  collapseAllCategories();
  ui.search = "";
  ui.categoryFilter = "all";
  ui.activeStoryId = null;
  ui.storyCursor = 0;
  els.search.value = "";
  resetItemForm();
  resetStoryForm();
  resetCategoryForm();
  resetGraphNodeForm();
  resetGraphEdgeForm();
  persist();
  renderAll();
  const warningText = warningCount
    ? ` · ${warningCount} conversion ${warningCount === 1 ? "warning" : "warnings"}`
    : "";
  showStatus(
    `${statusPrefix} ${state.items.length} ${state.items.length === 1 ? "item" : "items"} and ${state.stories.length} ${state.stories.length === 1 ? "story" : "stories"}${warningText}.`,
  );
}

function graphContract() {
  return (
    graph.getGraphContract?.() || {
      version: graph.GRAPH_CONTRACT_VERSION || "unknown",
      rules: clone(graph.GRAPH_MODEL_RULES || {}),
    }
  );
}

function auditAgentGraph(project) {
  const candidate = clone(project ?? state);
  const errors = graph.validateGraphInput(candidate);
  return {
    valid: errors.length === 0,
    graphContractVersion: graph.GRAPH_CONTRACT_VERSION || graphContract().version,
    errors,
    structure: graph.auditGraphStructure(candidate),
  };
}

function assertAgentGraphValid(project) {
  const audit = auditAgentGraph(project);
  if (audit.valid) return audit;
  throw new Error(
    `Graph contract ${audit.graphContractVersion} rejected the mutation:\n- ${audit.errors.join("\n- ")}`,
  );
}

function validateAgentProject(project) {
  try {
    const candidate = clone(project ?? state);
    const graphAudit = auditAgentGraph(candidate);
    if (!graphAudit.valid) {
      return {
        valid: false,
        graphContractVersion: graphAudit.graphContractVersion,
        errors: graphAudit.errors,
        graph: graphAudit.structure,
      };
    }
    const normalized = normalizeTimeline(candidate, { strictGraph: true });
    return {
      valid: true,
      graphContractVersion: graphAudit.graphContractVersion,
      errors: [],
      graph: graphAudit.structure,
      summary: {
        items: normalized.items.length,
        stories: normalized.stories.length,
        entities: normalized.entities.length,
        places: normalized.places.length,
        relationships: normalized.relationships.length,
      },
    };
  } catch (error) {
    return {
      valid: false,
      graphContractVersion: graph.GRAPH_CONTRACT_VERSION || graphContract().version,
      errors: [error instanceof Error ? error.message : "Timeline validation failed."],
    };
  }
}

function replaceProjectFromAgent(project, statusPrefix = "AI replaced") {
  const candidate = clone(project);
  assertAgentGraphValid(candidate);
  timelineView?.closeFocus();
  applyImportedTimeline(candidate, statusPrefix);
  return clone(state);
}

function applyAgentTransaction(operations) {
  const draft = webMcp.applyOperations(clone(state), operations);
  assertAgentGraphValid(draft);
  const normalized = normalizeTimeline(draft, { strictGraph: true });
  timelineView?.closeFocus();
  applyImportedTimeline(normalized, "AI updated");
  return {
    project: clone(state),
    appliedOperations: operations.length,
    validation: validateAgentProject(state),
  };
}

type WebMcpRegistration = {
  registered: boolean;
  reason?: string;
  toolNames?: string[];
  dispose?: () => void;
};

let webMcpRegistration: WebMcpRegistration | null = null;

const agentApi = Object.freeze({
  getProject: () => clone(state),
  getGraphContract: graphContract,
  auditGraph: auditAgentGraph,
  validateProject: validateAgentProject,
  applyOperations: applyAgentTransaction,
  replaceProject: (project) => ({
    project: replaceProjectFromAgent(project),
    validation: validateAgentProject(state),
  }),
  exportMemgraph: (options = {}) => memgraphInterchange.exportBundle(state, options),
  importMemgraph: (snapshot) => {
    const draft = memgraphInterchange.importSnapshot(snapshot, state);
    return {
      project: replaceProjectFromAgent(draft, "Imported from Memgraph"),
      validation: validateAgentProject(state),
    };
  },
});

globalThis.TimelineAgentAPI = agentApi;

els.importJson.addEventListener("change", async () => {
  if (ui.mode !== "edit") return;
  const file = els.importJson.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error("Import is limited to 5 MB.");
    const raw = JSON.parse(await file.text());
    const adapter = interchangeAdapter;
    const converted = adapter?.isLikelyInterchange(raw) ? adapter.importData(raw) : null;
    const imported = converted?.timeline || raw;
    if (
      (state.items.length || state.stories.length) &&
      !window.confirm("Replace the current timeline with the imported file?")
    )
      return;
    timelineView?.closeFocus();
    applyImportedTimeline(
      imported,
      converted ? "Imported interchange" : "Imported",
      converted?.warnings?.length || 0,
    );
  } catch (error) {
    showStatus(error instanceof Error ? error.message : "Could not import that file.");
  } finally {
    els.importJson.value = "";
  }
});

els.importInterchange.addEventListener("change", async () => {
  if (ui.mode !== "edit") return;
  const file = els.importInterchange.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error("Import is limited to 5 MB.");
    const adapter = interchangeAdapter;
    if (!adapter) throw new Error("Interchange adapter is unavailable.");
    const converted = adapter.importData(await file.text());
    if (
      (state.items.length || state.stories.length) &&
      !window.confirm("Replace the current timeline with the interchange file?")
    )
      return;
    timelineView?.closeFocus();
    applyImportedTimeline(converted.timeline, "Imported interchange", converted.warnings.length);
    if (converted.warnings.length) console.warn("Interchange import warnings:", converted.warnings);
  } catch (error) {
    showStatus(error instanceof Error ? error.message : "Could not import that interchange file.");
  } finally {
    els.importInterchange.value = "";
  }
});

els.exportJson.addEventListener("click", () => {
  download(
    `${JSON.stringify(state, null, 2)}\n`,
    `${slug(state.title)}.json`,
    "application/json;charset=utf-8",
  );
  showStatus("JSON exported.");
});

els.exportInterchange.addEventListener("click", () => {
  const adapter = interchangeAdapter;
  if (!adapter) {
    showStatus("Interchange adapter is unavailable.");
    return;
  }
  const exported = adapter.exportData(state);
  download(
    `${JSON.stringify(exported, null, 2)}\n`,
    `${slug(state.title)}.interchange.json`,
    "application/json;charset=utf-8",
  );
  showStatus("Interchange JSON exported.");
});

els.exportMarkdown.addEventListener("click", () => {
  download(toMarkdown(), `${slug(state.title)}.md`, "text/markdown;charset=utf-8");
  showStatus("Markdown exported.");
});

els.clear.addEventListener("click", () => {
  if (ui.mode !== "edit") return;
  if (
    (state.items.length || state.stories.length || state.title) &&
    !window.confirm("Clear this timeline? This removes its locally stored items and stories.")
  )
    return;
  timelineView?.closeFocus();
  state = blankTimeline();
  collapseAllCategories();
  ui.search = "";
  ui.categoryFilter = "all";
  ui.activeStoryId = null;
  ui.storyCursor = 0;
  els.search.value = "";
  resetItemForm();
  resetStoryForm();
  resetCategoryForm();
  resetGraphNodeForm();
  resetGraphEdgeForm();
  persist();
  renderAll();
  showStatus("Timeline cleared.");
});

fillTimeZoneOptions();
resetItemForm();
resetStoryForm();
resetCategoryForm();
resetGraphNodeForm();
resetGraphEdgeForm();
setActivePanel("items", { open: false });
syncApplicationSurfaces();
renderAll();
void syncInferenceAvailability();

webMcp
  .register(agentApi)
  .then((registration) => {
    webMcpRegistration?.dispose?.();
    webMcpRegistration = registration;
    if (!registration.registered) {
      console.info("Timeline WebMCP tools are unavailable in this browser:", registration.reason);
    }
  })
  .catch((error) => {
    console.warn("Timeline WebMCP registration failed:", error);
  });

const disposeWebMcpRegistration = (): void => {
  webMcpRegistration?.dispose?.();
  webMcpRegistration = null;
};
window.addEventListener("pagehide", disposeWebMcpRegistration, { once: true });

// Set global API for backward compatibility
globalThis.TimelineAgentAPI = agentApi;
