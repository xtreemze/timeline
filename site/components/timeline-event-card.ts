import { html, LitElement, noChange } from "lit";

const presentation = globalThis.TimelinePresentation;

export interface TimelineEventCardItem {
  id: string;
  title?: string;
  color?: string;
  start: number;
  end?: number | null;
  startLabel?: string;
  endLabel?: string;
  terminalShape?: string;
  connectorStyle?: string;
  connectorRouting?: string;
  connectorWeight?: string;
  connectorEndpoint?: string;
  media?: Array<{ src?: string; alt?: string; caption?: string }>;
  tags?: Array<string | { label?: string; icon?: string; hue?: number }>;
}

/**
 * Semantic event-card renderer.
 *
 * Lit owns only the card's semantic subtree. The retained timeline controller
 * owns identity, lifetime, transform, connector geometry and range geometry so
 * pointer/wheel/pinch frames never enqueue reactive updates for every card.
 */
export class LuumEventCardElement extends LitElement {
  item: TimelineEventCardItem | null = null;

  override createRenderRoot(): HTMLElement {
    return this;
  }

  setSemanticItem(item: TimelineEventCardItem): void {
    if (this.item === item) return;
    this.item = item;
    this.requestUpdate();
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
    if (!item) return noChange;

    const primaryTag = item.tags?.[0];
    const iconName =
      typeof primaryTag === "object" && primaryTag?.icon ? primaryTag.icon : "milestone";
    const media = item.media?.[0];
    const detail =
      Number.isFinite(item.end) && item.endLabel
        ? `${item.startLabel || ""} → ${item.endLabel}`
        : item.startLabel || "";
    const ariaLabel = [item.title || item.id, detail].filter(Boolean).join(", ");

    return html`
      <span class="timeline-event-connector" aria-hidden="true"></span>
      <span class="timeline-event-connector-turn" aria-hidden="true"></span>
      <button
        type="button"
        class="timeline-event-terminal"
        data-id=${item.id}
        aria-label=${ariaLabel}
      >
        <span
          class=${media?.src ? "timeline-event-art" : "timeline-event-dot"}
          aria-hidden="true"
          data-timeline-visual
        >
          ${media?.src
            ? html`
                <img
                  class="timeline-event-art-image"
                  src=${media.src}
                  alt=""
                  decoding="async"
                  loading="lazy"
                />
                <span class="timeline-event-icon-badge" data-timeline-icon=${iconName}></span>
              `
            : html`<span data-timeline-icon=${iconName}>•</span>`}
        </span>
        <span class="timeline-event-copy">
          <strong>${item.title || item.id}</strong>
          <span>${detail}</span>
        </span>
      </button>
    `;
  }

  override updated(): void {
    const item = this.item;
    if (!item) return;

    this.style.setProperty("--event-color", item.color || "var(--accent)");
    this.dataset.terminalShape = item.terminalShape || "rounded";
    this.dataset.connectorStyle = item.connectorStyle || "solid";
    this.dataset.connectorRouting = item.connectorRouting || "straight";
    this.dataset.connectorEndpoint = item.connectorEndpoint || "none";
    this.dataset.connectorWeight = item.connectorWeight || "normal";

    for (const slot of this.querySelectorAll<HTMLElement>("[data-timeline-icon]")) {
      const iconName = slot.dataset.timelineIcon || "milestone";
      const icon =
        presentation && typeof presentation.createIcon === "function"
          ? presentation.createIcon(iconName, {
              size: slot.classList.contains("timeline-event-icon-badge") ? 18 : 24,
            })
          : null;
      if (icon) slot.replaceChildren(icon);
    }
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("luum-event-card")
) {
  customElements.define("luum-event-card", LuumEventCardElement);
}
