import { css, html, LitElement, nothing, svg } from "lit";
import { embedThemeStyles } from "./embed-theme.ts";

export interface EmbedGraphNode {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  readonly color?: string;
  readonly position?: Readonly<{ x: number; y: number }>;
}

export interface EmbedGraphEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label?: string;
  readonly color?: string;
}

type ResolvedNode = EmbedGraphNode & { readonly position: Readonly<{ x: number; y: number }> };

const clampPosition = (value: number): number => Math.min(92, Math.max(8, value));

export class LuumEmbedGraphElement extends LitElement {
  static properties = {
    nodes: { attribute: false },
    edges: { attribute: false },
    selectedId: { type: String, attribute: "selected-id" },
    ariaLabel: { type: String, attribute: "aria-label" },
  };

  static styles = [
    embedThemeStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      [part="surface"] {
        position: relative;
        min-block-size: var(--luum-embed-graph-height, 22rem);
        overflow: hidden;
        border: 2px solid var(--_luum-line);
        border-radius: var(--_luum-radius);
        background: var(--_luum-paper);
        box-shadow: var(--_luum-shadow);
      }

      svg {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        pointer-events: none;
      }

      [part="edge"] {
        stroke: var(--edge-color, color-mix(in srgb, var(--_luum-line) 52%, transparent));
        stroke-width: 1.5;
      }

      [part="edge-label"] {
        fill: var(--_luum-muted);
        font: 700 3px var(--luum-embed-font, system-ui, sans-serif);
        paint-order: stroke;
        stroke: var(--_luum-paper);
        stroke-width: 1.2px;
      }

      [part="node"] {
        position: absolute;
        translate: -50% -50%;
        display: grid;
        gap: 0.15rem;
        min-inline-size: 5.5rem;
        max-inline-size: 9rem;
        min-block-size: 44px;
        padding: 0.55rem 0.65rem;
        border: 2px solid var(--node-color, var(--_luum-line));
        border-radius: var(--_luum-radius);
        background: color-mix(in srgb, var(--node-color, var(--_luum-panel)) 12%, var(--_luum-paper));
        color: inherit;
        box-shadow: 3px 3px 0 color-mix(in srgb, var(--_luum-line) 75%, transparent);
        text-align: center;
        cursor: pointer;
      }

      [part="node"][aria-pressed="true"] {
        border-color: var(--node-color, var(--_luum-accent));
        box-shadow:
          inset 0 3px 0 var(--node-color, var(--_luum-accent)),
          3px 3px 0 var(--_luum-line);
      }

      [part="node-label"] {
        font-size: 0.84rem;
        font-weight: 900;
        line-height: 1.05;
      }

      [part="node-detail"] {
        color: var(--_luum-muted);
        font-size: 0.7rem;
        line-height: 1.2;
      }
    `,
  ];

  nodes: readonly EmbedGraphNode[] = [];
  edges: readonly EmbedGraphEdge[] = [];
  selectedId = "";
  ariaLabel = "Relationship graph";

  private resolvedPosition(node: EmbedGraphNode, index: number): Readonly<{ x: number; y: number }> {
    if (node.position) {
      return Object.freeze({
        x: clampPosition(node.position.x),
        y: clampPosition(node.position.y),
      });
    }
    const count = Math.max(1, this.nodes.length);
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return Object.freeze({
      x: 50 + Math.cos(angle) * 34,
      y: 50 + Math.sin(angle) * 32,
    });
  }

  private selectNode(id: string): void {
    this.selectedId = id;
    this.dispatchEvent(
      new CustomEvent("luum-embed-select", {
        bubbles: true,
        composed: true,
        detail: Object.freeze({ kind: "graph", id }),
      }),
    );
  }

  protected override render() {
    const resolved: readonly ResolvedNode[] = this.nodes.map((node, index) =>
      Object.freeze({ ...node, position: this.resolvedPosition(node, index) }),
    );
    const byId = new Map(resolved.map((node) => [node.id, node] as const));

    return html`
      <div part="surface" role="group" aria-label=${this.ariaLabel}>
        <svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
          ${this.edges.map((edge) => {
            const source = byId.get(edge.sourceId);
            const target = byId.get(edge.targetId);
            if (!source || !target) return nothing;
            const midX = (source.position.x + target.position.x) / 2;
            const midY = (source.position.y + target.position.y) / 2;
            return svg`
              <line
                part="edge"
                x1=${source.position.x}
                y1=${source.position.y}
                x2=${target.position.x}
                y2=${target.position.y}
                style=${edge.color ? `--edge-color:${edge.color}` : nothing}
              ></line>
              ${edge.label
                ? svg`<text part="edge-label" x=${midX} y=${midY - 1} text-anchor="middle">${edge.label}</text>`
                : nothing}
            `;
          })}
        </svg>
        ${resolved.map(
          (node) => html`
            <button
              part="node"
              type="button"
              aria-pressed=${this.selectedId === node.id ? "true" : "false"}
              style=${`left:${String(node.position.x)}%;top:${String(node.position.y)}%;${
                node.color ? `--node-color:${node.color};` : ""
              }`}
              @click=${() => this.selectNode(node.id)}
            >
              <span part="node-label">${node.label}</span>
              ${node.detail ? html`<span part="node-detail">${node.detail}</span>` : nothing}
            </button>
          `,
        )}
      </div>
    `;
  }
}
