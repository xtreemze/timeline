# Narrative and fictional timelines

Timeline's core chronology remains strict about machine-sortable temporal values and normalized spatial records. Fictional stories should not weaken those rules or reuse forensic assertions as though they were factual evidence. Instead, narrative datasets use the existing `extensions` mechanism to declare a separate semantic reference frame.

## Profile

A fictional timeline declares top-level metadata such as:

```json
{
  "extensions": {
    "narrative": {
      "mode": "fictional",
      "validationProfile": "narrative",
      "forensicEvidenceRequired": false,
      "logicalConsistencyRequired": true,
      "temporalReferenceFrame": {
        "fictional": true,
        "interchangeEncoding": "ISO 8601 synthetic ordering anchors"
      },
      "spatialReferenceFrame": {
        "fictional": true
      }
    }
  }
}
```

This is additive. Forensic timelines continue to use the normal evidence and provenance requirements. Narrative mode changes the meaning of explicitly declared fictional extension metadata; it does not make invalid dates, reversed ranges, dangling graph endpoints, or malformed coordinates acceptable.

## Fictional time

The renderer and timeline scale require sortable values. Fictional fixtures therefore encode relative chronology using valid ISO 8601 values as synthetic ordering anchors. Those values are ordering coordinates, not historical claims.

Each fictional item carries `extensions.narrative.displayTime` for the story-facing label and `extensions.narrative.temporalReferenceFrame` naming its fictional clock. Temporal endpoints use `certainty: "inferred"` and a `sourceText` statement explaining that the ISO value is synthetic.

This preserves deterministic sorting and zooming, intervals and event precision, graph-window calculations, JSON/interchange stability, and an explicit separation between fictional chronology and asserted real-world time.

## Fictional places

Fictional locations can use ordinary names and identifiers. When the current map renderer needs coordinates, a fixture may provide stable staging anchors so relative distance and movement remain logically coherent. The location identifier and narrative metadata must clearly state that these are not Earth-location claims.

When `extensions.narrative.spatialReferenceFrame.fictional` is true, the presentation map switches to Timeline's local procedural fictional reference layer. It does not request OpenStreetMap tiles or display Earth geography. The layer provides deterministic paper/topographic texture, contour strokes, stippling, and reference guides while the stored coordinates continue to function only as internal staging anchors for relative position, map interaction, and camera movement. Real-world timelines continue to use the configured geographic tile provider.

## Categories versus stories

Categories and stories serve different axes and should not be used interchangeably.

- A **category** classifies what a timeline event is, such as a conflict, discovery, decision, relationship change, or resolution. Category filtering is taxonomy. Categories belong only to timeline items; places, graph entities, and relationships/edges have their own domains and must never carry category membership.
- A **story** groups and orders associated timeline events into a navigable narrative sequence. Story focus is narrative membership and traversal.
- Events in one story should normally span several categories.
- The same category should be reusable by unrelated stories when their events have the same semantic type.
- A story title or story identifier should not be copied into `categoryId` merely to color or group that story. Story identity belongs in `story.itemIds` and, where useful, narrative extension metadata.

The default anthology therefore keeps **The Three Little Pigs**, **Snow White**, and **Cinderella** as three story nodes while categorizing their events with a reusable semantic taxonomy: background/condition, movement/transition, creation/preparation, conflict/threat, decision/choice, discovery/information, relationship/social, state change/transformation, and resolution/outcome.

## Parallel stories

Multiple stories may coexist in one timeline. The recommended pattern is:

- every chronology item belongs to exactly one story unless a deliberate crossover is represented;
- each story has its own characters, places, and story relationships;
- an optional anthology/container entity connects the story nodes without creating false character-to-character relationships;
- with story focus off, the timeline shows all items together; selecting a story uses the existing focus path to inspect only that narrative sequence.

The default sample uses **The Three Little Pigs**, **Snow White**, and **Cinderella** to exercise this model across year-scale prologues, minute-scale action, ranges, media, locations, graph relationships, relation lifecycle changes, and all three focused-event compositions.
