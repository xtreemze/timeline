import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../site/temporal-standards-shim.ts");
await import("../site/timeline-migration-shim.ts");
await import("../site/spatial-shim.ts");

const temporal = globalThis.TimelineTemporal;
const migration = globalThis.TimelineMigration;
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
    timeZone: "",
  });
  assert.equal(day.value, "2026-09-19");
  assert.equal(day.timeZone, null);

  const second = temporal.buildEndpoint({
    date: "2026-09-19",
    time: "12:06:31",
    precision: "second",
    certainty: "approximate",
    timeZone: "",
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
    timeZone: "",
  });
  const year = temporal.buildEndpoint({
    date: "2026-09-19",
    time: "",
    precision: "year",
    certainty: "approximate",
    timeZone: "",
  });
  const month = temporal.buildEndpoint({
    date: "2026-09-19",
    time: "",
    precision: "month",
    certainty: "uncertain",
    timeZone: "",
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
    source: "manual",
  });
  assert.deepEqual(location.geometry, { type: "Point", coordinates: [18.0686, 59.3293] });
  assert.equal(location.crs, "OGC:CRS84");
});

test("rejects incomplete coordinate pairs", () => {
  assert.throws(
    () => spatial.fromForm({ latitude: "59.3", longitude: "" }),
    /both latitude and longitude/i,
  );
});

test("canonical places support point radius, area geometry, semantic icon and marker shape", () => {
  const point = spatial.placeFromForm({
    id: "place-a",
    name: "Stockholm Central",
    latitude: "59.3293",
    longitude: "18.0686",
    radiusMeters: "250",
    icon: "place",
    markerShape: "diamond",
  });
  assert.deepEqual(point.geometry, { type: "Point", coordinates: [18.0686, 59.3293] });
  assert.equal(point.radiusMeters, 250);
  assert.equal(point.icon, "place");
  assert.equal(point.markerShape, "diamond");

  const area = spatial.placeFromForm({
    id: "place-area",
    name: "Search Area",
    areaGeometry: JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [18, 59],
          [18.1, 59],
          [18.1, 59.1],
          [18, 59],
        ],
      ],
    }),
    icon: "search",
    markerShape: "square",
  });
  assert.equal(area.geometry.type, "Polygon");
  assert.equal(area.radiusMeters, null);
  assert.throws(
    () =>
      spatial.normalizePlace({
        id: "bad-area",
        name: "Bad area",
        geometry: area.geometry,
        radiusMeters: 10,
      }),
    /radius can only be used with Point/i,
  );
});

test("canonical place normalization requires geometry and clamps imported marker semantics", () => {
  const places = spatial.normalizePlaces([
    { id: "missing-geometry", name: "Name only", icon: "unknown-icon", markerShape: "hexagon" },
    {
      id: "valid",
      name: "Valid",
      geometry: { type: "Point", coordinates: [18, 59] },
      icon: "unknown-icon",
      markerShape: "hexagon",
    },
  ]);
  assert.equal(places.length, 1);
  assert.equal(places[0].id, "valid");
  assert.equal(places[0].icon, "place");
  assert.equal(places[0].markerShape, "pin");
  assert.ok(spatial.PLACE_ICON_NAMES.includes("place"));
});

test("canonical places deduplicate equivalent location records", () => {
  const places = spatial.normalizePlaces([
    {
      id: "one",
      name: "Same place",
      geometry: { type: "Point", coordinates: [18, 59] },
      radiusMeters: 100,
    },
    {
      id: "two",
      name: "Same place",
      geometry: { type: "Point", coordinates: [18, 59] },
      radiusMeters: 100,
    },
  ]);
  assert.equal(places.length, 1);
  assert.equal(
    spatial.placeIdentity(places[0]),
    spatial.placeIdentity({
      name: "Same place",
      geometry: { type: "Point", coordinates: [18, 59] },
      radiusMeters: 100,
    }),
  );
});

test("item form uses one range calendar while canonical place authoring is separated into the graph editor", async () => {
  const [html, mapSource, appSource] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/location-map.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
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
  assert.equal(html.split('<option value="millennium">Millennium</option>').length - 1, 2);
  assert.ok(
    appSource.includes(
      'const hasClock = !["millennium", "century", "decade", "year", "month", "day"].includes(precision);',
    ),
  );
  assert.match(html, /id="item-location-details"[^>]*hidden/);
  assert.match(html, /id="graph-place-form"/);
  assert.match(html, /id="graph-edge-place"/);
  assert.match(mapSource, /tile\.openstreetmap\.org/);
  assert.match(mapSource, /OpenStreetMap/);
  assert.match(mapSource, /1\.9\.4/);
});

test("omits location accuracy when the form field is empty", () => {
  const location = spatial.fromForm({
    name: "Point",
    latitude: "59.3293",
    longitude: "18.0686",
    accuracyMeters: "",
  });
  assert.equal("accuracyMeters" in location, false);
});

test("presentation map is semantic and selects a reasonable zoom from canonical place radius", async () => {
  const source = await readFile(new URL("../site/location-map.ts", import.meta.url), "utf8");
  assert.match(source, /class ReadOnlyLocationMap/);
  assert.match(source, /createReadOnly/);
  assert.match(source, /presentationZoom/);
  assert.match(source, /radiusMeters/);
  assert.match(source, /markerShape/);
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
    referenceSystem: "http://www.opengis.net/def/uom/ISO-8601/0/Gregorian",
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
  assert.equal(temporal.normalizeExtent(null, "2026-09-20", "2026-09-19", "range"), null);
  const uncertain = temporal.normalizeExtent(
    {
      start: { value: "2026-09-20", certainty: "uncertain" },
      end: { value: "2026-09-19", certainty: "uncertain" },
    },
    null,
    null,
    "range",
  );
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

test("retains the complete original v2 payload exactly once during temporal migration", () => {
  const source = {
    version: 2,
    title: "Legacy",
    categories: [{ id: "incident", name: "Incident", color: "#b42318" }],
    items: [
      {
        id: "legacy-event",
        kind: "event",
        start: "2026-09-19T12:06",
        end: null,
        title: "Legacy event",
        description: "Original v2 record",
        categoryId: "incident",
      },
    ],
    stories: [{ id: "story-a", title: "Story", itemIds: ["legacy-event"] }],
    extensions: { vendorExample: { keep: true } },
  };

  const extensions = migration.extensionsWithRetainedV2(source);
  assert.deepEqual(
    extensions.timelineMigration.originalV2,
    source,
    "the retained payload is a verbatim structural clone of the imported v2 source",
  );
  assert.equal(extensions.timelineMigration.sourceVersion, 2);
  assert.equal(extensions.timelineMigration.temporalSchema, "v3");
  assert.deepEqual(extensions.vendorExample, { keep: true });

  source.items[0].title = "Mutated after capture";
  assert.equal(
    extensions.timelineMigration.originalV2.items[0].title,
    "Legacy event",
    "retained migration provenance does not share mutable references with source state",
  );
});

test("re-normalizing a migrated payload preserves the original v2 source without recursive envelopes", () => {
  const original = {
    version: 2,
    title: "Legacy",
    items: [{ id: "a", kind: "event", start: "2026-09-19", title: "A", categoryId: "incident" }],
  };
  const first = {
    ...original,
    extensions: migration.extensionsWithRetainedV2(original),
  };
  const secondExtensions = migration.extensionsWithRetainedV2(first);

  assert.deepEqual(secondExtensions.timelineMigration.originalV2, original);
  assert.equal(
    secondExtensions.timelineMigration.originalV2.extensions?.timelineMigration,
    undefined,
    "the original payload never contains a nested copy of its own migration envelope",
  );
  assert.deepEqual(migration.originalV2Payload({ extensions: secondExtensions }), original);
});

test("current structured-temporal projects are not mislabeled as legacy v2 migrations", () => {
  const current = {
    version: 2,
    items: [
      {
        id: "current",
        kind: "event",
        start: "2026-09-20",
        time: {
          type: "instant",
          start: { value: "2026-09-20", precision: "day", certainty: "exact" },
          end: null,
        },
        title: "Current",
      },
    ],
  };
  assert.equal(migration.isLegacyV2Timeline(current), false);
  assert.equal(migration.extensionsWithRetainedV2(current), undefined);
});

test("models unknown endpoint values without fabricating a persisted date", () => {
  const endpoint = temporal.unknownEndpoint({
    certainty: "unknown",
    sourceText: "date not established",
  });
  assert.deepEqual(endpoint, {
    value: null,
    precision: null,
    certainty: "unknown",
    calendar: "gregorian",
    timeZone: null,
    utcOffset: null,
    sourceText: "date not established",
  });
  assert.equal(Number.isNaN(temporal.sortKey(endpoint)), true);
  assert.equal(JSON.stringify(endpoint).includes("0000-01-01"), false);
  assert.equal(
    temporal.intervalRepresentation({ type: "instant", start: endpoint, end: null }),
    "date not established",
  );
});

test("derives coordinates only from explicit uncertainty bounds", () => {
  const endpoint = temporal.unknownEndpoint({
    certainty: "unknown",
    earliest: "2026-09-10",
    latest: "2026-09-20",
    sourceText: "sometime in mid-September",
  });
  const bounds = temporal.endpointBounds(endpoint);
  assert.equal(bounds.locatable, true);
  assert.equal(bounds.start, Date.UTC(2026, 8, 10));
  assert.equal(bounds.end, Date.UTC(2026, 8, 20));
  assert.equal(temporal.sortKey(endpoint), Date.UTC(2026, 8, 15));
  assert.equal(
    temporal.unknownEndpoint({
      certainty: "unknown",
      earliest: "2026-09-20",
      latest: "2026-09-10",
    }),
    null,
  );
});

test("represents explicitly open interval boundaries without sentinel dates", () => {
  const openEnd = temporal.normalizeExtent(
    {
      type: "interval",
      start: { value: "2026-09-20", certainty: "exact" },
      end: null,
      openEnd: true,
    },
    null,
    null,
    "range",
  );
  assert.equal(openEnd.type, "interval");
  assert.equal(openEnd.end, null);
  assert.equal(openEnd.openEnd, true);
  assert.equal(temporal.intervalRepresentation(openEnd), "2026-09-20/");
  assert.deepEqual(temporal.extentBounds(openEnd), {
    start: Date.UTC(2026, 8, 20),
    end: Number.POSITIVE_INFINITY,
    locatable: true,
  });

  const openStart = temporal.normalizeExtent(
    {
      type: "interval",
      start: null,
      openStart: true,
      end: { value: "2026-09-20", certainty: "exact" },
    },
    null,
    null,
    "range",
  );
  assert.equal(openStart.start, null);
  assert.equal(openStart.openStart, true);
  assert.equal(temporal.intervalRepresentation(openStart), "/2026-09-20");
  assert.deepEqual(temporal.extentBounds(openStart), {
    start: Number.NEGATIVE_INFINITY,
    end: Date.UTC(2026, 8, 20),
    locatable: true,
  });

  assert.equal(
    temporal.normalizeExtent(
      { type: "interval", start: { value: "2026-09-20" }, end: null },
      null,
      null,
      "range",
    ),
    null,
    "a missing boundary is not open unless the explicit open flag is present",
  );
});

test("keeps open-boundary flags invalid on instants", () => {
  assert.equal(
    temporal.normalizeExtent(
      {
        type: "instant",
        start: { value: "2026-09-20" },
        openEnd: true,
      },
      null,
      null,
      "event",
    ),
    null,
  );
});
