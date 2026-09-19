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

  class ReadOnlyLocationMap {
    constructor(options) {
      this.container = options.container;
      this.location = options.location || null;
      this.provider = globalThis.TimelineMapTileProvider || DEFAULT_PROVIDER;
      this.color = options.color || "#315fbd";
      this.map = null;
      this.marker = null;
      this.destroyed = false;
      this.ready = this.render();
    }

    coordinates() {
      const coordinates = this.location?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      return { lat, lng };
    }

    async render() {
      const point = this.coordinates();
      if (!this.container || !point) return;
      this.container.setAttribute("aria-label", this.location?.name || this.location?.geographicIdentifier || "Event location");
      try {
        const L = await loadLeaflet();
        if (this.destroyed || !this.container.isConnected) return;
        this.map = L.map(this.container, {
          zoomControl: false,
          attributionControl: true,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false
        }).setView([point.lat, point.lng], presentationZoom(this.location));

        L.tileLayer(this.provider.url, {
          maxZoom: this.provider.maxZoom || 19,
          attribution: this.provider.attribution || DEFAULT_PROVIDER.attribution
        }).addTo(this.map);

        this.marker = L.circleMarker([point.lat, point.lng], {
          radius: 8,
          color: this.color,
          weight: 3,
          fillColor: this.color,
          fillOpacity: 0.32
        }).addTo(this.map);

        requestAnimationFrame(() => this.map?.invalidateSize({ pan: false }));
      } catch (error) {
        if (!this.destroyed && this.container) {
          this.container.dataset.error = "true";
          this.container.textContent = "Map preview unavailable.";
        }
        console.warn(error);
      }
    }

    refresh() {
      if (!this.map) return;
      const point = this.coordinates();
      if (!point) return;
      this.map.invalidateSize({ pan: false });
      this.map.setView([point.lat, point.lng], presentationZoom(this.location), { animate: false });
    }

    destroy() {
      this.destroyed = true;
      this.marker = null;
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
          attributionControl: true
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
    loadLeaflet,
    presentationZoom,
    provider: DEFAULT_PROVIDER
  });
})();
