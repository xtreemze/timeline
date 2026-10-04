import type { ComposerOption } from "./components/reusable/composer.ts";
import { ReusableComposerElement } from "./components/reusable/composer.ts";
import { ReusableMediaViewerElement } from "./components/reusable/media-viewer.ts";
import { RetainedTimelineElement } from "./components/reusable/retained-timeline.ts";
import { SemanticHueElement } from "./components/reusable/semantic-hue.ts";
import "./components/occurrence-media-deck.ts";
import "./embed-entry.ts";

class LabComposerElement extends ReusableComposerElement {}
customElements.define("component-lab-composer", LabComposerElement);

class LabHueElement extends SemanticHueElement {}
customElements.define("component-lab-hue", LabHueElement);

class LabMediaViewerElement extends ReusableMediaViewerElement {}
customElements.define("component-lab-media-viewer", LabMediaViewerElement);

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
      const strong = document.createElement("strong");
      strong.textContent = label;
      const span = document.createElement("span");
      span.textContent = year;
      item.append(strong, span);
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

const mediaViewer = document.querySelector<LabMediaViewerElement>("component-lab-media-viewer");
if (mediaViewer) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" fill="#d7d8dc"/><path d="M80 430 320 170l170 190 110-120 280 190Z" fill="#737782"/><circle cx="730" cy="130" r="58" fill="#f0f1f4"/></svg>`;
  mediaViewer.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  mediaViewer.alt = "Abstract landscape used to test pan and zoom";
  mediaViewer.caption = "Pinch, wheel, double-click, or use the keyboard and zoom controls.";
}


const embedTimeline = document.querySelector<
  HTMLElement & { items: readonly unknown[] }
>("luum-embed-timeline");
if (embedTimeline) {
  embedTimeline.items = Object.freeze([
    Object.freeze({
      id: "mainframe",
      timeLabel: "1973",
      label: "MECC mainframe original",
      detail: "Bob Jamison creates the original educational business simulation.",
      color: "#e3a538",
    }),
    Object.freeze({
      id: "apple-ii",
      timeLabel: "1979",
      label: "Apple II adaptation",
      detail: "Charlie Kellner adapts the program for Apple II classroom use.",
      color: "#236f5e",
    }),
    Object.freeze({
      id: "revival",
      timeLabel: "2026",
      label: "Modern revival",
      detail: "A deterministic browser simulation makes the neighborhood visible.",
      color: "#3f5944",
    }),
  ]);
  embedTimeline.addEventListener("luum-embed-select", (event) => {
    if (!(event instanceof CustomEvent)) return;
    const output = document.querySelector<HTMLElement>("[data-embed-timeline-output]");
    if (output) output.textContent = String(event.detail.id);
  });
}

const embedGraph = document.querySelector<
  HTMLElement & { nodes: readonly unknown[]; edges: readonly unknown[] }
>("luum-embed-graph");
if (embedGraph) {
  embedGraph.nodes = Object.freeze([
    Object.freeze({
      id: "bob-jamison",
      label: "Bob Jamison",
      detail: "Original creator",
      color: "#e3a538",
      position: Object.freeze({ x: 20, y: 55 }),
    }),
    Object.freeze({
      id: "mecc",
      label: "MECC",
      detail: "Educational computing",
      color: "#3f5944",
      position: Object.freeze({ x: 50, y: 22 }),
    }),
    Object.freeze({
      id: "charlie-kellner",
      label: "Charlie Kellner",
      detail: "Apple II adapter",
      color: "#236f5e",
      position: Object.freeze({ x: 80, y: 55 }),
    }),
  ]);
  embedGraph.edges = Object.freeze([
    Object.freeze({
      id: "created-at",
      sourceId: "bob-jamison",
      targetId: "mecc",
      label: "created at",
    }),
    Object.freeze({
      id: "adapted-from",
      sourceId: "charlie-kellner",
      targetId: "mecc",
      label: "adapted work",
    }),
  ]);
  embedGraph.addEventListener("luum-embed-select", (event) => {
    if (!(event instanceof CustomEvent)) return;
    const output = document.querySelector<HTMLElement>("[data-embed-graph-output]");
    if (output) output.textContent = String(event.detail.id);
  });
}
