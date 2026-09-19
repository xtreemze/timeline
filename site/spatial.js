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

  globalThis.TimelineSpatial = Object.freeze({
    formParts,
    fromForm,
    normalize
  });
})();
