# Temporal and spatial interchange

Timeline's item editor uses browser-native controls for ordinary calendar and clock input while storing a richer, explicit interchange structure.

## Published standards baseline

### ISO 8601-1:2019 + Amendment 1:2022

Use for Gregorian calendar dates, 24-hour clock values, date-times, UTC, UTC offsets, and intervals used in information interchange.

The 2019 edition remains the current published International Standard in September 2026. A second edition is under development and is not used as a normative implementation target.

References:
- https://www.iso.org/standard/70907.html
- https://www.iso.org/standard/81801.html

### ISO 8601-2:2019 + Amendment 1:2025

Use as the design baseline for explicit uncertainty/approximation and extended interval semantics. Timeline stores certainty as structured metadata instead of depending on draft-only syntax.

References:
- https://www.iso.org/standard/70908.html
- https://www.iso.org/standard/86124.html

### Spatial references

- ISO 19112:2019 informs geographic identifiers.
- ISO 19111:2019 informs coordinate-reference-system metadata.
- RFC 7946 GeoJSON provides the practical Point geometry shape and WGS 84 / CRS84 longitude-latitude coordinate order.

References:
- https://www.iso.org/standard/70742.html
- https://www.iso.org/standard/74039.html
- https://www.rfc-editor.org/rfc/rfc7946.html

## Editor behavior

The item form exposes one readonly date/range field backed by a small custom calendar because HTML's native date input represents a single date and does not provide a two-date range selection contract. The calendar is shown through the native Popover API, presents an explicit editable year indicator, and writes canonical `YYYY-MM-DD` start/end values into hidden form state. Clock input remains native `<input type="time">` so date-range selection and time precision stay independent.

Precision is explicit:

- `day`
- `minute`
- `second`
- `millisecond`

The native clock input step changes to match the selected precision. A point event selects one calendar date; a range selects two dates in the same calendar before optional start/end clocks are applied.

Date-only endpoints do not carry a time zone. Clock values may either be floating local date-times or have an IANA zone identifier. When a zone is supplied, Chrome's native Temporal API resolves the wall-clock date/time to the corresponding UTC offset. The stored ISO value contains the offset while `timeZone` retains the IANA identifier separately.

This distinction matters because ISO 8601 represents UTC offsets, while IANA identifiers carry civil-time rules such as daylight-saving transitions.

## Item temporal structure

```json
{
  "time": {
    "type": "interval",
    "start": {
      "value": "2026-09-19T12:06:31.125+08:00",
      "precision": "millisecond",
      "certainty": "exact",
      "calendar": "gregorian",
      "timeZone": "Asia/Manila",
      "utcOffset": "+08:00",
      "sourceText": null
    },
    "end": {
      "value": "2026-09-20",
      "precision": "day",
      "certainty": "approximate",
      "calendar": "gregorian",
      "timeZone": null,
      "utcOffset": null,
      "sourceText": null
    }
  }
}
```

Legacy `start` and `end` remain present as compatibility projections of `time.start.value` and `time.end.value`.

## Location structure

A location may be descriptive without coordinates, coordinate-only, or both.

```json
{
  "location": {
    "name": "Stockholm Central Station",
    "geographicIdentifier": "Stockholm, Sweden",
    "address": "Centralplan 15, Stockholm",
    "geometry": {
      "type": "Point",
      "coordinates": [18.0586, 59.3300]
    },
    "crs": "OGC:CRS84",
    "source": "manual",
    "accuracyMeters": null
  }
}
```

Coordinate order is always `[longitude, latitude]`.

`source` is one of:

- `manual` — typed coordinates or map placement;
- `device` — obtained from the browser geolocation control;
- `imported` — retained from external data.

## Browser-native location permission

Chrome 144 introduced the `<geolocation>` element. Timeline uses it as the primary device-location control on its Chrome Beta target. It is user activated and returns a standard `GeolocationPosition` through the element's `location` event. A legacy `navigator.geolocation` button exists only as progressive fallback content for browsers that treat the element as unknown.

No location prompt runs automatically.

## Leaflet / OpenStreetMap

Leaflet 1.9.4 is currently the latest stable Leaflet release. It is loaded lazily from the documented distribution with Subresource Integrity only when the location section is opened.

The default map provider is:

```text
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

Timeline:

- shows OpenStreetMap attribution on the map;
- does not prefetch or bulk-download tiles;
- does not offer offline map-tile download;
- relies on normal browser HTTP caching;
- does not use public Nominatim geocoding implicitly;
- allows deployments to replace the tile provider through `globalThis.TimelineMapTileProvider`.

Opening the map sends tile requests to OpenStreetMap. This network/privacy boundary is distinct from Timeline's local storage of the location record.

References:
- https://leafletjs.com/download.html
- https://operations.osmfoundation.org/policies/tiles/
