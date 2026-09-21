/**
 * GraphSurface: Timeline-owned contracts for graph rendering, decoupled from renderer implementation.
 * This boundary separates the domain/application layer from any specific rendering backend (Orb, Sigma, etc).
 */

import type { EntityId, RelationshipId } from "../domain/ids.ts";

/**
 * CanonicalSelection identifies what is selected in the graph using Timeline domain IDs only.
 * Never includes renderer-specific IDs or objects.
 */
export type GraphSelectionKind = "entity" | "relationship";

export interface CanonicalSelection {
  readonly kind: GraphSelectionKind;
  readonly id: EntityId | RelationshipId;
}

/**
 * CameraState represents the viewport position and zoom of the graph display.
 * Renderer-agnostic representation that can be serialized and restored.
 */
export interface CameraState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * TemporalProjectionBounds represents the time window shown in the graph.
 */
export interface TemporalProjectionBounds {
  readonly start: number;
  readonly end: number;
}

/**
 * GraphNodeProjection represents how an entity should be displayed.
 * Renderer receives this, not renderer-specific node objects.
 */
export interface GraphNodeProjection {
  readonly id: EntityId;
  readonly label: string;
  readonly group?: string; // e.g., "person", "place", "organization"
}

/**
 * GraphEdgeProjection represents how a relationship should be displayed.
 */
export interface GraphEdgeProjection {
  readonly id: RelationshipId;
  readonly sourceId: EntityId;
  readonly targetId: EntityId;
  readonly label: string;
  readonly temporalState?: "timeless" | "temporal";
  readonly startTime?: number;
  readonly endTime?: number;
}

/**
 * GraphProjection is the complete data fed to a renderer.
 * It comes from Timeline domain and timeline-owned projection logic, not from the renderer.
 */
export interface GraphProjection {
  readonly nodes: readonly GraphNodeProjection[];
  readonly edges: readonly GraphEdgeProjection[];
  readonly temporal?: TemporalProjectionBounds;
}

/**
 * GraphSurface is the interface that a renderer must implement.
 * It abstracts over Orb, Sigma, or any other graph display technology.
 * The renderer does not own interaction or state; it receives commands and fires events.
 */
export interface GraphSurface {
  /**
   * Set the graph data to display.
   * This is used for initial load or when the topology changes significantly.
   */
  setProjection(projection: GraphProjection): void;

  /**
   * Transition between projections with animation.
   * Used when topology changes but the transition should be smooth.
   */
  transitionProjection(projection: GraphProjection): void;

  /**
   * Update only temporal state of edges (e.g., visibility based on time window),
   * without changing topology.
   */
  updateTemporalEdges(edges: readonly GraphEdgeProjection[]): void;

  /**
   * Set which entity or relationship is currently selected.
   */
  setSelection(selection: CanonicalSelection | null): void;

  /**
   * Get the current camera state (viewport position and zoom).
   */
  getCamera(): CameraState;

  /**
   * Set the camera to a specific position and zoom.
   */
  setCamera(camera: CameraState): void;

  /**
   * Fit the view to show all nodes (e.g., via a keyboard shortcut or menu action).
   */
  fit(): void;

  /**
   * Recenter the graph to its current layout center (useful after interactions).
   */
  recenter(): void;

  /**
   * Force a layout update. Used when canvas size changes or external forces apply.
   */
  refreshLayout(): void;

  /**
   * Get the current rendering mode or layout algorithm in use (e.g., "gpu", "cpu", "worker").
   * For diagnostic/telemetry purposes.
   */
  getMode(): string;

  /**
   * Clean up resources. Called before disposal.
   */
  destroy(): void;

  /**
   * Optional: Select a node for interaction (e.g., long-press drag).
   */
  selectForInteraction?(kind: GraphSelectionKind, id: EntityId | RelationshipId): void;
}

/**
 * GraphSurfaceEvents are fired by a renderer when user interactions occur.
 * These are Timeline domain events, using canonical IDs only.
 */
export type GraphSurfaceEvent =
  | { kind: "selection-changed"; selection: CanonicalSelection }
  | { kind: "interaction-start"; selection: CanonicalSelection; interaction: string }
  | { kind: "simulation-state"; running: boolean; durationMs?: number; mode?: string };

/**
 * GraphSurfaceEventListener receives events from the renderer.
 */
export type GraphSurfaceEventListener = (event: GraphSurfaceEvent) => void;

/**
 * GraphSurfaceFactory creates and owns a GraphSurface instance.
 * This is the sole point where renderer-specific code is instantiated.
 */
export interface GraphSurfaceFactory {
  create(
    container: HTMLElement,
    eventListener: GraphSurfaceEventListener,
  ): GraphSurface;
}
