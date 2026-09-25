import type { WorldRenderPosition } from "../src/layout/world-geographic-position.ts";
import type { DeckWorldRuntime } from "./world/deck-world-surface.ts";
import type { DeckPlaceMap } from "./world/place-map.ts";
import {
  geoJsonObjects,
  hasRenderableGeometry,
  mergeMapStyle,
  PLACE_MAP_DEFAULT_COLOR,
  type PlaceMapLocation,
  type PlaceMapStyle,
  placeMapGeometry,
  pointCoordinates,
  presentationZoom,
} from "./world/place-map-geometry.ts";
import type { WorldBasemap } from "./world/world-basemap.ts";

/**
 * Location maps for the item editor and the focused-event popover, drawn
 * with the WorldSurface globe stack (vector basemap, theme and node markers)
 * rather than a tile map. The renderer and basemap load on first use.
 */

const PRESENTATION_COUNTRY_ZOOM = 5;
const PRESENTATION_FLY_DURATION_MS = 7_000;
const PRESENTATION_WORLD_DWELL_MS = 450;
const EDITOR_PICK_ZOOM = 7;
const EDITOR_FLY_DURATION_MS = 600;
const RENDERER_UNAVAILABLE_MESSAGE =
  "Map preview unavailable. Coordinates can still be entered manually.";

interface PlaceMapModules {
  readonly runtime: DeckWorldRuntime;
  readonly DeckPlaceMap: typeof DeckPlaceMap;
  readonly basemap: Promise<WorldBasemap>;
}

interface ReadOnlyLocationMapOptions {
  container: HTMLElement;
  location?: PlaceMapLocation;
  color?: string;
  iconName?: string;
  markerShape?: string;
  style?: PlaceMapStyle;
  label?: string;
  interactive?: boolean;
  countryContextIntro?: boolean;
  fictionalReferenceFrame?: boolean;
}

interface LocationMapControllerOptions {
  container: HTMLElement;
  details?: HTMLDetailsElement;
  latitude: HTMLInputElement;
  longitude: HTMLInputElement;
  accuracy?: HTMLInputElement;
  source?: HTMLInputElement;
  geolocation?: HTMLElement;
  clearButton?: HTMLElement;
}

function supportsWebGL2(): boolean {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

let placeMapModules: Promise<PlaceMapModules> | null = null;

/** Loads the deck renderer, place map and vector basemap once, on demand. */
function loadPlaceMapModules(): Promise<PlaceMapModules> {
  placeMapModules ??= (async () => {
    if (!supportsWebGL2()) throw new Error("The place map needs WebGL 2.");
    const [bindings, { createDeckWorldRuntime }, { DeckPlaceMap }, { loadWorldBasemap }] =
      await Promise.all([
        import("./world/deck-world-bindings.ts"),
        import("./world/deck-world-runtime.ts"),
        import("./world/place-map.ts"),
        import("./world/world-basemap.ts"),
      ]);
    return {
      runtime: createDeckWorldRuntime(await bindings.loadRealDeckWorldBindings()),
      DeckPlaceMap,
      basemap: loadWorldBasemap(),
    };
  })();
  placeMapModules.catch(() => {
    placeMapModules = null;
  });
  return placeMapModules;
}

/** Attaches the shared vector basemap and reports its state on the container. */
function attachBasemap(map: DeckPlaceMap, container: HTMLElement, basemap: Promise<WorldBasemap>) {
  container.dataset.basemapState = "loading";
  basemap.then(
    (loaded) => {
      try {
        map.setBasemap(loaded);
        container.dataset.basemapState = "ready";
      } catch {
        // The map was destroyed while the basemap loaded.
      }
    },
    (error) => {
      container.dataset.basemapState = "unavailable";
      console.warn("World basemap unavailable; place geometry stays visible.", error);
    },
  );
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function numeric(input: HTMLInputElement, min: number, max: number): number | null {
  const value = Number(input?.value);
  return input?.value !== "" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
}

class ReadOnlyLocationMap {
  container: HTMLElement | null;
  location: PlaceMapLocation | null;
  color: string;
  iconName: string;
  markerShape: string;
  style: PlaceMapStyle;
  label: string;
  interactive: boolean;
  countryContextIntro: boolean;
  fictionalReferenceFrame: boolean;
  map: DeckPlaceMap | null = null;
  positions: readonly WorldRenderPosition[] = [];
  placePlaceholder: HTMLElement | null = null;
  destroyed = false;
  introInProgress = false;
  introComplete = false;
  cameraUserControlled = false;
  introInteractionAbort: AbortController | null = null;
  introTimer: ReturnType<typeof globalThis.setTimeout> | 0 = 0;
  ready: Promise<void>;

  constructor(options: ReadOnlyLocationMapOptions) {
    this.container = options.container;
    this.location = options.location || null;
    this.color = options.color || PLACE_MAP_DEFAULT_COLOR;
    this.iconName = options.iconName || this.location?.icon || "place";
    this.markerShape = options.markerShape || this.location?.markerShape || "pin";
    this.style = mergeMapStyle(this.location?.style, options.style);
    this.label =
      options.label ||
      this.location?.name ||
      this.location?.geographicIdentifier ||
      this.location?.address ||
      "Event location";
    this.interactive = options.interactive === true;
    this.countryContextIntro = options.countryContextIntro === true;
    this.fictionalReferenceFrame = options.fictionalReferenceFrame === true;
    this.ready = this.render();
  }

  renderPlacePlaceholder() {
    if (!this.container || this.placePlaceholder) return;
    const marker = this.style.marker || {};
    const placeholder = document.createElement("div");
    placeholder.className = `timeline-map-place-placeholder timeline-map-marker-shape-${this.markerShape}`;
    placeholder.style.setProperty("--map-marker-color", String(marker.color || this.color));
    if (marker.fillColor) placeholder.style.setProperty("--map-marker-fill", marker.fillColor);
    placeholder.setAttribute("aria-hidden", "true");

    const iconShell = document.createElement("span");
    iconShell.className = "timeline-map-place-icon";
    const icon = globalThis.TimelinePresentation?.createIcon?.(this.iconName || "place", {
      size: 22,
    });
    if (icon) iconShell.append(icon);
    else iconShell.textContent = "•";

    const label = document.createElement("span");
    label.className = "timeline-map-place-label";
    label.textContent = this.label;

    placeholder.append(iconShell, label);
    this.container.append(placeholder);
    this.placePlaceholder = placeholder;
  }

  clearPlacePlaceholder() {
    this.placePlaceholder?.remove();
    this.placePlaceholder = null;
  }

  setPlaceStatus(message: string) {
    if (!this.placePlaceholder || !message) return;
    let status = this.placePlaceholder.querySelector<HTMLElement>(".timeline-map-place-status");
    if (!status) {
      status = document.createElement("small");
      status.className = "timeline-map-place-status";
      this.placePlaceholder.append(status);
    }
    status.textContent = message;
  }

  markRendered() {
    if (!this.container || this.destroyed) return;
    this.container.dataset.mapState = "ready";
    this.clearPlacePlaceholder();
  }

  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;
    container.setAttribute("aria-label", this.label);
    this.renderPlacePlaceholder();
    const geometry = placeMapGeometry(this.location, {
      color: this.color,
      iconName: this.iconName,
      markerShape: this.markerShape,
      label: this.label,
      style: this.style,
    });
    this.positions = geometry.positions;
    if (geoJsonObjects(this.location).length === 0 || geometry.positions.length === 0) {
      container.dataset.mapState = "geometry-unavailable";
      container.setAttribute("aria-label", `${this.label}. No mapped coordinates.`);
      this.setPlaceStatus("No mapped coordinates");
      return;
    }
    container.dataset.mapState = "loading";

    try {
      const modules = await loadPlaceMapModules();
      if (this.destroyed || !container.isConnected) return;
      const map = new modules.DeckPlaceMap(container, modules.runtime, {
        interactive: this.interactive,
        label: this.label,
        onRender: () => this.markRendered(),
      });
      this.map = map;
      if (this.fictionalReferenceFrame) {
        container.classList.add("is-fictional-map");
        container.dataset.referenceFrame = "fictional";
        map.setFictional(true);
      }
      map.setGeometry(geometry);
      attachBasemap(map, container, modules.basemap);
      if (this.countryContextIntro) this.prepareCountryContextIntro();
      else this.fitGeometry();
    } catch (error) {
      if (!this.destroyed && this.container) {
        this.container.dataset.error = "true";
        this.container.dataset.mapState = "renderer-unavailable";
        this.container.setAttribute("aria-label", `${this.label}. Map renderer unavailable.`);
        this.placePlaceholder?.classList.add("is-error");
        this.setPlaceStatus("Map renderer unavailable");
      }
      console.warn(error);
    }
  }

  fitGeometry({ maxZoom = presentationZoom(this.location) } = {}) {
    const camera = this.map?.fitCamera(this.positions, maxZoom);
    if (camera) this.map?.jumpTo(camera);
  }

  clearCountryContextInteractionGuard() {
    this.introInteractionAbort?.abort();
    this.introInteractionAbort = null;
  }

  cancelCountryContextIntro() {
    if (!this.countryContextIntro) return;
    this.cameraUserControlled = true;
    if (this.introTimer) {
      globalThis.clearTimeout(this.introTimer);
      this.introTimer = 0;
    }
    this.introInProgress = false;
    this.introComplete = true;
    this.clearCountryContextInteractionGuard();
  }

  bindCountryContextInteractionGuard() {
    if (!this.interactive || !this.container) return;
    this.clearCountryContextInteractionGuard();
    const controller = new AbortController();
    const cancel = () => this.cancelCountryContextIntro();
    this.introInteractionAbort = controller;
    for (const type of ["pointerdown", "wheel"] as const) {
      this.container.addEventListener(type, cancel, { passive: true, signal: controller.signal });
    }
    this.container.addEventListener("keydown", cancel, { signal: controller.signal });
  }

  /** Opens on the whole globe, then flies in to country context. */
  prepareCountryContextIntro() {
    const map = this.map;
    if (!map || this.destroyed || this.introComplete || this.cameraUserControlled) return;
    if (prefersReducedMotion()) {
      this.fitGeometry({ maxZoom: PRESENTATION_COUNTRY_ZOOM });
      this.introComplete = true;
      return;
    }
    map.jumpTo(map.overviewCamera(this.positions));
    this.bindCountryContextInteractionGuard();
    this.introTimer = globalThis.setTimeout(() => {
      this.introTimer = 0;
      this.startCountryContextIntro();
    }, PRESENTATION_WORLD_DWELL_MS);
  }

  startCountryContextIntro() {
    const map = this.map;
    if (!map || this.destroyed || this.introComplete || this.cameraUserControlled) return;
    const target = map.fitCamera(this.positions, PRESENTATION_COUNTRY_ZOOM);
    if (!target) {
      this.introComplete = true;
      this.clearCountryContextInteractionGuard();
      return;
    }
    this.introInProgress = true;
    void map.flyTo(target, PRESENTATION_FLY_DURATION_MS).then(() => {
      this.introInProgress = false;
      this.introComplete = true;
      this.clearCountryContextInteractionGuard();
    });
  }

  refresh() {
    const map = this.map;
    if (!map) return;
    if (this.countryContextIntro) {
      if (this.cameraUserControlled || this.introInProgress || !this.introComplete) return;
      this.fitGeometry({ maxZoom: PRESENTATION_COUNTRY_ZOOM });
      return;
    }
    if (!map.userControlsCamera) this.fitGeometry();
  }

  destroy() {
    this.destroyed = true;
    if (this.introTimer) globalThis.clearTimeout(this.introTimer);
    this.introTimer = 0;
    this.clearCountryContextInteractionGuard();
    this.clearPlacePlaceholder();
    this.map?.destroy();
    this.map = null;
    this.container?.classList.remove("is-fictional-map");
    if (this.container) {
      delete this.container.dataset.referenceFrame;
      this.container.replaceChildren();
    }
  }
}

class LocationMapController {
  container: HTMLElement;
  details?: HTMLDetailsElement;
  latitude: HTMLInputElement;
  longitude: HTMLInputElement;
  accuracy?: HTMLInputElement;
  source?: HTMLInputElement;
  geolocation?: HTMLElement;
  clearButton?: HTMLElement;
  map: DeckPlaceMap | null = null;
  loading: Promise<void> | null = null;

  constructor(options: LocationMapControllerOptions) {
    this.container = options.container;
    this.details = options.details;
    this.latitude = options.latitude;
    this.longitude = options.longitude;
    this.accuracy = options.accuracy;
    this.source = options.source;
    this.geolocation = options.geolocation;
    this.clearButton = options.clearButton;
    this.bind();
  }

  bind() {
    this.details?.addEventListener("toggle", () => {
      if (this.details?.open) void this.ensureMap();
    });

    const update = () => this.updateFromInputs();
    this.latitude?.addEventListener("input", update);
    this.longitude?.addEventListener("input", update);

    this.clearButton?.addEventListener("click", () => this.clear());

    this.geolocation?.addEventListener("location", (event: Event) => {
      const position = (event.target as { position?: GeolocationPosition } | null)?.position;
      if (!position) return;
      this.applyPosition(position.coords.latitude, position.coords.longitude, {
        source: "device",
        accuracy: position.coords.accuracy,
      });
    });

    const fallback = this.geolocation?.querySelector("[data-geolocation-fallback]");
    fallback?.addEventListener("click", () => {
      if ("HTMLGeolocationElement" in globalThis) return;
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (position) =>
          this.applyPosition(position.coords.latitude, position.coords.longitude, {
            source: "device",
            accuracy: position.coords.accuracy,
          }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
      );
    });
  }

  ensureMap(): Promise<void> {
    if (this.map || !this.container) return Promise.resolve();
    this.loading ??= (async () => {
      this.container.dataset.mapState = "loading";
      try {
        const modules = await loadPlaceMapModules();
        if (this.map) return;
        this.map = new modules.DeckPlaceMap(this.container, modules.runtime, {
          interactive: true,
          editable: true,
          label: "Location picker",
          onPick: (point) =>
            this.applyPosition(point.latitude, point.longitude, { source: "manual" }),
          onRender: () => {
            this.container.dataset.mapState = "ready";
          },
        });
        attachBasemap(this.map, this.container, modules.basemap);
        this.updateFromInputs(true);
      } catch (error) {
        this.container.textContent = RENDERER_UNAVAILABLE_MESSAGE;
        this.container.dataset.error = "true";
        this.container.dataset.mapState = "renderer-unavailable";
        console.warn(error);
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  applyPosition(
    latitude: number,
    longitude: number,
    options: { source?: string; accuracy?: number } = {},
  ) {
    this.latitude.value = Number(latitude).toFixed(6);
    this.longitude.value = Number(longitude).toFixed(6);
    if (this.source) this.source.value = options.source || "manual";
    if (this.accuracy) {
      this.accuracy.value = Number.isFinite(options.accuracy)
        ? String(Math.round(Number(options.accuracy)))
        : "";
    }
    this.updateFromInputs();
    this.latitude.dispatchEvent(new Event("change", { bubbles: true }));
  }

  updateFromInputs(fit = false) {
    const map = this.map;
    if (!map) return;
    const latitude = numeric(this.latitude, -90, 90);
    const longitude = numeric(this.longitude, -180, 180);
    if (latitude === null || longitude === null) {
      map.setMarker(null);
      return;
    }
    map.setMarker({ longitude, latitude });
    if (!fit && map.camera.zoom >= 5) return;
    const camera = map.fitCamera(
      [[longitude, latitude, 0] as WorldRenderPosition],
      EDITOR_PICK_ZOOM,
    );
    if (!camera) return;
    if (fit) map.jumpTo(camera);
    else void map.flyTo(camera, EDITOR_FLY_DURATION_MS);
  }

  clear() {
    this.latitude.value = "";
    this.longitude.value = "";
    if (this.accuracy) this.accuracy.value = "";
    if (this.source) this.source.value = "manual";
    this.map?.setMarker(null);
    if (this.map) this.map.jumpTo(this.map.overviewCamera([]));
  }

  refresh() {
    if (this.details?.open) {
      void this.ensureMap().then(() => this.updateFromInputs(true));
    }
  }

  destroy() {
    this.map?.destroy();
    this.map = null;
  }
}

export function create(options: LocationMapControllerOptions): LocationMapController {
  return new LocationMapController(options);
}

export function createReadOnly(options: ReadOnlyLocationMapOptions): ReadOnlyLocationMap {
  return new ReadOnlyLocationMap(options);
}

const TimelineLocationMapObj = {
  create,
  createReadOnly,
  geoJsonObjects,
  hasRenderableGeometry,
  pointCoordinates,
  presentationZoom,
} as const;

export const TimelineLocationMap = Object.freeze(TimelineLocationMapObj);
