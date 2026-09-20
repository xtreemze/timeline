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
          "displayTime": "Prologue · Snow White is born",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.png",
          "alt": "1852 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-childhood",
      "kind": "range",
      "start": "0993-01-02",
      "end": "1000-04-02",
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
          "value": "1000-04-02",
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
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.png",
          "alt": "1852 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Snow%20White%20illustration%20from%20german%20children's%20book%201919%20(3917968514).jpg",
          "alt": "1919 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
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
          "displayTime": "Prologue · mother's death",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20by%20Elenore%20Abbott.jpg",
          "alt": "Elenore Abbott public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20and%20the%20Fairy%20Godmother.jpg",
          "alt": "William Henry Margetson public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-stepfamily-arrives",
      "kind": "event",
      "start": "0997-06-01",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "0997-06-01",
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
          "displayTime": "Prologue · stepfamily joins household",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20and%20the%20Fairy%20Godmother.jpg",
          "alt": "William Henry Margetson public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helen%20Stratton%20Cinderella.jpg",
          "alt": "Helen Stratton public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-hardship",
      "kind": "range",
      "start": "0997-06-02",
      "end": "1000-04-10",
      "time": {
        "type": "interval",
        "start": {
          "value": "0997-06-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-10",
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
          "displayTime": "Prologue · years of household servitude",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helen%20Stratton%20Cinderella.jpg",
          "alt": "Helen Stratton public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-childhood",
      "kind": "range",
      "start": "0998-01-01",
      "end": "1000-03-31",
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
          "value": "1000-03-31",
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
          "displayTime": "Prologue · childhood before independence",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20straw.jpg",
          "alt": "L. Leslie Brooke illustration of a pig carrying straw",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20third%20pig%20builds%20a%20house%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the third pig building",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
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
        "source": "imported",
        "mapFeatures": [
          {
            "type": "Feature",
            "properties": {
              "name": "The pigs leave home route"
            },
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  8.1,
                  50.02
                ],
                [
                  8.125,
                  50.01
                ],
                [
                  8.15,
                  50.005
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Mother Pig's Cottage",
              "icon": "home"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.1,
                50.02
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Pigwood Fork",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.125,
                50.01
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Pigwood Market Road",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.15,
                50.005
              ]
            }
          }
        ]
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
          "displayTime": "Day 1 · departure",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20third%20pig%20builds%20a%20house%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the third pig building",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%201904%20straw%20house.jpg",
          "alt": "1904 illustration of the wolf at the straw house",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-acquire-straw",
      "kind": "event",
      "start": "1000-04-02T09:00Z",
      "end": null,
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
      "title": "First Pig acquires straw",
      "description": "The First Pig meets a material seller on Pigwood Market Road and chooses straw because it can be assembled quickly. The choice minimizes construction time but leaves him with the least resistant shelter.",
      "categoryId": "decision",
      "location": {
        "name": "Straw Seller's Field",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.14,
            50.012
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
          "displayTime": "Day 2 · straw chosen",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%201904%20straw%20house.jpg",
          "alt": "1904 illustration of the wolf at the straw house",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20Little%20pigs%2C%20Img005.jpg",
          "alt": "L. Leslie Brooke Three Little Pigs illustration",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-mirror",
      "kind": "event",
      "start": "1000-04-03T08:20Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T08:20Z",
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
        "name": "Queen's Mirror Chamber",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.326,
            48.542
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
          "displayTime": "Day 1 · mirror disclosure",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Snow%20White%20illustration%20from%20german%20children's%20book%201919%20(3917968514).jpg",
          "alt": "1919 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite21.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-acquire-sticks",
      "kind": "event",
      "start": "1000-04-03T11:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T11:30Z",
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
        "name": "Timber Track",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.19,
            50.003
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
          "displayTime": "Day 3 · sticks chosen",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20Little%20pigs%2C%20Img005.jpg",
          "alt": "L. Leslie Brooke Three Little Pigs illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20Img006.jpg",
          "alt": "L. Leslie Brooke illustration of the wolf at the brick house",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-acquire-bricks",
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
      "title": "Third Pig acquires bricks and mortar",
      "description": "The Third Pig chooses bricks and mortar even though the material is heavier and the build will take much longer. This explicit planning decision begins the causal chain that later makes the brick house the brothers' refuge.",
      "categoryId": "decision",
      "location": {
        "name": "Pigwood Mason's Yard",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.245,
            49.988
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
          "displayTime": "Day 4 · masonry chosen",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20Img006.jpg",
          "alt": "L. Leslie Brooke illustration of the wolf at the brick house",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20Img013.jpg",
          "alt": "L. Leslie Brooke illustration of the chimney attempt",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-brick-build",
      "kind": "range",
      "start": "1000-04-05T08:00Z",
      "end": "1000-04-17T18:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-05T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-17T18:00Z",
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
          "displayTime": "Days 5–17 · brick construction",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20Img013.jpg",
          "alt": "L. Leslie Brooke illustration of the chimney attempt",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20the%20wolf%20lands%20in%20the%20cooking%20pot%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the final chimney scene",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20straw.jpg",
          "alt": "L. Leslie Brooke illustration of a pig carrying straw",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        }
      ]
    },
    {
      "id": "snow-huntsman-order",
      "kind": "event",
      "start": "1000-04-05T09:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-05T09:00Z",
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
        "name": "Castle Great Hall",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.334,
            48.536
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
          "displayTime": "Day 3 · order issued",
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
      ],
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite21.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite23.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-straw-house",
      "kind": "event",
      "start": "1000-04-06T12:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-06T12:00Z",
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
      "description": "The First Pig chooses speed and builds a light house of straw shortly after acquiring his material. The rapid construction leaves him free sooner, but the shelter has little resistance when the wolf later arrives.",
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
          "displayTime": "Day 6 · straw house completed",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20the%20wolf%20lands%20in%20the%20cooking%20pot%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the final chimney scene",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20straw.jpg",
          "alt": "L. Leslie Brooke illustration of a pig carrying straw",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-huntsman-spares",
      "kind": "event",
      "start": "1000-04-07T10:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-07T10:00Z",
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
          "displayTime": "Day 5 · huntsman refuses",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite23.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite31.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-forest-flight",
      "kind": "event",
      "start": "1000-04-08T11:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-08T11:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": null
      },
      "title": "Snow White flees deeper into the forest",
      "description": "After the huntsman releases her, Snow White follows a ridge path away from the castle and becomes disoriented in the deeper forest. The movement event makes the spatial transition to the dwarfs' cottage explicit and shows why the cottage functions as an accidental refuge.",
      "categoryId": "movement",
      "location": {
        "name": "Forest Ridge Path",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.55,
            48.42
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported",
        "mapFeatures": [
          {
            "type": "Feature",
            "properties": {
              "name": "Snow White flees deeper into the forest route"
            },
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  10.48,
                  48.45
                ],
                [
                  10.55,
                  48.42
                ],
                [
                  10.61,
                  48.39
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Deep Forest",
              "icon": "home"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                10.48,
                48.45
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Forest Ridge Path",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                10.55,
                48.42
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Seven Dwarfs' Cottage",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                10.61,
                48.39
              ]
            }
          }
        ]
      },
      "presentation": {
        "variant": "hero-split"
      },
      "evidenceIds": [
        "src-snow"
      ],
      "tags": [
        {
          "label": "Flight",
          "icon": "relation",
          "hue": 282
        }
      ],
      "extensions": {
        "narrative": {
          "fictional": true,
          "storyId": "story-snow-white",
          "sequence": 6,
          "displayTime": "Day 6 · flight through forest",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite31.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite32.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-stick-house",
      "kind": "event",
      "start": "1000-04-09T17:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-09T17:00Z",
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
      "description": "The Second Pig builds a house from bundled sticks, spending more effort than his brother with straw but still finishing quickly. The resulting shelter is stronger than straw yet remains vulnerable to the same attack.",
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
          "displayTime": "Day 9 · stick house completed",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20straw.jpg",
          "alt": "L. Leslie Brooke illustration of a pig carrying straw",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20third%20pig%20builds%20a%20house%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the third pig building",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-finds-cottage",
      "kind": "event",
      "start": "1000-04-10T16:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-10T16:00Z",
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
      "description": "After fleeing through the forest, Snow White discovers the dwarfs' cottage and enters seeking food, rest, and safety. The location becomes her refuge and later the fixed point the Queen targets through repeated disguises.",
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
          "sequence": 7,
          "displayTime": "Day 8 · cottage discovered",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite32.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite35.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite36.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        }
      ]
    },
    {
      "id": "snow-dwarfs-shelter",
      "kind": "range",
      "start": "1000-04-10T19:00Z",
      "end": "1000-05-04T07:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-10T19:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-04T07:00Z",
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
          "sequence": 8,
          "displayTime": "Days 8–32 · shelter with dwarfs",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite35.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite36.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-invitation",
      "kind": "event",
      "start": "1000-04-11T09:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-11T09:00Z",
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
          "displayTime": "Day 1 · invitation arrives",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20Gustav%20Dor%C3%A9%20illustration%20for%20Charles%20Perrault%20-%20Il%20libro%20delle%20fate%2C%20Longanesi%2C%20Milano%2C%201891.jpg",
          "alt": "Gustave Doré public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-queen-discovers",
      "kind": "event",
      "start": "1000-04-14T08:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-14T08:00Z",
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
      "description": "The Queen consults the mirror again and learns that Snow White survived the huntsman's mission and is living at the dwarfs' cottage. This discovery restarts the threat and causes the Queen to plan direct disguised attacks.",
      "categoryId": "discovery",
      "location": {
        "name": "Queen's Mirror Chamber",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.326,
            48.542
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
          "sequence": 9,
          "displayTime": "Day 12 · Queen learns Snow White survived",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite36.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-denied",
      "kind": "event",
      "start": "1000-04-16T16:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-16T16:00Z",
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
          "displayTime": "Day 6 · attendance denied",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20Gustav%20Dor%C3%A9%20illustration%20for%20Charles%20Perrault%20-%20Il%20libro%20delle%20fate%2C%20Longanesi%2C%20Milano%2C%201891.jpg",
          "alt": "Gustave Doré public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20by%20Elenore%20Abbott.jpg",
          "alt": "Elenore Abbott public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-extra-chores",
      "kind": "event",
      "start": "1000-04-17T08:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-17T08:00Z",
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
          "displayTime": "Day 7 · exclusion enforced",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20by%20Elenore%20Abbott.jpg",
          "alt": "Elenore Abbott public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20and%20the%20Fairy%20Godmother.jpg",
          "alt": "William Henry Margetson public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-disguises",
      "kind": "range",
      "start": "1000-04-18T09:00Z",
      "end": "1000-05-04T11:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-18T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-04T11:00Z",
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
        "name": "Cottage Approach",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.592,
            48.398
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported",
        "mapFeatures": [
          {
            "type": "Feature",
            "properties": {
              "name": "The Queen makes disguised attempts route"
            },
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  10.32,
                  48.54
                ],
                [
                  10.58,
                  48.405
                ],
                [
                  10.61,
                  48.39
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Queen's Castle",
              "icon": "home"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                10.32,
                48.54
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Cottage Approach",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                10.58,
                48.405
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Seven Dwarfs' Cottage",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                10.61,
                48.39
              ]
            }
          }
        ]
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
          "sequence": 10,
          "displayTime": "Days 16–32 · disguised attacks",
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
      ],
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.png",
          "alt": "1852 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-laces",
      "kind": "event",
      "start": "1000-04-18T10:15Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-18T10:15Z",
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
          "sequence": 11,
          "displayTime": "Day 16 · laces attack",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.png",
          "alt": "1852 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Snow%20White%20illustration%20from%20german%20children's%20book%201919%20(3917968514).jpg",
          "alt": "1919 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-laces-recovery",
      "kind": "event",
      "start": "1000-04-18T18:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-18T18:00Z",
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
          "sequence": 12,
          "displayTime": "Day 16 · first recovery",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Snow%20White%20illustration%20from%20german%20children's%20book%201919%20(3917968514).jpg",
          "alt": "1919 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite21.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-wolf-straw",
      "kind": "event",
      "start": "1000-04-20T08:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-20T08:00Z",
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
      "description": "The wolf reaches the straw house, demands entry, and destroys the light shelter by blowing against it. The First Pig escapes toward the Second Pig's house, turning an individual threat into a moving pursuit.",
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
          "displayTime": "Day 20 · wolf reaches straw house",
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
      ],
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20third%20pig%20builds%20a%20house%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the third pig building",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%201904%20straw%20house.jpg",
          "alt": "1904 illustration of the wolf at the straw house",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-first-flees",
      "kind": "event",
      "start": "1000-04-20T08:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-20T08:30Z",
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
        "name": "Pigwood Escape Path",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.205,
            49.992
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported",
        "mapFeatures": [
          {
            "type": "Feature",
            "properties": {
              "name": "First Pig flees to the stick house route"
            },
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  8.16,
                  50
                ],
                [
                  8.19,
                  49.99
                ],
                [
                  8.22,
                  49.98
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Straw House Meadow",
              "icon": "home"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.16,
                50
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Pigwood Escape Path",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.19,
                49.99
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Stick House Grove",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.22,
                49.98
              ]
            }
          }
        ]
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
          "displayTime": "Day 20 · escape to second brother",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%201904%20straw%20house.jpg",
          "alt": "1904 illustration of the wolf at the straw house",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20Little%20pigs%2C%20Img005.jpg",
          "alt": "L. Leslie Brooke Three Little Pigs illustration",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-transformation",
      "kind": "event",
      "start": "1000-04-22T18:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-22T18:00Z",
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
          "displayTime": "Day 12 · fairy intervention",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20and%20the%20Fairy%20Godmother.jpg",
          "alt": "William Henry Margetson public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helen%20Stratton%20Cinderella.jpg",
          "alt": "Helen Stratton public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        }
      ]
    },
    {
      "id": "cinderella-coach-created",
      "kind": "event",
      "start": "1000-04-22T18:20Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-22T18:20Z",
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
          "displayTime": "Day 12 · coach and attendants created",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helen%20Stratton%20Cinderella.jpg",
          "alt": "Helen Stratton public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-wolf-sticks",
      "kind": "event",
      "start": "1000-04-23T09:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-23T09:00Z",
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
      "description": "The wolf follows the First Pig to the stick house and destroys that shelter as well. The First and Second Pigs escape together toward the Third Pig's brick house, concentrating the pursuit on the strongest remaining refuge.",
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
          "displayTime": "Day 23 · wolf reaches stick house",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20Little%20pigs%2C%20Img005.jpg",
          "alt": "L. Leslie Brooke Three Little Pigs illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20Img006.jpg",
          "alt": "L. Leslie Brooke illustration of the wolf at the brick house",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-two-flee",
      "kind": "event",
      "start": "1000-04-23T09:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-23T09:30Z",
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
        "name": "Brick House Approach",
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.275,
            49.972
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported",
        "mapFeatures": [
          {
            "type": "Feature",
            "properties": {
              "name": "First and Second Pig flee to the brick house route"
            },
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  8.22,
                  49.98
                ],
                [
                  8.26,
                  49.97
                ],
                [
                  8.3,
                  49.96
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Stick House Grove",
              "icon": "home"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.22,
                49.98
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Brick House Approach",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.26,
                49.97
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Brick House Hill",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                8.3,
                49.96
              ]
            }
          }
        ]
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
          "displayTime": "Day 23 · escape to brick house",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20Img006.jpg",
          "alt": "L. Leslie Brooke illustration of the wolf at the brick house",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20Img013.jpg",
          "alt": "L. Leslie Brooke illustration of the chimney attempt",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-comb",
      "kind": "event",
      "start": "1000-04-25T14:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-25T14:00Z",
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
          "sequence": 13,
          "displayTime": "Day 23 · comb attack",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite21.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite23.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-comb-recovery",
      "kind": "event",
      "start": "1000-04-25T20:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-25T20:00Z",
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
          "sequence": 14,
          "displayTime": "Day 23 · second recovery",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite23.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite31.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-first-ball",
      "kind": "range",
      "start": "1000-04-26T20:00Z",
      "end": "1000-04-26T23:40Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-26T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-26T23:40Z",
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
        "name": "Royal Ballroom",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.986,
            47.232
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
          "displayTime": "Days 16–16 · first ball",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20Gustav%20Dor%C3%A9%20illustration%20for%20Charles%20Perrault%20-%20Il%20libro%20delle%20fate%2C%20Longanesi%2C%20Milano%2C%201891.jpg",
          "alt": "Gustave Doré public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-prince-dance",
      "kind": "event",
      "start": "1000-04-26T21:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-26T21:00Z",
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
        "name": "Royal Ballroom",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.986,
            47.232
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
          "displayTime": "Day 16 · first dance",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20Gustav%20Dor%C3%A9%20illustration%20for%20Charles%20Perrault%20-%20Il%20libro%20delle%20fate%2C%20Longanesi%2C%20Milano%2C%201891.jpg",
          "alt": "Gustave Doré public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20by%20Elenore%20Abbott.jpg",
          "alt": "Elenore Abbott public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-first-return",
      "kind": "event",
      "start": "1000-04-26T23:45Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-26T23:45Z",
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
        "name": "Moonlit Carriage Road",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.925,
            47.248
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported",
        "mapFeatures": [
          {
            "type": "Feature",
            "properties": {
              "name": "Cinderella leaves the first ball before midnight route"
            },
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  12.98,
                  47.23
                ],
                [
                  12.9,
                  47.25
                ],
                [
                  12.74,
                  47.31
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Royal Ballroom",
              "icon": "home"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.98,
                47.23
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Moonlit Carriage Road",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.9,
                47.25
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Cinderella's House",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.74,
                47.31
              ]
            }
          }
        ]
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
          "displayTime": "Day 16 · returns before midnight",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20by%20Elenore%20Abbott.jpg",
          "alt": "Elenore Abbott public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20and%20the%20Fairy%20Godmother.jpg",
          "alt": "William Henry Margetson public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-brick-siege",
      "kind": "range",
      "start": "1000-04-27T11:00Z",
      "end": "1000-04-28T09:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-27T11:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-28T09:00Z",
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
          "displayTime": "Days 27–28 · sustained siege",
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
      ],
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20Img013.jpg",
          "alt": "L. Leslie Brooke illustration of the chimney attempt",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20the%20wolf%20lands%20in%20the%20cooking%20pot%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the final chimney scene",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-wolf-roof",
      "kind": "event",
      "start": "1000-04-29T16:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-29T16:00Z",
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
          "displayTime": "Day 29 · roof approach",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20the%20wolf%20lands%20in%20the%20cooking%20pot%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the final chimney scene",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20straw.jpg",
          "alt": "L. Leslie Brooke illustration of a pig carrying straw",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-chimney",
      "kind": "event",
      "start": "1000-04-29T16:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-29T16:30Z",
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
      "description": "Unable to breach the brick walls, the wolf descends toward the chimney as an alternate entry route. The attempted vertical approach is the final escalation after direct attacks on the house have failed.",
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
          "displayTime": "Day 29 · chimney attempt",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%2C%20straw.jpg",
          "alt": "L. Leslie Brooke illustration of a pig carrying straw",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20third%20pig%20builds%20a%20house%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the third pig building",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "pigs-safe",
      "kind": "event",
      "start": "1000-04-30T08:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-30T08:00Z",
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
          "displayTime": "Day 30 · threat ended",
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
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%20-%20third%20pig%20builds%20a%20house%20-%20Project%20Gutenberg%20eText%2015661.jpg",
          "alt": "L. Leslie Brooke illustration of the third pig building",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Three%20little%20pigs%201904%20straw%20house.jpg",
          "alt": "1904 illustration of the wolf at the straw house",
          "caption": "Additional public-domain The Three Little Pigs illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-apple-prepared",
      "kind": "event",
      "start": "1000-05-02T15:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-02T15:00Z",
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
        "name": "Queen's Workshop",
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.342,
            48.531
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
          "sequence": 15,
          "displayTime": "Day 30 · poisoned apple prepared",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite31.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite32.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-apple",
      "kind": "event",
      "start": "1000-05-04T11:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-04T11:30Z",
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
          "sequence": 16,
          "displayTime": "Day 32 · apple attack",
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
      ],
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite32.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite35.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-coffin",
      "kind": "range",
      "start": "1000-05-05T18:00Z",
      "end": "1000-05-14T09:30Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-05T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-14T09:30Z",
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
          "sequence": 17,
          "displayTime": "Days 33–42 · glass-coffin vigil",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite35.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite36.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-second-ball",
      "kind": "range",
      "start": "1000-05-06T20:00Z",
      "end": "1000-05-06T23:55Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-06T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-06T23:55Z",
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
        "name": "Royal Ballroom",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.986,
            47.232
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
          "displayTime": "Days 26–26 · second ball",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20and%20the%20Fairy%20Godmother.jpg",
          "alt": "William Henry Margetson public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helen%20Stratton%20Cinderella.jpg",
          "alt": "Helen Stratton public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-midnight-flight",
      "kind": "event",
      "start": "1000-05-06T23:57Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-06T23:57Z",
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
        "source": "imported",
        "mapFeatures": [
          {
            "type": "Feature",
            "properties": {
              "name": "Midnight warning triggers Cinderella's hurried flight route"
            },
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  12.98,
                  47.23
                ],
                [
                  12.965,
                  47.235
                ],
                [
                  12.9,
                  47.25
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Royal Ballroom",
              "icon": "home"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.98,
                47.23
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Royal Palace Steps",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.965,
                47.235
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Royal Carriage Road",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.9,
                47.25
              ]
            }
          }
        ]
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
          "displayTime": "Day 26 · hurried departure",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helen%20Stratton%20Cinderella.jpg",
          "alt": "Helen Stratton public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-slipper",
      "kind": "event",
      "start": "1000-05-07T00:02Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-07T00:02Z",
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
        "name": "Royal Carriage Road",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.902,
            47.254
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
          "displayTime": "Day 27 · slipper lost",
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
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20Gustav%20Dor%C3%A9%20illustration%20for%20Charles%20Perrault%20-%20Il%20libro%20delle%20fate%2C%20Longanesi%2C%20Milano%2C%201891.jpg",
          "alt": "Gustave Doré public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-search",
      "kind": "range",
      "start": "1000-05-09T08:00Z",
      "end": "1000-05-19T14:00Z",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-09T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-19T14:00Z",
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
        "name": "Ashenvale Village Search Route",
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "address": "Fictional place — map coordinates are staging anchors, not an Earth-location claim.",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.845,
            47.275
          ]
        },
        "crs": "OGC:CRS84",
        "source": "imported",
        "mapFeatures": [
          {
            "type": "Feature",
            "properties": {
              "name": "The prince searches for the slipper's owner route"
            },
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  12.98,
                  47.23
                ],
                [
                  12.86,
                  47.27
                ],
                [
                  12.74,
                  47.31
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Royal Palace",
              "icon": "home"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.98,
                47.23
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Ashenvale Village Search Route",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.86,
                47.27
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "Cinderella's House",
              "icon": "place"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                12.74,
                47.31
              ]
            }
          }
        ]
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
          "displayTime": "Days 29–39 · kingdom-wide search",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20Gustav%20Dor%C3%A9%20illustration%20for%20Charles%20Perrault%20-%20Il%20libro%20delle%20fate%2C%20Longanesi%2C%20Milano%2C%201891.jpg",
          "alt": "Gustave Doré public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20by%20Elenore%20Abbott.jpg",
          "alt": "Elenore Abbott public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-prince-arrives",
      "kind": "event",
      "start": "1000-05-14T09:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-14T09:00Z",
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
          "sequence": 18,
          "displayTime": "Day 42 · prince reaches clearing",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite36.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-revival",
      "kind": "event",
      "start": "1000-05-14T10:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-14T10:00Z",
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
          "sequence": 19,
          "displayTime": "Day 42 · revival",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.jpg",
          "alt": "1913 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.png",
          "alt": "1852 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-stepsisters-try",
      "kind": "event",
      "start": "1000-05-20T14:30Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T14:30Z",
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
          "displayTime": "Day 40 · stepsisters tested",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20by%20Elenore%20Abbott.jpg",
          "alt": "Elenore Abbott public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20and%20the%20Fairy%20Godmother.jpg",
          "alt": "William Henry Margetson public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-asks-to-try",
      "kind": "event",
      "start": "1000-05-20T15:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T15:00Z",
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
          "displayTime": "Day 40 · Cinderella requests a turn",
          "temporalReferenceFrame": "Storybook Cycle 1000",
          "spatialReferenceFrame": "Storybook Realm",
          "validationProfile": "narrative"
        }
      },
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20and%20the%20Fairy%20Godmother.jpg",
          "alt": "William Henry Margetson public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helen%20Stratton%20Cinderella.jpg",
          "alt": "Helen Stratton public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-fit",
      "kind": "event",
      "start": "1000-05-20T15:10Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T15:10Z",
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
          "displayTime": "Day 40 · identity confirmed",
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
      ],
      "media": [
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Helen%20Stratton%20Cinderella.jpg",
          "alt": "Helen Stratton public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "snow-resolution",
      "kind": "event",
      "start": "1000-05-22T12:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-22T12:00Z",
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
          "sequence": 20,
          "displayTime": "Day 50 · wedding resolution",
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
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/SnowWhite.png",
          "alt": "1852 public-domain Snow White illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Snow%20White%20illustration%20from%20german%20children's%20book%201919%20(3917968514).jpg",
          "alt": "1919 public-domain Snow White illustration",
          "caption": "Additional public-domain Snow White illustration for narrative context; illustrative only."
        }
      ]
    },
    {
      "id": "cinderella-resolution",
      "kind": "event",
      "start": "1000-06-02T14:00Z",
      "end": null,
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-06-02T14:00Z",
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
          "displayTime": "Day 53 · wedding resolution",
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
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Cinderella%20silhouette%20illustration.jpg",
          "alt": "Arthur Rackham public-domain Cinderella illustration",
          "caption": "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction."
        },
        {
          "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Cinderella%20Gustav%20Dor%C3%A9%20illustration%20for%20Charles%20Perrault%20-%20Il%20libro%20delle%20fate%2C%20Longanesi%2C%20Milano%2C%201891.jpg",
          "alt": "Gustave Doré public-domain Cinderella illustration",
          "caption": "Additional public-domain Cinderella illustration for narrative context; illustrative only."
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
        "snow-forest-flight",
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
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.3,
            49.96
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
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
      "id": "snow-mirror-object",
      "type": "object",
      "name": "Magic Mirror",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true
      }
    },
    {
      "id": "snow-apple-object",
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
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.61,
            48.39
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
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
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.98,
            47.23
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
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
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.69,
            48.34
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
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
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.965,
            47.235
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "snow-forest-ridge-place",
      "type": "place",
      "name": "Forest Ridge Path",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.55,
            48.42
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-snow-white-queen-s-castle",
      "type": "place",
      "name": "Queen's Castle",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.32,
            48.54
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-cinderella-cinderella-s-house",
      "type": "place",
      "name": "Cinderella's House",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.74,
            47.31
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-three-little-pigs-mother-pig-s-cottage",
      "type": "place",
      "name": "Mother Pig's Cottage",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.1,
            50.02
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-three-little-pigs-straw-seller-s-field",
      "type": "place",
      "name": "Straw Seller's Field",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.14,
            50.012
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-snow-white-queen-s-mirror-chamber",
      "type": "place",
      "name": "Queen's Mirror Chamber",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.326,
            48.542
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-three-little-pigs-timber-track",
      "type": "place",
      "name": "Timber Track",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.19,
            50.003
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-three-little-pigs-pigwood-mason-s-yard",
      "type": "place",
      "name": "Pigwood Mason's Yard",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.245,
            49.988
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-snow-white-castle-great-hall",
      "type": "place",
      "name": "Castle Great Hall",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.334,
            48.536
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-three-little-pigs-straw-house-meadow",
      "type": "place",
      "name": "Straw House Meadow",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.16,
            50
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-snow-white-deep-forest",
      "type": "place",
      "name": "Deep Forest",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.48,
            48.45
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-three-little-pigs-stick-house-grove",
      "type": "place",
      "name": "Stick House Grove",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.22,
            49.98
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-cinderella-garden-and-pumpkin-patch",
      "type": "place",
      "name": "Garden and Pumpkin Patch",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.82,
            47.28
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-cinderella-royal-ballroom",
      "type": "place",
      "name": "Royal Ballroom",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.986,
            47.232
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-cinderella-moonlit-carriage-road",
      "type": "place",
      "name": "Moonlit Carriage Road",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.925,
            47.248
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-snow-white-cottage-approach",
      "type": "place",
      "name": "Cottage Approach",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.592,
            48.398
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-three-little-pigs-pigwood-escape-path",
      "type": "place",
      "name": "Pigwood Escape Path",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.205,
            49.992
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-three-little-pigs-brick-house-approach",
      "type": "place",
      "name": "Brick House Approach",
      "identifiers": [],
      "attributes": {
        "storyId": "story-three-little-pigs",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Pigwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            8.275,
            49.972
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-cinderella-royal-carriage-road",
      "type": "place",
      "name": "Royal Carriage Road",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.902,
            47.254
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-cinderella-ashenvale-village-search-route",
      "type": "place",
      "name": "Ashenvale Village Search Route",
      "identifiers": [],
      "attributes": {
        "storyId": "story-cinderella",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Ashenvale · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            12.845,
            47.275
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
      }
    },
    {
      "id": "place-snow-white-queen-s-workshop",
      "type": "place",
      "name": "Queen's Workshop",
      "identifiers": [],
      "attributes": {
        "storyId": "story-snow-white",
        "fictional": true,
        "geographicIdentifier": "Storybook Cycle 1000 · Mirrorwood · fictional staging anchor",
        "geometry": {
          "type": "Point",
          "coordinates": [
            10.342,
            48.531
          ]
        },
        "crs": "OGC:CRS84",
        "mapMarker": true
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
          "value": "1000-04-05T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-17T18:00Z",
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
          "value": "1000-04-17T18:00Z",
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
      "objectId": "snow-mirror-object",
      "predicate": "consults",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T08:20Z",
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
          "value": "1000-04-05T09:00Z",
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
          "value": "1000-04-07T10:00Z",
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
          "value": "1000-04-10T19:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-04T07:00Z",
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
      "objectId": "snow-apple-object",
      "predicate": "prepares",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-02T15:00Z",
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
          "value": "1000-05-14T10:00Z",
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
          "value": "0997-06-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-05",
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
          "value": "0997-06-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-05",
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
          "value": "1000-04-22T18:00Z",
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
          "value": "1000-05-07T00:02Z",
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
          "value": "0997-06-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-05",
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
          "value": "1000-04-26T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-06T23:55Z",
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
          "value": "1000-04-03T11:30Z",
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
          "value": "1000-04-02T08:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-02T15:30Z",
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
          "value": "1000-04-20T08:30Z",
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
          "value": "1000-04-23T09:30Z",
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
          "value": "1000-04-18T10:15Z",
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
          "value": "1000-04-25T14:00Z",
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
          "value": "1000-04-18T18:00Z",
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
          "value": "1000-04-25T20:00Z",
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
          "value": "1000-05-05T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-14T09:30Z",
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
          "value": "1000-05-14T09:00Z",
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
          "value": "0997-06-01",
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
          "value": "1000-04-22T18:20Z",
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
          "value": "1000-04-22T18:00Z",
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
          "value": "1000-04-26T21:00Z",
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
          "value": "1000-05-09T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-19T14:00Z",
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
          "value": "1000-05-20T14:30Z",
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
    },
    {
      "id": "rel-snow-forest-flight",
      "subjectId": "snow-white",
      "objectId": "snow-forest-ridge-place",
      "predicate": "traverses",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-08T11:30Z",
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
        "from": "Deep Forest",
        "toward": "Seven Dwarfs' Cottage"
      }
    },
    {
      "id": "rel-event-snow-birth-place",
      "subjectId": "snow-birth",
      "objectId": "place-snow-white-queen-s-castle",
      "predicate": "occursAt",
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
      "attributes": {
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.32,
          48.54
        ]
      }
    },
    {
      "id": "rel-event-snow-birth-actor",
      "subjectId": "snow-white",
      "objectId": "snow-birth",
      "predicate": "participatesIn",
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
      "attributes": {
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-childhood-place",
      "subjectId": "snow-childhood",
      "objectId": "place-snow-white-queen-s-castle",
      "predicate": "occursAt",
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
          "value": "1000-04-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.32,
          48.54
        ]
      }
    },
    {
      "id": "rel-event-snow-childhood-actor",
      "subjectId": "snow-white",
      "objectId": "snow-childhood",
      "predicate": "participatesIn",
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
          "value": "1000-04-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-mother-place",
      "subjectId": "cinderella-mother",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
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
      "attributes": {
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-mother-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-mother",
      "predicate": "participatesIn",
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
      "attributes": {
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-stepfamily-arrives-place",
      "subjectId": "cinderella-stepfamily-arrives",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "0997-06-01",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-stepfamily-arrives-actor",
      "subjectId": "cinderella-father",
      "objectId": "cinderella-stepfamily-arrives",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "0997-06-01",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-hardship-place",
      "subjectId": "cinderella-hardship",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "0997-06-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-10",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-hardship-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-hardship",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "0997-06-02",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-10",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-childhood-place",
      "subjectId": "pigs-childhood",
      "objectId": "place-three-little-pigs-mother-pig-s-cottage",
      "predicate": "occursAt",
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
          "value": "1000-03-31",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.1,
          50.02
        ]
      }
    },
    {
      "id": "rel-event-pigs-childhood-actor",
      "subjectId": "pigs-brothers",
      "objectId": "pigs-childhood",
      "predicate": "participatesIn",
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
          "value": "1000-03-31",
          "precision": "day",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": null,
          "utcOffset": null,
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-leave-home-place",
      "subjectId": "pigs-leave-home",
      "objectId": "place-three-little-pigs-mother-pig-s-cottage",
      "predicate": "occursAt",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.1,
          50.02
        ]
      }
    },
    {
      "id": "rel-event-pigs-leave-home-actor",
      "subjectId": "pigs-brothers",
      "objectId": "pigs-leave-home",
      "predicate": "participatesIn",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-invitation-place",
      "subjectId": "cinderella-invitation",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-11T09:00Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-invitation-actor",
      "subjectId": "cinderella-herald",
      "objectId": "cinderella-invitation",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-11T09:00Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-acquire-straw-place",
      "subjectId": "pigs-acquire-straw",
      "objectId": "place-three-little-pigs-straw-seller-s-field",
      "predicate": "occursAt",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.14,
          50.012
        ]
      }
    },
    {
      "id": "rel-event-pigs-acquire-straw-actor",
      "subjectId": "pigs-first",
      "objectId": "pigs-acquire-straw",
      "predicate": "participatesIn",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-mirror-place",
      "subjectId": "snow-mirror",
      "objectId": "place-snow-white-queen-s-mirror-chamber",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T08:20Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.326,
          48.542
        ]
      }
    },
    {
      "id": "rel-event-snow-mirror-actor",
      "subjectId": "snow-queen",
      "objectId": "snow-mirror",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T08:20Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-acquire-sticks-place",
      "subjectId": "pigs-acquire-sticks",
      "objectId": "place-three-little-pigs-timber-track",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T11:30Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.19,
          50.003
        ]
      }
    },
    {
      "id": "rel-event-pigs-acquire-sticks-actor",
      "subjectId": "pigs-second",
      "objectId": "pigs-acquire-sticks",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T11:30Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-acquire-bricks-place",
      "subjectId": "pigs-acquire-bricks",
      "objectId": "place-three-little-pigs-pigwood-mason-s-yard",
      "predicate": "occursAt",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.245,
          49.988
        ]
      }
    },
    {
      "id": "rel-event-pigs-acquire-bricks-actor",
      "subjectId": "pigs-third",
      "objectId": "pigs-acquire-bricks",
      "predicate": "participatesIn",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-brick-build-place",
      "subjectId": "pigs-brick-build",
      "objectId": "pigs-brick-place",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-05T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-17T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.3,
          49.96
        ]
      }
    },
    {
      "id": "rel-event-pigs-brick-build-actor",
      "subjectId": "pigs-third",
      "objectId": "pigs-brick-build",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-05T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-17T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-huntsman-order-place",
      "subjectId": "snow-huntsman-order",
      "objectId": "place-snow-white-castle-great-hall",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-05T09:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.334,
          48.536
        ]
      }
    },
    {
      "id": "rel-event-snow-huntsman-order-actor",
      "subjectId": "snow-queen",
      "objectId": "snow-huntsman-order",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-05T09:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-straw-house-place",
      "subjectId": "pigs-straw-house",
      "objectId": "place-three-little-pigs-straw-house-meadow",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-06T12:00Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.16,
          50
        ]
      }
    },
    {
      "id": "rel-event-pigs-straw-house-actor",
      "subjectId": "pigs-first",
      "objectId": "pigs-straw-house",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-06T12:00Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-huntsman-spares-place",
      "subjectId": "snow-huntsman-spares",
      "objectId": "place-snow-white-deep-forest",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-07T10:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.48,
          48.45
        ]
      }
    },
    {
      "id": "rel-event-snow-huntsman-spares-actor",
      "subjectId": "snow-huntsman",
      "objectId": "snow-huntsman-spares",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-07T10:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-forest-flight-place",
      "subjectId": "snow-forest-flight",
      "objectId": "snow-forest-ridge-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-08T11:30Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.55,
          48.42
        ]
      }
    },
    {
      "id": "rel-event-snow-forest-flight-actor",
      "subjectId": "snow-white",
      "objectId": "snow-forest-flight",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-08T11:30Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-stick-house-place",
      "subjectId": "pigs-stick-house",
      "objectId": "place-three-little-pigs-stick-house-grove",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-09T17:00Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.22,
          49.98
        ]
      }
    },
    {
      "id": "rel-event-pigs-stick-house-actor",
      "subjectId": "pigs-second",
      "objectId": "pigs-stick-house",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-09T17:00Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-finds-cottage-place",
      "subjectId": "snow-finds-cottage",
      "objectId": "snow-cottage-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-10T16:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.61,
          48.39
        ]
      }
    },
    {
      "id": "rel-event-snow-finds-cottage-actor",
      "subjectId": "snow-white",
      "objectId": "snow-finds-cottage",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-10T16:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-denied-place",
      "subjectId": "cinderella-denied",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-16T16:00Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-denied-actor",
      "subjectId": "cinderella-stepmother",
      "objectId": "cinderella-denied",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-16T16:00Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-extra-chores-place",
      "subjectId": "cinderella-extra-chores",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-17T08:00Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-extra-chores-actor",
      "subjectId": "cinderella-stepmother",
      "objectId": "cinderella-extra-chores",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-17T08:00Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-dwarfs-shelter-place",
      "subjectId": "snow-dwarfs-shelter",
      "objectId": "snow-cottage-place",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-10T19:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-04T07:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.61,
          48.39
        ]
      }
    },
    {
      "id": "rel-event-snow-dwarfs-shelter-actor",
      "subjectId": "snow-dwarfs",
      "objectId": "snow-dwarfs-shelter",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-10T19:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-04T07:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-transformation-place",
      "subjectId": "cinderella-transformation",
      "objectId": "place-cinderella-garden-and-pumpkin-patch",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-22T18:00Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.82,
          47.28
        ]
      }
    },
    {
      "id": "rel-event-cinderella-transformation-actor",
      "subjectId": "cinderella-fairy",
      "objectId": "cinderella-transformation",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-22T18:00Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-coach-created-place",
      "subjectId": "cinderella-coach-created",
      "objectId": "place-cinderella-garden-and-pumpkin-patch",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-22T18:20Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.82,
          47.28
        ]
      }
    },
    {
      "id": "rel-event-cinderella-coach-created-actor",
      "subjectId": "cinderella-fairy",
      "objectId": "cinderella-coach-created",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-22T18:20Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-first-ball-place",
      "subjectId": "cinderella-first-ball",
      "objectId": "place-cinderella-royal-ballroom",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-26T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-26T23:40Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.986,
          47.232
        ]
      }
    },
    {
      "id": "rel-event-cinderella-first-ball-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-first-ball",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-26T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-26T23:40Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-prince-dance-place",
      "subjectId": "cinderella-prince-dance",
      "objectId": "place-cinderella-royal-ballroom",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-26T21:00Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.986,
          47.232
        ]
      }
    },
    {
      "id": "rel-event-cinderella-prince-dance-actor",
      "subjectId": "cinderella-prince",
      "objectId": "cinderella-prince-dance",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-26T21:00Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-first-return-place",
      "subjectId": "cinderella-first-return",
      "objectId": "place-cinderella-moonlit-carriage-road",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-26T23:45Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.925,
          47.248
        ]
      }
    },
    {
      "id": "rel-event-cinderella-first-return-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-first-return",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-26T23:45Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-queen-discovers-place",
      "subjectId": "snow-queen-discovers",
      "objectId": "place-snow-white-queen-s-mirror-chamber",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-14T08:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.326,
          48.542
        ]
      }
    },
    {
      "id": "rel-event-snow-queen-discovers-actor",
      "subjectId": "snow-queen",
      "objectId": "snow-queen-discovers",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-14T08:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-wolf-straw-place",
      "subjectId": "pigs-wolf-straw",
      "objectId": "place-three-little-pigs-straw-house-meadow",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-20T08:00Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.16,
          50
        ]
      }
    },
    {
      "id": "rel-event-pigs-wolf-straw-actor",
      "subjectId": "pigs-wolf",
      "objectId": "pigs-wolf-straw",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-20T08:00Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-disguises-place",
      "subjectId": "snow-disguises",
      "objectId": "place-snow-white-cottage-approach",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-18T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-04T11:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.592,
          48.398
        ]
      }
    },
    {
      "id": "rel-event-snow-disguises-actor",
      "subjectId": "snow-queen",
      "objectId": "snow-disguises",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-18T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-04T11:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-first-flees-place",
      "subjectId": "pigs-first-flees",
      "objectId": "place-three-little-pigs-pigwood-escape-path",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-20T08:30Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.205,
          49.992
        ]
      }
    },
    {
      "id": "rel-event-pigs-first-flees-actor",
      "subjectId": "pigs-first",
      "objectId": "pigs-first-flees",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-20T08:30Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-laces-place",
      "subjectId": "snow-laces",
      "objectId": "snow-cottage-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-18T10:15Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.61,
          48.39
        ]
      }
    },
    {
      "id": "rel-event-snow-laces-actor",
      "subjectId": "snow-queen",
      "objectId": "snow-laces",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-18T10:15Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-wolf-sticks-place",
      "subjectId": "pigs-wolf-sticks",
      "objectId": "place-three-little-pigs-stick-house-grove",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-23T09:00Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.22,
          49.98
        ]
      }
    },
    {
      "id": "rel-event-pigs-wolf-sticks-actor",
      "subjectId": "pigs-wolf",
      "objectId": "pigs-wolf-sticks",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-23T09:00Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-two-flee-place",
      "subjectId": "pigs-two-flee",
      "objectId": "place-three-little-pigs-brick-house-approach",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-23T09:30Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.275,
          49.972
        ]
      }
    },
    {
      "id": "rel-event-pigs-two-flee-actor",
      "subjectId": "pigs-brothers",
      "objectId": "pigs-two-flee",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-23T09:30Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-brick-siege-place",
      "subjectId": "pigs-brick-siege",
      "objectId": "pigs-brick-place",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-27T11:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-28T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.3,
          49.96
        ]
      }
    },
    {
      "id": "rel-event-pigs-brick-siege-actor",
      "subjectId": "pigs-wolf",
      "objectId": "pigs-brick-siege",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-04-27T11:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-04-28T09:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-laces-recovery-place",
      "subjectId": "snow-laces-recovery",
      "objectId": "snow-cottage-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-18T18:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.61,
          48.39
        ]
      }
    },
    {
      "id": "rel-event-snow-laces-recovery-actor",
      "subjectId": "snow-dwarfs",
      "objectId": "snow-laces-recovery",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-18T18:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-wolf-roof-place",
      "subjectId": "pigs-wolf-roof",
      "objectId": "pigs-brick-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-29T16:00Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.3,
          49.96
        ]
      }
    },
    {
      "id": "rel-event-pigs-wolf-roof-actor",
      "subjectId": "pigs-wolf",
      "objectId": "pigs-wolf-roof",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-29T16:00Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-chimney-place",
      "subjectId": "pigs-chimney",
      "objectId": "pigs-brick-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-29T16:30Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.3,
          49.96
        ]
      }
    },
    {
      "id": "rel-event-pigs-chimney-actor",
      "subjectId": "pigs-wolf",
      "objectId": "pigs-chimney",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-29T16:30Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-safe-place",
      "subjectId": "pigs-safe",
      "objectId": "pigs-brick-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-30T08:00Z",
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
        "storyId": "story-three-little-pigs",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          8.3,
          49.96
        ]
      }
    },
    {
      "id": "rel-event-pigs-safe-actor",
      "subjectId": "pigs-brothers",
      "objectId": "pigs-safe",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-30T08:00Z",
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
        "storyId": "story-three-little-pigs",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-comb-place",
      "subjectId": "snow-comb",
      "objectId": "snow-cottage-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-25T14:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.61,
          48.39
        ]
      }
    },
    {
      "id": "rel-event-snow-comb-actor",
      "subjectId": "snow-queen",
      "objectId": "snow-comb",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-25T14:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-comb-recovery-place",
      "subjectId": "snow-comb-recovery",
      "objectId": "snow-cottage-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-25T20:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.61,
          48.39
        ]
      }
    },
    {
      "id": "rel-event-snow-comb-recovery-actor",
      "subjectId": "snow-dwarfs",
      "objectId": "snow-comb-recovery",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-25T20:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-second-ball-place",
      "subjectId": "cinderella-second-ball",
      "objectId": "place-cinderella-royal-ballroom",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-06T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-06T23:55Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.986,
          47.232
        ]
      }
    },
    {
      "id": "rel-event-cinderella-second-ball-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-second-ball",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-06T20:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-06T23:55Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-midnight-flight-place",
      "subjectId": "cinderella-midnight-flight",
      "objectId": "cinderella-palace-steps-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-06T23:57Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.965,
          47.235
        ]
      }
    },
    {
      "id": "rel-event-cinderella-midnight-flight-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-midnight-flight",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-06T23:57Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-slipper-place",
      "subjectId": "cinderella-slipper",
      "objectId": "place-cinderella-royal-carriage-road",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-07T00:02Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.902,
          47.254
        ]
      }
    },
    {
      "id": "rel-event-cinderella-slipper-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-slipper",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-07T00:02Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-search-place",
      "subjectId": "cinderella-search",
      "objectId": "place-cinderella-ashenvale-village-search-route",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-09T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-19T14:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.845,
          47.275
        ]
      }
    },
    {
      "id": "rel-event-cinderella-search-actor",
      "subjectId": "cinderella-herald",
      "objectId": "cinderella-search",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-09T08:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-19T14:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-apple-prepared-place",
      "subjectId": "snow-apple-prepared",
      "objectId": "place-snow-white-queen-s-workshop",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-02T15:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.342,
          48.531
        ]
      }
    },
    {
      "id": "rel-event-snow-apple-prepared-actor",
      "subjectId": "snow-queen",
      "objectId": "snow-apple-prepared",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-02T15:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-apple-place",
      "subjectId": "snow-apple",
      "objectId": "snow-cottage-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-04T11:30Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.61,
          48.39
        ]
      }
    },
    {
      "id": "rel-event-snow-apple-actor",
      "subjectId": "snow-white",
      "objectId": "snow-apple",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-04T11:30Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-coffin-place",
      "subjectId": "snow-coffin",
      "objectId": "snow-clearing-place",
      "predicate": "occursAt",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-05T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-14T09:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.69,
          48.34
        ]
      }
    },
    {
      "id": "rel-event-snow-coffin-actor",
      "subjectId": "snow-dwarfs",
      "objectId": "snow-coffin",
      "predicate": "participatesIn",
      "time": {
        "type": "interval",
        "start": {
          "value": "1000-05-05T18:00Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        },
        "end": {
          "value": "1000-05-14T09:30Z",
          "precision": "minute",
          "certainty": "inferred",
          "calendar": "gregorian",
          "timeZone": "UTC",
          "utcOffset": "+00:00",
          "sourceText": "Fictional narrative ordering coordinate; not a real-world date."
        }
      },
      "attributes": {
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-prince-arrives-place",
      "subjectId": "snow-prince-arrives",
      "objectId": "snow-clearing-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-14T09:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.69,
          48.34
        ]
      }
    },
    {
      "id": "rel-event-snow-prince-arrives-actor",
      "subjectId": "snow-prince",
      "objectId": "snow-prince-arrives",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-14T09:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-revival-place",
      "subjectId": "snow-revival",
      "objectId": "snow-clearing-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-14T10:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.69,
          48.34
        ]
      }
    },
    {
      "id": "rel-event-snow-revival-actor",
      "subjectId": "snow-white",
      "objectId": "snow-revival",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-14T10:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-stepsisters-try-place",
      "subjectId": "cinderella-stepsisters-try",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T14:30Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-stepsisters-try-actor",
      "subjectId": "cinderella-stepsisters",
      "objectId": "cinderella-stepsisters-try",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T14:30Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-asks-to-try-place",
      "subjectId": "cinderella-asks-to-try",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T15:00Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-asks-to-try-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-asks-to-try",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T15:00Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-fit-place",
      "subjectId": "cinderella-fit",
      "objectId": "place-cinderella-cinderella-s-house",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T15:10Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.74,
          47.31
        ]
      }
    },
    {
      "id": "rel-event-cinderella-fit-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-fit",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T15:10Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-snow-resolution-place",
      "subjectId": "snow-resolution",
      "objectId": "place-snow-white-queen-s-castle",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-22T12:00Z",
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
        "storyId": "story-snow-white",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          10.32,
          48.54
        ]
      }
    },
    {
      "id": "rel-event-snow-resolution-actor",
      "subjectId": "snow-white",
      "objectId": "snow-resolution",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-22T12:00Z",
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
        "storyId": "story-snow-white",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-cinderella-resolution-place",
      "subjectId": "cinderella-resolution",
      "objectId": "cinderella-palace-place",
      "predicate": "occursAt",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-06-02T14:00Z",
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
        "storyId": "story-cinderella",
        "mapMarker": true,
        "referenceFrame": "Storybook Realm",
        "coordinates": [
          12.98,
          47.23
        ]
      }
    },
    {
      "id": "rel-event-cinderella-resolution-actor",
      "subjectId": "cinderella",
      "objectId": "cinderella-resolution",
      "predicate": "participatesIn",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-06-02T14:00Z",
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
        "storyId": "story-cinderella",
        "role": "primary"
      }
    },
    {
      "id": "rel-event-pigs-childhood-story",
      "subjectId": "pigs-childhood",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-leave-home-story",
      "subjectId": "pigs-leave-home",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-acquire-straw-story",
      "subjectId": "pigs-acquire-straw",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-acquire-sticks-story",
      "subjectId": "pigs-acquire-sticks",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-acquire-bricks-story",
      "subjectId": "pigs-acquire-bricks",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-brick-build-story",
      "subjectId": "pigs-brick-build",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-straw-house-story",
      "subjectId": "pigs-straw-house",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-stick-house-story",
      "subjectId": "pigs-stick-house",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-wolf-straw-story",
      "subjectId": "pigs-wolf-straw",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-first-flees-story",
      "subjectId": "pigs-first-flees",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-wolf-sticks-story",
      "subjectId": "pigs-wolf-sticks",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-two-flee-story",
      "subjectId": "pigs-two-flee",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-brick-siege-story",
      "subjectId": "pigs-brick-siege",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-wolf-roof-story",
      "subjectId": "pigs-wolf-roof",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-chimney-story",
      "subjectId": "pigs-chimney",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-safe-story",
      "subjectId": "pigs-safe",
      "objectId": "story-three-little-pigs",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-snow-birth-story",
      "subjectId": "snow-birth",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-childhood-story",
      "subjectId": "snow-childhood",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-mirror-story",
      "subjectId": "snow-mirror",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-huntsman-order-story",
      "subjectId": "snow-huntsman-order",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-huntsman-spares-story",
      "subjectId": "snow-huntsman-spares",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-forest-flight-story",
      "subjectId": "snow-forest-flight",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-finds-cottage-story",
      "subjectId": "snow-finds-cottage",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-dwarfs-shelter-story",
      "subjectId": "snow-dwarfs-shelter",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-queen-discovers-story",
      "subjectId": "snow-queen-discovers",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-disguises-story",
      "subjectId": "snow-disguises",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-laces-story",
      "subjectId": "snow-laces",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-laces-recovery-story",
      "subjectId": "snow-laces-recovery",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-comb-story",
      "subjectId": "snow-comb",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-comb-recovery-story",
      "subjectId": "snow-comb-recovery",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-apple-prepared-story",
      "subjectId": "snow-apple-prepared",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-apple-story",
      "subjectId": "snow-apple",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-coffin-story",
      "subjectId": "snow-coffin",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-prince-arrives-story",
      "subjectId": "snow-prince-arrives",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-revival-story",
      "subjectId": "snow-revival",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-resolution-story",
      "subjectId": "snow-resolution",
      "objectId": "story-snow-white",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-cinderella-mother-story",
      "subjectId": "cinderella-mother",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-stepfamily-arrives-story",
      "subjectId": "cinderella-stepfamily-arrives",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-hardship-story",
      "subjectId": "cinderella-hardship",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-invitation-story",
      "subjectId": "cinderella-invitation",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-denied-story",
      "subjectId": "cinderella-denied",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-extra-chores-story",
      "subjectId": "cinderella-extra-chores",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-transformation-story",
      "subjectId": "cinderella-transformation",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-coach-created-story",
      "subjectId": "cinderella-coach-created",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-first-ball-story",
      "subjectId": "cinderella-first-ball",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-prince-dance-story",
      "subjectId": "cinderella-prince-dance",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-first-return-story",
      "subjectId": "cinderella-first-return",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-second-ball-story",
      "subjectId": "cinderella-second-ball",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-midnight-flight-story",
      "subjectId": "cinderella-midnight-flight",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-slipper-story",
      "subjectId": "cinderella-slipper",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-search-story",
      "subjectId": "cinderella-search",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-stepsisters-try-story",
      "subjectId": "cinderella-stepsisters-try",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-asks-to-try-story",
      "subjectId": "cinderella-asks-to-try",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-fit-story",
      "subjectId": "cinderella-fit",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-resolution-story",
      "subjectId": "cinderella-resolution",
      "objectId": "story-cinderella",
      "predicate": "partOfStory",
      "attributes": {
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-pigs-acquire-straw-involvesObject",
      "subjectId": "pigs-acquire-straw",
      "objectId": "pigs-straw-bundle",
      "predicate": "involvesObject",
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
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-acquire-sticks-involvesObject",
      "subjectId": "pigs-acquire-sticks",
      "objectId": "pigs-stick-bundle",
      "predicate": "involvesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T11:30Z",
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
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-acquire-bricks-involvesObject",
      "subjectId": "pigs-acquire-bricks",
      "objectId": "pigs-brick-load",
      "predicate": "involvesObject",
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
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-brick-build-createsObject",
      "subjectId": "pigs-brick-build",
      "objectId": "pigs-brick-house",
      "predicate": "createsObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-05T08:00Z",
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
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-wolf-straw-targetsCharacter",
      "subjectId": "pigs-wolf-straw",
      "objectId": "pigs-first",
      "predicate": "targetsCharacter",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-20T08:00Z",
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
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-wolf-sticks-targetsCharacter",
      "subjectId": "pigs-wolf-sticks",
      "objectId": "pigs-second",
      "predicate": "targetsCharacter",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-23T09:00Z",
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
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-brick-siege-targetsObject",
      "subjectId": "pigs-brick-siege",
      "objectId": "pigs-brick-house",
      "predicate": "targetsObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-27T11:00Z",
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
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-pigs-chimney-attemptsEntryVia",
      "subjectId": "pigs-chimney",
      "objectId": "pigs-brick-house",
      "predicate": "attemptsEntryVia",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-29T16:30Z",
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
        "storyId": "story-three-little-pigs"
      }
    },
    {
      "id": "rel-event-snow-mirror-involvesObject",
      "subjectId": "snow-mirror",
      "objectId": "snow-mirror",
      "predicate": "involvesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-03T08:20Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-huntsman-order-directsCharacter",
      "subjectId": "snow-huntsman-order",
      "objectId": "snow-huntsman",
      "predicate": "directsCharacter",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-05T09:00Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-huntsman-spares-protectsCharacter",
      "subjectId": "snow-huntsman-spares",
      "objectId": "snow-white",
      "predicate": "protectsCharacter",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-07T10:00Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-laces-involvesObject",
      "subjectId": "snow-laces",
      "objectId": "snow-laces-object",
      "predicate": "involvesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-18T10:15Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-laces-recovery-removesObject",
      "subjectId": "snow-laces-recovery",
      "objectId": "snow-laces-object",
      "predicate": "removesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-18T18:00Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-comb-involvesObject",
      "subjectId": "snow-comb",
      "objectId": "snow-comb-object",
      "predicate": "involvesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-25T14:00Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-comb-recovery-removesObject",
      "subjectId": "snow-comb-recovery",
      "objectId": "snow-comb-object",
      "predicate": "removesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-25T20:00Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-apple-prepared-createsObject",
      "subjectId": "snow-apple-prepared",
      "objectId": "snow-apple",
      "predicate": "createsObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-02T15:00Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-apple-involvesObject",
      "subjectId": "snow-apple",
      "objectId": "snow-apple",
      "predicate": "involvesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-04T11:30Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-coffin-involvesObject",
      "subjectId": "snow-coffin",
      "objectId": "snow-coffin-object",
      "predicate": "involvesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-05T18:00Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-snow-prince-arrives-encountersObject",
      "subjectId": "snow-prince-arrives",
      "objectId": "snow-coffin-object",
      "predicate": "encountersObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-14T09:00Z",
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
        "storyId": "story-snow-white"
      }
    },
    {
      "id": "rel-event-cinderella-stepfamily-arrives-introducesCharacter",
      "subjectId": "cinderella-stepfamily-arrives",
      "objectId": "cinderella-stepmother",
      "predicate": "introducesCharacter",
      "time": {
        "type": "instant",
        "start": {
          "value": "0997-06-01",
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
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-transformation-involvesObject",
      "subjectId": "cinderella-transformation",
      "objectId": "cinderella-gown",
      "predicate": "involvesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-22T18:00Z",
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
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-coach-created-createsObject",
      "subjectId": "cinderella-coach-created",
      "objectId": "cinderella-coach",
      "predicate": "createsObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-22T18:20Z",
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
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-prince-dance-connectsCharacter",
      "subjectId": "cinderella-prince-dance",
      "objectId": "cinderella",
      "predicate": "connectsCharacter",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-04-26T21:00Z",
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
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-midnight-flight-risksObject",
      "subjectId": "cinderella-midnight-flight",
      "objectId": "cinderella-slipper-object",
      "predicate": "risksObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-06T23:57Z",
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
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-slipper-involvesObject",
      "subjectId": "cinderella-slipper",
      "objectId": "cinderella-slipper-object",
      "predicate": "involvesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-07T00:02Z",
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
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-search-usesClue",
      "subjectId": "cinderella-search",
      "objectId": "cinderella-slipper-object",
      "predicate": "usesClue",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-09T08:00Z",
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
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-stepsisters-try-testsObject",
      "subjectId": "cinderella-stepsisters-try",
      "objectId": "cinderella-slipper-object",
      "predicate": "testsObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T14:30Z",
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
        "storyId": "story-cinderella"
      }
    },
    {
      "id": "rel-event-cinderella-fit-matchesObject",
      "subjectId": "cinderella-fit",
      "objectId": "cinderella-slipper-object",
      "predicate": "matchesObject",
      "time": {
        "type": "instant",
        "start": {
          "value": "1000-05-20T15:10Z",
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
        "storyId": "story-cinderella"
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
