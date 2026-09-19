import test from "node:test";
import assert from "node:assert/strict";

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
