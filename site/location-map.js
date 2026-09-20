(() => {
  "use strict";

  const LEAFLET_VERSION = "1.9.4";
  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  const LEAFLET_CSS_INTEGRITY = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
  const LEAFLET_JS_INTEGRITY = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";

  const DEFAULT_PROVIDER = Object.freeze({
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  });

  const PRESENTATION_WORLD_VIEW = Object.freeze({
    center: Object.freeze([18, 0]),
    zoom: 1
  });
  const PRESENTATION_COUNTRY_ZOOM = 5;
  const PRESENTATION_FLY_DURATION_SECONDS = 7;
  const PRESENTATION_WORLD_DWELL_MS = 450;
  const motion = globalThis.TimelineMotion;

  let loadPromise = null;

  function loadLeaflet() {
    if (globalThis.L) return Promise.resolve(globalThis.L);
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-timeline-leaflet]')) {
        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = LEAFLET_CSS;
        stylesheet.integrity = LEAFLET_CSS_INTEGRITY;
        stylesheet.crossOrigin = "";
        stylesheet.dataset.timelineLeaflet = LEAFLET_VERSION;
        document.head.append(stylesheet);
      }

      const existing = document.querySelector('script[data-timeline-leaflet]');
      const script = existing || document.createElement("script");
      if (!existing) {
        script.src = LEAFLET_JS;
        script.integrity = LEAFLET_JS_INTEGRITY;
        script.crossOrigin = "";
        script.dataset.timelineLeaflet = LEAFLET_VERSION;
        document.head.append(script);
      }
      script.addEventListener("load", () => resolve(globalThis.L), { once: true });
      script.addEventListener("error", () => reject(new Error("Leaflet could not be loaded.")), { once: true });
      if (globalThis.L) resolve(globalThis.L);
    });

    return loadPromise;
  }

  function numeric(input, min, max) {
    const value = Number(input.value);
    return Number.isFinite(value) && value >= min && value <= max ? value : null;
  }

  function prefersReducedMotion() {
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }

  function mapMotionOptions(interactive = true) {
    const reducedMotion = prefersReducedMotion();
    return {
      inertia: Boolean(interactive && !reducedMotion),
      inertiaDeceleration: motion?.CAMERA_INERTIA_DECELERATION_PX_PER_S2 || 3810,
      inertiaMaxSpeed: motion?.MAX_RELEASE_SPEED_PX_PER_S || 3200,
      easeLinearity: 0.2,
      zoomAnimation: !reducedMotion,
      fadeAnimation: !reducedMotion,
      markerZoomAnimation: !reducedMotion
    };
  }

  function presentationZoom(location) {
    const accuracy = Number(location?.accuracyMeters ?? location?.accuracy);
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
    "FeatureCollection"
  ]);

  function isGeoJsonObject(value) {
    return Boolean(value && typeof value === "object" && GEOJSON_TYPES.has(value.type));
  }

  function geoJsonObjects(location) {
    const objects = [];
    if (isGeoJsonObject(location?.geometry)) objects.push(location.geometry);
    const extras = Array.isArray(location?.mapFeatures) ? location.mapFeatures : [];
    for (const feature of extras) {
      if (isGeoJsonObject(feature)) objects.push(feature);
    }
    return objects;
  }

  function hasRenderableGeometry(location) {
    return geoJsonObjects(location).length > 0;
  }

  function pointCoordinates(location) {
    const geometry = location?.geometry;
    if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
      return null;
    }
    const lng = Number(geometry.coordinates[0]);
    const lat = Number(geometry.coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  function fictionalTextureLayer(L, container) {
    const layer = L.gridLayer({
      tileSize: 256,
      minZoom: 0,
      maxZoom: 12,
      noWrap: true,
      attribution: "Fictional reference frame · procedural texture"
    });

    layer.createTile = (coords) => {
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
      const unit = (salt) => {
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
          const y = baseline + Math.sin((x / 38) + phase) * amplitude;
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

  function semanticMarkerIcon(L, iconName, color, label = "") {
    const identity = document.createElement("span");
    identity.className = "timeline-map-marker-identity";
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
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  class ReadOnlyLocationMap {
    constructor(options) {
      this.container = options.container;
      this.location = options.location || null;
      this.provider = globalThis.TimelineMapTileProvider || DEFAULT_PROVIDER;
      this.color = options.color || "#315fbd";
      this.iconName = options.iconName || "place";
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
      this.ready = this.render();
    }

    renderPlacePlaceholder() {
      if (!this.container || this.placePlaceholder) return;
      const placeholder = document.createElement("div");
      placeholder.className = "timeline-map-place-placeholder";
      placeholder.style.setProperty("--map-marker-color", this.color);
      placeholder.setAttribute("aria-hidden", "true");

      const iconShell = document.createElement("span");
      iconShell.className = "timeline-map-place-icon";
      const icon = globalThis.TimelinePresentation?.createIcon?.(this.iconName || "place", { size: 22 });
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

    async render() {
      const objects = geoJsonObjects(this.location);
      if (!this.container || objects.length === 0) return;
      this.container.setAttribute("aria-label", this.label);
      this.renderPlacePlaceholder();

      try {
        const L = await loadLeaflet();
        if (this.destroyed || !this.container.isConnected) return;

        this.map = L.map(this.container, {
          zoomControl: this.interactive,
          attributionControl: true,
          dragging: this.interactive,
          scrollWheelZoom: this.interactive,
          doubleClickZoom: this.interactive,
          boxZoom: this.interactive,
          keyboard: this.interactive,
          touchZoom: this.interactive,
          ...mapMotionOptions(this.interactive)
        });

        if (this.countryContextIntro) {
          this.map.setView(
            PRESENTATION_WORLD_VIEW.center,
            PRESENTATION_WORLD_VIEW.zoom,
            { animate: false }
          );
        }

        if (this.fictionalReferenceFrame) {
          this.container.classList.add("is-fictional-map");
          this.container.dataset.referenceFrame = "fictional";
          fictionalTextureLayer(L, this.container).addTo(this.map);
        } else {
          L.tileLayer(this.provider.url, {
            maxZoom: this.provider.maxZoom || 19,
            attribution: this.provider.attribution || DEFAULT_PROVIDER.attribution
          }).addTo(this.map);
        }

        const baseGeoJsonOptions = {
          style: () => ({
            color: this.color,
            weight: 3,
            opacity: 0.9,
            fillColor: this.color,
            fillOpacity: 0.12
          })
        };

        for (const [index, object] of objects.entries()) {
          const isPrimaryPlacePoint =
            index === 0 &&
            this.location?.geometry?.type === "Point";
          const layer = L.geoJSON(object, {
            ...baseGeoJsonOptions,
            pointToLayer: (feature, latlng) => {
              const properties = feature?.properties || {};
              const markerLabel = isPrimaryPlacePoint
                ? this.label
                : String(properties.name || properties.label || "");
              const markerIcon = semanticMarkerIcon(
                L,
                String(properties.icon || this.iconName || "place"),
                String(properties.color || this.color),
                markerLabel
              );
              return L.marker(latlng, {
                icon: markerIcon,
                interactive: this.interactive,
                keyboard: this.interactive,
                title: markerLabel || "Map feature"
              });
            }
          }).addTo(this.map);
          this.layers.push(layer);
        }

        this.clearPlacePlaceholder();

        const point = pointCoordinates(this.location);
        const accuracy = Number(this.location?.accuracyMeters ?? this.location?.accuracy);
        if (point && Number.isFinite(accuracy) && accuracy > 0) {
          this.layers.push(L.circle([point.lat, point.lng], {
            radius: accuracy,
            color: this.color,
            weight: 1.5,
            opacity: 0.55,
            fillColor: this.color,
            fillOpacity: 0.06,
            interactive: false
          }).addTo(this.map));
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
          if (this.placePlaceholder && !this.placePlaceholder.querySelector(".timeline-map-place-status")) {
            const status = document.createElement("small");
            status.className = "timeline-map-place-status";
            status.textContent = "Map preview unavailable";
            this.placePlaceholder.append(status);
          }
        }
        console.warn(error);
      }
    }

    geometryBounds() {
      if (!globalThis.L) return null;
      const drawableLayers = this.layers.filter((layer) => typeof layer?.getBounds === "function");
      return drawableLayers.length
        ? globalThis.L.featureGroup(drawableLayers).getBounds()
        : null;
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
      this.container.addEventListener("pointerdown", cancel, { passive: true, signal: controller.signal });
      this.container.addEventListener("wheel", cancel, { passive: true, signal: controller.signal });
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
        padding: [8, 8]
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
          maxZoom: PRESENTATION_COUNTRY_ZOOM
        });
        return;
      }

      if (point) {
        this.map.flyTo([point.lat, point.lng], PRESENTATION_COUNTRY_ZOOM, {
          animate: true,
          duration: PRESENTATION_FLY_DURATION_SECONDS,
          easeLinearity: 0.16
        });
        return;
      }

      if (bounds?.isValid?.()) {
        this.map.flyToBounds(bounds, {
          animate: true,
          duration: PRESENTATION_FLY_DURATION_SECONDS,
          easeLinearity: 0.16,
          padding: [18, 18],
          maxZoom: PRESENTATION_COUNTRY_ZOOM
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
          maxZoom
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
          maxZoom
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
    constructor(options) {
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
      this.provider = globalThis.TimelineMapTileProvider || DEFAULT_PROVIDER;
      this.bind();
    }

    bind() {
      this.details?.addEventListener("toggle", () => {
        if (this.details.open) this.ensureMap();
      });

      const update = () => this.updateFromInputs();
      this.latitude?.addEventListener("input", update);
      this.longitude?.addEventListener("input", update);

      this.clearButton?.addEventListener("click", () => this.clear());

      this.geolocation?.addEventListener("location", (event) => {
        const position = event.target.position;
        if (!position) return;
        this.applyPosition(position.coords.latitude, position.coords.longitude, {
          source: "device",
          accuracy: position.coords.accuracy
        });
      });

      const fallback = this.geolocation?.querySelector("[data-geolocation-fallback]");
      fallback?.addEventListener("click", () => {
        if ("HTMLGeolocationElement" in globalThis) return;
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (position) => this.applyPosition(position.coords.latitude, position.coords.longitude, {
            source: "device",
            accuracy: position.coords.accuracy
          }),
          () => {},
          { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
        );
      });
    }

    async ensureMap() {
      if (this.map || !this.container) return;
      try {
        const L = await loadLeaflet();
        if (!L) throw new Error("Leaflet did not initialize.");
        this.map = L.map(this.container, {
          zoomControl: true,
          attributionControl: true,
          ...mapMotionOptions(true)
        }).setView([20, 0], 2);

        L.tileLayer(this.provider.url, {
          maxZoom: this.provider.maxZoom || 19,
          attribution: this.provider.attribution || DEFAULT_PROVIDER.attribution
        }).addTo(this.map);

        this.map.on("click", (event) => {
          this.applyPosition(event.latlng.lat, event.latlng.lng, { source: "manual" });
        });

        this.updateFromInputs(true);
        requestAnimationFrame(() => this.map.invalidateSize());
      } catch (error) {
        this.container.textContent = "Map preview unavailable. Coordinates can still be entered manually.";
        this.container.dataset.error = "true";
        console.warn(error);
      }
    }

    applyPosition(latitude, longitude, options = {}) {
      this.latitude.value = Number(latitude).toFixed(6);
      this.longitude.value = Number(longitude).toFixed(6);
      if (this.source) this.source.value = options.source || "manual";
      if (this.accuracy) this.accuracy.value = Number.isFinite(options.accuracy)
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
        this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
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
      if (this.details?.open) this.ensureMap().then(() => {
        this.updateFromInputs(true);
        this.map?.invalidateSize();
      });
    }
  }

  function create(options) {
    return new LocationMapController(options);
  }

  function createReadOnly(options) {
    return new ReadOnlyLocationMap(options);
  }

  globalThis.TimelineLocationMap = Object.freeze({
    create,
    createReadOnly,
    geoJsonObjects,
    hasRenderableGeometry,
    loadLeaflet,
    presentationZoom,
    provider: DEFAULT_PROVIDER
  });
})();
