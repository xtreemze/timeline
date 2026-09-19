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

test("builds coarse-precision endpoints without requiring clock fields", () => {
  const millennium = temporal.buildEndpoint({
    date: "2026-09-19",
    time: "",
    precision: "millennium",
    certainty: "exact",
    timeZone: ""
  });
  const year = temporal.buildEndpoint({
    date: "2026-09-19",
    time: "",
    precision: "year",
    certainty: "approximate",
    timeZone: ""
  });
  const month = temporal.buildEndpoint({
    date: "2026-09-19",
    time: "",
    precision: "month",
    certainty: "uncertain",
    timeZone: ""
  });
  assert.equal(millennium.value, "2026");
  assert.equal(millennium.precision, "millennium");
  assert.equal(year.value, "2026");
  assert.equal(year.precision, "year");
  assert.equal(month.value, "2026-09");
  assert.equal(month.precision, "month");
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
  const [html, mapSource, appSource] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/location-map.js", import.meta.url), "utf8"),
    readFile(new URL("../site/app.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="item-date-range" type="text" readonly/);
  assert.match(html, /id="item-calendar-popover"[^>]*popover="auto"/);
  assert.match(html, /id="item-calendar-year"[^>]*type="number"/);
  assert.match(html, /id="item-start-date" type="hidden"/);
  assert.match(html, /id="item-end-date" type="hidden"/);
  assert.match(html, /id="item-start-time" type="time"/);
  assert.match(html, /id="item-end-time" type="time"/);
  assert.ok(html.includes('<option value="millennium">Millennium</option>'));
  assert.ok(html.includes('<option value="century">Century</option>'));
  assert.ok(html.includes('<option value="decade">Decade</option>'));
  assert.ok(html.includes('<option value="year">Year</option>'));
  assert.ok(html.includes('<option value="month">Month</option>'));
  assert.equal((html.match(/<option value="millennium">Millennium<\\/option>/g) || []).length, 2);
  assert.ok(appSource.includes('const hasClock = !["millennium", "century", "decade", "year", "month", "day"].includes(precision);'));
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

test("presentation map is read-only, semantic, and selects a reasonable zoom from accuracy", async () => {
  const source = await readFile(new URL("../site/location-map.js", import.meta.url), "utf8");
  assert.match(source, /class ReadOnlyLocationMap/);
  assert.match(source, /createReadOnly/);
  assert.match(source, /presentationZoom/);
  assert.match(source, /this\.interactive = options\.interactive === true/);
  assert.match(source, /zoomControl:\s*this\.interactive/);
  assert.match(source, /dragging:\s*this\.interactive/);
  assert.match(source, /scrollWheelZoom:\s*this\.interactive/);
  assert.match(source, /touchZoom:\s*this\.interactive/);
  assert.match(source, /semanticMarkerIcon/);
  assert.match(source, /L\.divIcon/);
  assert.match(source, /L\.geoJSON/);
  assert.match(source, /L\.circle/);
  assert.match(source, /return 15/);
  assert.match(source, /return 12/);
});


test("round-trips reduced year/month precision and exact milliseconds", () => {
  const year = temporal.endpointFrom("2026");
  const month = temporal.endpointFrom("2026-09");
  const millisecond = temporal.endpointFrom("2026-09-19T12:06:31.125Z");
  assert.equal(year.value, "2026");
  assert.equal(year.precision, "year");
  assert.equal(month.value, "2026-09");
  assert.equal(month.precision, "month");
  assert.equal(millisecond.value, "2026-09-19T12:06:31.125Z");
  assert.equal(millisecond.precision, "millisecond");
});

test("preserves bounded uncertainty separately from source wording", () => {
  const endpoint = temporal.endpointFrom("2026-09-19", {
    certainty: "uncertain",
    earliest: "2026-09-17",
    latest: "2026-09-21",
    sourceText: "around 19 September 2026",
    referenceSystem: "http://www.opengis.net/def/uom/ISO-8601/0/Gregorian"
  });
  assert.equal(endpoint.certainty, "uncertain");
  assert.equal(endpoint.earliest, "2026-09-17");
  assert.equal(endpoint.latest, "2026-09-21");
  assert.equal(endpoint.sourceText, "around 19 September 2026");
  assert.equal(endpoint.referenceSystem, "http://www.opengis.net/def/uom/ISO-8601/0/Gregorian");
});

test("represents astronomical year zero and BCE without Date 1900 remapping", () => {
  const bce = temporal.endpointFrom("0000-01-01");
  const earlier = temporal.endpointFrom("-000001-01-01");
  const ce = temporal.endpointFrom("0001-01-01");
  assert.equal(bce.value, "0000-01-01");
  assert.equal(temporal.parse(bce.value).year, 0);
  assert.equal(temporal.parse(earlier.value).year, -1);
  assert.ok(Number.isFinite(temporal.sortKey(bce)));
  assert.ok(temporal.sortKey(earlier) < temporal.sortKey(bce));
  assert.ok(temporal.sortKey(bce) < temporal.sortKey(ce));
});

test("rejects inverted exact intervals but preserves uncertain bounds", () => {
  assert.equal(
    temporal.normalizeExtent(null, "2026-09-20", "2026-09-19", "range"),
    null
  );
  const uncertain = temporal.normalizeExtent({
    start: { value: "2026-09-20", certainty: "uncertain" },
    end: { value: "2026-09-19", certainty: "uncertain" }
  }, null, null, "range");
  assert.equal(uncertain.type, "interval");
});

test("legacy v2 migration preserves source strings and inferred precision", () => {
  const day = temporal.normalizeExtent(null, "2026-09-19", null, "event");
  const minute = temporal.normalizeExtent(null, "2026-09-19T12:06", null, "event");
  assert.equal(day.start.precision, "day");
  assert.equal(day.start.sourceText, "2026-09-19");
  assert.equal(minute.start.precision, "minute");
  assert.equal(minute.start.sourceText, "2026-09-19T12:06");
});

test("treats malformed external temporal values as untrusted", () => {
  assert.equal(temporal.endpointFrom("2026-02-30"), null);
  assert.equal(temporal.endpointFrom("2026-13"), null);
  assert.equal(temporal.endpointFrom({ value: "2026-09-19" }), null);
  assert.equal(temporal.normalizeExtent(null, "<script>", null, "event"), null);
});
