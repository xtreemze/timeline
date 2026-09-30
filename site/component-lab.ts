import type { ComposerOption } from "./components/reusable/composer.ts";
import { ReusableComposerElement } from "./components/reusable/composer.ts";
import { RetainedTimelineElement } from "./components/reusable/retained-timeline.ts";

class LabComposerElement extends ReusableComposerElement {}
customElements.define("component-lab-composer", LabComposerElement);

class LabTimelineController {
  private static sequence = 0;
  private readonly rail: HTMLDivElement;

  constructor(private readonly host: HTMLElement) {
    const generation = ++LabTimelineController.sequence;
    host.dataset.controllerGeneration = String(generation);
    const rail = document.createElement("div");
    this.rail = rail;
    rail.className = "demo-timeline-rail";
    rail.setAttribute("aria-label", "Retained timeline demo");
    const events = [
      ["Prototype", "2024"],
      ["Pilot", "2025"],
      ["Release", "2026"],
    ];
    for (const [label, year] of events) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "demo-timeline-event";
      item.innerHTML = `<strong>${label}</strong><span>${year}</span>`;
      rail.append(item);
    }
    host.append(rail);
  }

  destroy(): void {
    this.rail.remove();
    this.host.dataset.controllerDestroyed = "true";
  }
}

class LabTimelineElement extends RetainedTimelineElement<LabTimelineController> {
  protected override createTimelineController(): LabTimelineController {
    return new LabTimelineController(this);
  }
}
customElements.define("component-lab-timeline", LabTimelineElement);

const suggestions: readonly ComposerOption[] = Object.freeze([
  Object.freeze({
    id: "ada",
    label: "Ada Lovelace",
    detail: "Person",
    color: "oklch(62% 0.16 320)",
    iconLabel: "A",
    keywords: Object.freeze(["mathematician", "entity"]),
  }),
  Object.freeze({
    id: "engine",
    label: "Analytical Engine",
    detail: "Object",
    color: "oklch(64% 0.13 245)",
    iconLabel: "E",
    keywords: Object.freeze(["machine", "entity"]),
  }),
  Object.freeze({
    id: "london",
    label: "London",
    detail: "Place",
    color: "oklch(64% 0.12 150)",
    iconLabel: "L",
    keywords: Object.freeze(["place"]),
  }),
  Object.freeze({
    id: "notes",
    label: "published notes",
    detail: "Action",
    color: "oklch(68% 0.14 70)",
    iconLabel: "→",
    keywords: Object.freeze(["predicate", "verb"]),
  }),
]);

const composer = document.querySelector<LabComposerElement>("component-lab-composer");
if (composer) {
  composer.suggestions = suggestions;
  composer.multiple = true;
  composer.selectOnSpace = true;
  composer.wheelSelection = true;
  composer.addEventListener("composer-selection-change", (event) => {
    if (!(event instanceof CustomEvent)) return;
    const output = document.querySelector<HTMLElement>("[data-composer-output]");
    if (output) {
      const labels = (event.detail.selected as readonly ComposerOption[]).map((item) => item.label);
      output.textContent = labels.length ? labels.join(" · ") : "No selections";
    }
  });
}
