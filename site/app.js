(() => {
  "use strict";

  const VERSION = 2;
  const STORAGE_KEY = "timeline:v2";
  const LEGACY_STORAGE_KEY = "timeline:v1";
  const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
  const temporal = globalThis.TimelineTemporal;
  const spatial = globalThis.TimelineSpatial;
  const graph = globalThis.TimelineGraph;
  const presentation = globalThis.TimelinePresentation;
  const dateRangeFactory = globalThis.TimelineDateRangePicker;
  const navigationFactory = globalThis.TimelineNavigation;
  const evidenceStore = globalThis.TimelineEvidence;
  const temporalGraphFactory = globalThis.TemporalGraphView;
  const presentationLayout = globalThis.TimelinePresentationLayout;
  const caseReasoning = globalThis.TimelineCaseReasoning;
  const migration = globalThis.TimelineMigration;
  const memgraphInterchange = globalThis.TimelineMemgraphInterchange;
  const webMcp = globalThis.TimelineWebMCP;
  if (!temporal) throw new Error("TimelineTemporal must load before app.js.");
  if (!spatial) throw new Error("TimelineSpatial must load before app.js.");
  if (!graph) throw new Error("TimelineGraph must load before app.js.");
  if (!presentation) throw new Error("TimelinePresentation must load before app.js.");
  if (!dateRangeFactory) throw new Error("TimelineDateRangePicker must load before app.js.");
  if (!navigationFactory) throw new Error("TimelineNavigation must load before app.js.");
  if (!evidenceStore) throw new Error("TimelineEvidence must load before app.js.");
  if (!temporalGraphFactory) throw new Error("TemporalGraphView must load before app.js.");
  if (!presentationLayout) throw new Error("TimelinePresentationLayout must load before app.js.");
  if (!caseReasoning) throw new Error("TimelineCaseReasoning must load before app.js.");
  if (!migration) throw new Error("TimelineMigration must load before app.js.");
  if (!memgraphInterchange) throw new Error("TimelineMemgraphInterchange must load before app.js.");
  if (!webMcp) throw new Error("TimelineWebMCP must load before app.js.");

  const DEFAULT_CATEGORIES = [
    { id: "incident", name: "Incident", color: "#b42318" },
    { id: "witness", name: "Witness / Interview", color: "#7a5af8" },
    { id: "communication", name: "Communication", color: "#2563eb" },
    { id: "evidence", name: "Evidence", color: "#027a48" },
    { id: "document", name: "Document / Record", color: "#667085" },
    { id: "decision", name: "Decision / Action", color: "#b54708" },
    { id: "transaction", name: "Transaction", color: "#0e7090" },
    { id: "observation", name: "Observation", color: "#475467" }
  ];

  const SAMPLE = globalThis.TimelineSampleCase;
  if (!SAMPLE) throw new Error("TimelineSampleCase must load before app.js.");

  const els = {
    title: document.querySelector("#timeline-title"),
    heading: document.querySelector("#timeline-heading"),
    itemCount: document.querySelector("#item-count"),
    storyCount: document.querySelector("#story-count"),
    categoryCount: document.querySelector("#category-count"),
    visibleCount: document.querySelector("#visible-count"),
    appShell: document.querySelector("#app-shell"),
    appToolDock: document.querySelector(".app-tool-dock"),
    controlPanel: document.querySelector("#control-panel"),
    controlPanelClose: document.querySelector("#control-panel-close"),
    editorToggle: document.querySelector("#editor-toggle"),
    editorSurfaceTitle: document.querySelector("#editor-surface-title"),
    panelOpeners: [...document.querySelectorAll("[data-open-panel]")],
    semanticIconTargets: [...document.querySelectorAll("[data-semantic-icon]")],
    projectMenu: document.querySelector("#project-menu"),
    projectMenuToggle: document.querySelector("#project-menu-toggle"),
    importJsonTrigger: document.querySelector("#import-json-trigger"),
    importInterchangeTrigger: document.querySelector("#import-interchange-trigger"),
    browserSheet: document.querySelector("#timeline-browser-sheet"),
    browserToggle: document.querySelector("#timeline-browser-toggle"),
    browserClose: document.querySelector("#timeline-browser-close"),
    browserStoryList: document.querySelector("#browser-story-list"),
    browserStoryCount: document.querySelector("#browser-story-count"),
    viewControls: document.querySelector("#timeline-view-toolbar"),
    viewControlsToggle: document.querySelector("#timeline-view-controls-toggle"),
    loadSample: document.querySelector("#load-sample"),
    importJson: document.querySelector("#import-json"),
    importInterchange: document.querySelector("#import-interchange"),
    exportJson: document.querySelector("#export-json"),
    exportInterchange: document.querySelector("#export-interchange"),
    exportMarkdown: document.querySelector("#export-markdown"),
    clear: document.querySelector("#clear-timeline"),
    tabs: [...document.querySelectorAll(".tab")],
    panels: [...document.querySelectorAll(".editor-section")],

    itemForm: document.querySelector("#item-form"),
    itemId: document.querySelector("#item-id"),
    itemKind: document.querySelector("#item-kind"),
    itemCategory: document.querySelector("#item-category"),
    itemLayoutVariant: document.querySelector("#item-layout-variant"),
    itemTerminalShape: document.querySelector("#item-terminal-shape"),
    itemConnectorStyle: document.querySelector("#item-connector-style"),
    itemConnectorRouting: document.querySelector("#item-connector-routing"),
    itemConnectorWeight: document.querySelector("#item-connector-weight"),
    itemConnectorEndpoint: document.querySelector("#item-connector-endpoint"),
    itemLane: document.querySelector("#item-lane"),
    itemDateRange: document.querySelector("#item-date-range"),
    itemCalendarPopover: document.querySelector("#item-calendar-popover"),
    itemCalendarGrid: document.querySelector("#item-calendar-grid"),
    itemCalendarMonth: document.querySelector("#item-calendar-month"),
    itemCalendarYear: document.querySelector("#item-calendar-year"),
    itemCalendarPrev: document.querySelector("#item-calendar-prev"),
    itemCalendarNext: document.querySelector("#item-calendar-next"),
    itemCalendarClear: document.querySelector("#item-calendar-clear"),
    itemStartDate: document.querySelector("#item-start-date"),
    itemStartTime: document.querySelector("#item-start-time"),
    itemStartPrecision: document.querySelector("#item-start-precision"),
    itemStartCertainty: document.querySelector("#item-start-certainty"),
    itemStartZone: document.querySelector("#item-start-zone"),
    itemStartTimeField: document.querySelector("#item-start-time-field"),
    itemStartZoneField: document.querySelector("#item-start-zone-field"),
    itemEndDate: document.querySelector("#item-end-date"),
    itemEndTime: document.querySelector("#item-end-time"),
    itemEndPrecision: document.querySelector("#item-end-precision"),
    itemEndCertainty: document.querySelector("#item-end-certainty"),
    itemEndZone: document.querySelector("#item-end-zone"),
    itemEndTimeField: document.querySelector("#item-end-time-field"),
    itemEndZoneField: document.querySelector("#item-end-zone-field"),
    timeZoneOptions: document.querySelector("#time-zone-options"),
    endField: document.querySelector("#end-field"),
    itemTitle: document.querySelector("#item-title"),
    itemDescription: document.querySelector("#item-description"),
    itemMediaDetails: document.querySelector("#item-media-details"),
    itemMediaRows: [...document.querySelectorAll("[data-media-slot]")],
    itemTagsDetails: document.querySelector("#item-tags-details"),
    itemTagRows: [...document.querySelectorAll("[data-tag-slot]")],
    itemRelationChangesDetails: document.querySelector("#item-relation-changes-details"),
    itemRelationChangeRows: [...document.querySelectorAll("[data-relation-change-slot]")],
    itemEvidenceDetails: document.querySelector("#item-evidence-details"),
    itemEvidenceRows: [...document.querySelectorAll("[data-evidence-slot]")],
    itemLocationDetails: document.querySelector("#item-location-details"),
    itemLocationName: document.querySelector("#item-location-name"),
    itemLocationIdentifier: document.querySelector("#item-location-identifier"),
    itemLocationAddress: document.querySelector("#item-location-address"),
    itemLocationLatitude: document.querySelector("#item-location-latitude"),
    itemLocationLongitude: document.querySelector("#item-location-longitude"),
    itemLocationSource: document.querySelector("#item-location-source"),
    itemLocationAccuracy: document.querySelector("#item-location-accuracy"),
    itemGeolocation: document.querySelector("#item-geolocation"),
    itemLocationClear: document.querySelector("#item-location-clear"),
    itemLocationMap: document.querySelector("#item-location-map"),
    itemFormError: document.querySelector("#item-form-error"),
    saveItem: document.querySelector("#save-item"),
    cancelItemEdit: document.querySelector("#cancel-item-edit"),
    deleteItemEdit: document.querySelector("#delete-item-edit"),

    storyForm: document.querySelector("#story-form"),
    storyId: document.querySelector("#story-id"),
    storyTitle: document.querySelector("#story-title"),
    storyDescription: document.querySelector("#story-description"),
    storyPicker: document.querySelector("#story-picker"),
    storyPickerCount: document.querySelector("#story-picker-count"),
    storySequence: document.querySelector("#story-sequence"),
    storySequenceCount: document.querySelector("#story-sequence-count"),
    storyFormError: document.querySelector("#story-form-error"),
    saveStory: document.querySelector("#save-story"),
    cancelStoryEdit: document.querySelector("#cancel-story-edit"),
    storyList: document.querySelector("#story-list"),
    savedStoryCount: document.querySelector("#saved-story-count"),

    categoryForm: document.querySelector("#category-form"),
    categoryId: document.querySelector("#category-id"),
    categoryName: document.querySelector("#category-name"),
    categoryColor: document.querySelector("#category-color"),
    categoryFormError: document.querySelector("#category-form-error"),
    saveCategory: document.querySelector("#save-category"),
    cancelCategoryEdit: document.querySelector("#cancel-category-edit"),
    categoryList: document.querySelector("#category-list"),

    graphNodeForm: document.querySelector("#graph-node-form"),
    graphNodeId: document.querySelector("#graph-node-id"),
    graphNodeName: document.querySelector("#graph-node-name"),
    graphNodeType: document.querySelector("#graph-node-type"),
    graphNodeAlternateNames: document.querySelector("#graph-node-alternate-names"),
    graphNodeIdentifiers: document.querySelector("#graph-node-identifiers"),
    graphNodeSourceIds: document.querySelector("#graph-node-source-ids"),
    graphNodeProperties: document.querySelector("#graph-node-properties"),
    graphNodeError: document.querySelector("#graph-node-error"),
    saveGraphNode: document.querySelector("#save-graph-node"),
    cancelGraphNodeEdit: document.querySelector("#cancel-graph-node-edit"),
    graphNodeList: document.querySelector("#graph-node-list"),
    graphNodeCount: document.querySelector("#graph-node-count"),
    graphPlaceForm: document.querySelector("#graph-place-form"),
    graphPlaceId: document.querySelector("#graph-place-id"),
    graphPlaceName: document.querySelector("#graph-place-name"),
    graphPlaceIdentifier: document.querySelector("#graph-place-identifier"),
    graphPlaceAddress: document.querySelector("#graph-place-address"),
    graphPlaceLatitude: document.querySelector("#graph-place-latitude"),
    graphPlaceLongitude: document.querySelector("#graph-place-longitude"),
    graphPlaceRadius: document.querySelector("#graph-place-radius"),
    graphPlaceIcon: document.querySelector("#graph-place-icon"),
    graphPlaceMarkerShape: document.querySelector("#graph-place-marker-shape"),
    graphPlaceArea: document.querySelector("#graph-place-area"),
    graphPlaceError: document.querySelector("#graph-place-error"),
    saveGraphPlace: document.querySelector("#save-graph-place"),
    cancelGraphPlaceEdit: document.querySelector("#cancel-graph-place-edit"),
    graphPlaceList: document.querySelector("#graph-place-list"),
    graphPlaceCount: document.querySelector("#graph-place-count"),
    graphEdgeForm: document.querySelector("#graph-edge-form"),
    graphEdgeId: document.querySelector("#graph-edge-id"),
    graphEdgeSubject: document.querySelector("#graph-edge-subject"),
    graphEdgePredicate: document.querySelector("#graph-edge-predicate"),
    graphEdgeObject: document.querySelector("#graph-edge-object"),
    graphEdgePlace: document.querySelector("#graph-edge-place"),
    graphEdgeItemIds: document.querySelector("#graph-edge-item-ids"),
    graphEdgeRole: document.querySelector("#graph-edge-role"),
    graphEdgeInitialState: document.querySelector("#graph-edge-initial-state"),
    graphEdgeSourceIds: document.querySelector("#graph-edge-source-ids"),
    graphEdgeConfidence: document.querySelector("#graph-edge-confidence"),
    graphEdgeProperties: document.querySelector("#graph-edge-properties"),
    graphEdgeTimeKind: document.querySelector("#graph-edge-time-kind"),
    graphEdgeDateField: document.querySelector("#graph-edge-date-field"),
    graphEdgeDateRange: document.querySelector("#graph-edge-date-range"),
    graphEdgeCalendarPopover: document.querySelector("#graph-edge-calendar-popover"),
    graphEdgeCalendarGrid: document.querySelector("#graph-edge-calendar-grid"),
    graphEdgeCalendarMonth: document.querySelector("#graph-edge-calendar-month"),
    graphEdgeCalendarYear: document.querySelector("#graph-edge-calendar-year"),
    graphEdgeCalendarPrev: document.querySelector("#graph-edge-calendar-prev"),
    graphEdgeCalendarNext: document.querySelector("#graph-edge-calendar-next"),
    graphEdgeCalendarClear: document.querySelector("#graph-edge-calendar-clear"),
    graphEdgeStartDate: document.querySelector("#graph-edge-start-date"),
    graphEdgeEndDate: document.querySelector("#graph-edge-end-date"),
    graphEdgeError: document.querySelector("#graph-edge-error"),
    saveGraphEdge: document.querySelector("#save-graph-edge"),
    cancelGraphEdgeEdit: document.querySelector("#cancel-graph-edge-edit"),
    graphEdgeList: document.querySelector("#graph-edge-list"),
    graphEdgeCount: document.querySelector("#graph-edge-count"),
    graphViewRoot: document.querySelector("#temporal-graph-view"),
    graphLens: document.querySelector("#graph-lens"),
    presentationStage: document.querySelector("#presentation-stage"),
    presentationFullscreenToggle: document.querySelector("#presentation-fullscreen-toggle"),
    presentationMapPanel: document.querySelector("#presentation-map-panel"),
    presentationMap: document.querySelector("#presentation-map"),
    presentationMapLabel: document.querySelector("#presentation-map-label"),

    search: document.querySelector("#timeline-search"),
    categoryFilter: document.querySelector("#category-filter"),
    clearFilters: document.querySelector("#clear-filters"),
    timelineViewRoot: document.querySelector("#timeline-view"),
    autoToggle: document.querySelector("#timeline-auto-toggle"),
    autoSeconds: document.querySelector("#timeline-auto-seconds"),
    autoStatus: document.querySelector("#timeline-auto-status"),
    storyFocus: document.querySelector("#story-focus"),
    storyFocusTitle: document.querySelector("#story-focus-title"),
    storyFocusDescription: document.querySelector("#story-focus-description"),
    storyFocusPosition: document.querySelector("#story-focus-position"),
    storyPrev: document.querySelector("#story-prev"),
    storyNext: document.querySelector("#story-next"),
    storyExit: document.querySelector("#story-exit"),
    empty: document.querySelector("#empty-state"),
    filteredEmpty: document.querySelector("#filtered-empty-state"),
    list: document.querySelector("#timeline-list"),
    status: document.querySelector("#status")
  };

  let state = loadState();
  let storyDraftIds = [];
  let statusTimer = 0;
  let navigationController = null;
  const ui = {
    activePanel: "items",
    search: "",
    categoryFilter: "all",
    activeStoryId: null,
    storyCursor: 0,
    mode: "view",
    editorOpen: false,
    browserOpen: false,
    viewControlsOpen: false,
    collapsedCategoryIds: new Set(state.categories.map((category) => category.id))
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
  const temporalGraphView = temporalGraphFactory.create(els.graphViewRoot);
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
    mode: "event"
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
    mode: "range"
  });
  let presentationResizeObserver = null;
  let presentationResizeFrame = 0;
  let timelineOrientationBeforeFullscreen = null;
  let presentationMap = null;
  let presentationMapKey = "";
  let focusedGraphContextAvailable = false;

  const presentationMapAnchor = els.presentationMap
    ? document.createComment("timeline-map-home")
    : null;
  els.presentationMap?.after(presentationMapAnchor);

  const appToolDockAnchor = els.appToolDock
    ? document.createComment("timeline-tool-dock-home")
    : null;
  els.appToolDock?.after(appToolDockAnchor);

  function workspaceToolViewport() {
    const visualViewport = window.visualViewport;
    return {
      width: Math.max(1, visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || 1),
      height: Math.max(1, visualViewport?.height || document.documentElement.clientHeight || window.innerHeight || 1),
      left: Math.max(0, visualViewport?.offsetLeft || 0),
      top: Math.max(0, visualViewport?.offsetTop || 0)
    };
  }

  function positionWorkspaceToolDock() {
    if (!els.appToolDock || !els.projectMenuToggle || !els.timelineViewRoot) return;
    const orientation = els.timelineViewRoot.dataset.orientation === "portrait" ? "portrait" : "landscape";
    els.appToolDock.dataset.projectAnchored = "true";
    els.appToolDock.dataset.timelineOrientation = orientation;

    const triggerRect = els.projectMenuToggle.getBoundingClientRect();
    const viewport = workspaceToolViewport();
    const gap = 6;
    const edge = 8;
    const minLeft = viewport.left + edge;
    const minTop = viewport.top + edge;
    const maxRight = viewport.left + viewport.width - edge;
    const maxBottom = viewport.top + viewport.height - edge;
    const dockRect = els.appToolDock.getBoundingClientRect();
    const dockWidth = Math.max(1, dockRect.width || els.appToolDock.offsetWidth || 1);
    const dockHeight = Math.max(1, dockRect.height || els.appToolDock.offsetHeight || 1);

    let left;
    let top;
    let placement;

    if (orientation === "portrait") {
      const preferredLeft = triggerRect.left - dockWidth - gap;
      const fallbackLeft = triggerRect.right + gap;
      left = preferredLeft >= minLeft ? preferredLeft : fallbackLeft;
      top = triggerRect.top + (triggerRect.height - dockHeight) / 2;
      placement = preferredLeft >= minLeft ? "left" : "right";
    } else {
      const preferredTop = triggerRect.bottom + gap;
      const fallbackTop = triggerRect.top - dockHeight - gap;
      left = triggerRect.left + (triggerRect.width - dockWidth) / 2;
      top = preferredTop + dockHeight <= maxBottom ? preferredTop : fallbackTop;
      placement = preferredTop + dockHeight <= maxBottom ? "below" : "inward";
    }

    left = Math.min(
      Math.max(minLeft, left),
      Math.max(minLeft, maxRight - dockWidth)
    );
    top = Math.min(
      Math.max(minTop, top),
      Math.max(minTop, maxBottom - dockHeight)
    );

    els.appToolDock.dataset.projectAnchorPlacement = placement;
    els.appToolDock.style.setProperty("--workspace-tool-dock-left", `${Math.round(left)}px`);
    els.appToolDock.style.setProperty("--workspace-tool-dock-top", `${Math.round(top)}px`);
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

    const fictionalReferenceFrame =
      state.extensions?.narrative?.spatialReferenceFrame?.fictional === true;
    const mapKey = JSON.stringify({
      id: item.id,
      place,
      fictionalReferenceFrame
    });

    if (presentationMap && presentationMapKey === mapKey) {
      if (!mountMapBackdrop()) return false;
      requestAnimationFrame(() => presentationMap?.refresh?.());
      return true;
    }

    destroyPresentationMap();
    if (!mountMapBackdrop()) return false;

    const name =
      place.name ||
      place.geographicIdentifier ||
      place.address ||
      item.title;
    if (els.presentationMapLabel) els.presentationMapLabel.textContent = name;
    const category = getCategory(item.categoryId);
    presentationMap = mapApi.createReadOnly?.({
      container: els.presentationMap,
      location: place,
      color: category?.color || "#315fbd",
      iconName: place.icon || "place",
      markerShape: place.markerShape || "pin",
      label: name,
      interactive: true,
      countryContextIntro: true,
      fictionalReferenceFrame
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
      els.presentationStage.dataset.hasContextGraph =
        String(Boolean(focused && focusedGraphContextAvailable));
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
      fullscreen: presentationIsFullscreen()
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
    positionWorkspaceToolDock();
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
          timelineView?.setOrientation?.(timelineOrientationBeforeFullscreen, { persist: false, focus: false });
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
      syncViewControlsSurface();
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
    if (!document.fullscreenEnabled || typeof els.presentationStage.requestFullscreen !== "function") {
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
          timelineView?.setOrientation?.(timelineOrientationBeforeFullscreen, { persist: false, focus: false });
          timelineOrientationBeforeFullscreen = null;
        }
        console.warn("Could not enter full-screen presentation:", error);
        showStatus("Could not enter full-screen presentation.");
      }
    }
  }

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const locationMap = globalThis.TimelineLocationMap?.create({
    container: els.itemLocationMap,
    details: els.itemLocationDetails,
    latitude: els.itemLocationLatitude,
    longitude: els.itemLocationLongitude,
    accuracy: els.itemLocationAccuracy,
    source: els.itemLocationSource,
    geolocation: els.itemGeolocation,
    clearButton: els.itemLocationClear
  }) || null;

  function newId(prefix = "id") {
    const random = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${random}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function parseJsonObject(value, label = "Properties") {
    const source = String(value || "").trim();
    if (!source) return {};
    let parsed;
    try {
      parsed = JSON.parse(source);
    } catch {
      throw new Error(`${label} must be valid JSON.`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object.`);
    }
    return parsed;
  }

  function parseJsonArray(value, label = "Identifiers") {
    const source = String(value || "").trim();
    if (!source) return [];
    let parsed;
    try {
      parsed = JSON.parse(source);
    } catch {
      throw new Error(`${label} must be valid JSON.`);
    }
    if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array.`);
    return parsed;
  }

  function parseLineList(value, { maxItems = 48, maxLength = 180 } = {}) {
    return [...new Set(
      String(value || "")
        .split(/\r?\n/)
        .map((entry) => entry.trim().slice(0, maxLength))
        .filter(Boolean)
    )].slice(0, maxItems);
  }

  function normalizeExtensions(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    try {
      return clone(value);
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
    dateObject.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day);
    dateObject.setUTCHours(
      parsed.hour || 0,
      parsed.minute || 0,
      parsed.second || 0,
      parsed.millisecond || 0
    );

    const date = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(dateObject);

    let time = "";
    if (parsed.hasTime) {
      const options = {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC"
      };
      if (parsed.precision === "second" || parsed.precision === "millisecond") options.second = "2-digit";
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

  function normalizeTimeline(input, { strictGraph = false } = {}) {
    if (!input || typeof input !== "object") throw new Error("Expected a timeline object.");
    const retainedMigrationExtensions = migration.extensionsWithRetainedV2(input);
    input = graph.migrateLegacySpatialModel(input, spatial);

    const categories = [];
    const categoryIds = new Set();
    const sourceCategories = Array.isArray(input.categories) && input.categories.length
      ? input.categories
      : DEFAULT_CATEGORIES;

    sourceCategories.forEach((raw, index) => {
      if (!raw || typeof raw !== "object") return;
      const fallbackId = `category-${index + 1}`;
      const id = String(raw.id || fallbackId).trim().slice(0, 80) || fallbackId;
      if (categoryIds.has(id)) return;
      const name = String(raw.name || categoryLabelFromId(id)).trim().slice(0, 60) || categoryLabelFromId(id);
      const category = { id, name, color: normalizeColor(raw.color) };
      const extensions = normalizeExtensions(raw.extensions);
      if (extensions) category.extensions = extensions;
      categories.push(category);
      categoryIds.add(id);
    });

    if (!categories.length) {
      for (const category of DEFAULT_CATEGORIES) {
        categories.push(clone(category));
        categoryIds.add(category.id);
      }
    }

    const ensureCategory = (rawId) => {
      const candidate = String(rawId || categories[0].id).trim().slice(0, 80) || categories[0].id;
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

    let sourceItems;
    if (Array.isArray(input.items)) {
      sourceItems = input.items;
    } else if (Array.isArray(input.events)) {
      sourceItems = input.events.map((legacy) => ({
        id: legacy.id,
        kind: "event",
        start: legacy.date,
        end: null,
        title: legacy.title,
        description: legacy.description,
        categoryId: legacy.category
      }));
    } else {
      sourceItems = [];
    }

    const items = sourceItems.map((raw, index) => {
      if (!raw || typeof raw !== "object") throw new Error(`Item ${index + 1} is not an object.`);
      const kind = raw.kind === "range" ? "range" : "event";
      const rawStart = raw.time?.start?.value ?? raw.start;
      const rawEnd = kind === "range" ? (raw.time?.end?.value ?? raw.end) : null;
      const start = typeof rawStart === "string" ? rawStart.trim() : "";
      const end = kind === "range" && typeof rawEnd === "string" ? rawEnd.trim() : null;
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
      const time = temporal.normalizeExtent(raw.time, start, end, kind);
      if (!time?.start?.value || !Number.isFinite(temporal.sortKey(time.start))) {
        throw new Error(`Item ${index + 1} requires a known, locatable ISO 8601 start value; open or unbounded-unknown chronology starts cannot be placed on the timeline.`);
      }
      if (!title) throw new Error(`Item ${index + 1} is missing a title.`);
      if (kind === "range") {
        if (!time.end?.value || !Number.isFinite(temporal.sortKey(time.end))) {
          throw new Error(`Range ${index + 1} requires a known, locatable ISO 8601 end value; open or unbounded-unknown chronology ends are not rendered as finite ranges.`);
        }
        if (temporal.sortKey(time.end) < temporal.sortKey(time.start)) {
          throw new Error(`Range ${index + 1} ends before it starts.`);
        }
      }

      const item = {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : newId("item"),
        kind,
        start: time.start.value,
        end: kind === "range" ? time.end.value : null,
        time,
        title,
        description: typeof raw.description === "string" ? raw.description.slice(0, 2000) : "",
        categoryId: ensureCategory(raw.categoryId || raw.category)
      };
      const media = presentation.normalizeMedia(raw.media);
      const tags = presentation.normalizeTags(raw.tags);
      if (media.length) item.media = media;
      if (tags.length) item.tags = tags;
      const variant = ["hero-split", "evidence-dossier", "editorial-mosaic"].includes(raw.presentation?.variant)
        ? raw.presentation.variant
        : "hero-split";
      const terminalShape = ["rounded", "circle", "square", "diamond"].includes(raw.presentation?.terminalShape)
        ? raw.presentation.terminalShape
        : "rounded";
      const connectorStyle = ["solid", "dashed", "dotted"].includes(raw.presentation?.connectorStyle)
        ? raw.presentation.connectorStyle
        : "solid";
      const connectorRouting = ["straight", "orthogonal"].includes(raw.presentation?.connectorRouting)
        ? raw.presentation.connectorRouting
        : "straight";
      const connectorWeight = ["fine", "normal", "strong"].includes(raw.presentation?.connectorWeight)
        ? raw.presentation.connectorWeight
        : "normal";
      const connectorEndpoint = ["none", "dot", "arrow"].includes(raw.presentation?.connectorEndpoint)
        ? raw.presentation.connectorEndpoint
        : "none";
      const laneCandidate = raw.presentation?.lane;
      const lane = laneCandidate === null || laneCandidate === undefined || laneCandidate === ""
        ? null
        : Number.isInteger(Number(laneCandidate)) && Number(laneCandidate) >= 0 && Number(laneCandidate) <= 31
          ? Number(laneCandidate)
          : null;
      item.presentation = { variant, terminalShape, connectorStyle, connectorRouting, connectorWeight, connectorEndpoint, lane };
      item.relationChanges = graph.normalizeRelationChanges(raw.relationChanges);
      item.evidenceIds = (Array.isArray(raw.evidenceIds) ? raw.evidenceIds : [])
        .filter((id) => typeof id === "string" && evidenceIds.has(id))
        .slice(0, 12);
      const extensions = normalizeExtensions(raw.extensions);
      if (extensions) item.extensions = extensions;
      return item;
    });

    const itemIds = new Set(items.map((item) => item.id));
    const seenStoryIds = new Set();
    const stories = (Array.isArray(input.stories) ? input.stories : []).map((raw, index) => {
      if (!raw || typeof raw !== "object") throw new Error(`Story ${index + 1} is not an object.`);
      let id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : newId("story");
      if (seenStoryIds.has(id)) id = newId("story");
      seenStoryIds.add(id);
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
      if (!title) throw new Error(`Story ${index + 1} is missing a title.`);
      const uniqueIds = [];
      const seenItems = new Set();
      for (const itemId of Array.isArray(raw.itemIds) ? raw.itemIds : []) {
        if (typeof itemId === "string" && itemIds.has(itemId) && !seenItems.has(itemId)) {
          uniqueIds.push(itemId);
          seenItems.add(itemId);
        }
      }
      const story = {
        id,
        title,
        description: typeof raw.description === "string" ? raw.description.slice(0, 1500) : "",
        itemIds: uniqueIds
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
    for (const relationship of graphData.relationships) {
      relationship.itemIds = (relationship.itemIds || []).filter((id) => itemIds.has(String(id)));
    }
    const graphEndpointIds = new Set(graphData.entities.map((entity) => entity.id));
    graphData.relationships = graphData.relationships.filter(
      (relationship) =>
        graphEndpointIds.has(relationship.subjectId) &&
        graphEndpointIds.has(relationship.objectId)
    );
    const relationshipIds = new Set(graphData.relationships.map((relationship) => relationship.id));
    for (const item of items) {
      item.relationChanges = (item.relationChanges || []).filter(
        (change) => relationshipIds.has(change.relationshipId)
      );
    }
    const normalized = {
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
      reasoning
    };
    const extensions = normalizeExtensions(retainedMigrationExtensions || input.extensions);
    if (extensions) normalized.extensions = extensions;
    return normalized;
  }

  function blankTimeline() {
    return {
      version: VERSION,
      title: "",
      categories: clone(DEFAULT_CATEGORIES),
      items: [],
      stories: [],
      entities: [],
      places: [],
      relationships: [],
      evidence: [],
      custodyActions: [],
      reasoning: caseReasoning.normalizeReasoning({})
    };
  }

  function loadState() {
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
    return normalizeTimeline(clone(SAMPLE), { strictGraph: true });
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Timeline state could not be saved:", error);
      showStatus("Changes are visible, but browser storage is unavailable.");
    }
  }

  function sortItems(items = state.items) {
    return [...items].sort((a, b) => {
      const startDelta = parseDate(a.start).sortKey - parseDate(b.start).sortKey;
      if (startDelta) return startDelta;
      const aEnd = a.end ? parseDate(a.end).sortKey : parseDate(a.start).sortKey;
      const bEnd = b.end ? parseDate(b.end).sortKey : parseDate(b.start).sortKey;
      return aEnd - bEnd || a.title.localeCompare(b.title);
    });
  }

  function getCategory(id) {
    return state.categories.find((category) => category.id === id) || state.categories[0];
  }

  function getStory(id) {
    return state.stories.find((story) => story.id === id) || null;
  }

  function getItem(id) {
    return state.items.find((item) => item.id === id) || null;
  }

  function entityOrItemName(id) {
    const entity = state.entities.find((candidate) => candidate.id === id);
    if (entity) return entity.name || entity.id;
    const item = getItem(id);
    if (item) return item.title || item.id;
    const story = getStory(id);
    return story?.title || id;
  }

  function storySpanLabel(story) {
    const items = story.itemIds.map(getItem).filter(Boolean);
    if (!items.length) return "empty";
    const starts = items.map((item) => temporal.sortKey(item.time?.start || item.start)).filter(Number.isFinite);
    const ends = items.map((item) => item.end
      ? temporal.sortKey(item.time?.end || item.end)
      : temporal.sortKey(item.time?.start || item.start)
    ).filter(Number.isFinite);
    if (!starts.length || !ends.length) return "unknown span";
    const spanMs = Math.max(...ends) - Math.min(...starts);
    const day = 86_400_000;
    if (spanMs < day) return "within one day";
    if (spanMs < day * 60) return `${Math.max(1, Math.round(spanMs / day))} days`;
    if (spanMs < day * 730) return `${Math.max(1, Math.round(spanMs / (day * 30.4375)))} months`;
    return `${(spanMs / (day * 365.2425)).toFixed(1)} years`;
  }

  function storyMembershipCount(itemId) {
    return state.stories.reduce((count, story) => count + (story.itemIds.includes(itemId) ? 1 : 0), 0);
  }

  function getVisibleItems() {
    let items;
    const activeStory = getStory(ui.activeStoryId);
    if (activeStory) {
      items = activeStory.itemIds.map(getItem).filter(Boolean);
    } else {
      items = sortItems();
    }

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
          .filter(Boolean)
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

  function syncViewControlsSurface() {
    if (!els.viewControls) return;
    const shouldOpen = Boolean(ui.viewControlsOpen);
    const isOpen = els.viewControls.matches(":popover-open");

    if (shouldOpen && !isOpen) {
      try {
        els.viewControls.showPopover();
      } catch {
        return;
      }
    } else if (!shouldOpen && isOpen) {
      els.viewControls.hidePopover();
    }
  }

  function syncApplicationSurfaces() {
    if (ui.mode !== "edit") ui.editorOpen = false;
    const editing = ui.mode === "edit";
    if (els.appShell) {
      els.appShell.dataset.mode = ui.mode;
      els.appShell.dataset.editorOpen = String(ui.editorOpen);
      els.appShell.dataset.browserOpen = String(ui.browserOpen);
      els.appShell.dataset.graphOpen = "true";
      els.appShell.dataset.viewControlsOpen = String(ui.viewControlsOpen);
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
    for (const control of [els.loadSample, els.importJsonTrigger, els.importInterchangeTrigger, els.clear]) {
      if (control) control.disabled = !editing;
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
      els.viewControlsToggle.setAttribute("aria-expanded", String(ui.viewControlsOpen));
    }
    syncViewControlsSurface();

    temporalGraphView?.setPresentationMode?.(presentationModeActive());
    syncContextualPresentationPanels();
    schedulePresentationGeometryRefresh({ recenterGraph: true });
  }

  function closeLargeUtilitySurfaces(except = "") {
    if (except !== "editor") ui.editorOpen = false;
    if (except !== "browser") ui.browserOpen = false;
    if (except !== "view") ui.viewControlsOpen = false;
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
        const firstStory = els.browserStoryList?.querySelector(".browser-story-card");
        const firstCategory = els.list?.querySelector(".timeline-category-summary");
        (firstStory || firstCategory || els.search)?.focus({ preventScroll: true });
      });
    }
  }


  function setViewControlsOpen(open) {
    if (ui.mode === "edit") return;
    ui.viewControlsOpen = Boolean(open);
    if (ui.viewControlsOpen) {
      closeLargeUtilitySurfaces("view");
      closeProjectMenu();
      closeFocusedEventForUtility();
    }
    syncApplicationSurfaces();
  }

  function setActivePanel(name, { open = true } = {}) {
    ui.activePanel = name;
    const editorLabels = {
      items: "Events & ranges",
      stories: "Stories",
      categories: "Categories",
      graph: "Graph data"
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

  function fillCategorySelect(select, includeAll, selected) {
    const options = [];
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

    const cards = state.stories.map((story) => {
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

  function renderTimelineList(visible, activeStory) {
    if (activeStory) {
      const ordered = document.createElement("ol");
      ordered.className = "timeline-category-items story-order";
      ordered.replaceChildren(...visible.map((item) => renderItem(item, activeStory)));
      els.list.replaceChildren(ordered);
      return;
    }

    const groups = [];
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
      ui.storyCursor = Math.max(0, Math.min(ui.storyCursor, Math.max(activeStory.itemIds.length - 1, 0)));
      els.storyFocus.hidden = false;
      els.storyFocusTitle.textContent = activeStory.title;
      els.storyFocusDescription.textContent = activeStory.description || "Only the items selected for this story are shown, in narrative order.";
      els.storyFocusPosition.textContent = activeStory.itemIds.length ? `${ui.storyCursor + 1} / ${activeStory.itemIds.length}` : "0 / 0";
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
      stories: state.stories
    };
    const relationshipById = new Map(state.relationships.map((relationship) => [relationship.id, relationship]));

    const allTimelineCoordinates = state.items.flatMap((item) => {
      const coordinates = [temporal.sortKey(item.time?.start || item.start)];
      if (item.end || item.time?.end) coordinates.push(temporal.sortKey(item.time?.end || item.end));
      return coordinates.filter(Number.isFinite);
    });

    timelineView?.setItems(visible.map((item) => {
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
        locationName: placeForItem(item.id)?.name || placeForItem(item.id)?.geographicIdentifier || "",
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
          .filter((relationship) => (relationship.itemIds || []).some((id) => String(id) === String(item.id)))
          .map((relationship) => ({
            id: relationship.id,
            predicate: relationship.predicate,
            role: relationship.role || "",
            subjectId: relationship.subjectId,
            objectId: relationship.objectId,
            subjectName: entityOrItemName(relationship.subjectId),
            objectName: entityOrItemName(relationship.objectId),
            time: relationship.time || null
          })),
        relationChanges: (item.relationChanges || []).map((change) => {
          const relationship = relationshipById.get(change.relationshipId);
          return {
            ...change,
            predicate: change.predicate || relationship?.predicate || "",
            subjectName: relationship ? entityOrItemName(relationship.subjectId) : "",
            objectName: relationship ? entityOrItemName(relationship.objectId) : ""
          };
        }),
        graphContext: graph.neighborhoodGraph(graphInput, item.id, eventViewport, { depth: 1, limit: 28 })
      };
    }), {
      focusId: storyCurrentId,
      allCoordinates: allTimelineCoordinates,
      relationships: graph.temporalRelationProjection(state.relationships, temporal)
    });
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
    actions.append(
      actionButton("Focus", "focus-item", `Focus ${item.title}`)
    );
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
    timeInput.step =
      precision === "millisecond" ? "0.001" :
      precision === "second" ? "1" :
      "60";

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
      timeZone: els[`item${prefix}Zone`].value
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
      caption: inputs.find((input) => input.id.endsWith("-caption"))
    };
  }

  function tagRowParts(row) {
    return {
      label: row.querySelector('input[type="text"]'),
      icon: row.querySelector("select"),
      hue: row.querySelector('input[type="range"]'),
      output: row.querySelector("output")
    };
  }

  function collectMediaForm() {
    const media = [];
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
    const tags = [];
    for (const row of els.itemTagRows) {
      const parts = tagRowParts(row);
      const label = parts.label.value.trim();
      if (!label) continue;
      tags.push({
        label,
        icon: parts.icon.value,
        hue: Number(parts.hue.value)
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

  function relationChangeRowParts(row) {
    return {
      relationship: row.querySelector('select[id$="-relation"]'),
      operation: row.querySelector('select[id$="-operation"]'),
      predicate: row.querySelector('input[id$="-predicate"]'),
      role: row.querySelector('input[id$="-role"]'),
      properties: row.querySelector('textarea[id$="-properties"]')
    };
  }

  function fillRelationChangeOptions(select, selected = "") {
    const options = [document.createElement("option")];
    options[0].value = "";
    options[0].textContent = "No relation change";
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
    const changes = [];
    const seen = new Set();
    for (const row of els.itemRelationChangeRows) {
      const parts = relationChangeRowParts(row);
      const relationshipId = parts.relationship.value;
      if (!relationshipId) continue;
      if (seen.has(relationshipId)) throw new Error("An event can define only one change per relation.");
      seen.add(relationshipId);
      const operation = ["activate", "deactivate", "update"].includes(parts.operation.value)
        ? parts.operation.value
        : "update";
      const change = {
        relationshipId,
        operation,
        predicate: "",
        role: "",
        properties: {}
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
          throw new Error(`Relation property “${duplicateContextKey}” duplicates structured context. Time and place must use the edge's canonical fields.`);
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
      fileStatus: row.querySelector(".evidence-file-status")
    };
  }

  async function collectEvidenceForm() {
    const records = [];
    for (const row of els.itemEvidenceRows) {
      const parts = evidenceRowParts(row);
      const title = parts.title.value.trim();
      if (!title) continue;
      const id = parts.id.value || newId("evidence");
      const existing = state.evidence.find((record) => record.id === id);
      const file = parts.file.files?.[0] || null;
      let fileMetadata = existing?.file || null;
      if (file) {
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error("Evidence uploads must be PDF files.");
        }
        if (file.size > 25_000_000) throw new Error("PDF evidence uploads are limited to 25 MB each.");
        const blobKey = `evidence:${id}`;
        await evidenceStore.putBlob(blobKey, file);
        fileMetadata = {
          blobKey,
          name: file.name.slice(0, 260),
          mimeType: file.type || "application/pdf",
          size: file.size
        };
      }
      const record = evidenceStore.normalizeRecord({
        id,
        type: parts.type.value,
        title,
        sourceName: parts.sourceName.value,
        publishedAt: parts.publishedAt.value,
        url: parts.url.value,
        note: parts.note.value,
        file: fileMetadata,
        forensic: existing?.forensic || null
      });
      if (record) records.push(record);
    }
    return records;
  }

  function fillEvidenceForm(item) {
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
      parts.fileStatus.textContent = record?.file?.name
        ? `Stored locally: ${record.file.name}`
        : "";
    });
    els.itemEvidenceDetails.open = attached.length > 0;
  }

  function mergeEvidenceRecords(records) {
    const map = new Map(state.evidence.map((record) => [record.id, record]));
    for (const record of records) map.set(record.id, record);
    state.evidence = [...map.values()];
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
    els.itemLocationName.value = parts.name;
    els.itemLocationIdentifier.value = parts.geographicIdentifier;
    els.itemLocationAddress.value = parts.address;
    els.itemLocationLatitude.value = parts.latitude;
    els.itemLocationLongitude.value = parts.longitude;
    els.itemLocationSource.value = parts.source;
    els.itemLocationAccuracy.value = parts.accuracyMeters;
    els.itemLocationDetails.open = Boolean(location);
    if (location) locationMap?.refresh();
  }

  function resetItemForm() {
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
    els.itemLane.value = Number.isInteger(item.presentation?.lane) ? String(item.presentation.lane) : "";
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
    const suffix = affectedStories ? ` It will also be removed from ${affectedStories} ${affectedStories === 1 ? "story" : "stories"}.` : "";
    if (!window.confirm(`Delete “${item.title}”?${suffix}`)) return;
    state.items = state.items.filter((candidate) => candidate.id !== id);
    state.stories = state.stories.map((story) => ({ ...story, itemIds: story.itemIds.filter((itemId) => itemId !== id) }));
    state.relationships = state.relationships.map((relationship) => ({
      ...relationship,
      itemIds: (relationship.itemIds || []).filter((itemId) => itemId !== id)
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
      meta.textContent = `${formatDateInline(item.start)} · ${getCategory(item.categoryId).name}`;
      copy.append(title, meta);
      label.append(checkbox, copy);
      return label;
    });
    els.storyPicker.replaceChildren(...pickerRows);

    const sequenceRows = storyDraftIds.map((id, index) => {
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
    }).filter(Boolean);
    els.storySequence.replaceChildren(...sequenceRows);
  }

  function resetStoryForm() {
    els.storyForm.reset();
    els.storyId.value = "";
    storyDraftIds = [];
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
    els.saveStory.textContent = "Save story";
    els.cancelStoryEdit.hidden = false;
    setError(els.storyFormError);
    renderStoryBuilder();
    els.storyTitle.focus();
  }

  function removeStory(id) {
    const story = getStory(id);
    if (!story || !window.confirm(`Delete story “${story.title}”? Timeline items will not be deleted.`)) return;
    const removedRelationshipIds = state.relationships
      .filter((relationship) => relationship.subjectId === id || relationship.objectId === id)
      .map((relationship) => relationship.id);
    state.stories = state.stories.filter((candidate) => candidate.id !== id);
    state.relationships = state.relationships.filter(
      (relationship) => relationship.subjectId !== id && relationship.objectId !== id
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
    const cards = state.stories.map((story) => {
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
        actionButton("Delete", "delete-story", `Delete story ${story.title}`, "delete")
      );
      top.append(copy, actions);
      const meta = document.createElement("div");
      meta.className = "story-meta";
      meta.textContent = `${story.itemIds.length} ${story.itemIds.length === 1 ? "step" : "steps"} · ${storySpanLabel(story)}`;
      card.append(top, meta);
      return card;
    });
    if (!cards.length) {
      const empty = document.createElement("p");
      empty.className = "privacy-note";
      empty.textContent = "No stories yet. Select timeline items above to create a focused narrative path.";
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

  function focusCurrentStoryItem(openFocus = false, options = {}) {
    const story = getStory(ui.activeStoryId);
    if (!story || !story.itemIds.length) return;
    const currentId = story.itemIds[ui.storyCursor];
    if (openFocus) {
      timelineView?.focusItem(currentId, {
        direction: Number(options.direction) < 0 ? -1 : 1
      });
      return;
    }
    requestAnimationFrame(() => {
      const element = els.list.querySelector(`[data-id="${CSS.escape(currentId)}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function stepStory(delta, options = {}) {
    const story = getStory(ui.activeStoryId);
    if (!story) return false;
    const next = ui.storyCursor + (delta < 0 ? -1 : 1);
    if (next < 0 || next >= story.itemIds.length) return false;
    ui.storyCursor = next;
    renderTimeline();
    focusCurrentStoryItem(Boolean(options.focusEvent), {
      direction: delta < 0 ? -1 : 1
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
    const detail = usage ? ` ${usage} ${usage === 1 ? "item" : "items"} will be reassigned to “${replacement.name}”.` : "";
    if (!window.confirm(`Delete category “${category.name}”?${detail}`)) return;
    state.categories = state.categories.filter((candidate) => candidate.id !== id);
    state.items = state.items.map((item) => item.categoryId === id ? { ...item, categoryId: replacement.id } : item);
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
        actionButton("Delete", "delete-category", `Delete category ${category.name}`, "delete")
      );
      row.append(identity, actions);
      return row;
    });
    els.categoryList.replaceChildren(...rows);
  }

  function graphEndpointOptions(select, selected = "") {
    const groups = [
      ["Entity nodes", state.entities.map((entity) => ({ id: entity.id, label: entity.name, type: entity.type }))]
    ];
    const nodes = [];
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

  function graphContextItemOptions(select, selected = []) {
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
        (change) => !removed.has(String(change.relationshipId))
      )
    }));
  }

  function removeGraphNode(id) {
    const entity = state.entities.find((candidate) => candidate.id === id);
    if (!entity) return;
    const edgeCount = state.relationships.filter(
      (relationship) => relationship.subjectId === id || relationship.objectId === id
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
      (relationship) => relationship.subjectId !== id && relationship.objectId !== id
    );
    pruneRelationChanges(removedRelationshipIds);
    if (els.graphNodeId.value === id) resetGraphNodeForm();
    persist();
    renderAll();
    showStatus("Graph node deleted.");
  }

  function renderGraphNodes() {
    els.graphNodeCount.textContent = String(state.entities.length);
    const rows = state.entities.map((entity) => {
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
        actionButton("Delete", "delete-graph-node", `Delete node ${entity.name}`, "delete")
      );
      row.append(copy, actions);
      return row;
    });
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "privacy-note";
      empty.textContent = "No graph nodes yet. Each node represents one entity such as a person, organization, device, account, document, or object. Places and time are edge context, not nodes.";
      rows.push(empty);
    }
    els.graphNodeList.replaceChildren(...rows);
  }

  function graphPlaceOptions(select, selected = "") {
    if (!select) return;
    const options = [document.createElement("option")];
    options[0].value = "";
    options[0].textContent = "No place";
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
      (relationship.itemIds || []).some((id) => String(id) === String(itemId))
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
    els.graphPlaceName.value = parts.name;
    els.graphPlaceIdentifier.value = parts.geographicIdentifier;
    els.graphPlaceAddress.value = parts.address;
    els.graphPlaceLatitude.value = parts.latitude;
    els.graphPlaceLongitude.value = parts.longitude;
    els.graphPlaceRadius.value = parts.radiusMeters;
    els.graphPlaceIcon.value = presentation.ICON_NAMES.includes(parts.icon) ? parts.icon : "place";
    els.graphPlaceMarkerShape.value = parts.markerShape;
    els.graphPlaceArea.value = parts.areaGeometry;
    els.saveGraphPlace.textContent = "Save place";
    els.cancelGraphPlaceEdit.hidden = false;
    setError(els.graphPlaceError);
    els.graphPlaceName.focus();
  }

  function removeGraphPlace(id) {
    const place = getPlace(id);
    if (!place) return;
    const usage = state.relationships.filter((relationship) => relationship.placeId === id).length;
    const suffix = usage ? ` ${usage} ${usage === 1 ? "edge" : "edges"} will lose this spatial reference.` : "";
    if (!window.confirm(`Delete place “${place.name}”?${suffix}`)) return;
    state.places = state.places.filter((candidate) => candidate.id !== id);
    state.relationships = state.relationships.map((relationship) =>
      relationship.placeId === id ? { ...relationship, placeId: "" } : relationship
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
      meta.textContent = `${geometry}${radius} · ${place.icon || "place"} · ${place.markerShape || "pin"}`;
      copy.append(title, meta);
      const actions = document.createElement("div");
      actions.className = "graph-record-actions";
      actions.append(
        actionButton("Edit", "edit-graph-place", `Edit place ${place.name}`),
        actionButton("Delete", "delete-graph-place", `Delete place ${place.name}`, "delete")
      );
      row.append(copy, actions);
      return row;
    });
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "privacy-note";
      empty.textContent = "No places yet. Create reusable point, radius, or area records here, then select them from edges.";
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

  function buildGraphEdgeTime() {
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
      timeZone: ""
    });
    const end = kind === "range"
      ? temporal.buildEndpoint({
          date: endDate,
          time: "",
          precision: "day",
          certainty: "exact",
          timeZone: ""
        })
      : null;
    if (end && temporal.sortKey(end) < temporal.sortKey(start)) {
      throw new Error("The edge end cannot be earlier than its start.");
    }
    return {
      type: kind === "range" ? "interval" : "instant",
      start,
      end
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
    els.graphEdgeInitialState.value = relationship.initialState === "inactive" ? "inactive" : "active";
    els.graphEdgeSourceIds.value = (relationship.sourceIds || []).join("\n");
    els.graphEdgeConfidence.value = relationship.confidence ?? "";
    els.graphEdgeProperties.value = JSON.stringify(relationship.attributes || {}, null, 2);
    const timeKind = relationship.time?.end ? "range" : relationship.time?.start ? "event" : "timeless";
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
      const when = relationship.time ? temporal.intervalRepresentation(relationship.time) : "event-driven / timeless";
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
        actionButton("Delete", "delete-graph-edge", `Delete edge ${relationship.predicate}`, "delete")
      );
      row.append(copy, actions);
      return row;
    });
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "privacy-note";
      empty.textContent = "No graph edges yet. Edges connect two different entity nodes, use an action-only label, and carry structured time plus an optional reusable place reference.";
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
      relationships: state.relationships,
      items: state.items
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
  updatePresentationStageLayout();
  requestAnimationFrame(positionWorkspaceToolDock);
  window.addEventListener("resize", positionWorkspaceToolDock);
  window.visualViewport?.addEventListener("resize", positionWorkspaceToolDock);
  window.visualViewport?.addEventListener("scroll", positionWorkspaceToolDock);

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
      const when = item.kind === "range"
        ? `${formatDateInline(item.start)} → ${formatDateInline(item.end)}`
        : formatDateInline(item.start);
      lines.push(`### ${when} — ${item.title}`, "", `Type: ${item.kind}  `, `Category: ${category.name}`);
      const place = placeForItem(item.id);
      if (place) {
        const label = place.name || place.geographicIdentifier || place.address || "Coordinates";
        const coordinates = place.geometry?.type === "Point" ? place.geometry.coordinates : null;
        lines.push(`Location: ${label}${coordinates ? ` (${coordinates[1]}, ${coordinates[0]})` : ""}  `);
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
          const when = item.kind === "range"
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
        if (record.file?.name) lines.push(`Local PDF metadata: ${record.file.name} (${record.file.size || 0} bytes)  `);
        if (record.note) lines.push("", record.note);
        const supported = state.items.filter((item) => item.evidenceIds?.includes(record.id));
        if (supported.length) lines.push("", `Supports: ${supported.map((item) => item.title).join("; ")}`);
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
          `- ${relationship.subjectId} —${relationship.predicate}→ ${relationship.objectId} (time: ${when}${spatialContext})`
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

  function renderAutoAdvanceState(autoState) {
    const seconds = Math.round(autoState.intervalMs / 1000);
    const playing = autoState.running && !autoState.paused;
    els.autoToggle.setAttribute("aria-pressed", String(playing));
    setSemanticControlIcon(
      els.autoToggle,
      playing ? "pause" : "play",
      playing ? "Pause slideshow" : "Play slideshow"
    );
    if (!autoState.running) {
      els.autoStatus.textContent = "Slideshow stopped";
      return;
    }
    if (autoState.paused) {
      els.autoStatus.textContent = autoState.pauseReason === "interaction"
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

  function advancePresentation(delta, options = {}) {
    const story = getStory(ui.activeStoryId);
    if (story) return stepStory(delta, { focusEvent: options.focusEvent !== false });
    return timelineView?.focusAdjacent(delta) || false;
  }

  function handlePresentationCommand(command, meta = {}) {
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
      if (
        presentationIsFullscreen() &&
        meta.source === "keyboard" &&
        meta.event?.key === "Escape"
      ) {
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
      onStateChange: renderAutoAdvanceState
    }
  });

  els.autoToggle.addEventListener("click", () => handlePresentationCommand("toggle-auto"));
  els.autoSeconds.addEventListener("change", () => {
    const seconds = Math.max(2, Math.min(3600, Number(els.autoSeconds.value) || 10));
    els.autoSeconds.value = String(seconds);
    navigationController.auto.setIntervalMs(seconds * 1000);
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
      visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || 1
    );
    const height = Math.max(
      1,
      visualViewport?.height || document.documentElement.clientHeight || window.innerHeight || 1
    );
    return {
      width,
      height,
      left: Math.max(0, visualViewport?.offsetLeft || 0),
      top: Math.max(0, visualViewport?.offsetTop || 0)
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
    const menuWidth = Math.min(340, availableWidth);
    const menuHeight = Math.min(
      620,
      Math.max(1, els.projectMenu.scrollHeight || 340),
      availableHeight
    );
    const portrait = els.timelineViewRoot?.dataset.orientation === "portrait";
    const preferredLeft = portrait ? rect.left - menuWidth - gap : rect.left;
    const left = Math.min(
      Math.max(minLeft, preferredLeft),
      Math.max(minLeft, maxRight - menuWidth)
    );
    const opensUpward = !portrait && rect.top > viewport.top + viewport.height / 2;
    const preferredTop = opensUpward
      ? rect.top - menuHeight - gap
      : portrait ? rect.top : rect.bottom + gap;
    const top = Math.min(
      Math.max(minTop, preferredTop),
      Math.max(minTop, maxBottom - menuHeight)
    );

    els.projectMenu.style.setProperty("--project-menu-left", `${Math.round(left)}px`);
    els.projectMenu.style.setProperty("--project-menu-top", `${Math.round(top)}px`);
    els.projectMenu.style.setProperty("--project-menu-max-width", `${Math.floor(availableWidth)}px`);
    els.projectMenu.style.setProperty("--project-menu-max-height", `${Math.floor(availableHeight)}px`);

    if (els.projectMenu.matches(":popover-open")) {
      const menuRect = els.projectMenu.getBoundingClientRect();
      const clampedLeft = Math.min(
        Math.max(minLeft, menuRect.left),
        Math.max(minLeft, maxRight - menuRect.width)
      );
      const clampedTop = Math.min(
        Math.max(minTop, menuRect.top),
        Math.max(minTop, maxBottom - menuRect.height)
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
    if (event.newState !== "open") return;
    requestAnimationFrame(positionProjectMenu);
  });
  window.addEventListener("resize", repositionOpenProjectMenu);
  window.visualViewport?.addEventListener("resize", repositionOpenProjectMenu);
  window.visualViewport?.addEventListener("scroll", repositionOpenProjectMenu);

  els.projectMenu?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-project-menu-close]");
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
  els.viewControlsToggle?.addEventListener("click", () => setViewControlsOpen(!ui.viewControlsOpen));

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
    if (ui.viewControlsOpen && !presentationIsFullscreen()) {
      event.preventDefault();
      setViewControlsOpen(false);
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
    const alternateNames = parseLineList(els.graphNodeAlternateNames.value, { maxItems: 48, maxLength: 180 });
    const sourceIds = parseLineList(els.graphNodeSourceIds.value, { maxItems: 96, maxLength: 120 });
    let identifiers;
    let attributes;
    try {
      identifiers = parseJsonArray(els.graphNodeIdentifiers.value, "Node identifiers");
      attributes = parseJsonObject(els.graphNodeProperties.value, "Node properties");
    } catch (error) {
      setError(els.graphNodeError, error instanceof Error ? error.message : "Check the node identifiers and properties.");
      return;
    }
    const entity = {
      id: els.graphNodeId.value || newId("entity"),
      type: type.slice(0, 60),
      name: name.slice(0, 180),
      alternateNames,
      identifiers,
      sourceIds,
      attributes
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
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest(".graph-record");
    if (!button || !row) return;
    if (button.dataset.action === "edit-graph-node") beginGraphNodeEdit(row.dataset.id);
    if (button.dataset.action === "delete-graph-node") removeGraphNode(row.dataset.id);
  });

  els.graphPlaceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setError(els.graphPlaceError);
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
        areaGeometry: els.graphPlaceArea.value.trim()
      });
      if (!place) throw new Error("A place name is required.");
      if (!place.geometry) throw new Error("A place needs point coordinates or an area geometry.");
      const duplicate = state.places.find((candidate) =>
        candidate.id !== place.id &&
        spatial.placeIdentity(candidate) === spatial.placeIdentity(place)
      );
      if (duplicate) throw new Error(`This location already exists as “${duplicate.name}”. Reuse it from the edge Place selector instead of creating a duplicate.`);
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
      setError(els.graphPlaceError, error instanceof Error ? error.message : "Check the place geometry.");
    }
  });

  els.cancelGraphPlaceEdit.addEventListener("click", resetGraphPlaceForm);

  els.graphPlaceList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest(".graph-record");
    if (!button || !row) return;
    if (button.dataset.action === "edit-graph-place") beginGraphPlaceEdit(row.dataset.id);
    if (button.dataset.action === "delete-graph-place") removeGraphPlace(row.dataset.id);
  });

  els.graphEdgeTimeKind.addEventListener("change", () => {
    const start = els.graphEdgeStartDate.value;
    const end = els.graphEdgeEndDate.value;
    configureGraphEdgeTime();
    if (els.graphEdgeTimeKind.value !== "timeless") {
      graphEdgeDatePicker.setRange(
        start,
        els.graphEdgeTimeKind.value === "range" ? end : ""
      );
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
      setError(els.graphEdgeError, "Choose two different entities. An edge cannot originate from and target the same node.");
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
    let attributes;
    let time;
    try {
      attributes = parseJsonObject(els.graphEdgeProperties.value, "Edge properties");
      const duplicateContextKey = Object.keys(attributes).find(graph.contextPropertyKey);
      if (duplicateContextKey) {
        throw new Error(`Edge property “${duplicateContextKey}” duplicates structured context. Use the Time and Place fields instead.`);
      }
      time = buildGraphEdgeTime();
    } catch (error) {
      setError(els.graphEdgeError, error instanceof Error ? error.message : "Check the edge properties and time.");
      return;
    }

    const relationship = {
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
      attributes
    };
    const duplicateFact = graph.findDuplicateRelationship(relationship, state.relationships, relationship.id);
    if (duplicateFact) {
      setError(els.graphEdgeError, `This action fact already exists as “${duplicateFact.id}”. Keep one canonical edge and add chronology, provenance, place, confidence, or other context to that edge instead of duplicating it.`);
      return;
    }
    const mirroredFact = graph.findMirroredRelationship(relationship, state.relationships, relationship.id);
    if (mirroredFact) {
      setError(els.graphEdgeError, `A reverse copy of this same action fact already exists as “${mirroredFact.id}”. Direction is part of the fact; create a reverse edge only when it describes a genuinely different reverse action.`);
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
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest(".graph-record");
    if (!button || !row) return;
    if (button.dataset.action === "edit-graph-edge") beginGraphEdgeEdit(row.dataset.id);
    if (button.dataset.action === "delete-graph-edge") removeGraphEdge(row.dataset.id);
  });

  if (els.presentationFullscreenToggle) {
    if (!document.fullscreenEnabled || typeof els.presentationStage?.requestFullscreen !== "function") {
      els.presentationFullscreenToggle.disabled = true;
      els.presentationFullscreenToggle.title = "Full-screen presentation is unavailable in this browser.";
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
      active?.isContentEditable
    ) return;
    const stageHasFocus = Boolean(
      presentationIsFullscreen() ||
      (active instanceof Element && els.presentationStage?.contains(active))
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

  els.itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError(els.itemFormError);
    const kind = els.itemKind.value === "range" ? "range" : "event";
    const title = els.itemTitle.value.trim();

    let startEndpoint;
    let endEndpoint = null;
    let media = [];
    let tags = [];
    let relationChanges = [];
    let evidenceRecords = [];
    try {
      if (!els.itemStartDate.value) throw new Error("Choose a calendar date.");
      if (kind === "range" && !els.itemEndDate.value) throw new Error("Choose both dates for the range.");
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
      setError(els.itemFormError, error instanceof Error ? error.message : "Check the temporal, media, tag, or evidence values.");
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
      setError(els.itemFormError, "Lane must be a whole number from 0 through 31, or left blank for automatic placement.");
      els.itemLane.focus();
      return;
    }

    const item = {
      id: els.itemId.value || newId("item"),
      kind,
      start: startEndpoint.value,
      end: kind === "range" ? endEndpoint.value : null,
      time: {
        type: kind === "range" ? "interval" : "instant",
        start: startEndpoint,
        end: kind === "range" ? endEndpoint : null
      },
      title: title.slice(0, 160),
      description: els.itemDescription.value.trim().slice(0, 2000),
      categoryId: state.categories.some((category) => category.id === els.itemCategory.value)
        ? els.itemCategory.value
        : state.categories[0].id,
      presentation: {
        variant: els.itemLayoutVariant.value,
        terminalShape: els.itemTerminalShape.value,
        connectorStyle: els.itemConnectorStyle.value,
        connectorRouting: els.itemConnectorRouting.value,
        connectorWeight: els.itemConnectorWeight.value,
        connectorEndpoint: els.itemConnectorEndpoint.value,
        lane: manualLane
      },
      relationChanges,
      evidenceIds: evidenceRecords.map((record) => record.id)
    };
    if (media.length) item.media = media;
    if (tags.length) item.tags = tags;
    mergeEvidenceRecords(evidenceRecords);

    const index = state.items.findIndex((candidate) => candidate.id === item.id);
    if (index >= 0) {
      state.items[index] = item;
      showStatus("Timeline item updated.");
    } else {
      state.items.push(item);
      showStatus(`${kind === "range" ? "Range" : "Event"} added.`);
    }
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

  els.list.addEventListener("toggle", (event) => {
    const details = event.target.closest?.(".timeline-category-group");
    if (!details) return;
    if (details.open) ui.collapsedCategoryIds.delete(details.dataset.categoryId);
    else ui.collapsedCategoryIds.add(details.dataset.categoryId);
  }, true);

  els.list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "focus-category") {
      const group = event.target.closest(".timeline-category-shell");
      if (group) focusCategory(group.dataset.categoryId);
      return;
    }

    const itemElement = event.target.closest(".timeline-item");
    if (!itemElement) return;
    if (button.dataset.action === "focus-item") {
      setBrowserSurfaceOpen(false);
      timelineView?.focusItem(itemElement.dataset.id);
    }
    if (button.dataset.action === "story-focus") {
      ui.storyCursor = Number(button.dataset.storyIndex);
      renderTimeline();
      focusCurrentStoryItem();
    }
  });

  els.storyPicker.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    if (checkbox.checked && !storyDraftIds.includes(checkbox.value)) storyDraftIds.push(checkbox.value);
    if (!checkbox.checked) storyDraftIds = storyDraftIds.filter((id) => id !== checkbox.value);
    renderStoryBuilder();
  });

  els.storySequence.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest(".sequence-row");
    if (!button || !row) return;
    const index = storyDraftIds.indexOf(row.dataset.id);
    if (index < 0) return;
    if (button.dataset.action === "story-up" && index > 0) {
      [storyDraftIds[index - 1], storyDraftIds[index]] = [storyDraftIds[index], storyDraftIds[index - 1]];
    }
    if (button.dataset.action === "story-down" && index < storyDraftIds.length - 1) {
      [storyDraftIds[index + 1], storyDraftIds[index]] = [storyDraftIds[index], storyDraftIds[index + 1]];
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
      itemIds: [...storyDraftIds]
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
    const button = event.target.closest("button[data-action]");
    const card = event.target.closest(".story-card");
    if (!button || !card) return;
    if (button.dataset.action === "focus-story") focusStory(card.dataset.id);
    if (button.dataset.action === "edit-story") beginStoryEdit(card.dataset.id);
    if (button.dataset.action === "delete-story") removeStory(card.dataset.id);
  });

  els.browserStoryList?.addEventListener("click", (event) => {
    const card = event.target.closest(".browser-story-card[data-id]");
    if (!card) return;
    focusStory(card.dataset.id);
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
    const duplicate = state.categories.some((category) => category.id !== editingId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (duplicate) {
      setError(els.categoryFormError, "Category names must be unique.");
      els.categoryName.focus();
      return;
    }
    const category = {
      id: editingId || newId("category"),
      name: name.slice(0, 60),
      color: normalizeColor(els.categoryColor.value)
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
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest(".category-row");
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

  function focusTimelineFromGraph(id) {
    if (!id || !getItem(id)) return false;
    ui.search = "";
    ui.categoryFilter = "all";
    ui.activeStoryId = null;
    ui.storyCursor = 0;
    els.search.value = "";
    renderTimeline();
    requestAnimationFrame(() => timelineView?.focusItem(id));
    return true;
  }

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
    if ((state.items.length || state.stories.length) && !window.confirm("Replace the current timeline with the example dataset?")) return;
    timelineView?.closeFocus();
    state = normalizeTimeline(clone(SAMPLE), { strictGraph: true });
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
    const warningText = warningCount ? ` · ${warningCount} conversion ${warningCount === 1 ? "warning" : "warnings"}` : "";
    showStatus(`${statusPrefix} ${state.items.length} ${state.items.length === 1 ? "item" : "items"} and ${state.stories.length} ${state.stories.length === 1 ? "story" : "stories"}${warningText}.`);
  }

  function validateAgentProject(project) {
    try {
      const normalized = normalizeTimeline(clone(project ?? state), { strictGraph: true });
      return {
        valid: true,
        errors: [],
        summary: {
          items: normalized.items.length,
          stories: normalized.stories.length,
          entities: normalized.entities.length,
          places: normalized.places.length,
          relationships: normalized.relationships.length
        }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : "Timeline validation failed."]
      };
    }
  }

  function replaceProjectFromAgent(project, statusPrefix = "AI replaced") {
    timelineView?.closeFocus();
    applyImportedTimeline(clone(project), statusPrefix);
    return clone(state);
  }

  function applyAgentTransaction(operations) {
    const draft = webMcp.applyOperations(clone(state), operations);
    const normalized = normalizeTimeline(draft, { strictGraph: true });
    timelineView?.closeFocus();
    applyImportedTimeline(normalized, "AI updated");
    return {
      project: clone(state),
      appliedOperations: operations.length,
      validation: validateAgentProject(state)
    };
  }

  const agentApi = Object.freeze({
    getProject: () => clone(state),
    validateProject: validateAgentProject,
    applyOperations: applyAgentTransaction,
    replaceProject: (project) => ({
      project: replaceProjectFromAgent(project),
      validation: validateAgentProject(state)
    }),
    exportMemgraph: (options = {}) => memgraphInterchange.exportBundle(state, options),
    importMemgraph: (snapshot) => {
      const draft = memgraphInterchange.importSnapshot(snapshot, state);
      return {
        project: replaceProjectFromAgent(draft, "Imported from Memgraph"),
        validation: validateAgentProject(state)
      };
    }
  });

  globalThis.TimelineAgentAPI = agentApi;

  els.importJson.addEventListener("change", async () => {
    if (ui.mode !== "edit") return;
    const file = els.importJson.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Import is limited to 5 MB.");
      const raw = JSON.parse(await file.text());
      const adapter = globalThis.TimelineInterchangeAdapter;
      const converted = adapter?.isLikelyInterchange(raw) ? adapter.importData(raw) : null;
      const imported = converted?.timeline || raw;
      if ((state.items.length || state.stories.length) && !window.confirm("Replace the current timeline with the imported file?")) return;
      timelineView?.closeFocus();
      applyImportedTimeline(
        imported,
        converted ? "Imported interchange" : "Imported",
        converted?.warnings?.length || 0
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
      const adapter = globalThis.TimelineInterchangeAdapter;
      if (!adapter) throw new Error("Interchange adapter is unavailable.");
      const converted = adapter.importData(await file.text());
      if ((state.items.length || state.stories.length) && !window.confirm("Replace the current timeline with the interchange file?")) return;
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
    download(`${JSON.stringify(state, null, 2)}\n`, `${slug(state.title)}.json`, "application/json;charset=utf-8");
    showStatus("JSON exported.");
  });

  els.exportInterchange.addEventListener("click", () => {
    const adapter = globalThis.TimelineInterchangeAdapter;
    if (!adapter) {
      showStatus("Interchange adapter is unavailable.");
      return;
    }
    const exported = adapter.exportData(state);
    download(
      `${JSON.stringify(exported, null, 2)}\n`,
      `${slug(state.title)}.interchange.json`,
      "application/json;charset=utf-8"
    );
    showStatus("Interchange JSON exported.");
  });

  els.exportMarkdown.addEventListener("click", () => {
    download(toMarkdown(), `${slug(state.title)}.md`, "text/markdown;charset=utf-8");
    showStatus("Markdown exported.");
  });

  els.clear.addEventListener("click", () => {
    if (ui.mode !== "edit") return;
    if ((state.items.length || state.stories.length || state.title) && !window.confirm("Clear this timeline? This removes its locally stored items and stories.")) return;
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

  webMcp.register(agentApi).then((registration) => {
    globalThis.TimelineWebMCPRegistration = registration;
    if (!registration.registered) {
      console.info("Timeline WebMCP tools are not registered:", registration.reason);
    }
  }).catch((error) => {
    console.warn("Timeline WebMCP registration failed:", error);
  });
})();
