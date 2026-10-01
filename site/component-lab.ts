import type { ComposerOption } from "./components/reusable/composer.ts";
import { ReusableComposerElement } from "./components/reusable/composer.ts";
import { RetainedTimelineElement } from "./components/reusable/retained-timeline.ts";
import { ReusableMediaViewerElement } from "./components/reusable/media-viewer.ts";
import { SemanticHueElement } from "./components/reusable/semantic-hue.ts";
import "./components/occurrence-media-deck.ts";

class LabComposerElement extends ReusableComposerElement {}
customElements.define("component-lab-composer", LabComposerElement);

class LabHueElement extends SemanticHueElement {}
customElements.define("component-lab-hue", LabHueElement);

class LabMediaViewerElement extends ReusableMediaViewerElement {}
customElements.define("component-lab-media-viewer", LabMediaViewerElement);

class LabTimelineController {
  constructor(host: HTMLElement) {
    const rail = document.createElement("div");
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

const mediaViewer = document.querySelector<LabMediaViewerElement>("component-lab-media-viewer");
if (mediaViewer) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" fill="#d7d8dc"/><path d="M80 430 320 170l170 190 110-120 280 190Z" fill="#737782"/><circle cx="730" cy="130" r="58" fill="#f0f1f4"/></svg>`;
  mediaViewer.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  mediaViewer.alt = "Abstract landscape used to test pan and zoom";
  mediaViewer.caption = "Pinch, wheel, double-click, or use the keyboard and zoom controls.";
}
