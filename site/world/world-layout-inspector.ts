import type { PlaceId } from "../../src/domain/ids.ts";
import { DEFAULT_D3_WORLD_FORCE_TUNING } from "../../src/layout/d3-world-force-simulation.ts";
import type {
  WorldDagCoordinateStrategy,
  WorldDagEdgeStyle,
  WorldDagLayoutAlgorithm,
  WorldDagLayoutOrientation,
  WorldDagLayoutStrategy,
} from "../../src/layout/world-dag-layout.ts";
import type { WorldForceTuning } from "../../src/layout/world-force-simulation.ts";
import { createIcon } from "../event-presentation.ts";

const LONG_PRESS_MS = 500;

export interface WorldLayoutInspectorActions {
  readonly reorganizeDag: (settings: {
    readonly orientation?: WorldDagLayoutOrientation | "auto";
    readonly algorithm?: WorldDagLayoutAlgorithm;
    readonly strategy?: WorldDagLayoutStrategy;
    readonly coordinate?: WorldDagCoordinateStrategy;
    readonly edgeStyle?: WorldDagEdgeStyle;
    readonly placeId?: PlaceId;
  }) => boolean;
  readonly relaxForce: () => boolean;
  readonly setForceTuning: (tuning: WorldForceTuning, placeId?: PlaceId) => boolean;
  readonly getSelectedPlaceId: () => PlaceId | null;
}

interface InspectorState {
  readonly scope: HTMLSelectElement;
  readonly selectedPlaceOption: HTMLOptionElement;
}

function positionPanel(panel: HTMLElement, button: HTMLButtonElement): void {
  const view = button.ownerDocument.defaultView;
  const viewportWidth = view?.innerWidth ?? 1024;
  const viewportHeight = view?.innerHeight ?? 768;
  const gap = 8;
  const buttonRect = button.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const left = Math.max(gap, Math.min(buttonRect.left, viewportWidth - panelRect.width - gap));
  const above = buttonRect.top - panelRect.height - gap;
  const top =
    above >= gap
      ? above
      : Math.min(viewportHeight - panelRect.height - gap, buttonRect.bottom + gap);
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.max(gap, Math.round(top))}px`;
}

function showPanel(
  panel: HTMLElement,
  button: HTMLButtonElement,
  state: InspectorState,
  actions: WorldLayoutInspectorActions,
): void {
  const placeId = actions.getSelectedPlaceId();
  state.selectedPlaceOption.disabled = placeId === null;
  state.selectedPlaceOption.hidden = placeId === null;
  state.selectedPlaceOption.textContent =
    placeId === null ? "Selected place" : `Selected place · ${String(placeId)}`;
  state.scope.value = placeId === null ? "global" : "place";

  const popover = panel as HTMLElement & {
    showPopover?: () => void;
  };
  if (popover.showPopover) {
    if (!panel.matches(":popover-open")) popover.showPopover();
  } else {
    panel.hidden = false;
  }
  button.setAttribute("aria-expanded", "true");
  positionPanel(panel, button);
  state.scope.focus({ preventScroll: true });
}

function hidePanel(panel: HTMLElement, button: HTMLButtonElement): void {
  const popover = panel as HTMLElement & {
    hidePopover?: () => void;
  };
  if (popover.hidePopover && panel.matches(":popover-open")) popover.hidePopover();
  else panel.hidden = true;
  button.setAttribute("aria-expanded", "false");
}

function advancedButton(
  doc: Document,
  options: {
    readonly label: string;
    readonly icon: string;
    readonly panel: HTMLElement;
    readonly state: InspectorState;
    readonly primaryAction: () => boolean;
    readonly actions: WorldLayoutInspectorActions;
  },
): HTMLButtonElement {
  const element = doc.createElement("button");
  element.type = "button";
  element.className = "toolbar-control world-layout-control";
  element.dataset.viewControl = "";
  element.setAttribute("aria-label", options.label);
  element.setAttribute("aria-haspopup", "dialog");
  element.setAttribute("aria-controls", options.panel.id);
  element.setAttribute("aria-expanded", "false");
  element.title = `${options.label} · long press for options`;
  element.append(createIcon(options.icon, { size: 20 }));

  let timer = 0;
  let suppressClick = false;
  let pressOrigin: readonly [number, number] | null = null;
  const clearTimer = (): void => {
    if (!timer) return;
    doc.defaultView?.clearTimeout(timer);
    timer = 0;
  };
  const open = (): void => {
    clearTimer();
    suppressClick = true;
    showPanel(options.panel, element, options.state, options.actions);
  };

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || element.disabled) return;
    clearTimer();
    pressOrigin = Object.freeze([event.clientX, event.clientY]);
    timer = doc.defaultView?.setTimeout(open, LONG_PRESS_MS) ?? 0;
  });
  element.addEventListener("pointermove", (event) => {
    if (!pressOrigin || !timer) return;
    if (Math.hypot(event.clientX - pressOrigin[0], event.clientY - pressOrigin[1]) > 8) {
      clearTimer();
      pressOrigin = null;
    }
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"] as const) {
    element.addEventListener(type, () => {
      clearTimer();
      pressOrigin = null;
    });
  }
  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    open();
  });
  element.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || (event.key === "F10" && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      open();
    }
  });
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    clearTimer();
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }
    options.primaryAction();
  });

  options.panel.addEventListener("toggle", () => {
    const nativePopover =
      typeof (options.panel as HTMLElement & { showPopover?: () => void }).showPopover ===
      "function";
    const open = nativePopover ? options.panel.matches(":popover-open") : !options.panel.hidden;
    element.setAttribute("aria-expanded", String(open));
  });

  return element;
}

function panelShell(doc: Document, id: string, title: string): HTMLElement {
  const panel = doc.createElement("section");
  panel.id = id;
  panel.className = "world-layout-inspector";
  panel.setAttribute("popover", "auto");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);
  if (!("showPopover" in panel) || typeof panel.showPopover !== "function") {
    panel.hidden = true;
  }

  const heading = doc.createElement("h3");
  heading.className = "world-layout-inspector-title";
  heading.textContent = title;
  panel.append(heading);
  return panel;
}

function selectRow(
  doc: Document,
  labelText: string,
  options: readonly (readonly [value: string, label: string])[],
): { readonly row: HTMLLabelElement; readonly select: HTMLSelectElement } {
  const row = doc.createElement("label");
  row.className = "world-layout-inspector-row";
  const label = doc.createElement("span");
  label.textContent = labelText;
  const select = doc.createElement("select");
  for (const [value, text] of options) {
    const option = doc.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  row.append(label, select);
  return { row, select };
}

function valueRow(doc: Document, labelText: string, value: string): HTMLDivElement {
  const row = doc.createElement("div");
  row.className = "world-layout-inspector-row";
  const label = doc.createElement("span");
  label.textContent = labelText;
  const output = doc.createElement("output");
  output.textContent = value;
  row.append(label, output);
  return row;
}

function rangeRow(
  doc: Document,
  labelText: string,
  settings: {
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly value: number;
  },
): {
  readonly row: HTMLLabelElement;
  readonly input: HTMLInputElement;
  readonly output: HTMLOutputElement;
} {
  const row = doc.createElement("label");
  row.className = "world-layout-inspector-row world-layout-inspector-range";
  const label = doc.createElement("span");
  label.textContent = labelText;
  const input = doc.createElement("input");
  input.type = "range";
  input.min = String(settings.min);
  input.max = String(settings.max);
  input.step = String(settings.step);
  input.value = String(settings.value);
  const output = doc.createElement("output");
  output.value = input.value;
  input.addEventListener("input", () => {
    output.value = input.value;
  });
  row.append(label, input, output);
  return { row, input, output };
}

function scopeRow(doc: Document): {
  readonly row: HTMLLabelElement;
  readonly state: InspectorState;
} {
  const { row, select } = selectRow(doc, "Scope", [
    ["global", "All places"],
    ["place", "Selected place"],
  ]);
  const selectedPlaceOption = select.options[1] as HTMLOptionElement;
  return {
    row,
    state: {
      scope: select,
      selectedPlaceOption,
    },
  };
}

function sectionLabel(doc: Document, text: string): HTMLHeadingElement {
  const heading = doc.createElement("h4");
  heading.className = "world-layout-inspector-section";
  heading.textContent = text;
  return heading;
}

function footerActions(
  doc: Document,
  applyLabel: string,
  onApply: () => void,
  onReset: () => void,
): HTMLElement {
  const actions = doc.createElement("div");
  actions.className = "world-layout-inspector-actions";

  const reset = doc.createElement("button");
  reset.type = "button";
  reset.className = "world-layout-inspector-reset";
  reset.textContent = "Reset";
  reset.addEventListener("click", (event) => {
    event.stopPropagation();
    onReset();
  });

  const apply = doc.createElement("button");
  apply.type = "button";
  apply.className = "world-layout-inspector-apply";
  apply.textContent = applyLabel;
  apply.addEventListener("click", (event) => {
    event.stopPropagation();
    onApply();
  });

  actions.append(reset, apply);
  return actions;
}

export function createWorldLayoutControls(
  doc: Document,
  actions: WorldLayoutInspectorActions,
): HTMLElement {
  const group = doc.createElement("div");
  group.className = "world-layout-controls";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Graph layout controls");

  const dagPanel = panelShell(doc, "world-dag-layout-inspector", "D3 DAG options");
  const dagScope = scopeRow(doc);
  const algorithm = selectRow(doc, "Algorithm", [
    ["sugiyama", "Sugiyama · layered"],
    ["zherebko", "Zherebko · linear"],
    ["grid", "Grid · topological"],
  ]);
  const direction = selectRow(doc, "Direction", [
    ["auto", "Auto from viewport"],
    ["top-to-bottom", "Top → bottom"],
    ["left-to-right", "Left → right"],
  ]);
  const strategy = selectRow(doc, "Sugiyama strategy", [
    ["longest-auto-greedy", "Longest path + auto decross"],
    ["auto", "Auto / compare layering families"],
    ["longest-opt-greedy", "Longest path + optimal decross"],
    ["longest-two-layer-greedy", "Longest path + two-layer"],
    ["simplex-two-layer-greedy", "Simplex + two-layer"],
  ]);
  const coordinate = selectRow(doc, "Coordinates", [
    ["greedy", "Greedy"],
    ["simplex", "Simplex"],
    ["quad", "Quadratic"],
    ["center", "Centered"],
  ]);
  const edgeStyle = selectRow(doc, "Edge routing", [
    ["routed", "D3 routed"],
    ["curved", "Curved"],
    ["straight", "Straight"],
    ["orthogonal", "Orthogonal"],
  ]);
  const syncDagControls = (): void => {
    const sugiyama = algorithm.select.value === "sugiyama";
    strategy.select.disabled = !sugiyama;
    coordinate.select.disabled = !sugiyama;
  };
  algorithm.select.addEventListener("change", syncDagControls);
  syncDagControls();

  const dagNote = doc.createElement("p");
  dagNote.className = "world-layout-inspector-note";
  dagNote.textContent =
    "Algorithm, coordinates, and edge routing are disposable organization state. " +
    "Selected-place scope never changes canonical place coordinates.";
  dagPanel.append(
    dagScope.row,
    algorithm.row,
    direction.row,
    strategy.row,
    coordinate.row,
    edgeStyle.row,
    dagNote,
  );

  const dagApply = (): void => {
    const placeId = dagScope.state.scope.value === "place" ? actions.getSelectedPlaceId() : null;
    actions.reorganizeDag({
      orientation: direction.select.value as WorldDagLayoutOrientation | "auto",
      algorithm: algorithm.select.value as WorldDagLayoutAlgorithm,
      strategy: strategy.select.value as WorldDagLayoutStrategy,
      coordinate: coordinate.select.value as WorldDagCoordinateStrategy,
      edgeStyle: edgeStyle.select.value as WorldDagEdgeStyle,
      ...(placeId === null ? {} : { placeId }),
    });
    hidePanel(dagPanel, dagButton);
  };
  const dagReset = (): void => {
    algorithm.select.value = "sugiyama";
    direction.select.value = "auto";
    strategy.select.value = "longest-auto-greedy";
    coordinate.select.value = "greedy";
    edgeStyle.select.value = "routed";
    syncDagControls();
  };
  dagPanel.append(footerActions(doc, "Arrange", dagApply, dagReset));

  const forcePanel = panelShell(doc, "world-force-layout-inspector", "D3 force options");
  const forceScope = scopeRow(doc);

  const centerStrength = rangeRow(doc, "Center strength", {
    min: 0,
    max: 1,
    step: 0.05,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.centerStrength ?? 0,
  });
  const centerEast = rangeRow(doc, "Center east (m)", {
    min: -5_000,
    max: 5_000,
    step: 100,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.centerEastMeters ?? 0,
  });
  const centerNorth = rangeRow(doc, "Center north (m)", {
    min: -5_000,
    max: 5_000,
    step: 100,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.centerNorthMeters ?? 0,
  });

  const radiusPolicy = valueRow(doc, "Collision radius", "Rendered node + border · fixed");
  const collision = rangeRow(doc, "Collision strength", {
    min: 0,
    max: 1,
    step: 0.05,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.collisionStrength,
  });
  const iterations = rangeRow(doc, "Collision passes", {
    min: 1,
    max: 8,
    step: 1,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.collisionIterations,
  });
  const clearance = rangeRow(doc, "Connectivity clearance", {
    min: 0,
    max: 2.5,
    step: 0.25,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.connectivityClearanceScale,
  });

  const linkStrength = rangeRow(doc, "Link strength", {
    min: 0,
    max: 2,
    step: 0.1,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.linkStrengthScale,
  });
  const linkDistance = rangeRow(doc, "Link distance ×", {
    min: 0.25,
    max: 3,
    step: 0.05,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.linkDistanceScale ?? 1,
  });
  const linkIterations = rangeRow(doc, "Link passes", {
    min: 1,
    max: 8,
    step: 1,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.linkIterations ?? 1,
  });

  const repulsion = rangeRow(doc, "Repulsion", {
    min: 0,
    max: 5200,
    step: 100,
    value: Math.abs(DEFAULT_D3_WORLD_FORCE_TUNING.manyBodyStrength),
  });
  const anchors = rangeRow(doc, "Place attraction", {
    min: 0,
    max: 2,
    step: 0.1,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.anchorStrengthScale,
  });
  const dagGuidance = rangeRow(doc, "DAG guidance", {
    min: 0,
    max: 2,
    step: 0.1,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.dagStrengthScale,
  });

  const forceNote = doc.createElement("p");
  forceNote.className = "world-layout-inspector-note";
  forceNote.textContent =
    "Center targets are local tangent-space offsets. Link distance scales each relationship's " +
    "existing rest length. Connectivity clearance is soft hub spacing; collision radius stays exact.";

  forcePanel.append(
    forceScope.row,
    sectionLabel(doc, "Center force"),
    centerStrength.row,
    centerEast.row,
    centerNorth.row,
    sectionLabel(doc, "Collide force"),
    radiusPolicy,
    collision.row,
    iterations.row,
    clearance.row,
    sectionLabel(doc, "Link force"),
    linkStrength.row,
    linkDistance.row,
    linkIterations.row,
    sectionLabel(doc, "Other forces"),
    repulsion.row,
    anchors.row,
    dagGuidance.row,
    forceNote,
  );

  const currentForceTuning = (): WorldForceTuning =>
    Object.freeze({
      centerStrength: Number(centerStrength.input.value),
      centerEastMeters: Number(centerEast.input.value),
      centerNorthMeters: Number(centerNorth.input.value),
      collisionStrength: Number(collision.input.value),
      collisionIterations: Number(iterations.input.value),
      connectivityClearanceScale: Number(clearance.input.value),
      manyBodyStrength: -Number(repulsion.input.value),
      linkStrengthScale: Number(linkStrength.input.value),
      linkDistanceScale: Number(linkDistance.input.value),
      linkIterations: Number(linkIterations.input.value),
      anchorStrengthScale: Number(anchors.input.value),
      dagStrengthScale: Number(dagGuidance.input.value),
    });

  const forceRows = [
    centerStrength,
    centerEast,
    centerNorth,
    collision,
    iterations,
    clearance,
    linkStrength,
    linkDistance,
    linkIterations,
    repulsion,
    anchors,
    dagGuidance,
  ] as const;
  const forceReset = (): void => {
    centerStrength.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.centerStrength ?? 0);
    centerEast.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.centerEastMeters ?? 0);
    centerNorth.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.centerNorthMeters ?? 0);
    collision.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.collisionStrength);
    iterations.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.collisionIterations);
    clearance.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.connectivityClearanceScale);
    linkStrength.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.linkStrengthScale);
    linkDistance.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.linkDistanceScale ?? 1);
    linkIterations.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.linkIterations ?? 1);
    repulsion.input.value = String(Math.abs(DEFAULT_D3_WORLD_FORCE_TUNING.manyBodyStrength));
    anchors.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.anchorStrengthScale);
    dagGuidance.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.dagStrengthScale);
    for (const entry of forceRows) entry.output.value = entry.input.value;
  };
  const forceApply = (): void => {
    const placeId = forceScope.state.scope.value === "place" ? actions.getSelectedPlaceId() : null;
    actions.setForceTuning(currentForceTuning(), placeId ?? undefined);
    hidePanel(forcePanel, forceButton);
  };
  forcePanel.append(footerActions(doc, "Settle", forceApply, forceReset));

  const dagButton = advancedButton(doc, {
    label: "Arrange relationships",
    icon: "dag",
    panel: dagPanel,
    state: dagScope.state,
    primaryAction: () => actions.reorganizeDag({}),
    actions,
  });
  const forceButton = advancedButton(doc, {
    label: "Settle relationships",
    icon: "refresh",
    panel: forcePanel,
    state: forceScope.state,
    primaryAction: actions.relaxForce,
    actions,
  });

  group.append(dagButton, forceButton, dagPanel, forcePanel);
  return group;
}
