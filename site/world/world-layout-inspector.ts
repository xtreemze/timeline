import type { PlaceId } from "../../src/domain/ids.ts";
import type {
  WorldDagLayoutOrientation,
  WorldDagLayoutStrategy,
} from "../../src/layout/world-dag-layout.ts";
import type { WorldForceTuning } from "../../src/layout/world-force-simulation.ts";
import {
  DEFAULT_D3_WORLD_FORCE_TUNING,
} from "../../src/layout/d3-world-force-simulation.ts";
import { createIcon } from "../event-presentation.ts";

const LONG_PRESS_MS = 500;

export interface WorldLayoutInspectorActions {
  readonly reorganizeDag: (settings: {
    readonly orientation?: WorldDagLayoutOrientation | "auto";
    readonly strategy?: WorldDagLayoutStrategy;
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
  const left = Math.max(
    gap,
    Math.min(buttonRect.left, viewportWidth - panelRect.width - gap),
  );
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
  if (popover.showPopover) popover.showPopover();
  else panel.hidden = false;
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
    timer = doc.defaultView?.setTimeout(open, LONG_PRESS_MS) ?? 0;
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"] as const) {
    element.addEventListener(type, clearTimer);
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
  if (!(("showPopover" in panel) && typeof panel.showPopover === "function")) {
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

function rangeRow(
  doc: Document,
  labelText: string,
  settings: {
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly value: number;
  },
): { readonly row: HTMLLabelElement; readonly input: HTMLInputElement; readonly output: HTMLOutputElement } {
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
  const direction = selectRow(doc, "Direction", [
    ["auto", "Auto from viewport"],
    ["top-to-bottom", "Top → bottom"],
    ["left-to-right", "Left → right"],
  ]);
  const strategy = selectRow(doc, "Strategy", [
    ["auto", "Auto / best bounded candidate"],
    ["longest-opt-greedy", "Longest path + optimal decross"],
    ["longest-two-layer-greedy", "Longest path + two-layer"],
    ["simplex-two-layer-greedy", "Simplex + two-layer"],
  ]);
  dagPanel.append(dagScope.row, direction.row, strategy.row);

  const dagApply = (): void => {
    const placeId =
      dagScope.state.scope.value === "place" ? actions.getSelectedPlaceId() : null;
    actions.reorganizeDag({
      orientation: direction.select.value as WorldDagLayoutOrientation | "auto",
      strategy: strategy.select.value as WorldDagLayoutStrategy,
      ...(placeId === null ? {} : { placeId }),
    });
    hidePanel(dagPanel, dagButton);
  };
  const dagReset = (): void => {
    direction.select.value = "auto";
    strategy.select.value = "auto";
  };
  dagPanel.append(footerActions(doc, "Arrange", dagApply, dagReset));

  const forcePanel = panelShell(doc, "world-force-layout-inspector", "D3 force options");
  const forceScope = scopeRow(doc);
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
  const repulsion = rangeRow(doc, "Repulsion", {
    min: 0,
    max: 5200,
    step: 100,
    value: Math.abs(DEFAULT_D3_WORLD_FORCE_TUNING.manyBodyStrength),
  });
  const links = rangeRow(doc, "Relationship springs", {
    min: 0,
    max: 2,
    step: 0.1,
    value: DEFAULT_D3_WORLD_FORCE_TUNING.linkStrengthScale,
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
  const radiusNote = doc.createElement("p");
  radiusNote.className = "world-layout-inspector-note";
  radiusNote.textContent =
    "Collision radius is fixed to the rendered node + border. Connectivity clearance reserves additional soft space for hubs.";
  forcePanel.append(
    forceScope.row,
    collision.row,
    iterations.row,
    clearance.row,
    repulsion.row,
    links.row,
    anchors.row,
    dagGuidance.row,
    radiusNote,
  );

  const currentForceTuning = (): WorldForceTuning =>
    Object.freeze({
      collisionStrength: Number(collision.input.value),
      collisionIterations: Number(iterations.input.value),
      connectivityClearanceScale: Number(clearance.input.value),
      manyBodyStrength: -Number(repulsion.input.value),
      linkStrengthScale: Number(links.input.value),
      anchorStrengthScale: Number(anchors.input.value),
      dagStrengthScale: Number(dagGuidance.input.value),
    });
  const forceReset = (): void => {
    collision.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.collisionStrength);
    iterations.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.collisionIterations);
    clearance.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.connectivityClearanceScale);
    repulsion.input.value = String(Math.abs(DEFAULT_D3_WORLD_FORCE_TUNING.manyBodyStrength));
    links.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.linkStrengthScale);
    anchors.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.anchorStrengthScale);
    dagGuidance.input.value = String(DEFAULT_D3_WORLD_FORCE_TUNING.dagStrengthScale);
    for (const entry of [collision, iterations, clearance, repulsion, links, anchors, dagGuidance]) {
      entry.output.value = entry.input.value;
    }
  };
  const forceApply = (): void => {
    const placeId =
      forceScope.state.scope.value === "place" ? actions.getSelectedPlaceId() : null;
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
