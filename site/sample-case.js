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
      "description": "They live with Mother Pig until they are old enough to seek homes of their own.",
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
      "description": "Mother Pig sends her sons into the world to build homes and make their own way.",
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
          "sequence": 3,
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
          "sequence": 4,
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
      "description": "The third pig spends much longer building with brick and mortar while his brothers finish earlier.",
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
          "sequence": 5,
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
          "sequence": 6,
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
          "sequence": 7,
          "displayTime": "Day 2 · 10:35",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
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
      "description": "Repeated attempts to blow down the brick house fail and the pursuit becomes a siege.",
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
          "sequence": 8,
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
          "sequence": 9,
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
      "description": "The chimney attempt fails; the threat ends and the brothers remain together in the brick house.",
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
          "sequence": 10,
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
      "description": "Her birth establishes the long-scale prologue before the main conflict begins years later.",
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
      "description": "The Queen asks her magic mirror who is fairest; its answer shifts the Queen's jealousy toward Snow White.",
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
          "sequence": 2,
          "displayTime": "Day 1 · 08:20",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
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
          "sequence": 3,
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
      "description": "In the forest the huntsman refuses the order and tells Snow White to flee.",
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
          "sequence": 4,
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
          "sequence": 5,
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
      "description": "The dwarfs agree that Snow White may stay if she keeps house and avoids strangers.",
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
          "sequence": 6,
          "displayTime": "Days 1–3 · shelter",
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
          "sequence": 7,
          "displayTime": "Day 2 · morning",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
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
      "description": "The Queen repeatedly disguises herself and approaches the cottage with seemingly harmless goods.",
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
          "sequence": 8,
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
          "sequence": 9,
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
      "description": "Unable to revive her, the dwarfs place Snow White in a glass coffin in a forest clearing.",
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
          "sequence": 10,
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
      "description": "The poisoned piece is dislodged and Snow White awakens.",
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
          "sequence": 11,
          "displayTime": "Day 4 · morning",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      }
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
          "sequence": 12,
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
      "description": "The loss begins the long prologue that changes Cinderella's household.",
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
      "description": "Her stepmother and stepsisters reduce her to household labor while they enjoy the family's status.",
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
          "sequence": 2,
          "displayTime": "Prologue · long hardship",
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
          "sequence": 3,
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
      "description": "Her stepfamily leaves for the palace after making her attendance impossible.",
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
          "sequence": 4,
          "displayTime": "Day 1 · afternoon",
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
      "description": "A pumpkin becomes a coach, animals become attendants, and Cinderella receives formal clothes and glass slippers until midnight.",
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
          "sequence": 5,
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
      "description": "At the palace, Cinderella and the prince spend the evening together without her stepfamily recognizing her.",
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
          "sequence": 6,
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
      "description": "She returns for another evening and stays until the final moments before the enchantment expires.",
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
          "sequence": 7,
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
          "sequence": 8,
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
      "description": "The glass slipper is taken from household to household as a unique clue to the unknown guest.",
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
          "sequence": 9,
          "displayTime": "Days 3–4 · search",
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
      "description": "Cinderella is finally allowed to try the slipper; the fit identifies her as the guest from the ball.",
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
          "sequence": 10,
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
          "sequence": 11,
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
      "description": "Three brothers build different shelters and face the same pursuing wolf.",
      "itemIds": [
        "pigs-childhood",
        "pigs-leave-home",
        "pigs-straw-house",
        "pigs-stick-house",
        "pigs-brick-build",
        "pigs-wolf-straw",
        "pigs-wolf-sticks",
        "pigs-brick-siege",
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
      "description": "Jealousy, refuge, deception, poisoned sleep, revival, and resolution across a distinct fictional realm.",
      "itemIds": [
        "snow-birth",
        "snow-mirror",
        "snow-huntsman-order",
        "snow-huntsman-spares",
        "snow-finds-cottage",
        "snow-dwarfs-shelter",
        "snow-queen-discovers",
        "snow-disguises",
        "snow-apple",
        "snow-coffin",
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
      "description": "Household oppression, magical transformation, two balls, a lost slipper, a search, and recognition.",
      "itemIds": [
        "cinderella-mother",
        "cinderella-hardship",
        "cinderella-invitation",
        "cinderella-denied",
        "cinderella-transformation",
        "cinderella-first-ball",
        "cinderella-second-ball",
        "cinderella-slipper",
        "cinderella-search",
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
        "material": "brick"
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
        "purpose": "deception"
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
        "expiresAt": "midnight"
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
        "clue": "glass slipper"
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
