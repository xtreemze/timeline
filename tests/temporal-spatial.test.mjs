import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../site/temporal-standards.js");
await import("../site/spatial.js");

const temporal = globalThis.TimelineTemporal;
const spatial = globalThis.TimelineSpatial;

test("parses ISO 8601 calendar dates and progressively precise local date-times", () => {
  assert.equal(temporal.parse("2026-09-19").precision, "day");
  assert.equal(temporal.parse("2026-09-19T12:06").precision, "minute");
  assert.equal(temporal.parse("2026-09-19T12:06:31").precision, "second");
  assert.equal(temporal.parse("2026-09-19T12:06:31.125").precision, "millisecond");
  assert.equal(temporal.parse("2026-09-19T12:06:31.125+08:00").offset, "+08:00");
});

test("builds date-only and floating date-time endpoints", () => {
  const day = temporal.buildEndpoint({
    date: "2026-09-19",
    time: "",
    precision: "day",
    certainty: "exact",
    timeZone: ""
  });
  assert.equal(day.value, "2026-09-19");
  assert.equal(day.timeZone, null);

  const second = temporal.buildEndpoint({
    date: "2026-09-19",
    time: "12:06:31",
    precision: "second",
    certainty: "approximate",
    timeZone: ""
  });
  assert.equal(second.value, "2026-09-19T12:06:31");
  assert.equal(second.certainty, "approximate");
});

test("normalizes legacy start/end values into a structured temporal extent", () => {
  const extent = temporal.normalizeExtent(null, "2026-09-19T12:06", "2026-09-20", "range");
  assert.equal(extent.type, "interval");
  assert.equal(extent.start.precision, "minute");
  assert.equal(extent.end.precision, "day");
  assert.equal(temporal.intervalRepresentation(extent), "2026-09-19T12:06/2026-09-20");
});

test("location uses RFC 7946 coordinate order longitude, latitude", () => {
  const location = spatial.fromForm({
    name: "Stockholm",
    geographicIdentifier: "Stockholm, Sweden",
    address: "",
    latitude: "59.3293",
    longitude: "18.0686",
    source: "manual"
  });
  assert.deepEqual(location.geometry, { type: "Point", coordinates: [18.0686, 59.3293] });
  assert.equal(location.crs, "OGC:CRS84");
});

test("rejects incomplete coordinate pairs", () => {
  assert.throws(() => spatial.fromForm({ latitude: "59.3", longitude: "" }), /both latitude and longitude/i);
});

test("item form uses one range calendar, native clocks, and Chrome geolocation", async () => {
  const [html, mapSource] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/location-map.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="item-date-range" type="text" readonly/);
  assert.match(html, /id="item-calendar-popover"[^>]*popover="auto"/);
  assert.match(html, /id="item-calendar-year"[^>]*type="number"/);
  assert.match(html, /id="item-start-date" type="hidden"/);
  assert.match(html, /id="item-end-date" type="hidden"/);
  assert.match(html, /id="item-start-time" type="time"/);
  assert.match(html, /id="item-end-time" type="time"/);
  assert.match(html, /<geolocation id="item-geolocation"/);
  assert.match(mapSource, /tile\.openstreetmap\.org/);
  assert.match(mapSource, /OpenStreetMap/);
  assert.match(mapSource, /1\.9\.4/);
});

test("omits location accuracy when the form field is empty", () => {
  const location = spatial.fromForm({
    name: "Point",
    latitude: "59.3293",
    longitude: "18.0686",
    accuracyMeters: ""
  });
  assert.equal("accuracyMeters" in location, false);
});

test("presentation map is simplified read-only and selects a reasonable zoom from accuracy", async () => {
  const source = await readFile(new URL("../site/location-map.js", import.meta.url), "utf8");
  assert.match(source, /class ReadOnlyLocationMap/);
  assert.match(source, /createReadOnly/);
  assert.match(source, /presentationZoom/);
  assert.match(source, /zoomControl:\s*false/);
  assert.match(source, /dragging:\s*false/);
  assert.match(source, /scrollWheelZoom:\s*false/);
  assert.match(source, /circleMarker/);
  assert.match(source, /return 15/);
  assert.match(source, /return 12/);
});
