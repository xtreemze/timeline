export interface EmbedTimelineItem {
  readonly id: string;
  readonly label: string;
  readonly timeLabel: string;
  readonly detail?: string;
  readonly color?: string;
}

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

export interface LuumEmbedSelectDetail {
  readonly kind: "timeline" | "graph";
  readonly id: string;
}

export declare const LUUM_EMBED_VERSION: "0.4.0";

export declare class LuumEmbedTimelineElement extends HTMLElement {
  items: readonly EmbedTimelineItem[];
  selectedId: string;
  ariaLabel: string;
}

export declare class LuumEmbedGraphElement extends HTMLElement {
  nodes: readonly EmbedGraphNode[];
  edges: readonly EmbedGraphEdge[];
  selectedId: string;
  ariaLabel: string;
}

declare global {
  interface HTMLElementTagNameMap {
    "luum-embed-timeline": LuumEmbedTimelineElement;
    "luum-embed-graph": LuumEmbedGraphElement;
  }
}


export declare const PROJECT_SITE_KIT_VERSION: "0.4.0";

export declare class ProjectTimelineElement extends LuumEmbedTimelineElement {}
export declare class ProjectGraphElement extends LuumEmbedGraphElement {}
export declare class ProjectMediaViewerElement extends HTMLElement {
  src: string;
  alt: string;
  caption: string;
  minZoom: number;
  maxZoom: number;
  zoom: number;
  resetView(): void;
}
export declare function runProjectViewTransition(
  update: () => void | Promise<void>,
): Promise<void>;

declare global {
  interface HTMLElementTagNameMap {
    "xt-project-timeline": ProjectTimelineElement;
    "xt-project-graph": ProjectGraphElement;
    "xt-project-media-viewer": ProjectMediaViewerElement;
  }
}
