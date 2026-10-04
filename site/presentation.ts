type ExampleKind = "historical" | "incident" | "fiction" | "decision" | "corpus";

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

interface RepositorySample {
  title?: string;
  entities?: Array<{ id: string; name?: string; attributes?: { storyId?: string } }>;
  places?: Array<{ id: string; name?: string; title?: string; label?: string }>;
  evidence?: Array<{ id: string; title?: string; note?: string; sourceName?: string; publishedAt?: string }>;
  items?: Array<{ id: string; title?: string; start?: string; evidenceIds?: string[] }>;
  relationships?: Array<{
    id: string;
    subjectId?: string;
    objectId?: string;
    predicate?: string;
    placeId?: string;
    itemIds?: string[];
    time?: { start?: { value?: string } };
    attributes?: { storyId?: string };
  }>;
  stories?: Array<{ id: string; title?: string; itemIds?: string[] }>;
}

let repositoryExamplePromise: Promise<ExampleData> | undefined;

async function loadRepositoryExample(): Promise<ExampleData> {
  repositoryExamplePromise ??= import("./sample-case.ts").then(({ TimelineSampleCase }) => {
    const sample = TimelineSampleCase as RepositorySample;
    const storyId = "story-three-little-pigs";
    const story = sample.stories?.find((entry) => entry.id === storyId);
    const storyItemIds = new Set(story?.itemIds ?? []);
    const entityById = new Map((sample.entities ?? []).map((entity) => [entity.id, entity]));
    const placeById = new Map((sample.places ?? []).map((place) => [place.id, place]));
    const evidenceById = new Map((sample.evidence ?? []).map((entry) => [entry.id, entry]));
    const itemById = new Map((sample.items ?? []).map((item) => [item.id, item]));

    const relationships = (sample.relationships ?? [])
      .filter((relationship) => {
        const linkedItem = relationship.itemIds?.some((id) => storyItemIds.has(id));
        const linkedEntity =
          entityById.get(relationship.subjectId ?? "")?.attributes?.storyId === storyId ||
          entityById.get(relationship.objectId ?? "")?.attributes?.storyId === storyId;
        return Boolean(linkedItem || linkedEntity || relationship.attributes?.storyId === storyId);
      })
      .filter((relationship) => relationship.subjectId && relationship.objectId && relationship.predicate)
      .slice(0, 4);

    const referencedEntityIds = new Set(
      relationships.flatMap((relationship) => [relationship.subjectId ?? "", relationship.objectId ?? ""]).filter(Boolean),
    );
    const referencedPlaceIds = new Set(
      relationships.map((relationship) => relationship.placeId ?? "").filter(Boolean),
    );
    const referencedEvidenceIds = new Set<string>();

    const occurrences = relationships.map((relationship) => {
      const item = relationship.itemIds?.map((id) => itemById.get(id)).find(Boolean);
      for (const evidenceId of item?.evidenceIds ?? []) referencedEvidenceIds.add(evidenceId);
      return {
        id: relationship.id,
        label: item?.title ?? `${entityById.get(relationship.subjectId ?? "")?.name ?? relationship.subjectId} ${relationship.predicate} ${entityById.get(relationship.objectId ?? "")?.name ?? relationship.objectId}`,
        date: relationship.time?.start?.value ?? item?.start ?? "Story time",
        subjectId: relationship.subjectId ?? "",
        action: relationship.predicate ?? "relates to",
        objectId: relationship.objectId ?? "",
        placeId: relationship.placeId || undefined,
        evidenceIds: [...(item?.evidenceIds ?? [])],
      };
    });

    if (referencedEvidenceIds.size === 0 && evidenceById.has("src-pigs")) {
      referencedEvidenceIds.add("src-pigs");
    }

    return {
      title: story?.title ?? sample.title ?? "Repository example corpus",
      entities: [...referencedEntityIds].map((id) => ({
        id,
        label: entityById.get(id)?.name ?? id,
      })),
      places: [...referencedPlaceIds].map((id) => {
        const place = placeById.get(id);
        return { id, label: place?.name ?? place?.title ?? place?.label ?? id };
      }),
      evidence: [...referencedEvidenceIds].map((id) => {
        const entry = evidenceById.get(id);
        return {
          id,
          label: entry?.title ?? id,
          summary: entry?.note ?? "Repository-shipped source linked to this story.",
          provenance: [entry?.sourceName, entry?.publishedAt].filter(Boolean).join(" · ") || "Repository sample",
        };
      }),
      occurrences,
      stories: [
        {
          id: storyId,
          label: story?.title ?? "The Three Little Pigs",
          occurrenceIds: occurrences.map((occurrence) => occurrence.id),
        },
      ],
    };
  });

  return repositoryExamplePromise;
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

const examples: Record<Exclude<ExampleKind, "corpus">, ExampleData> = {
  ...conventionalExamples,
  ...unconventionalExamples,
};

const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-example]"));
const timeline = document.querySelector<HTMLElement>("[data-example-timeline]");
const world = document.querySelector<HTMLElement>("[data-example-world]");
const evidence = document.querySelector<HTMLElement>("[data-example-evidence]");

function entityLabel(data: ExampleData, id: string): string {
  return data.entities.find((entity) => entity.id === id)?.label ?? id;
}

function placeLabel(data: ExampleData, id?: string): string {
  if (!id) return "No place";
  return data.places.find((place) => place.id === id)?.label ?? id;
}

function renderTimeline(data: ExampleData): void {
  if (!timeline) return;
  timeline.replaceChildren(
    ...data.occurrences.map((occurrence) => {
      const row = document.createElement("div");
      row.className = "timeline-row";

      const time = document.createElement("time");
      time.textContent = occurrence.date;

      const card = document.createElement("div");
      card.className = "timeline-card";
      const title = document.createElement("strong");
      title.textContent = occurrence.label;
      const detail = document.createElement("small");
      detail.textContent = `${entityLabel(data, occurrence.subjectId)} ${occurrence.action} ${entityLabel(data, occurrence.objectId)} · ${placeLabel(data, occurrence.placeId)}`;

      card.append(title, detail);
      row.append(time, card);
      return row;
    }),
  );
}

function renderWorld(data: ExampleData): void {
  if (!world) return;
  world.replaceChildren();

  const nodes = [
    ...data.entities.map((entity, index) => ({
      id: entity.id,
      label: entity.label,
      kind: "entity",
      x: 18 + ((index * 31) % 68),
      y: 20 + ((index * 37) % 56),
    })),
    ...data.places.map((place, index) => ({
      id: place.id,
      label: place.label,
      kind: "place",
      x: 58 + ((index * 18) % 22),
      y: 68 - ((index * 23) % 30),
    })),
  ];

  const byId = new Map(nodes.map((node) => [node.id, node]));

  for (const occurrence of data.occurrences) {
    const subject = byId.get(occurrence.subjectId);
    const object = byId.get(occurrence.objectId);
    if (subject && object) {
      const dx = object.x - subject.x;
      const dy = object.y - subject.y;
      const edge = document.createElement("div");
      edge.className = "world-edge";
      edge.style.left = `${subject.x}%`;
      edge.style.top = `${subject.y}%`;
      edge.style.width = `${Math.hypot(dx, dy)}%`;
      edge.style.transform = `rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}deg)`;
      edge.title = occurrence.action;
      world.append(edge);
    }
  }

  for (const node of nodes) {
    const element = document.createElement("div");
    element.className = "world-node";
    element.dataset.kind = node.kind;
    element.style.left = `calc(${node.x}% - 2.75rem)`;
    element.style.top = `calc(${node.y}% - 1.5rem)`;
    element.textContent = node.label;
    world.append(element);
  }
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

async function renderExample(kind: ExampleKind): Promise<void> {
  const data = kind === "corpus" ? await loadRepositoryExample() : examples[kind];
  renderTimeline(data);
  renderWorld(data);
  renderEvidence(data);

  for (const button of buttons) {
    const active = button.dataset.example === kind;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    const kind = button.dataset.example as ExampleKind | undefined;
    if (kind && (kind === "corpus" || kind in examples)) void renderExample(kind);
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

void renderExample("historical");
