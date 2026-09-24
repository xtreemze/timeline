import { html, LitElement } from "lit";

import { iconPathData } from "../event-presentation.ts";

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
  return html`
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
      ${iconPathData(name).map((definition) => html`<path d=${definition}></path>`)}
    </svg>
  `;
}

/**
 * Semantic presentation for one retained timeline occurrence.
 *
 * The host is the retained geometry object. TimelineViewController writes
 * transforms directly to the host; Lit only reconciles semantic card content
 * when the projected occurrence revision changes.
 */
export class LuumEventCardElement extends LitElement {
  item: TimelineEventCardItem | null = null;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  setSemanticItem(item: TimelineEventCardItem): void {
    this.item = item;
    this.dataset.id = item.id;
    this.style.setProperty("--event-color", item.color || "var(--accent)");
    this.dataset.terminalShape = item.terminalShape || "rounded";
    this.dataset.connectorStyle = item.connectorStyle || "solid";
    this.dataset.connectorRouting = item.connectorRouting || "straight";
    this.dataset.connectorEndpoint = item.connectorEndpoint || "none";
    this.dataset.connectorWeight = item.connectorWeight || "normal";
    this.requestUpdate();
    // The retained scene measures and binds the terminal synchronously in the
    // same commit. Flush only semantic card content here; geometry stays external.
    this.performUpdate();
  }

  setSelected(selected: boolean): void {
    this.classList.toggle("is-selected", selected);
  }

  get terminal(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>(".timeline-event-terminal");
  }

  override render() {
    const item = this.item;
    if (!item) return html``;

    const iconName = primaryIconName(item);
    const media = item.media?.[0];
    const detail = detailText(item);
    const ariaLabel = [item.title || item.id, detail].filter(Boolean).join(", ");

    return html`
      <span class="timeline-event-connector"></span>
      <span class="timeline-event-connector-turn"></span>
      <button
        type="button"
        class="timeline-event-terminal"
        data-id=${item.id}
        aria-label=${ariaLabel}
      >
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
      </button>
    `;
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-event-card")
) {
  customElements.define("luum-event-card", LuumEventCardElement);
}
