(() => {
  "use strict";

  const SAMPLE = {
  "version": 2,
  "title": "Three classic tales — parallel fictional casebook",
  "categories": [
    {
      "id": "context",
      "name": "Background / Condition",
      "color": "#667085"
    },
    {
      "id": "movement",
      "name": "Movement / Transition",
      "color": "#0e7090"
    },
    {
      "id": "creation",
      "name": "Creation / Preparation",
      "color": "#b54708"
    },
    {
      "id": "conflict",
      "name": "Conflict / Threat",
      "color": "#b42318"
    },
    {
      "id": "decision",
      "name": "Decision / Choice",
      "color": "#7a5af8"
    },
    {
      "id": "discovery",
      "name": "Discovery / Information",
      "color": "#2563eb"
    },
    {
      "id": "relationship",
      "name": "Relationship / Social",
      "color": "#027a48"
    },
    {
      "id": "state-change",
      "name": "State Change / Transformation",
      "color": "#c11574"
    },
    {
      "id": "resolution",
      "name": "Resolution / Outcome",
      "color": "#067647"
    }
  ],
  "evidence": [
    {
      "id": "src-pigs",
      "type": "article",
      "title": "The Three Little Pigs — narrative source card",
      "sourceName": "Storybook fixture",
      "note": "A fictional narrative source used to demonstrate source attachment. It is not forensic evidence.",
      "publishedAt": "1000-04-01"
    },
    {
      "id": "src-snow",
      "type": "document",
      "title": "Snow White — narrative source card",
      "sourceName": "Storybook fixture",
      "note": "A fictional narrative source used to demonstrate source attachment. It is not forensic evidence.",
      "publishedAt": "1000-04-01"
    },
    {
      "id": "src-cinderella",
      "type": "pdf",
      "title": "Cinderella — narrative source card",
      "sourceName": "Storybook fixture",
      "note": "A fictional narrative source used to exercise document/PDF presentation. It is not forensic evidence.",
      "publishedAt": "1000-04-01"
    },
    {
      "id": "note-story-logic",
      "type": "note",
      "title": "Narrative consistency note",
      "sourceName": "Timeline demo",
      "note": "The three tales use synthetic dates and fictional map anchors while preserving internal temporal, spatial, and relational consistency.",
      "publishedAt": "1000-04-05"
    }
  ],
  "items": [
    {
      "id": "snow-birth",
      "kind": "event",
      "start": "0993-01-01",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "0993-01-01",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Snow White is born",
      "description": "Snow White is born in the royal household and becomes the child whose beauty later triggers the Queen's jealousy. This early event anchors the long prologue before the concentrated action around the mirror, huntsman, dwarfs, and disguised attacks.",
      "categoryId": "state-change",
      "location": {
        "name": "Queen's Castle",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.32,
            48.54
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Character",
          "icon": "person",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 1,
          "displayTime": "Prologue · seven years earlier",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "snow-childhood",
      "kind": "range",
      "start": "0993-01-02",
      "end": "1000-04-01",
      "time": {
        "type": "interval",
        "start": {
          "value": "0993-01-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-01",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "Snow White grows up at the castle",
      "description": "Snow White grows from infancy into the young princess later named by the mirror. The long background range makes the Queen's later jealousy a change in an established household rather than an isolated incident.",
      "categoryId": "context",
      "location": {
        "name": "Queen's Castle",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.32,
            48.54
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Background",
          "icon": "person",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 2,
          "displayTime": "Prologue · childhood at court",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-mother",
      "kind": "event",
      "start": "0997-01-01",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "0997-01-01",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Cinderella's mother dies",
      "description": "Cinderella's mother dies while Cinderella is still young. The loss removes her closest protector and begins the household transition that later leaves her dependent on her father, stepmother, and stepsisters.",
      "categoryId": "state-change",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Character",
          "icon": "person",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 1,
          "displayTime": "Prologue · years earlier",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-stepfamily-arrives",
      "kind": "event",
      "start": "0997-01-02",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "0997-01-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Cinderella's father remarries and the stepfamily joins the household",
      "description": "Cinderella's father remarries, bringing the stepmother and her two daughters into the house. The household structure changes immediately after Cinderella's loss and creates the relationship network behind the later years of unequal treatment.",
      "categoryId": "relationship",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Household change",
          "icon": "person",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 2,
          "displayTime": "Prologue · household changes",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-hardship",
      "kind": "range",
      "start": "0997-01-02",
      "end": "1000-04-01",
      "time": {
        "type": "interval",
        "start": {
          "value": "0997-01-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-01",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "Cinderella lives under her stepfamily's control",
      "description": "After the household changes, Cinderella is assigned the hardest domestic work and is repeatedly excluded from the privileges enjoyed by her stepsisters. The long range provides the background condition against which the invitation to the royal ball becomes significant.",
      "categoryId": "context",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Conflict",
          "icon": "danger",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 3,
          "displayTime": "Prologue · long hardship",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-childhood",
      "kind": "range",
      "start": "0998-01-01",
      "end": "1000-04-01",
      "time": {
        "type": "interval",
        "start": {
          "value": "0998-01-01",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-01",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "The three pigs grow up together",
      "description": "The three brothers grow up together under Mother Pig's care. Their shared upbringing establishes the family bond that later explains why each pig repeatedly seeks shelter with his brothers when the wolf destroys a home.",
      "categoryId": "context",
      "location": {
        "name": "Mother Pig's Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.1,
            50.02
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Character",
          "icon": "person",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 1,
          "displayTime": "Prologue · before the journey",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-leave-home",
      "kind": "event",
      "start": "1000-04-01T08:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The pigs leave home",
      "description": "Mother Pig tells her sons they are old enough to establish homes of their own and warns them to build carefully. They depart together, then separate along Pigwood Market Road as each chooses a different material and level of effort.",
      "categoryId": "movement",
      "location": {
        "name": "Mother Pig's Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.1,
            50.02
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Journey",
          "icon": "relation",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 2,
          "displayTime": "Day 1 · morning",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-invitation",
      "kind": "event",
      "start": "1000-04-01T08:10Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:10Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The royal ball invitation arrives",
      "description": "A palace invitation announces festivities at which the prince will meet the kingdom's eligible guests.",
      "categoryId": "discovery",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Invitation",
          "icon": "note",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 4,
          "displayTime": "Day 1 · morning",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1600&q=80",
          "alt": "Palace-like architecture used as Cinderella mood art",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "pigs-acquire-straw",
      "kind": "event",
      "start": "1000-04-01T08:20Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:20Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "First Pig acquires straw",
      "description": "The First Pig meets a material seller on Pigwood Market Road and chooses straw because it can be assembled quickly. The choice minimizes construction time but leaves him with the least resistant shelter.",
      "categoryId": "decision",
      "location": {
        "name": "Pigwood Market Road",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.13,
            50.01
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Material choice",
          "icon": "object",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 3,
          "displayTime": "Day 1 · 08:20 · material choice",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "snow-mirror",
      "kind": "event",
      "start": "1000-04-01T08:20Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:20Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The mirror names Snow White the fairest",
      "description": "The Queen consults the magic mirror expecting confirmation that she remains the fairest. The mirror instead names Snow White, converting the Queen's jealousy into a specific threat directed at her.",
      "categoryId": "discovery",
      "location": {
        "name": "Queen's Castle",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.32,
            48.54
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Inciting incident",
          "icon": "object",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 3,
          "displayTime": "Day 1 · 08:20",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-acquire-sticks",
      "kind": "event",
      "start": "1000-04-01T08:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Second Pig acquires sticks",
      "description": "The Second Pig selects bundled sticks from the same road, choosing a somewhat sturdier material while still prioritizing speed. His decision sits between the First Pig's straw and the Third Pig's masonry in both effort and resilience.",
      "categoryId": "decision",
      "location": {
        "name": "Pigwood Market Road",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.13,
            50.01
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Material choice",
          "icon": "object",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 4,
          "displayTime": "Day 1 · 08:30 · material choice",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-acquire-bricks",
      "kind": "event",
      "start": "1000-04-01T08:40Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:40Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Third Pig acquires bricks and mortar",
      "description": "The Third Pig chooses bricks and mortar even though the material is heavier and the build will take much longer. This explicit planning decision begins the causal chain that later makes the brick house the brothers' refuge.",
      "categoryId": "decision",
      "location": {
        "name": "Pigwood Market Road",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.13,
            50.01
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Material choice",
          "icon": "object",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 5,
          "displayTime": "Day 1 · 08:40 · material choice",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-brick-build",
      "kind": "range",
      "start": "1000-04-01T09:00Z",
      "end": "1000-04-02T09:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-01T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-02T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "Third Pig builds the brick house",
      "description": "The Third Pig begins laying brick and mortar soon after acquiring his materials. His slower construction overlaps the quick completion of the straw and stick houses, making the later difference in resilience a consequence of an earlier planning choice.",
      "categoryId": "creation",
      "location": {
        "name": "Brick House Hill",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.3,
            49.96
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Place",
          "icon": "home",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 6,
          "displayTime": "Day 1–2 · careful construction",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
          "alt": "Illustrative house exterior for the fictional brick house",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "snow-huntsman-order",
      "kind": "event",
      "start": "1000-04-01T09:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The Queen orders the huntsman to kill Snow White",
      "description": "The Queen commands the huntsman to take Snow White into the forest and not return with her alive.",
      "categoryId": "conflict",
      "location": {
        "name": "Queen's Castle",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.32,
            48.54
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Threat",
          "icon": "danger",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 4,
          "displayTime": "Day 1 · 09:00",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-snow-queen-threat",
          "operation": "activate"
        }
      ]
    },
    {
      "id": "pigs-straw-house",
      "kind": "event",
      "start": "1000-04-01T10:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T10:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "First Pig builds a straw house",
      "description": "The first pig chooses speed and builds a light house of straw.",
      "categoryId": "creation",
      "location": {
        "name": "Straw House Meadow",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.16,
            50
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Place",
          "icon": "home",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 7,
          "displayTime": "Day 1 · late morning",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
          "alt": "Illustrative house exterior for the fictional brick house",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "snow-huntsman-spares",
      "kind": "event",
      "start": "1000-04-01T10:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T10:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The huntsman spares Snow White",
      "description": "In the forest, the huntsman cannot carry out the Queen's order and tells Snow White to flee. His choice creates the path that leads her away from the castle and toward the dwarfs' cottage.",
      "categoryId": "decision",
      "location": {
        "name": "Deep Forest",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.48,
            48.45
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Choice",
          "icon": "decision",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 5,
          "displayTime": "Day 1 · 10:00",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80",
          "alt": "Dense forest used as Snow White mood art",
          "caption": "Illustrative fictional forest."
        }
      ]
    },
    {
      "id": "pigs-stick-house",
      "kind": "event",
      "start": "1000-04-01T11:15Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T11:15Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Second Pig builds a stick house",
      "description": "The second pig builds with sticks, trading some speed for a sturdier shelter.",
      "categoryId": "creation",
      "location": {
        "name": "Stick House Grove",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.22,
            49.98
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Place",
          "icon": "home",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 8,
          "displayTime": "Day 1 · midday",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
          "alt": "Illustrative house exterior for the fictional brick house",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "snow-finds-cottage",
      "kind": "event",
      "start": "1000-04-01T13:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T13:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Snow White finds the dwarfs' cottage",
      "description": "Lost in the forest, Snow White discovers a small cottage and rests inside.",
      "categoryId": "discovery",
      "location": {
        "name": "Seven Dwarfs' Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Discovery",
          "icon": "home",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 6,
          "displayTime": "Day 1 · afternoon",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80",
          "alt": "Dense forest used as Snow White mood art",
          "caption": "Illustrative fictional forest."
        },
        {
          "src": "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80",
          "alt": "Mountain landscape used as story mood art",
          "caption": "Illustrative landscape."
        },
        {
          "src": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
          "alt": "Old stone structure used as story mood art",
          "caption": "Illustrative architecture; exercises the three-image slideshow."
        }
      ]
    },
    {
      "id": "cinderella-denied",
      "kind": "event",
      "start": "1000-04-01T16:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T16:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Cinderella is prevented from attending",
      "description": "Cinderella asks to attend the ball but her stepfamily blocks her participation and adds work that makes attendance seem impossible. The setback directly precedes the fairy godmother's intervention.",
      "categoryId": "conflict",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Setback",
          "icon": "decision",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 5,
          "displayTime": "Day 1 · afternoon",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-extra-chores",
      "kind": "event",
      "start": "1000-04-01T16:20Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T16:20Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Stepmother adds impossible chores before departure",
      "description": "After denying Cinderella permission to attend, the stepmother leaves additional sorting and household work to be completed. The added tasks make the exclusion concrete and explain why Cinderella remains behind as the others leave for the palace.",
      "categoryId": "conflict",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Setback",
          "icon": "danger",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 6,
          "displayTime": "Day 1 · 16:20 · exclusion enforced",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "snow-dwarfs-shelter",
      "kind": "range",
      "start": "1000-04-01T18:00Z",
      "end": "1000-04-03T07:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-01T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-03T07:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "The seven dwarfs shelter Snow White",
      "description": "The seven dwarfs agree to shelter Snow White after hearing how she came to the cottage. Their protection creates a new relationship network around her, but it also establishes the fixed place where the Queen's later disguises can reach her.",
      "categoryId": "relationship",
      "location": {
        "name": "Seven Dwarfs' Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Alliance",
          "icon": "person",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 7,
          "displayTime": "Days 1–3 · shelter",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-transformation",
      "kind": "event",
      "start": "1000-04-01T18:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The fairy godmother transforms Cinderella's circumstances",
      "description": "The fairy godmother appears after Cinderella's exclusion and offers a temporary way to attend the ball. The intervention changes Cinderella's appearance and resources but comes with an explicit midnight limit that governs later events.",
      "categoryId": "state-change",
      "location": {
        "name": "Garden and Pumpkin Patch",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.82,
            47.28
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Transformation",
          "icon": "magic",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 7,
          "displayTime": "Day 1 · evening",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1600&q=80",
          "alt": "Palace-like architecture used as Cinderella mood art",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "cinderella-coach-created",
      "kind": "event",
      "start": "1000-04-01T18:10Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T18:10Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Pumpkin and animals are transformed into transport",
      "description": "The fairy godmother turns a pumpkin into a coach and transforms nearby animals into the team and attendants needed for the journey. The transformation gives Cinderella mobility as well as appearance, while remaining temporary until midnight.",
      "categoryId": "creation",
      "location": {
        "name": "Garden and Pumpkin Patch",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.82,
            47.28
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Transformation",
          "icon": "magic",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 8,
          "displayTime": "Day 1 · 18:10 · coach created",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-first-ball",
      "kind": "range",
      "start": "1000-04-01T20:00Z",
      "end": "1000-04-01T23:55Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-01T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-01T23:55Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "Cinderella attends the royal ball",
      "description": "Cinderella arrives at the palace transformed and initially unrecognized by her household. She attracts the prince's attention and experiences the social world from which she had been excluded, while the midnight condition remains active.",
      "categoryId": "relationship",
      "location": {
        "name": "Royal Palace",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.98,
            47.23
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Encounter",
          "icon": "crown",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 9,
          "displayTime": "Day 1 · ball",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1600&q=80",
          "alt": "Palace-like architecture used as Cinderella mood art",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "cinderella-prince-dance",
      "kind": "event",
      "start": "1000-04-01T20:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T20:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Prince dances with the unknown guest",
      "description": "At the first ball, the prince gives sustained attention to Cinderella without recognizing her household identity. The encounter establishes the relationship that makes her later absence and the slipper clue personally significant to him.",
      "categoryId": "relationship",
      "location": {
        "name": "Royal Palace",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.98,
            47.23
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Encounter",
          "icon": "crown",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 10,
          "displayTime": "Day 1 · 20:30 · first dance",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1600&q=80",
          "alt": "Palace-like architecture used as Cinderella mood art",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "cinderella-first-return",
      "kind": "event",
      "start": "1000-04-01T23:50Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T23:50Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Cinderella leaves the first ball before midnight",
      "description": "Remembering the fairy godmother's condition, Cinderella leaves the palace in time on the first night and returns home before the transformation ends. The successful departure makes her decision to stay later on the second night consequential.",
      "categoryId": "movement",
      "location": {
        "name": "Royal Palace Steps",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.965,
            47.235
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Departure",
          "icon": "relation",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 11,
          "displayTime": "Day 1 · 23:50 · timely departure",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "snow-queen-discovers",
      "kind": "event",
      "start": "1000-04-02T08:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The Queen learns Snow White survives",
      "description": "The mirror reveals that Snow White is alive at the dwarfs' cottage.",
      "categoryId": "discovery",
      "location": {
        "name": "Queen's Castle",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.32,
            48.54
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Discovery",
          "icon": "search",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 8,
          "displayTime": "Day 2 · morning",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-wolf-straw",
      "kind": "event",
      "start": "1000-04-02T10:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T10:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Wolf blows down the straw house",
      "description": "The wolf destroys the first shelter; the First Pig escapes toward his brother.",
      "categoryId": "conflict",
      "location": {
        "name": "Straw House Meadow",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.16,
            50
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Turning point",
          "icon": "danger",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 9,
          "displayTime": "Day 2 · 10:00",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-pigs-wolf-threat",
          "operation": "activate"
        }
      ]
    },
    {
      "id": "snow-disguises",
      "kind": "range",
      "start": "1000-04-02T10:00Z",
      "end": "1000-04-03T11:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-02T10:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-03T11:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "The Queen makes disguised attempts",
      "description": "After learning Snow White is still alive, the Queen repeatedly travels in disguise to the dwarfs' cottage. The range contains two separate failed attacks—tightened laces and a poisoned comb—before the later apple plot.",
      "categoryId": "conflict",
      "location": {
        "name": "Seven Dwarfs' Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Escalation",
          "icon": "danger",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 9,
          "displayTime": "Days 2–3 · disguised attempts",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-snow-queen-threat",
          "operation": "update",
          "predicate": "deceives",
          "properties": {
            "phase": "disguised attacks",
            "attempts": 2
          }
        }
      ]
    },
    {
      "id": "pigs-first-flees",
      "kind": "event",
      "start": "1000-04-02T10:05Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T10:05Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "First Pig flees to the stick house",
      "description": "After the straw house collapses, the First Pig escapes along the road to the Second Pig's house. The pursuit changes from a threat to one pig into a threat shared by two brothers.",
      "categoryId": "movement",
      "location": {
        "name": "Stick House Grove",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.22,
            49.98
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Escape",
          "icon": "relation",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 10,
          "displayTime": "Day 2 · 10:05 · escape",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "snow-laces",
      "kind": "event",
      "start": "1000-04-02T10:15Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T10:15Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Disguised Queen tightens enchanted laces",
      "description": "The Queen reaches the cottage in disguise and persuades Snow White to accept laces, then tightens them until Snow White collapses. This is the first distinct disguised attack inside the broader attack range.",
      "categoryId": "conflict",
      "location": {
        "name": "Seven Dwarfs' Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Deception",
          "icon": "danger",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 10,
          "displayTime": "Day 2 · 10:15 · first disguised attack",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-wolf-sticks",
      "kind": "event",
      "start": "1000-04-02T10:35Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T10:35Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Wolf blows down the stick house",
      "description": "The first two pigs flee together to the completed brick house.",
      "categoryId": "conflict",
      "location": {
        "name": "Stick House Grove",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.22,
            49.98
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Escalation",
          "icon": "danger",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 11,
          "displayTime": "Day 2 · 10:35",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-two-flee",
      "kind": "event",
      "start": "1000-04-02T10:40Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T10:40Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "First and Second Pig flee to the brick house",
      "description": "When the stick house is destroyed, both pigs run to the Third Pig's completed brick house. Their movement concentrates all three brothers at one defensible location before the wolf arrives.",
      "categoryId": "movement",
      "location": {
        "name": "Brick House Hill",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.3,
            49.96
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Regroup",
          "icon": "relation",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 12,
          "displayTime": "Day 2 · 10:40 · regrouping",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
          "alt": "Illustrative house exterior for the fictional brick house",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "pigs-brick-siege",
      "kind": "range",
      "start": "1000-04-02T11:15Z",
      "end": "1000-04-02T12:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-02T11:15Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-02T12:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "The brick house withstands the wolf",
      "description": "The wolf reaches the completed brick house after chasing the first two pigs there. Repeated huffing and blowing fails to breach the walls, shifting the conflict from direct destruction to a search for another entry route.",
      "categoryId": "conflict",
      "location": {
        "name": "Brick House Hill",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.3,
            49.96
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Conflict",
          "icon": "danger",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 13,
          "displayTime": "Day 2 · failed siege",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-pigs-wolf-threat",
          "operation": "update",
          "predicate": "besieges",
          "properties": {
            "phase": "brick-house siege"
          }
        }
      ]
    },
    {
      "id": "snow-laces-recovery",
      "kind": "event",
      "start": "1000-04-02T12:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T12:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Dwarfs loosen the laces and revive Snow White",
      "description": "The dwarfs return, recognize that the laces are constricting Snow White, and loosen them. Her recovery proves that the first disguised attack failed and prompts another warning not to admit strangers.",
      "categoryId": "relationship",
      "location": {
        "name": "Seven Dwarfs' Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Rescue",
          "icon": "person",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 11,
          "displayTime": "Day 2 · noon · first recovery",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-wolf-roof",
      "kind": "event",
      "start": "1000-04-02T12:02Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T12:02Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Wolf climbs onto the brick-house roof",
      "description": "Unable to destroy the walls, the wolf changes tactics and climbs onto the roof to reach the chimney. The event marks the transition from failed frontal attack to attempted entry from above.",
      "categoryId": "decision",
      "location": {
        "name": "Brick House Hill",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.3,
            49.96
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Tactical change",
          "icon": "danger",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 14,
          "displayTime": "Day 2 · 12:02 · alternate entry",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-chimney",
      "kind": "event",
      "start": "1000-04-02T12:05Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T12:05Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Wolf tries the chimney",
      "description": "Unable to breach the walls, the wolf attempts to enter through the chimney.",
      "categoryId": "conflict",
      "location": {
        "name": "Brick House Hill",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.3,
            49.96
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-pigs"
      ],
      "tags": [
        {
          "label": "Climax",
          "icon": "danger",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 15,
          "displayTime": "Day 2 · 12:05",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "pigs-safe",
      "kind": "event",
      "start": "1000-04-02T12:10Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T12:10Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The wolf is defeated and the pigs are safe",
      "description": "The chimney attempt fails and the immediate threat ends. The three brothers remain together inside the brick house, with the earlier material and construction choices now visibly linked to their survival.",
      "categoryId": "resolution",
      "location": {
        "name": "Brick House Hill",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.3,
            49.96
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-pigs",
        "note-story-logic"
      ],
      "tags": [
        {
          "label": "Resolution",
          "icon": "home",
          "hue": 28
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-three-little-pigs",
          "sequence": 16,
          "displayTime": "Day 2 · resolution",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-pigs-wolf-threat",
          "operation": "deactivate"
        }
      ],
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
          "alt": "Illustrative house exterior for the fictional brick house",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "snow-comb",
      "kind": "event",
      "start": "1000-04-02T16:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T16:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Disguised Queen uses a poisoned comb",
      "description": "The Queen returns in another disguise with a poisoned comb and places it in Snow White's hair. Snow White collapses again, showing that the threat persists despite the earlier rescue and warning.",
      "categoryId": "conflict",
      "location": {
        "name": "Seven Dwarfs' Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Poisoned object",
          "icon": "object",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 12,
          "displayTime": "Day 2 · 16:00 · second disguised attack",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "snow-comb-recovery",
      "kind": "event",
      "start": "1000-04-02T18:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Dwarfs remove the comb and revive Snow White again",
      "description": "The dwarfs find the poisoned comb, remove it, and Snow White recovers. The second failed attack leads the Queen to prepare a method designed to look harmless and survive inspection.",
      "categoryId": "relationship",
      "location": {
        "name": "Seven Dwarfs' Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Rescue",
          "icon": "person",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 13,
          "displayTime": "Day 2 · evening · second recovery",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-second-ball",
      "kind": "range",
      "start": "1000-04-02T20:00Z",
      "end": "1000-04-02T23:59Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-02T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-02T23:59Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "Cinderella returns to the palace",
      "description": "Cinderella returns to the palace a second time and spends longer with the prince. Because she leaves later, the midnight limit becomes the direct cause of the hurried flight and lost slipper.",
      "categoryId": "relationship",
      "location": {
        "name": "Royal Palace",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.98,
            47.23
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Escalation",
          "icon": "crown",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 12,
          "displayTime": "Day 2 · ball",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1600&q=80",
          "alt": "Palace-like architecture used as Cinderella mood art",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "cinderella-midnight-flight",
      "kind": "event",
      "start": "1000-04-02T23:55Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T23:55Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Midnight warning triggers Cinderella's hurried flight",
      "description": "During the second ball, Cinderella notices that midnight is imminent and abruptly leaves the prince. The hurried descent from the palace steps leads directly to the lost slipper moments later.",
      "categoryId": "movement",
      "location": {
        "name": "Royal Palace Steps",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.965,
            47.235
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Flight",
          "icon": "relation",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 13,
          "displayTime": "Day 2 · 23:55 · midnight flight",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-slipper",
      "kind": "event",
      "start": "1000-04-03T00:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T00:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Cinderella loses a glass slipper at midnight",
      "description": "Fleeing as the enchantment ends, Cinderella leaves one glass slipper behind on the palace steps.",
      "categoryId": "state-change",
      "location": {
        "name": "Midnight Road",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.9,
            47.25
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Clue",
          "icon": "object",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 14,
          "displayTime": "Day 3 · midnight",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-cinderella-prince-search",
          "operation": "activate"
        }
      ],
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1600&q=80",
          "alt": "Palace-like architecture used as Cinderella mood art",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    },
    {
      "id": "cinderella-search",
      "kind": "range",
      "start": "1000-04-03T08:00Z",
      "end": "1000-04-04T15:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-03T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-04T15:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "The prince searches for the slipper's owner",
      "description": "The prince uses the recovered glass slipper as the identifying clue for a house-to-house search. The search turns a private palace encounter into a public investigation that eventually reaches Cinderella's household.",
      "categoryId": "discovery",
      "location": {
        "name": "Midnight Road",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.9,
            47.25
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Investigation",
          "icon": "search",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 15,
          "displayTime": "Days 3–4 · search",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "snow-apple-prepared",
      "kind": "event",
      "start": "1000-04-03T10:45Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T10:45Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Queen prepares the poisoned apple",
      "description": "After two failed attempts, the Queen prepares an apple whose poisoned portion can be offered deceptively. The object becomes the mechanism for the third attack and the key causal link to Snow White's apparent death.",
      "categoryId": "creation",
      "location": {
        "name": "Queen's Castle",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.32,
            48.54
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Preparation",
          "icon": "object",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 14,
          "displayTime": "Day 3 · 10:45 · poison prepared",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "snow-apple",
      "kind": "event",
      "start": "1000-04-03T11:15Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T11:15Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Snow White bites the poisoned apple",
      "description": "The Queen's poisoned apple causes Snow White to collapse into an enchanted sleep.",
      "categoryId": "state-change",
      "location": {
        "name": "Seven Dwarfs' Cottage",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Climax",
          "icon": "object",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 15,
          "displayTime": "Day 3 · 11:15",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-snow-queen-threat",
          "operation": "update",
          "predicate": "poisons",
          "properties": {
            "phase": "poisoned apple"
          }
        }
      ]
    },
    {
      "id": "snow-coffin",
      "kind": "range",
      "start": "1000-04-03T15:00Z",
      "end": "1000-04-04T09:30Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-03T15:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-04T09:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "title": "The dwarfs keep vigil beside a glass coffin",
      "description": "Believing Snow White dead after the apple, the dwarfs place her in a glass coffin rather than burying her. Their vigil preserves the social bond around her and creates the setting in which the prince later encounters her.",
      "categoryId": "relationship",
      "location": {
        "name": "Glass Coffin Clearing",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.69,
            48.34
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Consequence",
          "icon": "object",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 16,
          "displayTime": "Day 3–4 · vigil",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80",
          "alt": "Mountain landscape used as story mood art",
          "caption": "Illustrative landscape."
        }
      ]
    },
    {
      "id": "snow-prince-arrives",
      "kind": "event",
      "start": "1000-04-04T09:15Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-04T09:15Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Prince encounters the glass coffin",
      "description": "A prince travelling through the forest clearing sees Snow White in the glass coffin and speaks with the dwarfs. His arrival connects the isolated vigil to the event that immediately precedes her revival.",
      "categoryId": "discovery",
      "location": {
        "name": "Glass Coffin Clearing",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.69,
            48.34
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Encounter",
          "icon": "search",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 17,
          "displayTime": "Day 4 · 09:15 · encounter",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80",
          "alt": "Dense forest used as Snow White mood art",
          "caption": "Illustrative fictional forest."
        }
      ]
    },
    {
      "id": "snow-revival",
      "kind": "event",
      "start": "1000-04-04T09:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-04T09:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Snow White revives",
      "description": "As the coffin is moved, the poisoned piece of apple is dislodged and Snow White awakens. The revival changes her state and ends the apparent death without treating the preceding attacks as though they never occurred.",
      "categoryId": "state-change",
      "location": {
        "name": "Glass Coffin Clearing",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.69,
            48.34
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-snow",
        "note-story-logic"
      ],
      "tags": [
        {
          "label": "Reversal",
          "icon": "magic",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 18,
          "displayTime": "Day 4 · morning",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-stepsisters-try",
      "kind": "event",
      "start": "1000-04-04T14:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-04T14:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Stepsisters attempt the slipper test",
      "description": "The search reaches Cinderella's house and the stepsisters each attempt to fit the recovered slipper. Their failure eliminates the obvious household candidates and creates the opening for Cinderella to ask for a turn.",
      "categoryId": "discovery",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "editorial-mosaic"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Test",
          "icon": "search",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 16,
          "displayTime": "Day 4 · 14:30 · household test",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-asks-to-try",
      "kind": "event",
      "start": "1000-04-04T15:05Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-04T15:05Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Cinderella asks to try the slipper",
      "description": "After the other candidates fail, Cinderella steps forward and asks to be included in the test despite her stepfamily's resistance. The request is the decision that converts the search from an external process into direct recognition.",
      "categoryId": "decision",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-cinderella"
      ],
      "tags": [
        {
          "label": "Decision",
          "icon": "decision",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 17,
          "displayTime": "Day 4 · 15:05 · claim to be tested",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
    },
    {
      "id": "cinderella-fit",
      "kind": "event",
      "start": "1000-04-04T15:10Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-04T15:10Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "The slipper fits Cinderella",
      "description": "After the other members of the household fail the test, Cinderella is allowed to try the slipper. It fits, linking the unknown guest from the palace to Cinderella and resolving the prince's search.",
      "categoryId": "discovery",
      "location": {
        "name": "Cinderella's House",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-cinderella",
        "note-story-logic"
      ],
      "tags": [
        {
          "label": "Recognition",
          "icon": "search",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 18,
          "displayTime": "Day 4 · 15:10",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-cinderella-prince-search",
          "operation": "update",
          "predicate": "identifies",
          "properties": {
            "clue": "glass slipper"
          }
        }
      ]
    },
    {
      "id": "snow-resolution",
      "kind": "event",
      "start": "1000-04-05T12:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-05T12:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Snow White's story reaches its wedding resolution",
      "description": "The Queen's threat is ended and Snow White's new life is marked by a royal wedding.",
      "categoryId": "resolution",
      "location": {
        "name": "Queen's Castle",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.32,
            48.54
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-snow",
        "note-story-logic"
      ],
      "tags": [
        {
          "label": "Resolution",
          "icon": "crown",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 19,
          "displayTime": "Day 5 · resolution",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-snow-queen-threat",
          "operation": "deactivate"
        }
      ],
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
          "alt": "Old stone structure used as story mood art",
          "caption": "Illustrative architecture; exercises the three-image slideshow."
        }
      ]
    },
    {
      "id": "cinderella-resolution",
      "kind": "event",
      "start": "1000-04-05T14:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-05T14:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Cinderella and the prince marry",
      "description": "The search ends, Cinderella leaves her imposed household role, and the tale closes with the royal marriage.",
      "categoryId": "resolution",
      "location": {
        "name": "Royal Palace",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.98,
            47.23
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported"
      },
      "presentation": {
        "variant": "evidence-dossier"
      },
      "evidenceIds": [
        "src-cinderella",
        "note-story-logic"
      ],
      "tags": [
        {
          "label": "Resolution",
          "icon": "crown",
          "hue": 214
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-cinderella",
          "sequence": 19,
          "displayTime": "Day 5 · resolution",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "relationChanges": [
        {
          "relationshipId": "rel-cinderella-prince-search",
          "operation": "deactivate"
        },
        {
          "relationshipId": "rel-cinderella-stepfamily-control",
          "operation": "deactivate"
        }
      ],
      "media": [
        {
          "src": "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1600&q=80",
          "alt": "Palace-like architecture used as Cinderella mood art",
          "caption": "Mood image only; not evidence or a real location."
        }
      ]
    }
  ],
  "stories": [
    {
      "id": "story-three-little-pigs",
      "title": "The Three Little Pigs",
      "description": "Three brothers leave home, choose different building strategies, acquire different materials, and face a pursuing wolf. The story now follows the material decisions, construction overlap, escapes between shelters, regrouping at the brick house, siege, roof approach, chimney attempt, and final safety.",
      "itemIds": [
        "pigs-childhood",
        "pigs-leave-home",
        "pigs-acquire-straw",
        "pigs-acquire-sticks",
        "pigs-acquire-bricks",
        "pigs-brick-build",
        "pigs-straw-house",
        "pigs-stick-house",
        "pigs-wolf-straw",
        "pigs-first-flees",
        "pigs-wolf-sticks",
        "pigs-two-flee",
        "pigs-brick-siege",
        "pigs-wolf-roof",
        "pigs-chimney",
        "pigs-safe"
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "validationProfile": "narrative",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm"
        }
      }
    },
    {
      "id": "story-snow-white",
      "title": "Snow White",
      "description": "Snow White grows up in the royal household while the Queen's jealousy intensifies. The chronology follows the mirror's disclosure, the huntsman's refusal, refuge with the dwarfs, separate disguised attacks with laces and a poisoned comb, the apple plot, vigil in the glass coffin, the prince's arrival, revival, and resolution.",
      "itemIds": [
        "snow-birth",
        "snow-childhood",
        "snow-mirror",
        "snow-huntsman-order",
        "snow-huntsman-spares",
        "snow-finds-cottage",
        "snow-dwarfs-shelter",
        "snow-queen-discovers",
        "snow-disguises",
        "snow-laces",
        "snow-laces-recovery",
        "snow-comb",
        "snow-comb-recovery",
        "snow-apple-prepared",
        "snow-apple",
        "snow-coffin",
        "snow-prince-arrives",
        "snow-revival",
        "snow-resolution"
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "validationProfile": "narrative",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm"
        }
      }
    },
    {
      "id": "story-cinderella",
      "title": "Cinderella",
      "description": "After her mother's death, Cinderella's household changes and she is reduced to servitude. The story traces the invitation, sabotage and extra chores, fairy intervention, creation of the coach and attire, two palace visits, her encounters with the prince, the midnight flight, the lost slipper, household trials, recognition, and marriage.",
      "itemIds": [
        "cinderella-mother",
        "cinderella-stepfamily-arrives",
        "cinderella-hardship",
        "cinderella-invitation",
        "cinderella-denied",
        "cinderella-extra-chores",
        "cinderella-transformation",
        "cinderella-coach-created",
        "cinderella-first-ball",
        "cinderella-prince-dance",
        "cinderella-first-return",
        "cinderella-second-ball",
        "cinderella-midnight-flight",
        "cinderella-slipper",
        "cinderella-search",
        "cinderella-stepsisters-try",
        "cinderella-asks-to-try",
        "cinderella-fit",
        "cinderella-resolution"
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "validationProfile": "narrative",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm"
        }
      }
    }
  ],
  "entities": [
    {
      "id": "storybook-anthology",
      "type": "group",
      "name": "Classic Tale Anthology",
      "identifiers": [],
      "attributes": {
        "container": true,
        "fictional": true
      }
    },
    {
      "id": "pigs-first",
      "type": "person",
      "name": "First Pig",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-second",
      "type": "person",
      "name": "Second Pig",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-third",
      "type": "person",
      "name": "Third Pig",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-mother",
      "type": "person",
      "name": "Mother Pig",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-wolf",
      "type": "person",
      "name": "Big Bad Wolf",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-brothers",
      "type": "group",
      "name": "The Three Pig Brothers",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-brick-house",
      "type": "object",
      "name": "Brick House",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-brick-place",
      "type": "place",
      "name": "Brick House Hill",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "snow-white",
      "type": "person",
      "name": "Snow White",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-queen",
      "type": "person",
      "name": "The Queen",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-huntsman",
      "type": "person",
      "name": "The Huntsman",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-prince",
      "type": "person",
      "name": "The Prince",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-dwarfs",
      "type": "group",
      "name": "Seven Dwarfs",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-mirror",
      "type": "object",
      "name": "Magic Mirror",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-apple",
      "type": "object",
      "name": "Poisoned Apple",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-cottage-place",
      "type": "place",
      "name": "Seven Dwarfs' Cottage",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "cinderella",
      "type": "person",
      "name": "Cinderella",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-stepmother",
      "type": "person",
      "name": "Stepmother",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-stepsisters",
      "type": "group",
      "name": "Stepsisters",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-fairy",
      "type": "person",
      "name": "Fairy Godmother",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-prince",
      "type": "person",
      "name": "The Prince",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-slipper-object",
      "type": "object",
      "name": "Glass Slipper",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-coach",
      "type": "object",
      "name": "Enchanted Coach",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-palace-place",
      "type": "place",
      "name": "Royal Palace",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "pigs-material-vendors",
      "type": "group",
      "name": "Pigwood Material Sellers",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-straw-bundle",
      "type": "object",
      "name": "Straw Bundle",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-stick-bundle",
      "type": "object",
      "name": "Stick Bundle",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-brick-load",
      "type": "object",
      "name": "Brick and Mortar Load",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "pigs-market-place",
      "type": "place",
      "name": "Pigwood Market Road",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true
      }
    },
    {
      "id": "snow-laces-object",
      "type": "object",
      "name": "Enchanted Laces",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-comb-object",
      "type": "object",
      "name": "Poisoned Comb",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-coffin-object",
      "type": "object",
      "name": "Glass Coffin",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-clearing-place",
      "type": "place",
      "name": "Glass Coffin Clearing",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "cinderella-father",
      "type": "person",
      "name": "Cinderella's Father",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-pumpkin",
      "type": "object",
      "name": "Pumpkin",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-gown",
      "type": "object",
      "name": "Ball Gown",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-herald",
      "type": "person",
      "name": "Royal Herald",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    },
    {
      "id": "cinderella-palace-steps-place",
      "type": "place",
      "name": "Royal Palace Steps",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true
      }
    }
  ],
  "relationships": [
    {
      "id": "rel-anthology-pigs",
      "subjectId": "storybook-anthology",
      "objectId": "story-three-little-pigs",
      "predicate": "containsStory",
      "attributes": {}
    },
    {
      "id": "rel-anthology-snow",
      "subjectId": "storybook-anthology",
      "objectId": "story-snow-white",
      "predicate": "containsStory",
      "attributes": {}
    },
    {
      "id": "rel-anthology-cinderella",
      "subjectId": "storybook-anthology",
      "objectId": "story-cinderella",
      "predicate": "containsStory",
      "attributes": {}
    },
    {
      "id": "rel-pigs-story",
      "subjectId": "pigs-brothers",
      "objectId": "story-three-little-pigs",
      "predicate": "participatesIn",
      "attributes": {}
    },
    {
      "id": "rel-snow-story",
      "subjectId": "snow-white",
      "objectId": "story-snow-white",
      "predicate": "protagonistOf",
      "attributes": {}
    },
    {
      "id": "rel-cinderella-story",
      "subjectId": "cinderella",
      "objectId": "story-cinderella",
      "predicate": "protagonistOf",
      "attributes": {}
    },
    {
      "id": "rel-pigs-first-group",
      "subjectId": "pigs-first",
      "objectId": "pigs-brothers",
      "predicate": "memberOf",
      "attributes": {}
    },
    {
      "id": "rel-pigs-second-group",
      "subjectId": "pigs-second",
      "objectId": "pigs-brothers",
      "predicate": "memberOf",
      "attributes": {}
    },
    {
      "id": "rel-pigs-third-group",
      "subjectId": "pigs-third",
      "objectId": "pigs-brothers",
      "predicate": "memberOf",
      "attributes": {}
    },
    {
      "id": "rel-pigs-builds",
      "subjectId": "pigs-third",
      "objectId": "pigs-brick-house",
      "predicate": "builds",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-01T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-02T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "material": "brick",
        "materialSource": "Pigwood Market Road"
      }
    },
    {
      "id": "rel-pigs-house-place",
      "subjectId": "pigs-brick-house",
      "objectId": "pigs-brick-place",
      "predicate": "locatedAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "referenceFrame": "Storybook Realm"
      }
    },
    {
      "id": "rel-pigs-wolf-threat",
      "subjectId": "pigs-wolf",
      "objectId": "pigs-brothers",
      "predicate": "pursues",
      "initialState": "inactive",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-pigs-mother-leave",
      "subjectId": "pigs-mother",
      "objectId": "pigs-leave-home",
      "predicate": "sendsForth",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "motivation": "independence"
      }
    },
    {
      "id": "rel-snow-mirror-owned",
      "subjectId": "snow-queen",
      "objectId": "snow-mirror",
      "predicate": "consults",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:20Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "question": "fairest"
      }
    },
    {
      "id": "rel-snow-huntsman-order",
      "subjectId": "snow-queen",
      "objectId": "snow-huntsman",
      "predicate": "commands",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "target": "Snow White"
      }
    },
    {
      "id": "rel-snow-huntsman-spares",
      "subjectId": "snow-huntsman",
      "objectId": "snow-white",
      "predicate": "spares",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T10:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "location": "Deep Forest"
      }
    },
    {
      "id": "rel-snow-dwarfs-shelter",
      "subjectId": "snow-dwarfs",
      "objectId": "snow-white",
      "predicate": "shelters",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-01T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-03T07:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "place": "Seven Dwarfs' Cottage"
      }
    },
    {
      "id": "rel-snow-apple-object",
      "subjectId": "snow-queen",
      "objectId": "snow-apple",
      "predicate": "prepares",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T10:45Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "purpose": "deception",
        "attempt": 3
      }
    },
    {
      "id": "rel-snow-queen-threat",
      "subjectId": "snow-queen",
      "objectId": "snow-white",
      "predicate": "threatens",
      "initialState": "inactive",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-snow-prince-revival",
      "subjectId": "snow-prince",
      "objectId": "snow-revival",
      "predicate": "presentAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-04T09:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "phase": "revival"
      }
    },
    {
      "id": "rel-cinderella-control",
      "subjectId": "cinderella-stepmother",
      "objectId": "cinderella",
      "predicate": "controls",
      "time": {
        "type": "interval",
        "start": {
          "value": "0997-01-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-05",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "domain": "household"
      }
    },
    {
      "id": "rel-cinderella-stepsisters",
      "subjectId": "cinderella-stepsisters",
      "objectId": "cinderella",
      "predicate": "burdens",
      "time": {
        "type": "interval",
        "start": {
          "value": "0997-01-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-04",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "domain": "household labor"
      }
    },
    {
      "id": "rel-cinderella-fairy",
      "subjectId": "cinderella-fairy",
      "objectId": "cinderella",
      "predicate": "transformsCircumstances",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "expiresAt": "midnight",
        "includes": [
          "gown",
          "coach",
          "attendants",
          "glass slippers"
        ]
      }
    },
    {
      "id": "rel-cinderella-slipper-loss",
      "subjectId": "cinderella",
      "objectId": "cinderella-slipper-object",
      "predicate": "loses",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T00:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "place": "Midnight Road"
      }
    },
    {
      "id": "rel-cinderella-prince-search",
      "subjectId": "cinderella-prince",
      "objectId": "cinderella",
      "predicate": "searchesFor",
      "initialState": "inactive",
      "attributes": {
        "storyId": "story-cinderella",
        "clue": "glass slipper",
        "agent": "Royal Herald"
      }
    },
    {
      "id": "rel-cinderella-stepfamily-control",
      "subjectId": "cinderella-stepmother",
      "objectId": "cinderella",
      "predicate": "restricts",
      "time": {
        "type": "interval",
        "start": {
          "value": "0997-01-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-05",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-cinderella-palace",
      "subjectId": "cinderella",
      "objectId": "cinderella-palace-place",
      "predicate": "visits",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-01T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-02T23:59Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "occasion": "royal balls"
      }
    },
    {
      "id": "rel-pigs-first-straw",
      "subjectId": "pigs-first",
      "objectId": "pigs-straw-bundle",
      "predicate": "acquires",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:20Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "from": "Pigwood Material Sellers"
      }
    },
    {
      "id": "rel-pigs-second-sticks",
      "subjectId": "pigs-second",
      "objectId": "pigs-stick-bundle",
      "predicate": "acquires",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "from": "Pigwood Material Sellers"
      }
    },
    {
      "id": "rel-pigs-third-bricks",
      "subjectId": "pigs-third",
      "objectId": "pigs-brick-load",
      "predicate": "acquires",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T08:40Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "from": "Pigwood Material Sellers"
      }
    },
    {
      "id": "rel-pigs-vendors-market",
      "subjectId": "pigs-material-vendors",
      "objectId": "pigs-market-place",
      "predicate": "locatedAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-01T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-01T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "referenceFrame": "Storybook Realm"
      }
    },
    {
      "id": "rel-pigs-first-shelter-second",
      "subjectId": "pigs-first",
      "objectId": "pigs-second",
      "predicate": "seeksShelterWith",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T10:05Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "after": "straw house destroyed"
      }
    },
    {
      "id": "rel-pigs-brothers-shelter-third",
      "subjectId": "pigs-brothers",
      "objectId": "pigs-third",
      "predicate": "regroupsWith",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T10:40Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "place": "Brick House Hill"
      }
    },
    {
      "id": "rel-snow-queen-laces",
      "subjectId": "snow-queen",
      "objectId": "snow-laces-object",
      "predicate": "usesInDisguise",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T10:15Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "attempt": 1
      }
    },
    {
      "id": "rel-snow-queen-comb",
      "subjectId": "snow-queen",
      "objectId": "snow-comb-object",
      "predicate": "usesInDisguise",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T16:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "attempt": 2
      }
    },
    {
      "id": "rel-snow-dwarfs-laces-rescue",
      "subjectId": "snow-dwarfs",
      "objectId": "snow-white",
      "predicate": "revivesAfterLaces",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T12:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "method": "loosen laces"
      }
    },
    {
      "id": "rel-snow-dwarfs-comb-rescue",
      "subjectId": "snow-dwarfs",
      "objectId": "snow-white",
      "predicate": "revivesAfterComb",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-02T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "method": "remove comb"
      }
    },
    {
      "id": "rel-snow-coffin-contains",
      "subjectId": "snow-coffin-object",
      "objectId": "snow-white",
      "predicate": "contains",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-03T15:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-04T09:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "place": "Glass Coffin Clearing"
      }
    },
    {
      "id": "rel-snow-prince-coffin",
      "subjectId": "snow-prince",
      "objectId": "snow-coffin-object",
      "predicate": "encounters",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-04T09:15Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "place": "Glass Coffin Clearing"
      }
    },
    {
      "id": "rel-cinderella-father-stepmother",
      "subjectId": "cinderella-father",
      "objectId": "cinderella-stepmother",
      "predicate": "marries",
      "time": {
        "type": "instant",
        "start": {
          "value": "0997-01-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "household": "Cinderella's House"
      }
    },
    {
      "id": "rel-cinderella-fairy-pumpkin",
      "subjectId": "cinderella-fairy",
      "objectId": "cinderella-pumpkin",
      "predicate": "transforms",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T18:10Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "result": "Enchanted Coach"
      }
    },
    {
      "id": "rel-cinderella-fairy-gown",
      "subjectId": "cinderella-fairy",
      "objectId": "cinderella-gown",
      "predicate": "provides",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "expiresAt": "midnight"
      }
    },
    {
      "id": "rel-cinderella-prince-dance",
      "subjectId": "cinderella-prince",
      "objectId": "cinderella",
      "predicate": "dancesWith",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-01T20:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "identityKnown": false
      }
    },
    {
      "id": "rel-cinderella-herald-slipper",
      "subjectId": "cinderella-herald",
      "objectId": "cinderella-slipper-object",
      "predicate": "carriesForTest",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-03T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-04T15:10Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "purpose": "identify owner"
      }
    },
    {
      "id": "rel-cinderella-stepsisters-slipper",
      "subjectId": "cinderella-stepsisters",
      "objectId": "cinderella-slipper-object",
      "predicate": "failsFitTest",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-04T14:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "attributes": {
        "result": "no match"
      }
    }
  ],
  "extensions": {
    "narrative": {
      "mode": "fictional",
      "validationProfile": "narrative",
      "forensicEvidenceRequired": false,
      "logicalConsistencyRequired": true,
      "temporalReferenceFrame": {
        "fictional": true,
        "name": "Storybook Cycle 1000",
        "interchangeEncoding": "ISO 8601 synthetic ordering anchors"
      },
      "spatialReferenceFrame": {
        "fictional": true,
        "name": "Storybook Realm",
        "coordinateSemantics": "staging anchors for relative story geography; not Earth-location claims"
      },
      "anthology": {
        "simultaneousStories": true,
        "independentStoryFocus": true,
        "storyIds": [
          "story-three-little-pigs",
          "story-snow-white",
          "story-cinderella"
        ]
      }
    }
  }
};

  globalThis.TimelineSampleCase = Object.freeze(SAMPLE);
})();
