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

export interface ProjectSiteLink {
  readonly label: string;
  readonly href: string;
}

export interface ProjectSiteCapabilityDescriptor {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly kind?: string;
  readonly href?: string;
  readonly status?: "available" | "experimental" | "planned";
}

export interface ProjectShowcaseAsset {
  readonly id: string;
  readonly kind: "image" | "video";
  readonly src: string;
  readonly alt: string;
  readonly poster?: string;
  readonly caption?: string;
}

export interface ProjectSiteDefinition {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly repositoryUrl: string;
  readonly links?: readonly ProjectSiteLink[];
  readonly capabilities?: readonly ProjectSiteCapabilityDescriptor[];
  readonly showcase?: readonly ProjectShowcaseAsset[];
}

export type ProjectCapabilityCleanup = () => void | Promise<void>;

export interface ProjectCapabilityContext {
  readonly host: ProjectCapabilityHostElement;
  readonly signal: AbortSignal;
}

export interface ProjectCapabilityAdapter {
  mount(
    context: ProjectCapabilityContext,
  ):
    | void
    | ProjectCapabilityCleanup
    | Promise<void | ProjectCapabilityCleanup>;
}

export interface ProjectCapabilityErrorDetail {
  readonly error: unknown;
}

export declare const PROJECT_SITE_KIT_VERSION: "0.6.0";

export declare function defineProjectSite<const T extends ProjectSiteDefinition>(
  definition: T,
): T;

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

export declare class ProjectCapabilityHostElement extends HTMLElement {
  adapter: ProjectCapabilityAdapter | null;
}

export declare function runProjectViewTransition(
  update: () => void | Promise<void>,
): Promise<void>;

declare global {
  interface HTMLElementTagNameMap {
    "xt-project-timeline": ProjectTimelineElement;
    "xt-project-graph": ProjectGraphElement;
    "xt-project-media-viewer": ProjectMediaViewerElement;
    "xt-project-capability": ProjectCapabilityHostElement;
  }
}
