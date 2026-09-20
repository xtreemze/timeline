(() => {
  "use strict";

  function text(value, max = 300) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function coordinate(value, min, max) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) return null;
    return number;
  }

  function normalize(raw) {
    if (!raw || typeof raw !== "object") return null;

    const geometry = raw.geometry && typeof raw.geometry === "object" ? raw.geometry : null;
    const coords = geometry?.type === "Point" && Array.isArray(geometry.coordinates)
      ? geometry.coordinates
      : null;

    const longitude = coordinate(raw.longitude ?? coords?.[0], -180, 180);
    const latitude = coordinate(raw.latitude ?? coords?.[1], -90, 90);
    const name = text(raw.name, 160);
    const geographicIdentifier = text(raw.geographicIdentifier, 300);
    const address = text(raw.address, 500);
    const source = ["manual", "device", "imported"].includes(raw.source) ? raw.source : "manual";
    const hasAccuracy =
      raw.accuracyMeters !== "" &&
      raw.accuracyMeters !== null &&
      raw.accuracyMeters !== undefined;
    const accuracyMeters = hasAccuracy &&
      Number.isFinite(Number(raw.accuracyMeters)) &&
      Number(raw.accuracyMeters) >= 0
      ? Number(raw.accuracyMeters)
      : null;

    if (!name && !geographicIdentifier && !address && latitude === null && longitude === null) return null;
    if ((latitude === null) !== (longitude === null)) {
      throw new Error("Location coordinates require both latitude and longitude.");
    }

    const result = {
      name,
      geographicIdentifier,
      address,
      geometry: latitude === null ? null : {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      crs: "OGC:CRS84",
      source
    };
    if (accuracyMeters !== null) result.accuracyMeters = accuracyMeters;
    return result;
  }

  function fromForm({ name, geographicIdentifier, address, latitude, longitude, source, accuracyMeters }) {
    return normalize({
      name,
      geographicIdentifier,
      address,
      latitude,
      longitude,
      source,
      accuracyMeters
    });
  }

  function formParts(location) {
    const normalized = normalize(location);
    return {
      name: normalized?.name || "",
      geographicIdentifier: normalized?.geographicIdentifier || "",
      address: normalized?.address || "",
      longitude: normalized?.geometry?.coordinates?.[0] ?? "",
      latitude: normalized?.geometry?.coordinates?.[1] ?? "",
      source: normalized?.source || "manual",
      accuracyMeters: normalized?.accuracyMeters ?? ""
    };
  }


  const PLACE_GEOMETRY_TYPES = new Set(["Point", "Polygon", "MultiPolygon"]);
  const PLACE_MARKER_SHAPES = new Set(["pin", "circle", "square", "diamond"]);

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }

  function normalizePlaceGeometry(raw) {
    if (!raw || typeof raw !== "object" || !PLACE_GEOMETRY_TYPES.has(raw.type)) return null;
    if (raw.type === "Point") {
      const coordinates = Array.isArray(raw.coordinates) ? raw.coordinates : [];
      const longitude = coordinate(coordinates[0], -180, 180);
      const latitude = coordinate(coordinates[1], -90, 90);
      if (longitude === null || latitude === null) {
        throw new Error("Place point geometry requires valid longitude and latitude.");
      }
      return { type: "Point", coordinates: [longitude, latitude] };
    }
    if (!Array.isArray(raw.coordinates) || !raw.coordinates.length) {
      throw new Error("Place area geometry requires GeoJSON coordinates.");
    }
    return clone(raw);
  }

  function normalizePlace(raw, index = 0) {
    if (!raw || typeof raw !== "object") return null;
    const id = text(raw.id, 120) || `place-${index + 1}`;
    const name = text(raw.name, 180);
    if (!name) return null;

    const sourceGeometry = raw.geometry || raw.attributes?.geometry || null;
    const geometry = normalizePlaceGeometry(sourceGeometry);
    const rawRadius = raw.radiusMeters ?? raw.radius ?? raw.attributes?.radiusMeters ?? raw.attributes?.accuracyMeters;
    const radiusMeters =
      rawRadius !== "" && rawRadius !== null && rawRadius !== undefined && Number.isFinite(Number(rawRadius)) && Number(rawRadius) >= 0
        ? Number(rawRadius)
        : null;
    if (radiusMeters !== null && geometry?.type !== "Point") {
      throw new Error("Place radius can only be used with Point geometry.");
    }

    const icon = text(raw.icon || raw.marker?.icon || raw.attributes?.icon, 48) || "place";
    const markerShapeCandidate = text(raw.markerShape || raw.marker?.shape || raw.attributes?.markerShape, 24);
    const markerShape = PLACE_MARKER_SHAPES.has(markerShapeCandidate) ? markerShapeCandidate : "pin";

    const result = {
      id,
      name,
      geographicIdentifier: text(raw.geographicIdentifier || raw.attributes?.geographicIdentifier, 300),
      address: text(raw.address || raw.attributes?.address, 500),
      geometry,
      crs: text(raw.crs || raw.attributes?.crs, 40) || "OGC:CRS84",
      radiusMeters,
      icon,
      markerShape,
      attributes: raw.attributes && typeof raw.attributes === "object"
        ? clone(raw.attributes)
        : {}
    };
    delete result.attributes.geometry;
    delete result.attributes.geographicIdentifier;
    delete result.attributes.address;
    delete result.attributes.crs;
    delete result.attributes.radiusMeters;
    delete result.attributes.accuracyMeters;
    delete result.attributes.icon;
    delete result.attributes.markerShape;
    return result;
  }

  function normalizePlaces(value) {
    if (!Array.isArray(value)) return [];
    const places = [];
    const seen = new Set();
    value.forEach((raw, index) => {
      const place = normalizePlace(raw, index);
      if (!place || seen.has(place.id)) return;
      seen.add(place.id);
      places.push(place);
    });
    return places;
  }

  function placeFromForm({ id, name, geographicIdentifier, address, latitude, longitude, radiusMeters, icon, markerShape, areaGeometry }) {
    let geometry = null;
    if (areaGeometry) {
      const parsed = typeof areaGeometry === "string" ? JSON.parse(areaGeometry) : areaGeometry;
      geometry = normalizePlaceGeometry(parsed);
    } else {
      const lng = coordinate(longitude, -180, 180);
      const lat = coordinate(latitude, -90, 90);
      if ((lng === null) !== (lat === null)) throw new Error("Place coordinates require both latitude and longitude.");
      if (lng !== null) geometry = { type: "Point", coordinates: [lng, lat] };
    }
    return normalizePlace({
      id,
      name,
      geographicIdentifier,
      address,
      geometry,
      radiusMeters,
      icon,
      markerShape
    });
  }

  function placeFormParts(place) {
    const normalized = normalizePlace(place);
    return {
      id: normalized?.id || "",
      name: normalized?.name || "",
      geographicIdentifier: normalized?.geographicIdentifier || "",
      address: normalized?.address || "",
      longitude: normalized?.geometry?.type === "Point" ? normalized.geometry.coordinates[0] : "",
      latitude: normalized?.geometry?.type === "Point" ? normalized.geometry.coordinates[1] : "",
      radiusMeters: normalized?.radiusMeters ?? "",
      icon: normalized?.icon || "place",
      markerShape: normalized?.markerShape || "pin",
      areaGeometry: normalized?.geometry && normalized.geometry.type !== "Point"
        ? JSON.stringify(normalized.geometry, null, 2)
        : ""
    };
  }

  globalThis.TimelineSpatial = Object.freeze({
    PLACE_MARKER_SHAPES: Object.freeze([...PLACE_MARKER_SHAPES]),
    formParts,
    fromForm,
    normalize,
    normalizePlace,
    normalizePlaces,
    placeFormParts,
    placeFromForm
  });
})();
