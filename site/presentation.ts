import {
  LuumEmbedGraphElement,
  LuumEmbedTimelineElement,
} from "./embed-entry.ts";
import type {
  EmbedGraphEdge,
  EmbedGraphNode,
  EmbedTimelineItem,
} from "./embed-entry.ts";

type ExampleKind = "historical" | "incident" | "fiction" | "decision";

interface Entity {
  id: string;
  label: string;
}

interface Place {
  id: string;
  label: string;
}

interface Evidence {
  id: string;
  label: string;
  summary: string;
  provenance: string;
}

interface Occurrence {
  id: string;
  label: string;
  date: string;
  subjectId: string;
  action: string;
  objectId: string;
  placeId?: string;
  evidenceIds: string[];
}

interface Story {
  id: string;
  label: string;
  occurrenceIds: string[];
}

interface ExampleData {
  title: string;
  entities: Entity[];
  places: Place[];
  evidence: Evidence[];
  occurrences: Occurrence[];
  stories: Story[];
}

const conventionalExamples: Record<"historical" | "incident", ExampleData> = {
  historical: {
    title: "Historical research",
    entities: [
      { id: "ada", label: "Ada Lovelace" },
      { id: "notes", label: "Notes on the Analytical Engine" },
      { id: "engine", label: "Analytical Engine" },
    ],
    places: [{ id: "london", label: "London" }],
    evidence: [
      {
        id: "published-notes",
        label: "Published notes",
        summary: "A source attached to the occurrence rather than duplicated into the timeline card.",
        provenance: "Publication · 1843",
      },
      {
        id: "correspondence",
        label: "Correspondence",
        summary: "A second source can support or qualify the same canonical occurrence.",
        provenance: "Letter archive",
      },
    ],
    occurrences: [
      {
        id: "studied",
        label: "Studied the machine",
        date: "1842",
        subjectId: "ada",
        action: "studied",
        objectId: "engine",
        placeId: "london",
        evidenceIds: ["correspondence"],
      },
      {
        id: "wrote",
        label: "Wrote explanatory notes",
        date: "1843",
        subjectId: "ada",
        action: "wrote",
        objectId: "notes",
        placeId: "london",
        evidenceIds: ["published-notes", "correspondence"],
      },
    ],
    stories: [
      {
        id: "early-computation",
        label: "Early programmable computation",
        occurrenceIds: ["studied", "wrote"],
      },
    ],
  },
  incident: {
    title: "Incident review",
    entities: [
      { id: "checkout", label: "Checkout service" },
      { id: "database", label: "Orders database" },
      { id: "team", label: "Operations team" },
    ],
    places: [{ id: "region", label: "EU region" }],
    evidence: [
      {
        id: "alert",
        label: "Latency alert",
        summary: "Telemetry provides an inspectable trace for the first detected degradation.",
        provenance: "Monitoring · 10:04",
      },
      {
        id: "change",
        label: "Deployment record",
        summary: "Change history is linked to the remediation occurrence.",
        provenance: "CI/CD · 10:21",
      },
    ],
    occurrences: [
      {
        id: "degraded",
        label: "Checkout latency rises",
        date: "10:04",
        subjectId: "checkout",
        action: "overloaded",
        objectId: "database",
        placeId: "region",
        evidenceIds: ["alert"],
      },
      {
        id: "rolled-back",
        label: "Operations rolls back release",
        date: "10:21",
        subjectId: "team",
        action: "rolled back",
        objectId: "checkout",
        placeId: "region",
        evidenceIds: ["change"],
      },
    ],
    stories: [
      {
        id: "incident-42",
        label: "Incident 42 reconstruction",
        occurrenceIds: ["degraded", "rolled-back"],
      },
    ],
  },
};

const unconventionalExamples: Record<"fiction" | "decision", ExampleData> = {
  fiction: {
    title: "Fiction continuity",
    entities: [
      { id: "captain", label: "Captain Mira" },
      { id: "artifact", label: "Glass compass" },
      { id: "archive", label: "Hidden archive" },
    ],
    places: [
      { id: "harbor", label: "North Harbor" },
      { id: "vault", label: "Archive Vault" },
    ],
    evidence: [
      {
        id: "chapter-3",
        label: "Chapter 3 manuscript",
        summary: "Narrative evidence records what the text establishes at this point in the story.",
        provenance: "Draft · chapter 3",
      },
      {
        id: "chapter-11",
        label: "Chapter 11 manuscript",
        summary: "Later revelation can coexist with earlier character knowledge without rewriting chronology.",
        provenance: "Draft · chapter 11",
      },
    ],
    occurrences: [
      {
        id: "finds",
        label: "Mira finds the compass",
        date: "Day 4",
        subjectId: "captain",
        action: "found",
        objectId: "artifact",
        placeId: "harbor",
        evidenceIds: ["chapter-3"],
      },
      {
        id: "reveals",
        label: "Compass reveals the archive",
        date: "Day 19",
        subjectId: "artifact",
        action: "revealed",
        objectId: "archive",
        placeId: "vault",
        evidenceIds: ["chapter-11"],
      },
    ],
    stories: [
      {
        id: "mira-arc",
        label: "Mira's discovery arc",
        occurrenceIds: ["finds", "reveals"],
      },
    ],
  },
  decision: {
    title: "Decision archaeology",
    entities: [
      { id: "person", label: "Decision maker" },
      { id: "offer-a", label: "Offer A" },
      { id: "offer-b", label: "Offer B" },
    ],
    places: [{ id: "stockholm", label: "Stockholm" }],
    evidence: [
      {
        id: "comparison",
        label: "Decision matrix",
        summary: "Captures the information and assumptions that were available before the choice.",
        provenance: "Private note · week 1",
      },
      {
        id: "outcome",
        label: "Outcome review",
        summary: "Later evidence can be compared with the original assumptions without back-editing them.",
        provenance: "Reflection · month 6",
      },
    ],
    occurrences: [
      {
        id: "compared",
        label: "Compared two offers",
        date: "Week 1",
        subjectId: "person",
        action: "compared",
        objectId: "offer-a",
        placeId: "stockholm",
        evidenceIds: ["comparison"],
      },
      {
        id: "selected",
        label: "Selected Offer B",
        date: "Week 2",
        subjectId: "person",
        action: "selected",
        objectId: "offer-b",
        placeId: "stockholm",
        evidenceIds: ["comparison", "outcome"],
      },
    ],
    stories: [
      {
        id: "choice-review",
        label: "Why this decision was made",
        occurrenceIds: ["compared", "selected"],
      },
    ],
  },
};

const examples: Record<ExampleKind, ExampleData> = {
  ...conventionalExamples,
  ...unconventionalExamples,
};

const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-example]"));
const timeline = document.querySelector<LuumEmbedTimelineElement>("[data-example-timeline]");
const world = document.querySelector<LuumEmbedGraphElement>("[data-example-world]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

interface ViewTransitionDocument extends Document {
  startViewTransition?: (update: () => void) => unknown;
}
const evidence = document.querySelector<HTMLElement>("[data-example-evidence]");

function entityLabel(data: ExampleData, id: string): string {
  return data.entities.find((entity) => entity.id === id)?.label ?? id;
}

function placeLabel(data: ExampleData, id?: string): string {
  if (!id) return "No place";
  return data.places.find((place) => place.id === id)?.label ?? id;
}

function timelineItems(data: ExampleData): readonly EmbedTimelineItem[] {
  return data.occurrences.map((occurrence) =>
    Object.freeze({
      id: occurrence.id,
      label: occurrence.label,
      timeLabel: occurrence.date,
      detail: `${entityLabel(data, occurrence.subjectId)} ${occurrence.action} ${entityLabel(
        data,
        occurrence.objectId,
      )} · ${placeLabel(data, occurrence.placeId)}`,
    }),
  );
}

function graphNodes(data: ExampleData): readonly EmbedGraphNode[] {
  return data.entities.map((entity, index) =>
    Object.freeze({
      id: entity.id,
      label: entity.label,
      position: Object.freeze({
        x: 18 + ((index * 31) % 68),
        y: 20 + ((index * 37) % 56),
      }),
    }),
  );
}

function graphEdges(data: ExampleData): readonly EmbedGraphEdge[] {
  return data.occurrences.map((occurrence) =>
    Object.freeze({
      id: occurrence.id,
      sourceId: occurrence.subjectId,
      targetId: occurrence.objectId,
      label: `${occurrence.action} · ${placeLabel(data, occurrence.placeId)}`,
    }),
  );
}

function renderTimeline(data: ExampleData): void {
  if (!timeline) return;
  timeline.items = timelineItems(data);
  timeline.ariaLabel = `${data.title} timeline`;
}

function renderWorld(data: ExampleData): void {
  if (!world) return;
  world.nodes = graphNodes(data);
  world.edges = graphEdges(data);
  world.ariaLabel = `${data.title} relationship graph`;
}

function renderEvidence(data: ExampleData): void {
  if (!evidence) return;
  const story = data.stories[0];
  evidence.replaceChildren(
    ...data.evidence.map((item) => {
      const article = document.createElement("article");
      article.className = "evidence-item";

      const title = document.createElement("strong");
      title.textContent = item.label;
      const summary = document.createElement("p");
      summary.textContent = item.summary;
      const badge = document.createElement("span");
      badge.className = "evidence-badge";
      badge.textContent = item.provenance;

      article.append(title, summary, badge);
      if (story) {
        article.setAttribute("aria-label", `${item.label}; story: ${story.label}`);
      }
      return article;
    }),
  );
}

function renderExample(kind: ExampleKind): void {
  const data = examples[kind];
  renderTimeline(data);
  renderWorld(data);
  renderEvidence(data);

  for (const button of buttons) {
    const active = button.dataset.example === kind;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }
}

function renderExampleWithTransition(kind: ExampleKind): void {
  const transitionDocument = document as ViewTransitionDocument;
  if (reducedMotion.matches || typeof transitionDocument.startViewTransition !== "function") {
    renderExample(kind);
    return;
  }
  transitionDocument.startViewTransition(() => renderExample(kind));
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    const kind = button.dataset.example as ExampleKind | undefined;
    if (kind && kind in examples) renderExampleWithTransition(kind);
  });

  button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = buttons.indexOf(button);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = buttons[(index + delta + buttons.length) % buttons.length];
    next?.focus();
    next?.click();
  });
}

renderExample("historical");
