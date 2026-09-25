# True-scale 3D place assets

Lūm treats 3D as another presentation of canonical places, not as a separate scene graph or story model.

## Ownership

- The GIS/world owns geographic placement and camera projection.
- A canonical place may own one 3D representation.
- Relationships/events continue to reference the canonical place ID.
- GLB owns physical geometry only.
- The story only references its canonical places.
- Production rendering remains deck.gl/luma. Three.js is not part of the runtime.
- Babylon.js may later be used as an editing tool, but Babylon scene serialization is not canonical project data.

## Coordinate convention

All authored geometry uses a right-handed local coordinate system:

- **1 unit = 1 meter**
- **+Y is up**
- **X/Z form the ground plane**
- model origin is the ground-contact footprint centroid
- the root node always has scale `[1, 1, 1]`
- dimensions are baked into geometry rather than fixed by renderer scaling
- heading is stored separately on the canonical place-scene record

Fictional story realms use local meter coordinates embedded into the larger fictional atlas. Atlas longitude/latitude remains presentation staging; it does not define building scale.

## Scale provenance

Most fairy-tale sources do not define exact architecture. These assets therefore use `scaleBasis: "fictional-plausible"`: dimensions are physically coherent staging dimensions, not historical/source assertions.

If a source explicitly establishes dimensions, use `scaleBasis: "sourced"` and attach provenance through the normal evidence model.

## Style: illustrated architectural storybook maquette

The shared language is deliberately non-photorealistic:

- clear architectural silhouettes;
- physically plausible doors, windows, stairs and paths;
- low-poly massing with small high-value detail;
- rough, simple PBR materials;
- limited material count;
- reusable architectural/environment kits;
- stylized vegetation and props;
- no texture detail whose apparent scale contradicts geometry.

Story identity should come from silhouette/material vocabulary rather than incompatible rendering styles. Pigwood emphasizes progressively sturdier construction: loose warm straw, irregular timber/sticks, then compact masonry.

## Representation kinds

Not every place becomes a GLB.

- `model`: a freestanding building/object.
- `composite`: several reusable assets sharing one canonical place.
- `interior`: an interior scene materialized only at close focus.
- `procedural-area`: meadow, clearing, forest, courtyard.
- `procedural-route`: road, path, pursuit corridor.
- `instanced`: trees, crops, fences, repeated props.
- `landmark`: distinctive isolated feature such as the beanstalk or old well.

The Pigwood pilot deliberately leaves fields and routes procedural instead of baking large mostly-empty GLBs.

## LOD

LOD is selected from projected screen size and never changes physical scale.

| projected size | result |
| ---: | --- |
| < 8 px | marker/cluster only |
| 8–25 px | LOD3 |
| 25–80 px | LOD2 |
| 80–180 px | LOD1 |
| > 180 px | LOD0 |

A small hysteresis band prevents threshold flicker. Runtime integration should prefetch the next LOD and materialize only visible/relevant place models.

## Pigwood metric layout

The pilot gives Pigwood a local meter-scale realm roughly 2.3 km across. The four principal buildings are real-scale maquette assets:

| asset | dimensions |
| --- | --- |
| Mother Pig cottage | 12 × 8.5 × 9 m |
| Straw house | 8.5 × 6.8 × 7 m |
| Stick house | 9.5 × 7.3 × 7.8 m |
| Brick house | 11 × 8.8 × 9.2 m |

Other canonical places remain explicit in `assets-3d/source/pigwood.json` as procedural areas/routes so they can later be generated from GIS geometry and instanced environment kits.

## Deterministic source

Editable geometry lives in `assets-3d/source/*.json`. Generated `.glb` files are build products.

Run:

```sh
pnpm assets:3d
```

The generator uses no renderer dependency. It produces glTF 2.0 binary assets, four LODs per modeled place, a manifest containing canonical place IDs, meter transforms, semantic anchors, triangle counts and byte sizes.

CI should eventually run generation in check mode and reject scale, geometry-budget or manifest drift.
