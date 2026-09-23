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
- RFC 7946 GeoJSON provides the practical geometry model and WGS 84 / CRS84 longitude-latitude coordinate order. Timeline presentation can render points, lines/trails, polygons/areas, multi-geometries, geometry collections, Features and FeatureCollections.

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

## Reusable place registry and edge spatial context

Spatial context is canonicalized separately from chronology items and graph nodes. A place is created once in top-level `places[]`, then any number of relationships reference it through `placeId`.

```json
{
  "places": [
    {
      "id": "place-stockholm-central",
      "name": "Stockholm Central Station",
      "geographicIdentifier": "Stockholm, Sweden",
      "address": "Centralplan 15, Stockholm",
      "geometry": {
        "type": "Point",
        "coordinates": [18.0586, 59.3300]
      },
      "crs": "OGC:CRS84",
      "radiusMeters": 150,
      "icon": "place",
      "markerShape": "pin",
      "style": {
        "marker": {
          "color": "#315fbd",
          "fillColor": "#fffdf9",
          "opacity": 1,
          "size": 32,
          "weight": 2
        },
        "path": {
          "stroke": true,
          "color": "#315fbd",
          "weight": 3,
          "opacity": 0.9,
          "dashArray": "6 4",
          "dashOffset": "0",
          "lineCap": "round",
          "lineJoin": "round"
        },
        "area": {
          "fill": true,
          "fillColor": "#315fbd",
          "fillOpacity": 0.12,
          "fillRule": "evenodd"
        }
      }
    }
  ],
  "relationships": [
    {
      "id": "rel-meeting",
      "subjectId": "person-a",
      "predicate": "met",
      "objectId": "person-b",
      "placeId": "place-stockholm-central",
      "time": {
        "type": "instant",
        "start": {
          "value": "2026-09-19",
          "precision": "day",
          "certainty": "exact",
          "calendar": "gregorian"
        },
        "end": null
      }
    }
  ]
}
```

Coordinate order is always `[longitude, latitude]`. Supported canonical place geometry is GeoJSON Point, LineString, MultiLineString, Polygon, or MultiPolygon. A Point may carry `radiusMeters`; path and area geometries already encode their extent and therefore cannot also carry a radius.

`icon` identifies the semantic marker symbol. `markerShape` is one of `pin`, `circle`, `square`, or `diamond`. Leaflet resolves both from the referenced place when rendering a relationship's map context.

Optional `style` is canonical presentation metadata rather than a Leaflet object. Blank editor values are omitted so the map can inherit Timeline/event colors. The supported portable subset maps directly to useful Leaflet visual options:

- `marker`: `color`, `fillColor`, `opacity`, visual `size`, and outline `weight`;
- `path`: `stroke`, `color`, `weight`, `opacity`, `dashArray`, `dashOffset`, `lineCap`, and `lineJoin`;
- `area`: `fill`, `fillColor`, `fillOpacity`, and `fillRule`.

Renderer behavior is deliberately excluded: arbitrary CSS classes, panes, event bubbling, interactivity, drag behavior, and Leaflet instances are never persisted. This keeps the same records portable to the MapLibre/PMTiles direction in #240.

Place identity is reusable and deduplicated. The editor rejects creating an equivalent name/geometry/radius record and directs the author to reuse the existing place from the edge selector. This prevents many events or edges from carrying copies of the same coordinates.

Legacy/imported `item.location` values remain accepted at the adapter boundary for compatibility, but canonical normalization migrates them into `places[]`, removes the copied item location, and assigns the resulting `placeId` to contextual edges. Place/location entities from older graph data are migrated out of graph topology by the same boundary.

## Browser-native location permission

Chrome 144 introduced the `<geolocation>` element. Timeline uses it as the primary device-location control on its Chrome Beta target. It is user activated and returns a standard `GeolocationPosition` through the element's `location` event. A legacy `navigator.geolocation` button exists only as progressive fallback content for browsers that treat the element as unknown.

No location prompt runs automatically.

## Map renderer and basemap providers

Timeline currently uses Leaflet 1.9.4 as its map renderer. Leaflet JavaScript and CSS are built into Timeline's static site from the pinned package dependency, so opening a map does not depend on a runtime CDN such as unpkg.

Canonical place geometry is independent from the basemap. Timeline-owned markers, labels, routes, polygons, radii, and fictional reference frames are rendered as overlays and remain meaningful when a basemap provider is unavailable. Basemap state is diagnostic presentation state only and is never persisted into project data.

The compatibility/default provider remains the public OpenStreetMap raster endpoint:

```text
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

It is treated as best-effort rather than authoritative application infrastructure. Deployments can provide either `globalThis.TimelineMapTileProvider` or an ordered `globalThis.TimelineMapTileProviders` array. After repeated tile failures Timeline advances to the next configured provider; if every provider fails it removes only the basemap layer and exposes a non-blocking `basemapState=unavailable` state while retaining semantic geometry. Provider failover never mutates the selected place, geometry, or event relationship.

Map containers are observed with `ResizeObserver`. Leaflet receives `invalidateSize()` after measurable layout changes so hidden, resized, fullscreen, portrait/landscape, and sidebar reflows do not leave stale map dimensions. A semantic placeholder remains until rendered Leaflet geometry is confirmed in the DOM. Places with no usable geometry show an explicit `No mapped coordinates` state rather than silently producing an empty map.

Timeline:

- keeps OpenStreetMap attribution when the compatibility provider is active;
- renders presentation geometry through Leaflet GeoJSON layers independently from the basemap;
- uses each canonical place's semantic SVG icon, marker shape, and optional marker/path/area style overrides, with relationship/event color retained as the fallback presentation accent;
- fits routes, areas and collections to their visible bounds rather than leaving an empty generic map;
- renders a canonical Point `radiusMeters` as a non-interactive Leaflet circle;
- does not prefetch or bulk-download tiles;
- does not offer offline map-tile download;
- relies on normal browser HTTP caching;
- does not use public Nominatim geocoding implicitly;
- keeps renderer/provider state out of canonical project data.

The integrated graph/geography architecture tracked in #236 may later replace the raster underlay with MapLibre GL + PMTiles/vector tiles. That renderer decision is intentionally separate from the canonical place model and this reliability contract.

Opening a network basemap sends tile requests to the selected provider. This network/privacy boundary is distinct from Timeline's local storage of the location record.

References:
- https://leafletjs.com/download.html
- https://operations.osmfoundation.org/policies/tiles/
