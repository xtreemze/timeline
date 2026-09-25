import { fitWorldCamera, globeOverviewCamera } from "../../src/layout/world-camera-fit.ts";
import type { WorldRenderPosition } from "../../src/layout/world-geographic-position.ts";
import {
  WORLD_ENTITY_MIN_HIT_RADIUS_PX,
  type WorldGraphPalette,
  worldColorBytes,
} from "../../src/layout/world-graph-style.ts";
import { createWorldCameraState, type WorldCameraState } from "../../src/layout/world-surface.ts";
import { TimelineMotion } from "../timeline-motion.ts";
import {
  type DeckRuntimeInstance,
  type DeckRuntimePickingInfo,
  type DeckWorldRuntime,
  EARTH_POLYGON,
  resolveWorldPalette,
  type WorldThemeColors,
  worldThemeColors,
} from "./deck-world-surface.ts";
import type {
  PlaceMapArea,
  PlaceMapGeometry,
  PlaceMapMarker,
  PlaceMapPath,
  PlaceMapPoint,
} from "./place-map-geometry.ts";
import { type WorldBasemap, worldGraticule } from "./world-basemap.ts";
import { worldNodeMarker } from "./world-node-marker.ts";

/**
 * A small WorldSurface-styled globe for one place: the same vector basemap,
 * theme and node markers as the relationship globe, used by the item editor
 * (click or drag to place a location) and the focused-event popover (the
 * event's place). Only the canonical location is ever drawn; the camera is
 * derived state and nothing here writes evidence except an explicit pick.
 */

export const PLACE_MAP_LAYER_IDS = Object.freeze({
  earth: "lum-place-map-earth",
  graticule: "lum-place-map-graticule",
  borders: "lum-place-map-borders",
  coastlines: "lum-place-map-coastlines",
  areas: "lum-place-map-areas",
  paths: "lum-place-map-paths",
  markers: "lum-place-map-markers",
  labels: "lum-place-map-labels",
});

/**
 * GlobeView drifts by pixels past ~zoom 8 (measured ~30 px at 11.7), and the
 * 1:110m vector basemap has no detail beyond regional scale, so the place
 * map stops at regional zoom. Exact coordinates are typed or geolocated.
 */
export const PLACE_MAP_MAX_ZOOM = 8;
const PLACE_MAP_MIN_ZOOM = 0;
/** Default framing for a point with no other geometry: regional context. */
const PLACE_MAP_POINT_SPAN_DEGREES = 0.02;
const PICKING_RADIUS_PX = 6;
const LABEL_SIZE_PX = 14;
const LABEL_HALO_PX = 3;
const ZOOM_STEP = 1;

const WORLD_CAMERA = createWorldCameraState({
  longitude: 0,
  latitude: 20,
  zoom: 1,
  bearing: 0,
  pitch: 0,
});

const GRATICULE = worldGraticule();

export interface PlaceMapOptions {
  /** Camera responds to drag/zoom/keyboard input. */
  readonly interactive: boolean;
  /** Click, tap, Enter or marker drag proposes a new location. */
  readonly editable?: boolean;
  /** Accessible name for the map region. */
  readonly label: string;
  /** Called with an explicit user pick (editable maps only). */
  readonly onPick?: (point: PlaceMapPoint) => void;
  /** Called once the first frame with the current content has rendered. */
  readonly onRender?: () => void;
}

interface CameraTween {
  readonly from: WorldCameraState;
  readonly to: WorldCameraState;
  readonly start: number;
  readonly durationMs: number;
  frame: number;
  readonly resolve: () => void;
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function clampZoom(zoom: number): number {
  return Math.max(PLACE_MAP_MIN_ZOOM, Math.min(PLACE_MAP_MAX_ZOOM, zoom));
}

/** Wraps only out-of-range longitudes, so in-range values stay exact. */
function wrapLongitude(longitude: number): number {
  return longitude >= -180 && longitude <= 180
    ? longitude
    : ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function clampCamera(camera: WorldCameraState): WorldCameraState {
  return createWorldCameraState({
    longitude: wrapLongitude(camera.longitude),
    latitude: Math.max(-85, Math.min(85, camera.latitude)),
    zoom: clampZoom(camera.zoom),
    bearing: camera.bearing,
    pitch: camera.pitch,
  });
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function interpolateCamera(
  from: WorldCameraState,
  to: WorldCameraState,
  t: number,
): WorldCameraState {
  const longitudeDelta = ((((to.longitude - from.longitude + 180) % 360) + 360) % 360) - 180;
  // Zoom out-and-in along a gentle arc so a long hop keeps its context.
  const hop = Math.min(
    3,
    Math.abs(longitudeDelta) / 30 + Math.abs(to.latitude - from.latitude) / 30,
  );
  const arc = Math.sin(Math.PI * t) * hop;
  return clampCamera({
    longitude: from.longitude + longitudeDelta * t,
    latitude: from.latitude + (to.latitude - from.latitude) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t - arc,
    bearing: from.bearing + (to.bearing - from.bearing) * t,
    pitch: from.pitch + (to.pitch - from.pitch) * t,
  });
}

function controllerOptions(): Readonly<Record<string, unknown>> {
  const reducedMotion = prefersReducedMotion();
  return Object.freeze({
    dragPan: true,
    dragRotate: false,
    scrollZoom: reducedMotion ? true : { smooth: true },
    touchZoom: true,
    touchRotate: false,
    keyboard: true,
    doubleClickZoom: true,
    zoomAround: "pointer",
    inertia: reducedMotion ? false : TimelineMotion.INERTIA_TAU_MS,
  });
}

export class DeckPlaceMap {
  readonly #container: HTMLElement;
  readonly #runtime: DeckWorldRuntime;
  readonly #options: PlaceMapOptions;
  readonly #deck: DeckRuntimeInstance;
  readonly #view: unknown;
  readonly #controls: HTMLElement | null;
  readonly #keydown = (event: KeyboardEvent) => this.#handleKeyDown(event);
  #palette: WorldGraphPalette;
  #theme: WorldThemeColors;
  #camera: WorldCameraState = WORLD_CAMERA;
  #basemap: WorldBasemap | null = null;
  #fictional = false;
  #geometry: PlaceMapGeometry | null = null;
  #marker: PlaceMapMarker | null = null;
  #markerDragging = false;
  #tween: CameraTween | null = null;
  #dashExtension: unknown = null;
  #userCamera = false;
  #renderPending = false;
  #destroyed = false;

  constructor(container: HTMLElement, runtime: DeckWorldRuntime, options: PlaceMapOptions) {
    this.#container = container;
    this.#runtime = runtime;
    this.#options = options;
    this.#palette = resolveWorldPalette(container);
    this.#theme = worldThemeColors(this.#palette);
    this.#view = runtime.createGlobeView({ id: "lum-place-map" });
    this.#deck = runtime.createDeck({
      parent: container,
      views: [this.#view],
      controller: options.interactive ? controllerOptions() : false,
      viewState: this.#camera,
      pickingRadius: PICKING_RADIUS_PX,
      layers: [],
      getCursor: ({ isDragging, isHovering }: { isDragging?: boolean; isHovering?: boolean }) => {
        if (this.#markerDragging || isDragging) return "grabbing";
        if (options.editable && isHovering) return "grab";
        return options.editable ? "crosshair" : "grab";
      },
      onClick: (info: DeckRuntimePickingInfo) => this.#handleClick(info),
      onViewStateChange: ({ viewState }: { readonly viewState: WorldCameraState }) =>
        this.#handleViewStateChange(viewState),
      onAfterRender: () => this.#afterRender(),
    });
    container.addEventListener?.("keydown", this.#keydown);
    if (container.tabIndex < 0 && options.interactive) container.tabIndex = 0;
    container.setAttribute?.("aria-label", options.label);
    if (options.editable) {
      container.setAttribute?.(
        "aria-description",
        "Drag to pan, use the zoom buttons or + and - to zoom, and click, tap or press Enter to place the location at the map centre.",
      );
    }
    this.#controls = options.interactive ? this.#createZoomControls() : null;
    this.#render();
  }

  get camera(): WorldCameraState {
    return this.#camera;
  }

  get userControlsCamera(): boolean {
    return this.#userCamera;
  }

  setBasemap(basemap: WorldBasemap | null): void {
    this.#assertAlive();
    this.#basemap = basemap;
    this.#render();
  }

  /** Invented geography: keep the graticule, hide real coastlines and borders. */
  setFictional(fictional: boolean): void {
    this.#assertAlive();
    this.#fictional = fictional;
    this.#render();
  }

  setGeometry(geometry: PlaceMapGeometry | null): void {
    this.#assertAlive();
    this.#geometry = geometry;
    this.#renderPending = true;
    this.#render();
  }

  /** The editor's movable location marker, or null to clear it. */
  setMarker(point: PlaceMapPoint | null): void {
    this.#assertAlive();
    this.#marker = point
      ? Object.freeze({
          position: Object.freeze([point.longitude, point.latitude, 0]) as WorldRenderPosition,
          label: "",
          icon: "place",
          shape: "pin",
          fill: this.#palette.focus,
          borderWidth: 2,
          size: 44,
          opacity: 1,
          primary: true,
        })
      : null;
    this.#renderPending = true;
    this.#render();
  }

  /** Whole-globe overview turned towards `positions`. */
  overviewCamera(positions: readonly WorldRenderPosition[]): WorldCameraState {
    return clampCamera(globeOverviewCamera(positions, this.#viewportSize(), this.#camera));
  }

  /** Camera framing `positions`, never closer than `maxZoom`. */
  fitCamera(
    positions: readonly WorldRenderPosition[],
    maxZoom = PLACE_MAP_MAX_ZOOM,
  ): WorldCameraState | null {
    const fitted = fitWorldCamera(positions, this.#viewportSize(), this.#camera, {
      minSpanDegrees: PLACE_MAP_POINT_SPAN_DEGREES,
      maxZoom: clampZoom(maxZoom),
    });
    return fitted ? clampCamera(fitted) : null;
  }

  jumpTo(camera: WorldCameraState): void {
    this.#assertAlive();
    this.#cancelTween();
    this.#camera = clampCamera(camera);
    this.#deck.setProps({ viewState: this.#camera });
  }

  /** Animated camera move; resolves when it ends or is interrupted. */
  flyTo(camera: WorldCameraState, durationMs: number): Promise<void> {
    this.#assertAlive();
    this.#cancelTween();
    const target = clampCamera(camera);
    if (prefersReducedMotion() || durationMs <= 0 || typeof requestAnimationFrame !== "function") {
      this.jumpTo(target);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const tween: CameraTween = {
        from: this.#camera,
        to: target,
        start: performance.now(),
        durationMs,
        frame: 0,
        resolve,
      };
      const step = (now: number) => {
        if (this.#tween !== tween || this.#destroyed) return;
        const t = Math.min(1, Math.max(0, (now - tween.start) / tween.durationMs));
        this.#camera = interpolateCamera(tween.from, tween.to, easeInOut(t));
        this.#deck.setProps({ viewState: this.#camera });
        if (t < 1) {
          tween.frame = requestAnimationFrame(step);
          return;
        }
        this.#tween = null;
        resolve();
      };
      this.#tween = tween;
      tween.frame = requestAnimationFrame(step);
    });
  }

  zoomBy(delta: number): void {
    this.#assertAlive();
    this.#userCamera = true;
    this.jumpTo({ ...this.#camera, zoom: this.#camera.zoom + delta });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#cancelTween();
    this.#destroyed = true;
    this.#container.removeEventListener?.("keydown", this.#keydown);
    this.#controls?.remove();
    this.#deck.finalize();
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error("DeckPlaceMap has been destroyed.");
  }

  #viewportSize(): { width: number; height: number } {
    const width = this.#container.clientWidth || 320;
    const height = this.#container.clientHeight || 240;
    return { width, height };
  }

  #cancelTween(): void {
    const tween = this.#tween;
    if (!tween) return;
    this.#tween = null;
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(tween.frame);
    tween.resolve();
  }

  #handleViewStateChange(viewState: WorldCameraState): void {
    if (this.#destroyed) return;
    // A marker drag owns the gesture: keep the frame still under the finger.
    if (this.#markerDragging) {
      this.#deck.setProps({ viewState: this.#camera });
      return;
    }
    this.#cancelTween();
    this.#userCamera = true;
    this.#camera = clampCamera({ ...this.#camera, ...viewState });
    this.#deck.setProps({ viewState: this.#camera });
  }

  #unproject(x: number | undefined, y: number | undefined): PlaceMapPoint | null {
    if (typeof x !== "number" || typeof y !== "number") return null;
    const viewport = this.#deck.getViewports()[0];
    if (!viewport) return null;
    const [longitude, latitude] = viewport.unproject([x, y]);
    if (
      typeof longitude !== "number" ||
      typeof latitude !== "number" ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return null;
    }
    return Object.freeze({ longitude: wrapLongitude(longitude), latitude });
  }

  #pick(point: PlaceMapPoint | null): void {
    if (!point || !this.#options.editable) return;
    this.setMarker(point);
    this.#options.onPick?.(point);
  }

  #handleClick(info: DeckRuntimePickingInfo): void {
    if (this.#destroyed || !this.#options.editable || this.#markerDragging) return;
    this.#pick(this.#unproject(info.x, info.y));
  }

  #handleKeyDown(event: KeyboardEvent): void {
    if (this.#destroyed || event.target !== this.#container) return;
    if (this.#options.editable && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      this.#pick({ longitude: this.#camera.longitude, latitude: this.#camera.latitude });
    }
  }

  #createZoomControls(): HTMLElement | null {
    const document = this.#container.ownerDocument;
    if (!document?.createElement) return null;
    const controls = document.createElement("div");
    controls.className = "place-map-zoom";
    for (const [label, text, delta] of [
      ["Zoom in", "+", ZOOM_STEP],
      ["Zoom out", "−", -ZOOM_STEP],
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "place-map-zoom-button";
      button.textContent = text;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.addEventListener("click", () => {
        if (!this.#destroyed) this.zoomBy(delta);
      });
      controls.append(button);
    }
    this.#container.append(controls);
    return controls;
  }

  #afterRender(): void {
    if (!this.#renderPending || this.#destroyed) return;
    this.#renderPending = false;
    this.#options.onRender?.();
  }

  #markerLayerProps(markers: readonly PlaceMapMarker[]): Readonly<Record<string, unknown>> {
    const style = (marker: PlaceMapMarker) =>
      worldNodeMarker({
        shape: marker.shape,
        fill: marker.fill,
        border: this.#palette.paper,
        borderWidth: marker.borderWidth,
        icon: marker.icon,
        image: null,
        radius: Math.max(WORLD_ENTITY_MIN_HIT_RADIUS_PX, marker.size / 2),
      });
    const editableMarker = this.#options.editable === true && this.#marker !== null;
    return {
      id: PLACE_MAP_LAYER_IDS.markers,
      data: markers,
      pickable: editableMarker,
      billboard: true,
      sizeUnits: "pixels",
      getPosition: (marker: PlaceMapMarker) => marker.position,
      getIcon: style,
      getSize: (marker: PlaceMapMarker) => style(marker).size,
      // A pin's tip, not its centre, marks the location.
      getPixelOffset: (marker: PlaceMapMarker) =>
        marker.shape === "pin" ? [0, -style(marker).size / 2 + 2] : [0, 0],
      getColor: (marker: PlaceMapMarker) => [255, 255, 255, Math.round(marker.opacity * 255)],
      updateTriggers: { getIcon: this.#palette, getSize: this.#palette },
      parameters: { cullMode: "none", depthCompare: "always" },
      ...(editableMarker
        ? {
            onDragStart: (
              _info: DeckRuntimePickingInfo,
              event: { stopPropagation?: () => void },
            ) => {
              this.#markerDragging = true;
              event.stopPropagation?.();
              return true;
            },
            onDrag: (info: DeckRuntimePickingInfo, event: { stopPropagation?: () => void }) => {
              if (!this.#markerDragging) return false;
              event.stopPropagation?.();
              const point = this.#unproject(info.x, info.y);
              if (point) this.setMarker(point);
              return true;
            },
            onDragEnd: (info: DeckRuntimePickingInfo, event: { stopPropagation?: () => void }) => {
              if (!this.#markerDragging) return false;
              this.#markerDragging = false;
              event.stopPropagation?.();
              this.#pick(this.#unproject(info.x, info.y) ?? this.#markerPoint());
              return true;
            },
          }
        : {}),
    };
  }

  /** Authored dashes via deck's PathStyleExtension, in line-width units. */
  #dashProps(paths: readonly PlaceMapPath[]): Readonly<Record<string, unknown>> {
    if (!paths.some((path) => path.dash) || !this.#runtime.createDashedPathExtension) return {};
    this.#dashExtension ??= this.#runtime.createDashedPathExtension();
    return {
      extensions: [this.#dashExtension],
      dashJustified: true,
      getDashArray: (path: PlaceMapPath) =>
        path.dash && path.width > 0
          ? [path.dash[0] / path.width, path.dash[1] / path.width]
          : [0, 0],
    };
  }

  #markerPoint(): PlaceMapPoint | null {
    return this.#marker
      ? { longitude: this.#marker.position[0], latitude: this.#marker.position[1] }
      : null;
  }

  #render(): void {
    if (this.#destroyed) return;
    const runtime = this.#runtime;
    const theme = this.#theme;
    const geometry = this.#geometry;
    const markers = [...(geometry?.markers ?? []), ...(this.#marker ? [this.#marker] : [])];
    const labels = markers.filter((marker) => marker.label);
    const areas = geometry?.areas ?? [];
    const paths = geometry?.paths ?? [];
    const lineLayer = (id: string, data: unknown, width: number, color: readonly number[]) =>
      runtime.createPathLayer({
        id,
        data,
        pickable: false,
        widthUnits: "pixels",
        getPath: (path: unknown) => path,
        getWidth: width,
        getColor: color,
        parameters: { cullMode: "none" },
      });

    const layers = [
      ...(runtime.createSolidPolygonLayer
        ? [
            runtime.createSolidPolygonLayer({
              id: PLACE_MAP_LAYER_IDS.earth,
              data: EARTH_POLYGON,
              getPolygon: (polygon: unknown) => polygon,
              filled: true,
              stroked: false,
              pickable: false,
              getFillColor: theme.earth,
            }),
          ]
        : []),
      lineLayer(PLACE_MAP_LAYER_IDS.graticule, GRATICULE, 1, theme.graticule),
      ...(this.#basemap && !this.#fictional
        ? [
            lineLayer(PLACE_MAP_LAYER_IDS.borders, this.#basemap.borders, 0.75, theme.border),
            lineLayer(
              PLACE_MAP_LAYER_IDS.coastlines,
              this.#basemap.coastlines,
              1.25,
              theme.coastline,
            ),
          ]
        : []),
      ...(runtime.createSolidPolygonLayer && areas.length > 0
        ? [
            runtime.createSolidPolygonLayer({
              id: PLACE_MAP_LAYER_IDS.areas,
              data: areas,
              getPolygon: (area: PlaceMapArea) => area.polygon,
              filled: true,
              stroked: false,
              pickable: false,
              getFillColor: (area: PlaceMapArea) => area.fill,
              parameters: { cullMode: "none" },
            }),
          ]
        : []),
      ...(paths.length > 0
        ? [
            runtime.createPathLayer({
              id: PLACE_MAP_LAYER_IDS.paths,
              data: paths,
              pickable: false,
              widthUnits: "pixels",
              getPath: (path: PlaceMapPath) => path.path,
              getWidth: (path: PlaceMapPath) => path.width,
              getColor: (path: PlaceMapPath) => path.color,
              parameters: { cullMode: "none" },
              ...this.#dashProps(paths),
            }),
          ]
        : []),
      ...(runtime.createIconLayer && markers.length > 0
        ? [runtime.createIconLayer(this.#markerLayerProps(markers))]
        : markers.length > 0
          ? [
              runtime.createScatterplotLayer({
                id: PLACE_MAP_LAYER_IDS.markers,
                data: markers,
                pickable: false,
                radiusUnits: "pixels",
                getPosition: (marker: PlaceMapMarker) => marker.position,
                getRadius: (marker: PlaceMapMarker) => marker.size / 2,
                getFillColor: (marker: PlaceMapMarker) =>
                  worldColorBytes(marker.fill, Math.round(marker.opacity * 255)),
              }),
            ]
          : []),
      ...(runtime.createTextLayer && labels.length > 0
        ? [
            runtime.createTextLayer({
              id: PLACE_MAP_LAYER_IDS.labels,
              data: labels,
              pickable: false,
              billboard: true,
              characterSet: "auto",
              sizeUnits: "pixels",
              fontWeight: 700,
              fontSettings: { sdf: true, fontSize: 64, buffer: 8, radius: 16 },
              outlineWidth: LABEL_HALO_PX,
              outlineColor: theme.labelHalo,
              getText: (marker: PlaceMapMarker) => marker.label,
              getPosition: (marker: PlaceMapMarker) => marker.position,
              getSize: LABEL_SIZE_PX,
              getColor: theme.labelText,
              getTextAnchor: "middle",
              getAlignmentBaseline: "top",
              getPixelOffset: [0, 6],
              parameters: { depthCompare: "always" },
            }),
          ]
        : []),
    ];
    this.#deck.setProps({ layers, viewState: this.#camera });
  }
}
