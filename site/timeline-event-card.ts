import { html, LitElement, svg } from "lit";

import { iconPathData } from "./event-presentation.ts";

export interface TimelineEventCardItem {
  id: string;
  title?: string;
  start: number;
  end?: number | null;
  startLabel?: string;
  endLabel?: string;
  color?: string;
  terminalShape?: string;
  connectorStyle?: string;
  connectorRouting?: string;
  connectorWeight?: string;
  connectorEndpoint?: string;
  media?: Array<{ src?: string; alt?: string; caption?: string }>;
  tags?: Array<string | { label?: string; icon?: string; hue?: number }>;
}

function detailText(item: TimelineEventCardItem): string {
  return Number.isFinite(item.end) && item.endLabel
    ? `${item.startLabel || ""} → ${item.endLabel}`
    : item.startLabel || "";
}

function primaryIconName(item: TimelineEventCardItem): string {
  const primaryTag = item.tags?.[0];
  return typeof primaryTag === "object" && primaryTag?.icon ? primaryTag.icon : "milestone";
}

function semanticIcon(name: string, size: number) {
  return svg`
    <svg
      class="semantic-icon"
      viewBox="0 0 24 24"
      width=${size}
      height=${size}
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${iconPathData(name).map((definition) => svg`<path d=${definition}></path>`)}
    </svg>
  `;
}

/**
 * Semantic presentation for one retained timeline occurrence.
 *
 * The host is the retained geometry object. TimelineSceneController writes
 * transforms directly to the host; Lit only reconciles the terminal's semantic
 * interior when the occurrence revision changes.
 */
export class LuumEventCardElement extends LitElement {
  item: TimelineEventCardItem | null = null;

  readonly connector: HTMLSpanElement;
  readonly connectorTurn: HTMLSpanElement;
  readonly terminal: HTMLButtonElement;

  constructor() {
    super();
    this.classList.add("timeline-event");

    this.connector = document.createElement("span");
    this.connector.className = "timeline-event-connector";

    this.connectorTurn = document.createElement("span");
    this.connectorTurn.className = "timeline-event-connector-turn";

    this.terminal = document.createElement("button");
    this.terminal.type = "button";
    this.terminal.className = "timeline-event-terminal";

    this.append(this.connector, this.connectorTurn, this.terminal);
  }

  override createRenderRoot(): HTMLElement {
    // Keep the terminal in light DOM so existing timeline CSS, focus semantics,
    // browser tests, and measurement code remain authoritative.
    return this.terminal;
  }

  setSemanticItem(item: TimelineEventCardItem): void {
    this.item = item;
    this.requestUpdate();
    this.dataset.id = item.id;
    this.terminal.dataset.id = item.id;
    this.style.setProperty("--event-color", item.color || "var(--accent)");
    this.dataset.terminalShape = item.terminalShape || "rounded";
    this.dataset.connectorStyle = item.connectorStyle || "solid";
    this.dataset.connectorRouting = item.connectorRouting || "straight";
    this.dataset.connectorEndpoint = item.connectorEndpoint || "none";
    this.dataset.connectorWeight = item.connectorWeight || "normal";
    const detail = detailText(item);
    this.terminal.setAttribute(
      "aria-label",
      [item.title || item.id, detail].filter(Boolean).join(", "),
    );
  }

  setSelected(selected: boolean): void {
    this.classList.toggle("is-selected", selected);
  }

  override render() {
    const item = this.item;
    if (!item) return html``;

    const iconName = primaryIconName(item);
    const media = item.media?.[0];
    const detail = detailText(item);

    return html`
      ${media?.src
        ? html`
            <span class="timeline-event-art" aria-hidden="true">
              <img
                class="timeline-event-art-image"
                src=${media.src}
                alt=""
                decoding="async"
                loading="lazy"
              />
              <span class="timeline-event-icon-badge">
                ${semanticIcon(iconName, 18)}
              </span>
            </span>
          `
        : html`
            <span class="timeline-event-dot" aria-hidden="true">
              ${semanticIcon(iconName, 24)}
            </span>
          `}
      <span class="timeline-event-copy">
        <strong>${item.title || item.id}</strong>
        <span>${detail}</span>
      </span>
    `;
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-event-card")
) {
  customElements.define("luum-event-card", LuumEventCardElement);
}
