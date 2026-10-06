export interface ProjectTimelineItem {
  readonly id: string;
  readonly label: string;
  readonly timeLabel: string;
  readonly detail?: string;
  readonly color?: string;
}

export interface ProjectGraphNode {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  readonly color?: string;
  readonly position?: Readonly<{ x: number; y: number }>;
}

export interface ProjectGraphEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label?: string;
  readonly color?: string;
}

export interface ProjectMediaViewerZoomDetail {
  readonly zoom: number;
}

export declare const PROJECT_SITE_KIT_VERSION: "0.4.0";

export declare class ProjectTimelineElement extends HTMLElement {
  items: readonly ProjectTimelineItem[];
  selectedId: string;
  ariaLabel: string;
}

export declare class ProjectGraphElement extends HTMLElement {
  nodes: readonly ProjectGraphNode[];
  edges: readonly ProjectGraphEdge[];
  selectedId: string;
  ariaLabel: string;
}

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
