/**
 * Leaflet-based location map viewer and editor
 * Supports read-only display with geospatial features and interactive editing
 */

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_INTEGRITY = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
const LEAFLET_JS_INTEGRITY = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";

const DEFAULT_PROVIDER = Object.freeze({
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
});

const PRESENTATION_WORLD_VIEW = Object.freeze({
  center: Object.freeze([18, 0]),
  zoom: 1,
});
const PRESENTATION_COUNTRY_ZOOM = 5;
const PRESENTATION_FLY_DURATION_SECONDS = 7;
const PRESENTATION_WORLD_DWELL_MS = 450;
const MAP_DRAG_MOVE_TOLERANCE_PX = 8;
const MAP_CLICK_SUPPRESSION_MS = 350;
const motion = globalThis.TimelineMotion;

let loadPromise: Promise<any> | null = null;

interface PointCoord {
  lat: number;
  lng: number;
}

interface MapProvider {
  url: string;
  attribution: string;
  maxZoom: number;
}

interface LocationObject {
  geometry?: { type: string; coordinates: number[] };
  mapFeatures?: unknown[];
  radiusMeters?: number;
  accuracyMeters?: number;
  accuracy?: number;
  name?: string;
  icon?: string;
  markerShape?: string;
  geographicIdentifier?: string;
  address?: string;
}

interface PointerState {
  pointerId: number;
  pointerType: string;
  x: number;
  y: number;
  blocked: boolean;
}

interface DragState {
  pointerId: number;
  pointerType: string;
  startPoint: { x: number; y: number };
  startCenter: { x: number; y: number };
  zoom: number;
  lastTime: number;
  samples: unknown[];
  moved: boolean;
}

interface ReadOnlyLocationMapOptions {
  container: HTMLElement;
  location?: LocationObject;
  color?: string;
  iconName?: string;
  markerShape?: string;
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

function loadLeaflet(): Promise<any> {
  if (globalThis.L) return Promise.resolve(globalThis.L);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-timeline-leaflet]")) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = LEAFLET_CSS;
      stylesheet.integrity = LEAFLET_CSS_INTEGRITY;
      stylesheet.crossOrigin = "";
      (stylesheet.dataset as any).timelineLeaflet = LEAFLET_VERSION;
      document.head.append(stylesheet);
    }

    const existing = document.querySelector("script[data-timeline-leaflet]");
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = LEAFLET_JS;
      script.integrity = LEAFLET_JS_INTEGRITY;
      script.crossOrigin = "";
      (script.dataset as any).timelineLeaflet = LEAFLET_VERSION;
      document.head.append(script);
    }
    script.addEventListener("load", () => resolve(globalThis.L), { once: true });
    script.addEventListener("error", () => reject(new Error("Leaflet could not be loaded.")), {
      once: true,
    });
    if (globalThis.L) resolve(globalThis.L);
  });

  return loadPromise;
}

function numeric(input: HTMLInputElement, min: number, max: number): number | null {
  const value = Number(input.value);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function weightedMapDragAvailable(): boolean {
  return Boolean(
    motion?.appendPointerVectorSamples &&
      motion?.estimatePointerVectorVelocity &&
      motion?.responseForElapsed &&
      motion?.decayVelocity,
  );
}

interface MapMotionOptions {
  inertia: boolean;
  inertiaDeceleration: number;
  inertiaMaxSpeed: number;
  easeLinearity: number;
  zoomAnimation: boolean;
  fadeAnimation: boolean;
  markerZoomAnimation: boolean;
}

function mapMotionOptions(interactive = true): MapMotionOptions {
  const reducedMotion = prefersReducedMotion();
  const weightedDrag = weightedMapDragAvailable();
  return {
    inertia: Boolean(interactive && !reducedMotion && !weightedDrag),
    inertiaDeceleration: motion?.CAMERA_INERTIA_DECELERATION_PX_PER_S2 || 3810,
    inertiaMaxSpeed: motion?.MAX_RELEASE_SPEED_PX_PER_S || 3200,
    easeLinearity: 0.2,
    zoomAnimation: !reducedMotion,
    fadeAnimation: !reducedMotion,
    markerZoomAnimation: !reducedMotion,
  };
}

function installWeightedMapDragging(
  map: any,
  container: HTMLElement,
  interactive = true,
): () => void {
  if (!interactive || !map || !container || !weightedMapDragAvailable()) return () => {};

  const pointers = new Map<number, PointerState>();
  let drag: DragState | null = null;
  let inertiaAnimationFrame = 0;
  let suppressClickUntil = 0;

  const releasePointerCapture = (pointerId: number) => {
    if (!Number.isFinite(pointerId)) return;
    try {
      if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
    } catch {
      // Browsers may release capture before cancellation reaches the map.
    }
  };

  const cancelInertia = () => {
    if (inertiaAnimationFrame) cancelAnimationFrame(inertiaAnimationFrame);
    inertiaAnimationFrame = 0;
  };

  const targetBlocksCameraDrag = (target: EventTarget | null): boolean =>
    Boolean(
      target instanceof Element &&
        target.closest(
          ".leaflet-control, .leaflet-marker-icon, button, a, input, select, textarea",
        ),
    );

  const beginDrag = (pointerId: number, point: any, sourceEvent: PointerEvent | null = null) => {
    if (!point || pointers.size > 1) return;
    cancelInertia();
    const zoom = map.getZoom();
    const center = map.project(map.getCenter(), zoom);
    drag = {
      pointerId,
      pointerType: sourceEvent?.pointerType || point.pointerType || "",
      startPoint: { x: point.x, y: point.y },
      startCenter: { x: center.x, y: center.y },
      zoom,
      lastTime: sourceEvent
        ? Number(sourceEvent.timeStamp) || performance.now()
        : performance.now(),
      samples: [],
      moved: false,
    };
    if (sourceEvent) motion.appendPointerVectorSamples(drag.samples, sourceEvent);
    try {
      container.setPointerCapture?.(pointerId);
    } catch {
      // Weighted dragging remains usable without capture.
    }
  };

  const cancelDrag = () => {
    const pointerId = drag?.pointerId;
    drag = null;
    if (pointerId) releasePointerCapture(pointerId);
  };

  const applyWeightedDrag = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId || pointers.size > 1) return;
    motion.appendPointerVectorSamples(drag.samples, event);
    const deltaX = event.clientX - drag.startPoint.x;
    const deltaY = event.clientY - drag.startPoint.y;
    if (Math.hypot(deltaX, deltaY) > MAP_DRAG_MOVE_TOLERANCE_PX) drag.moved = true;

    const target = {
      x: drag.startCenter.x - deltaX,
      y: drag.startCenter.y - deltaY,
    };
    const current = map.project(map.getCenter(), drag.zoom);
    const now = Number(event.timeStamp) || performance.now();
    const response = motion.responseForElapsed(now - drag.lastTime);
    drag.lastTime = now;
    const next = {
      x: current.x + (target.x - current.x) * response,
      y: current.y + (target.y - current.y) * response,
    };
    map.setView(map.unproject([next.x, next.y], drag.zoom), drag.zoom, { animate: false });
    if (drag.moved) event.preventDefault();
  };

  const startInertia = (velocity: any) => {
    if (
      !velocity ||
      prefersReducedMotion() ||
      velocity.magnitude < (motion.STOP_VELOCITY_PX_PER_MS || 0.012)
    ) {
      return;
    }
    cancelInertia();
    let velocityX = -velocity.x;
    let velocityY = -velocity.y;
    let lastFrame = 0;

    const step = (now: number) => {
      inertiaAnimationFrame = 0;
      const magnitude = Math.hypot(velocityX, velocityY);
      if (magnitude < (motion.STOP_VELOCITY_PX_PER_MS || 0.012)) return;

      const elapsed = lastFrame ? Math.min(48, Math.max(1, now - lastFrame)) : 16;
      lastFrame = now;
      velocityX = motion.decayVelocity(velocityX, elapsed);
      velocityY = motion.decayVelocity(velocityY, elapsed);
      map.panBy([velocityX * elapsed, velocityY * elapsed], { animate: false });

      if (Math.hypot(velocityX, velocityY) >= (motion.STOP_VELOCITY_PX_PER_MS || 0.012)) {
        inertiaAnimationFrame = requestAnimationFrame(step);
      }
    };

    inertiaAnimationFrame = requestAnimationFrame(step);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    cancelInertia();
    const blocked = targetBlocksCameraDrag(event.target);
    pointers.set(event.pointerId, {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      blocked,
    });

    if (pointers.size > 1) {
      cancelDrag();
      return;
    }
    if (!blocked) beginDrag(event.pointerId, pointers.get(event.pointerId), event);
  };

  const onPointerMove = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId);
    if (pointer) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }
    if (pointers.size > 1) {
      cancelDrag();
      return;
    }
    applyWeightedDrag(event);
  };

  const finishPointer = (event: PointerEvent) => {
    const ownsDrag = Boolean(drag && drag.pointerId === event.pointerId);
    const finishedDrag = ownsDrag ? drag : null;
    if (finishedDrag) motion.appendPointerVectorSamples(finishedDrag.samples, event);
    pointers.delete(event.pointerId);

    if (ownsDrag) {
      drag = null;
      releasePointerCapture(event.pointerId);
      if (event.type !== "pointercancel" && finishedDrag?.moved) {
        const velocity = motion.estimatePointerVectorVelocity(finishedDrag.samples);
        suppressClickUntil = performance.now() + MAP_CLICK_SUPPRESSION_MS;
        void motion.pulseHaptic?.("release");
        requestAnimationFrame(() => startInertia(velocity));
      }
    }

    if (event.type !== "pointercancel" && event.pointerType === "touch" && pointers.size === 1) {
      const remaining = Array.from(pointers.values())[0];
      if (!remaining.blocked) {
        requestAnimationFrame(() => {
          if (pointers.size === 1 && pointers.has(remaining.pointerId) && !drag) {
            beginDrag(remaining.pointerId, remaining);
          }
        });
      }
    }
  };

  const abortInteraction = () => {
    cancelInertia();
    const pointerIds = Array.from(pointers.keys());
    drag = null;
    pointers.clear();
    for (const pointerId of pointerIds) releasePointerCapture(pointerId);
  };

  const onLostPointerCapture = (event: Event) => {
    const pe = event as any;
    if (drag?.pointerId !== pe.pointerId) return;
    drag = null;
    pointers.delete(pe.pointerId);
  };

  const onClickCapture = (event: MouseEvent) => {
    if (performance.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") abortInteraction();
  };

  container.addEventListener("pointerdown", onPointerDown as EventListener);
  container.addEventListener("pointermove", onPointerMove as EventListener, { passive: false });
  container.addEventListener("pointerup", finishPointer as EventListener);
  container.addEventListener("pointercancel", finishPointer as EventListener);
  container.addEventListener("lostpointercapture", onLostPointerCapture);
  container.addEventListener("click", onClickCapture, { capture: true });
  container.addEventListener("wheel", cancelInertia, { passive: true });
  globalThis.addEventListener?.("blur", abortInteraction);
  globalThis.addEventListener?.("orientationchange", abortInteraction);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    abortInteraction();
    container.removeEventListener("pointerdown", onPointerDown as EventListener);
    container.removeEventListener("pointermove", onPointerMove as EventListener);
    container.removeEventListener("pointerup", finishPointer as EventListener);
    container.removeEventListener("pointercancel", finishPointer as EventListener);
    container.removeEventListener("lostpointercapture", onLostPointerCapture);
    container.removeEventListener("click", onClickCapture, true);
    container.removeEventListener("wheel", cancelInertia);
    globalThis.removeEventListener?.("blur", abortInteraction);
    globalThis.removeEventListener?.("orientationchange", abortInteraction);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

function presentationZoom(location?: LocationObject): number {
  const accuracy = Number(
    location?.radiusMeters ?? location?.accuracyMeters ?? location?.accuracy,
  );
  if (Number.isFinite(accuracy)) {
    if (accuracy <= 50) return 15;
    if (accuracy <= 250) return 14;
    if (accuracy <= 1000) return 12;
    if (accuracy <= 5000) return 10;
  }
  return 12;
}

const GEOJSON_TYPES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
  "GeometryCollection",
  "Feature",
  "FeatureCollection",
]);

function isGeoJsonObject(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && GEOJSON_TYPES.has((value as any).type));
}

function geoJsonObjects(location?: LocationObject): unknown[] {
  const objects: unknown[] = [];
  if (isGeoJsonObject(location?.geometry)) objects.push(location.geometry);
  const extras = Array.isArray(location?.mapFeatures) ? location.mapFeatures : [];
  for (const feature of extras) {
    if (isGeoJsonObject(feature)) objects.push(feature);
  }
  return objects;
}

function hasRenderableGeometry(location?: LocationObject): boolean {
  return geoJsonObjects(location).length > 0;
}

function pointCoordinates(location?: LocationObject): PointCoord | null {
  const geometry = location?.geometry;
  if (
    geometry?.type !== "Point" ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  ) {
    return null;
  }
  const lng = Number(geometry.coordinates[0]);
  const lat = Number(geometry.coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function fictionalTextureLayer(L: any, container: HTMLElement): any {
  const layer = L.gridLayer({
    tileSize: 256,
    minZoom: 0,
    maxZoom: 12,
    noWrap: true,
    attribution: "Fictional reference frame · procedural texture",
  });

  layer.createTile = (coords: any) => {
    const tile = document.createElement("canvas");
    tile.width = 256;
    tile.height = 256;
    tile.className = "timeline-fictional-map-tile";

    const context = tile.getContext("2d");
    if (!context) return tile;

    const computed = getComputedStyle(container);
    const paper = computed.getPropertyValue("--paper-2").trim() || "#f7f3ec";
    const line = computed.getPropertyValue("--line-strong").trim() || "#aaa195";
    const muted = computed.getPropertyValue("--muted").trim() || "#6b6965";
    context.fillStyle = paper;
    context.fillRect(0, 0, tile.width, tile.height);

    const seed = ((coords.x * 73856093) ^ (coords.y * 19349663) ^ (coords.z * 83492791)) >>> 0;
    const unit = (salt: number) => {
      let value = (seed ^ (salt * 2654435761)) >>> 0;
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return (value >>> 0) / 4294967295;
    };

    context.strokeStyle = line;
    context.lineWidth = 1;
    context.globalAlpha = 0.18;
    for (let contour = 0; contour < 7; contour += 1) {
      const phase = unit(contour + 1) * Math.PI * 2;
      const amplitude = 8 + unit(contour + 11) * 20;
      const baseline = 20 + contour * 34 + (unit(contour + 21) - 0.5) * 18;
      context.beginPath();
      for (let x = -8; x <= 264; x += 8) {
        const y = baseline + Math.sin(x / 38 + phase) * amplitude;
        if (x === -8) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }

    context.fillStyle = muted;
    context.globalAlpha = 0.12;
    for (let dot = 0; dot < 54; dot += 1) {
      const x = unit(100 + dot * 2) * 256;
      const y = unit(101 + dot * 2) * 256;
      const radius = 0.35 + unit(200 + dot) * 0.8;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.globalAlpha = 0.07;
    context.strokeStyle = muted;
    context.setLineDash([2, 7]);
    context.beginPath();
    context.moveTo(0, 128);
    context.lineTo(256, 128);
    context.moveTo(128, 0);
    context.lineTo(128, 256);
    context.stroke();
    context.setLineDash([]);
    context.globalAlpha = 1;

    return tile;
  };

  return layer;
}

function semanticMarkerIcon(
  L: any,
  iconName: string,
  color: string,
  label = "",
  markerShape = "pin",
): any {
  const identity = document.createElement("span");
  identity.className = `timeline-map-marker-identity timeline-map-marker-shape-${markerShape}`;
  identity.style.setProperty("--map-marker-color", String(color));

  const shell = document.createElement("span");
  shell.className = "timeline-map-marker-shell";
  const icon = globalThis.TimelinePresentation?.createIcon?.(iconName || "place", { size: 18 });
  if (icon) shell.append(icon);
  else shell.textContent = "•";
  identity.append(shell);

  if (label) {
    const copy = document.createElement("span");
    copy.className = "timeline-map-marker-label";
    copy.textContent = label;
    identity.append(copy);
  }

  return L.divIcon({
    className: "timeline-map-marker",
    html: identity.outerHTML,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

class ReadOnlyLocationMap {
  container: HTMLElement | null;
  location: LocationObject | null;
  provider: MapProvider;
  color: string;
  iconName: string;
  markerShape: string;
  label: string;
  interactive: boolean;
  countryContextIntro: boolean;
  fictionalReferenceFrame: boolean;
  map: any;
  placePlaceholder: HTMLElement | null;
  layers: any[];
  destroyed: boolean;
  introInProgress: boolean;
  introComplete: boolean;
  cameraUserControlled: boolean;
  introInteractionAbort: AbortController | null;
  introTimer: number;
  weightedDragCleanup: (() => void) | null;
  ready: Promise<void>;

  constructor(options: ReadOnlyLocationMapOptions) {
    this.container = options.container;
    this.location = options.location || null;
    this.provider = globalThis.TimelineMapTileProvider || DEFAULT_PROVIDER;
    this.color = options.color || "#315fbd";
    this.iconName = options.iconName || this.location?.icon || "place";
    this.markerShape = options.markerShape || this.location?.markerShape || "pin";
    this.label =
      options.label ||
      this.location?.name ||
      this.location?.geographicIdentifier ||
      this.location?.address ||
      "Event location";
    this.interactive = options.interactive === true;
    this.countryContextIntro = options.countryContextIntro === true;
    this.fictionalReferenceFrame = options.fictionalReferenceFrame === true;
    this.map = null;
    this.placePlaceholder = null;
    this.layers = [];
    this.destroyed = false;
    this.introInProgress = false;
    this.introComplete = false;
    this.cameraUserControlled = false;
    this.introInteractionAbort = null;
    this.introTimer = 0;
    this.weightedDragCleanup = null;
    this.ready = this.render();
  }

  renderPlacePlaceholder() {
    if (!this.container || this.placePlaceholder) return;
    const placeholder = document.createElement("div");
    placeholder.className = `timeline-map-place-placeholder timeline-map-marker-shape-${this.markerShape}`;
    placeholder.style.setProperty("--map-marker-color", this.color);
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

  async render(): Promise<void> {
    const objects = geoJsonObjects(this.location);
    if (!this.container || objects.length === 0) return;
    this.container.setAttribute("aria-label", this.label);
    this.renderPlacePlaceholder();

    try {
      const L = await loadLeaflet();
      if (this.destroyed || !this.container.isConnected) return;

      const weightedDrag = weightedMapDragAvailable();
      this.map = L.map(this.container, {
        zoomControl: this.interactive,
        attributionControl: true,
        dragging: this.interactive && !weightedDrag,
        scrollWheelZoom: this.interactive,
        doubleClickZoom: this.interactive,
        boxZoom: this.interactive,
        keyboard: this.interactive,
        touchZoom: this.interactive,
        ...mapMotionOptions(this.interactive),
      });
      this.weightedDragCleanup = installWeightedMapDragging(
        this.map,
        this.container,
        this.interactive,
      );

      if (this.countryContextIntro) {
        this.map.setView(PRESENTATION_WORLD_VIEW.center, PRESENTATION_WORLD_VIEW.zoom, {
          animate: false,
        });
      }

      if (this.fictionalReferenceFrame) {
        this.container.classList.add("is-fictional-map");
        (this.container.dataset as any).referenceFrame = "fictional";
        fictionalTextureLayer(L, this.container).addTo(this.map);
      } else {
        L.tileLayer(this.provider.url, {
          maxZoom: this.provider.maxZoom || 19,
          attribution: this.provider.attribution || DEFAULT_PROVIDER.attribution,
        }).addTo(this.map);
      }

      const baseGeoJsonOptions = {
        style: () => ({
          color: this.color,
          weight: 3,
          opacity: 0.9,
          fillColor: this.color,
          fillOpacity: 0.12,
        }),
      };

      for (const [index, object] of objects.entries()) {
        const isPrimaryPlacePoint = index === 0 && this.location?.geometry?.type === "Point";
        const layer = L.geoJSON(object, {
          ...baseGeoJsonOptions,
          pointToLayer: (feature: any, latlng: any) => {
            const properties = feature?.properties || {};
            const markerLabel = isPrimaryPlacePoint
              ? this.label
              : String(properties.name || properties.label || "");
            const markerIcon = semanticMarkerIcon(
              L,
              String(properties.icon || this.iconName || "place"),
              String(properties.color || this.color),
              markerLabel,
              String(properties.markerShape || this.markerShape || "pin"),
            );
            return L.marker(latlng, {
              icon: markerIcon,
              interactive: this.interactive,
              keyboard: this.interactive,
              title: markerLabel || "Map feature",
            });
          },
        }).addTo(this.map);
        this.layers.push(layer);
      }

      this.clearPlacePlaceholder();

      const point = pointCoordinates(this.location);
      const radius = Number(
        this.location?.radiusMeters ?? this.location?.accuracyMeters ?? this.location?.accuracy,
      );
      if (point && Number.isFinite(radius) && radius > 0) {
        this.layers.push(
          L.circle([point.lat, point.lng], {
            radius,
            color: this.color,
            weight: 1.5,
            opacity: 0.55,
            fillColor: this.color,
            fillOpacity: 0.06,
            interactive: false,
          }).addTo(this.map),
        );
      }

      if (!this.countryContextIntro) this.fitGeometry({ animate: false });
      requestAnimationFrame(() => {
        this.map?.invalidateSize({ pan: false });
        if (this.countryContextIntro) this.prepareCountryContextIntro();
      });
    } catch (error) {
      if (!this.destroyed && this.container) {
        this.container.dataset.error = "true";
        this.placePlaceholder?.classList.add("is-error");
        if (
          this.placePlaceholder &&
          !this.placePlaceholder.querySelector(".timeline-map-place-status")
        ) {
          const status = document.createElement("small");
          status.className = "timeline-map-place-status";
          status.textContent = "Map preview unavailable";
          this.placePlaceholder.append(status);
        }
      }
      console.warn(error);
    }
  }

  geometryBounds(): any {
    if (!globalThis.L) return null;
    const drawableLayers = this.layers.filter((layer) => typeof layer?.getBounds === "function");
    return drawableLayers.length ? globalThis.L.featureGroup(drawableLayers).getBounds() : null;
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
    if (this.introInProgress) this.map?.stop();
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
    this.container.addEventListener("pointerdown", cancel, {
      passive: true,
      signal: controller.signal,
    });
    this.container.addEventListener("wheel", cancel, {
      passive: true,
      signal: controller.signal,
    });
    this.container.addEventListener("keydown", cancel, { signal: controller.signal });
  }

  prepareCountryContextIntro() {
    if (!this.map || this.destroyed || this.introComplete || this.cameraUserControlled) return;

    if (prefersReducedMotion()) {
      this.fitGeometry({ animate: false, maxZoom: PRESENTATION_COUNTRY_ZOOM });
      this.introComplete = true;
      return;
    }

    this.map.fitWorld({
      animate: false,
      padding: [8, 8],
    });
    this.bindCountryContextInteractionGuard();
    this.introTimer = globalThis.setTimeout(() => {
      this.introTimer = 0;
      this.startCountryContextIntro();
    }, PRESENTATION_WORLD_DWELL_MS);
  }

  startCountryContextIntro() {
    if (!this.map || this.destroyed || this.introComplete || this.cameraUserControlled) return;

    const point = pointCoordinates(this.location);
    const bounds = this.geometryBounds();
    const hasSinglePoint = Boolean(point && geoJsonObjects(this.location).length === 1);
    this.introInProgress = true;

    const finish = () => {
      this.introInProgress = false;
      this.introComplete = true;
      this.clearCountryContextInteractionGuard();
    };
    this.map.once("moveend", finish);

    if (bounds?.isValid?.() && !hasSinglePoint) {
      this.map.flyToBounds(bounds, {
        animate: true,
        duration: PRESENTATION_FLY_DURATION_SECONDS,
        easeLinearity: 0.16,
        padding: [18, 18],
        maxZoom: PRESENTATION_COUNTRY_ZOOM,
      });
      return;
    }

    if (point) {
      this.map.flyTo([point.lat, point.lng], PRESENTATION_COUNTRY_ZOOM, {
        animate: true,
        duration: PRESENTATION_FLY_DURATION_SECONDS,
        easeLinearity: 0.16,
      });
      return;
    }

    if (bounds?.isValid?.()) {
      this.map.flyToBounds(bounds, {
        animate: true,
        duration: PRESENTATION_FLY_DURATION_SECONDS,
        easeLinearity: 0.16,
        padding: [18, 18],
        maxZoom: PRESENTATION_COUNTRY_ZOOM,
      });
      return;
    }

    finish();
  }

  fitGeometry({ animate = false, maxZoom = presentationZoom(this.location) } = {}) {
    if (!this.map || !globalThis.L) return;
    const point = pointCoordinates(this.location);
    const bounds = this.geometryBounds();

    if (bounds?.isValid?.() && !(point && geoJsonObjects(this.location).length === 1)) {
      this.map.fitBounds(bounds, {
        animate,
        padding: [18, 18],
        maxZoom,
      });
      return;
    }

    if (point) {
      this.map.setView([point.lat, point.lng], maxZoom, { animate });
      return;
    }

    if (bounds?.isValid?.()) {
      this.map.fitBounds(bounds, {
        animate,
        padding: [18, 18],
        maxZoom,
      });
    }
  }

  refresh() {
    if (!this.map) return;
    this.map.invalidateSize({ pan: false });
    if (this.countryContextIntro) {
      if (this.cameraUserControlled || this.introInProgress || !this.introComplete) return;
      this.fitGeometry({ animate: false, maxZoom: PRESENTATION_COUNTRY_ZOOM });
      return;
    }
    this.fitGeometry({ animate: false });
  }

  destroy() {
    this.destroyed = true;
    if (this.introTimer) globalThis.clearTimeout(this.introTimer);
    this.introTimer = 0;
    this.clearCountryContextInteractionGuard();
    this.weightedDragCleanup?.();
    this.weightedDragCleanup = null;
    this.clearPlacePlaceholder();
    this.container?.classList.remove("is-fictional-map");
    if (this.container) delete this.container.dataset.referenceFrame;
    this.layers = [];
    this.map?.remove();
    this.map = null;
    if (this.container) this.container.replaceChildren();
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
  map: any;
  marker: any;
  weightedDragCleanup: (() => void) | null;
  provider: MapProvider;

  constructor(options: LocationMapControllerOptions) {
    this.container = options.container;
    this.details = options.details;
    this.latitude = options.latitude;
    this.longitude = options.longitude;
    this.accuracy = options.accuracy;
    this.source = options.source;
    this.geolocation = options.geolocation;
    this.clearButton = options.clearButton;
    this.map = null;
    this.marker = null;
    this.weightedDragCleanup = null;
    this.provider = globalThis.TimelineMapTileProvider || DEFAULT_PROVIDER;
    this.bind();
  }

  bind() {
    this.details?.addEventListener("toggle", () => {
      if (this.details?.open) this.ensureMap();
    });

    const update = () => this.updateFromInputs();
    this.latitude?.addEventListener("input", update);
    this.longitude?.addEventListener("input", update);

    this.clearButton?.addEventListener("click", () => this.clear());

    this.geolocation?.addEventListener("location", (event: any) => {
      const position = event.target.position;
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

  async ensureMap() {
    if (this.map || !this.container) return;
    try {
      const L = await loadLeaflet();
      if (!L) throw new Error("Leaflet did not initialize.");
      const weightedDrag = weightedMapDragAvailable();
      this.map = L.map(this.container, {
        zoomControl: true,
        attributionControl: true,
        dragging: !weightedDrag,
        ...mapMotionOptions(true),
      }).setView([20, 0], 2);
      this.weightedDragCleanup = installWeightedMapDragging(this.map, this.container, true);

      L.tileLayer(this.provider.url, {
        maxZoom: this.provider.maxZoom || 19,
        attribution: this.provider.attribution || DEFAULT_PROVIDER.attribution,
      }).addTo(this.map);

      this.map.on("click", (event: any) => {
        this.applyPosition(event.latlng.lat, event.latlng.lng, { source: "manual" });
      });

      this.updateFromInputs(true);
      requestAnimationFrame(() => this.map.invalidateSize());
    } catch (error) {
      this.container.textContent =
        "Map preview unavailable. Coordinates can still be entered manually.";
      this.container.dataset.error = "true";
      console.warn(error);
    }
  }

  applyPosition(latitude: number, longitude: number, options: any = {}) {
    this.latitude.value = Number(latitude).toFixed(6);
    this.longitude.value = Number(longitude).toFixed(6);
    if (this.source) this.source.value = options.source || "manual";
    if (this.accuracy)
      this.accuracy.value = Number.isFinite(options.accuracy)
        ? String(Math.round(options.accuracy))
        : "";
    this.updateFromInputs();
    this.latitude.dispatchEvent(new Event("change", { bubbles: true }));
  }

  updateFromInputs(fit = false) {
    if (!this.map || !globalThis.L) return;
    const lat = numeric(this.latitude, -90, 90);
    const lng = numeric(this.longitude, -180, 180);
    if (lat === null || lng === null) {
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }
      return;
    }

    if (!this.marker) {
      const markerColor =
        getComputedStyle(this.container).getPropertyValue("--focus").trim() || "#315fbd";
      this.marker = globalThis.L.marker([lat, lng], {
        draggable: true,
        keyboard: true,
        title: "Selected location",
        icon: semanticMarkerIcon(globalThis.L, "place", markerColor, "", "pin"),
      }).addTo(this.map);
      this.marker.on("dragend", () => {
        const point = this.marker.getLatLng();
        this.applyPosition(point.lat, point.lng, { source: "manual" });
      });
    } else {
      this.marker.setLatLng([lat, lng]);
    }
    if (fit || this.map.getZoom() < 5) this.map.setView([lat, lng], 13);
  }

  clear() {
    this.latitude.value = "";
    this.longitude.value = "";
    if (this.accuracy) this.accuracy.value = "";
    if (this.source) this.source.value = "manual";
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    if (this.map) this.map.setView([20, 0], 2);
  }

  refresh() {
    if (this.details?.open)
      this.ensureMap().then(() => {
        this.updateFromInputs(true);
        this.map?.invalidateSize();
      });
  }

  destroy() {
    this.weightedDragCleanup?.();
    this.weightedDragCleanup = null;
    this.marker?.remove();
    this.marker = null;
    this.map?.remove();
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
  loadLeaflet,
  presentationZoom,
  provider: DEFAULT_PROVIDER,
} as const;

export const TimelineLocationMap = Object.freeze(TimelineLocationMapObj);
