# Dense trajectories and moving features

Lūm separates semantic geography from high-frequency movement samples.

## Canonical boundary

- **Place**: a meaningful reusable location.
- **Occurrence**: a meaningful event or activity such as a journey.
- **TrajectoryArtifact**: a compact manifest for dense sampled movement.
- **Samples**: measurements stored outside canonical project JSON.

A GNSS fix is not a Place, and a 100,000-point track does not create 100,000 occurrences.

`CanonicalOccurrence.trajectoryIds` links a journey or other occurrence to one or more trajectory manifests. Multiple participants may share the same trajectory. Multiple independent recordings may also support one occurrence.

## Storage

A trajectory manifest records sample count, time extent, WGS84 bounds, optional elevation bounds, channel metadata, simplification levels, provenance and a storage reference. The actual point/channel arrays belong in chunked source/blob/IndexedDB/external storage.

Attributes must not be used to smuggle dense `samples`, `points`, `coordinates`, `positions`, `vertices` or `trackPoints` arrays back into canonical JSON.

## Progressive materialization

`levels[]` describes simplification/materialization products such as raw, high, medium, low and overview. Renderers select a level according to spatial/temporal resolution without changing canonical trajectory identity.

## Standards mapping

The principal interoperability baseline is OGC Moving Features:
- OGC Moving Features Encoding Extension - JSON 1.0;
- OGC API - Moving Features - Part 1: Core 1.0;
- ISO 19141 moving-feature concepts where semantics match.

GPX, FIT, GeoJSON and JSON-FG are adapters around this model rather than canonical storage requirements.

## Derived events

Spatial analysis may derive observations such as entered/left, stop, boundary crossing, route deviation, convergence or proximity. These feed the evidence/claim proposal pipeline. Geometry alone never auto-commits a semantic occurrence or identity conclusion.
