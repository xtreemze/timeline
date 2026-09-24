const SOURCE_TEXT = "Fictional narrative ordering coordinate; not a real-world date.";
const MEDIA_CAPTION =
  "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction.";

const EXTRA_CATEGORIES = [
  { id: "deception", name: "Deception / Manipulation", color: "#9333ea" },
  { id: "exchange", name: "Exchange / Bargain", color: "#a16207" },
];

const STORY_SPECS = [
  {
    id: "story-little-red-riding-hood",
    title: "Little Red Riding Hood",
    description:
      "A journey from home to a grandmother's cottage becomes a chain of misdirection, pursuit, discovery, danger, rescue, and reflection across a distinct forest route.",
    cycle: "Storybook Cycle 1012",
    spatialFrame: "Northwood Realm",
    evidence: {
      id: "src-red-riding-hood",
      type: "article",
      title: "Little Red Riding Hood — narrative source card",
      sourceName: "Storybook fixture",
      note: "A fictional narrative source used to demonstrate story authoring and spatially distributed event context.",
      publishedAt: "1012-03-01",
    },
    media: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/WalterCrane%2CLittleRedRidingHood-1.png",
      "https://commons.wikimedia.org/wiki/Special:FilePath/WalterCrane%2CLittle%20Red%20Riding%20Hood-3.png",
      "https://commons.wikimedia.org/wiki/Special:FilePath/WalterCrane%2CLittle%20Red%20Riding%20Hood-7.png",
    ],
    entities: [
      ["red-riding-hood", "person", "Little Red Riding Hood"],
      ["red-wolf", "person", "Wolf"],
      ["red-grandmother", "person", "Grandmother"],
      ["red-woodcutter", "person", "Woodcutter"],
      ["red-mother", "person", "Red's Mother"],
    ],
    places: [
      ["red-home-place", "Red's Home", -22.0, 52.0, "home", "square"],
      ["red-forest-path-place", "Northwood Forest Path", -21.65, 52.2, "place", "pin"],
      ["red-flower-meadow-place", "Northwood Flower Meadow", -21.25, 52.45, "place", "diamond"],
      ["red-grandmother-cottage-place", "Grandmother's Cottage", -20.85, 52.65, "home", "square"],
      ["red-cottage-bedroom-place", "Cottage Bedroom", -20.8, 52.68, "danger", "diamond"],
      ["red-woodcutter-clearing-place", "Woodcutter's Clearing", -21.0, 52.55, "place", "pin"],
    ],
    scenes: [
      ["red-departure", "1012-03-01T08:00Z", "Red's Mother instructs Little Red Riding Hood", "Red's Mother asks Little Red Riding Hood to carry food to the cottage and to stay on the known route, establishing both the purpose of the journey and the rule that will soon be tested.", "relationship", "home", "hero-split", "red-home-place", "red-mother", "red-riding-hood", "instructs"],
      ["red-wolf-meeting", "1012-03-03T09:30Z", "Little Red Riding Hood meets Wolf", "Little Red Riding Hood encounters Wolf along the forest path and answers his questions, giving the journey a new participant whose intentions are not yet apparent to her.", "discovery", "relation", "editorial-mosaic", "red-forest-path-place", "red-riding-hood", "red-wolf", "meets"],
      ["red-wolf-misdirects", "1012-03-05T10:00Z", "Wolf deceives Little Red Riding Hood", "Wolf persuades Little Red Riding Hood to linger among the flowers, deliberately changing her pace while he gains time to reach the cottage by a more direct route.", "deception", "danger", "evidence-dossier", "red-flower-meadow-place", "red-wolf", "red-riding-hood", "deceives"],
      ["red-grandmother-attacked", "1012-03-07T11:00Z", "Wolf attacks Grandmother", "Wolf reaches the cottage before the traveler and attacks Grandmother, turning the quiet destination into the central danger around which the remaining scenes are organized.", "conflict", "danger", "hero-split", "red-grandmother-cottage-place", "red-wolf", "red-grandmother", "attacks"],
      ["red-cottage-arrival", "1012-03-09T12:00Z", "Little Red Riding Hood visits Grandmother", "Little Red Riding Hood arrives at the cottage and approaches Grandmother's bedside, unaware that the familiar destination no longer matches the situation she expected to find.", "movement", "home", "editorial-mosaic", "red-grandmother-cottage-place", "red-riding-hood", "red-grandmother", "visits"],
      ["red-questioning", "1012-03-11T12:30Z", "Little Red Riding Hood questions Wolf", "Little Red Riding Hood notices increasingly strange details and questions Wolf directly, converting vague unease into explicit discovery immediately before the confrontation.", "discovery", "search", "evidence-dossier", "red-cottage-bedroom-place", "red-riding-hood", "red-wolf", "questions"],
      ["red-attack", "1012-03-13T13:00Z", "Wolf attacks Little Red Riding Hood", "Wolf abandons the deception and attacks Little Red Riding Hood inside the cottage, escalating the story from manipulation to immediate physical danger.", "conflict", "danger", "hero-split", "red-cottage-bedroom-place", "red-wolf", "red-riding-hood", "attacks"],
      ["red-woodcutter-confronts", "1012-03-15T14:00Z", "Woodcutter confronts Wolf", "Woodcutter hears the disturbance, enters from the nearby clearing, and confronts Wolf, creating the intervention that interrupts the attack and changes the balance of the scene.", "decision", "person", "editorial-mosaic", "red-woodcutter-clearing-place", "red-woodcutter", "red-wolf", "confronts"],
      ["red-grandmother-rescued", "1012-03-17T15:00Z", "Woodcutter frees Grandmother", "Woodcutter frees Grandmother after the confrontation, restoring the household and making the rescue explicit rather than compressing it into a generic ending.", "state-change", "magic", "evidence-dossier", "red-grandmother-cottage-place", "red-woodcutter", "red-grandmother", "frees"],
      ["red-resolution", "1012-03-19T16:00Z", "Little Red Riding Hood thanks Woodcutter", "Little Red Riding Hood thanks Woodcutter once the danger has passed, closing the route with a social resolution and a clear consequence for her earlier decision to leave the path.", "resolution", "relation", "hero-split", "red-home-place", "red-riding-hood", "red-woodcutter", "thanks"],
    ],
  },
  {
    id: "story-hansel-and-gretel",
    title: "Hansel and Gretel",
    description:
      "Two siblings move from household pressure into a separate deep-forest geography, lose and recover their route, confront a witch, and return home after escaping captivity.",
    cycle: "Storybook Cycle 1027",
    spatialFrame: "Deepwood Realm",
    evidence: {
      id: "src-hansel-gretel",
      type: "document",
      title: "Hansel and Gretel — narrative source card",
      sourceName: "Storybook fixture",
      note: "A fictional narrative source used to demonstrate sibling traversal, repeated journeys, captivity, and escape.",
      publishedAt: "1027-09-02",
    },
    media: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Hansel-and-gretel-rackham.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Hansel%20and%20Grethal-Rackham-008.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Hansel%20and%20Grethal-Rackham-030.jpg",
    ],
    entities: [
      ["hg-hansel", "person", "Hansel"],
      ["hg-gretel", "person", "Gretel"],
      ["hg-father", "person", "Father"],
      ["hg-stepmother", "person", "Stepmother"],
      ["hg-witch", "person", "Witch"],
    ],
    places: [
      ["hg-home-place", "Deepwood Family Cottage", 27.0, 44.0, "home", "square"],
      ["hg-stone-trail-place", "White Stone Trail", 27.35, 44.2, "place", "pin"],
      ["hg-forest-crossing-place", "Deepwood Crossing", 27.7, 44.45, "place", "diamond"],
      ["hg-lost-forest-place", "Deepwood Interior", 28.1, 44.7, "danger", "pin"],
      ["hg-sugar-house-place", "Sugar House Clearing", 28.45, 44.85, "home", "square"],
      ["hg-witch-kitchen-place", "Witch's Kitchen", 28.5, 44.88, "danger", "diamond"],
    ],
    scenes: [
      ["hg-household-pressure", "1027-09-02T07:30Z", "Stepmother pressures Father", "Stepmother pressures Father to send the children away because the household cannot support them, establishing the decision that drives the first journey into the woods.", "conflict", "home", "hero-split", "hg-home-place", "hg-stepmother", "hg-father", "pressures"],
      ["hg-hansel-reassures", "1027-09-04T08:15Z", "Hansel reassures Gretel", "Hansel reassures Gretel before the first departure and quietly prepares a way to remember the route, turning fear into a concrete attempt to preserve their path home.", "relationship", "relation", "editorial-mosaic", "hg-stone-trail-place", "hg-hansel", "hg-gretel", "reassures"],
      ["hg-first-journey", "1027-09-06T09:00Z", "Father leads Hansel into Deepwood", "Father leads Hansel deeper into the forest under the household plan, creating a deliberate spatial separation between the family cottage and the children's temporary stopping point.", "movement", "place", "evidence-dossier", "hg-forest-crossing-place", "hg-father", "hg-hansel", "leads"],
      ["hg-second-route", "1027-09-08T10:00Z", "Hansel guides Gretel through the forest", "Hansel guides Gretel through another attempt to navigate the woods, but the improvised route markers do not provide the same reliable return path as before.", "movement", "search", "hero-split", "hg-lost-forest-place", "hg-hansel", "hg-gretel", "guides"],
      ["hg-witch-encounter", "1027-09-10T11:30Z", "Gretel meets Witch", "Gretel meets Witch at the unusual house in the clearing, where apparent hospitality hides a new source of danger and changes the siblings' problem from navigation to captivity.", "deception", "magic", "editorial-mosaic", "hg-sugar-house-place", "hg-gretel", "hg-witch", "meets"],
      ["hg-hansel-captive", "1027-09-12T12:30Z", "Witch imprisons Hansel", "Witch imprisons Hansel inside the house and begins controlling the siblings separately, making the threat concrete and giving his sibling a reason to look for an opening to act.", "conflict", "danger", "evidence-dossier", "hg-sugar-house-place", "hg-witch", "hg-hansel", "imprisons"],
      ["hg-gretel-ordered", "1027-09-14T13:00Z", "Witch orders Gretel", "Witch orders Gretel to prepare the kitchen for the next step of her plan, placing Gretel close to the mechanism of danger and creating the opportunity for resistance.", "conflict", "danger", "hero-split", "hg-witch-kitchen-place", "hg-witch", "hg-gretel", "orders"],
      ["hg-gretel-tricks-witch", "1027-09-16T14:00Z", "Gretel tricks Witch", "Gretel tricks Witch into demonstrating the dangerous oven herself, reversing the manipulation and changing Gretel from a controlled participant into the actor who ends the immediate threat.", "deception", "decision", "editorial-mosaic", "hg-witch-kitchen-place", "hg-gretel", "hg-witch", "tricks"],
      ["hg-hansel-freed", "1027-09-19T15:00Z", "Gretel frees Hansel", "Gretel frees Hansel after the danger is removed, reuniting the siblings and transforming the house from a place of captivity into the starting point for their return.", "state-change", "magic", "evidence-dossier", "hg-sugar-house-place", "hg-gretel", "hg-hansel", "frees"],
      ["hg-return-home", "1027-09-22T17:00Z", "Hansel reunites with Father", "Hansel reunites with Father at the family cottage after the siblings find their way back, closing the story with a restored household connection rather than an abrupt escape-only ending.", "resolution", "home", "hero-split", "hg-home-place", "hg-hansel", "hg-father", "reunitesWith"],
    ],
  },
  {
    id: "story-jack-and-the-beanstalk",
    title: "Jack and the Beanstalk",
    description:
      "A bargain at a village market leads from a poor farm to a separate vertical geography, repeated encounters in a sky castle, pursuit, and a final act that closes the route.",
    cycle: "Storybook Cycle 1043",
    spatialFrame: "Highmeadow Realm",
    evidence: {
      id: "src-jack-beanstalk",
      type: "pdf",
      title: "Jack and the Beanstalk — narrative source card",
      sourceName: "Storybook fixture",
      note: "A fictional narrative source used to demonstrate bargains, vertical travel, object-centered actions, and pursuit.",
      publishedAt: "1043-05-01",
    },
    media: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Jack%20and%20the%20Beanstalk.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Jack%20and%20the%20Beanstalk%20Cruikshank%201854.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Walter%20Crane18.jpg",
    ],
    entities: [
      ["jack", "person", "Jack"],
      ["jack-mother", "person", "Jack's Mother"],
      ["jack-bean-merchant", "person", "Bean Merchant"],
      ["jack-giant", "person", "Castle Giant"],
      ["jack-giants-wife", "person", "Giant's Wife"],
      ["jack-beanstalk", "object", "Beanstalk"],
      ["jack-golden-goose", "object", "Golden Goose"],
    ],
    places: [
      ["jack-farm-place", "Highmeadow Farm Cottage", 74.0, 16.0, "home", "square"],
      ["jack-market-place", "Highmeadow Village Market", 74.45, 16.2, "place", "pin"],
      ["jack-bean-field-place", "Moonlit Bean Field", 74.15, 16.35, "magic", "diamond"],
      ["jack-beanstalk-place", "Beanstalk Ascent", 74.2, 16.65, "magic", "pin"],
      ["jack-sky-hall-place", "Sky Castle Hall", 74.4, 17.1, "crown", "square"],
      ["jack-sky-yard-place", "Sky Castle Yard", 74.3, 16.95, "danger", "diamond"],
    ],
    scenes: [
      ["jack-sale-order", "1043-05-01T07:00Z", "Jack's Mother instructs Jack", "Jack's Mother instructs Jack to take the family's remaining livestock to market and obtain money, establishing the practical need behind the bargain that follows.", "decision", "home", "hero-split", "jack-farm-place", "jack-mother", "jack", "instructs"],
      ["jack-bean-trade", "1043-05-03T09:00Z", "Jack trades with Bean Merchant", "Jack trades with Bean Merchant at the village market, accepting unusual beans instead of ordinary payment and turning a routine sale into the story's central bargain.", "exchange", "relation", "editorial-mosaic", "jack-market-place", "jack", "jack-bean-merchant", "tradesWith"],
      ["jack-mother-scolds", "1043-05-05T18:00Z", "Jack's Mother scolds Jack", "Jack's Mother scolds Jack when he returns without the expected money, making the immediate cost of the bargain explicit before the beans create a new possibility overnight.", "conflict", "danger", "evidence-dossier", "jack-farm-place", "jack-mother", "jack", "scolds"],
      ["jack-climbs", "1043-05-07T07:30Z", "Jack climbs Beanstalk", "Jack climbs Beanstalk after discovering its extraordinary growth, moving from the familiar farm into a vertically separated region that the map can represent as its own story cluster.", "movement", "magic", "hero-split", "jack-beanstalk-place", "jack", "jack-beanstalk", "climbs"],
      ["jack-sheltered", "1043-05-09T10:00Z", "Giant's Wife shelters Jack", "Giant's Wife shelters Jack inside the sky castle and warns him about the danger nearby, creating a temporary alliance within a place otherwise controlled by the castle household.", "relationship", "home", "editorial-mosaic", "jack-sky-hall-place", "jack-giants-wife", "jack", "shelters"],
      ["jack-observes-giant", "1043-05-11T11:00Z", "Jack watches Castle Giant", "Jack watches Castle Giant in the castle hall and learns the rhythm of the household before acting, giving the later theft a clear observational step rather than treating it as instantaneous.", "discovery", "search", "evidence-dossier", "jack-sky-hall-place", "jack", "jack-giant", "watches"],
      ["jack-first-theft", "1043-05-13T12:00Z", "Jack steals from Castle Giant", "Jack steals from Castle Giant after the household settles, beginning the material escalation and creating the conflict that will eventually turn the return route into a pursuit.", "conflict", "object", "hero-split", "jack-sky-hall-place", "jack", "jack-giant", "stealsFrom"],
      ["jack-goose", "1043-05-15T13:00Z", "Jack seizes Golden Goose", "Jack seizes Golden Goose during a later visit, making the object itself a canonical graph participant and distinguishing this action from the earlier theft.", "exchange", "object", "editorial-mosaic", "jack-sky-hall-place", "jack", "jack-golden-goose", "seizes"],
      ["jack-pursuit", "1043-05-18T14:00Z", "Castle Giant chases Jack", "Castle Castle Giant chases Jack across the sky-castle yard toward the vertical route, turning the connection into an escape path and linking the remote cluster back to the farm below.", "conflict", "danger", "evidence-dossier", "jack-sky-yard-place", "jack-giant", "jack", "chases"],
      ["jack-cuts-beanstalk", "1043-05-21T16:00Z", "Jack cuts Beanstalk", "Jack cuts Beanstalk after reaching the ground, severing the dangerous route and providing a spatially explicit resolution to the pursuit rather than ending at the moment of escape.", "resolution", "decision", "hero-split", "jack-bean-field-place", "jack", "jack-beanstalk", "cuts"],
    ],
  },
];

function temporalPoint(value) {
  const precise = value.includes("T");
  return {
    value,
    precision: precise ? "minute" : "day",
    certainty: "inferred",
    calendar: "gregorian",
    timeZone: precise ? "UTC" : null,
    utcOffset: precise ? "+00:00" : null,
    sourceText: SOURCE_TEXT,
  };
}

function temporalInstant(value) {
  return { type: "instant", start: temporalPoint(value), end: null };
}

function temporalInterval(start, end) {
  return { type: "interval", start: temporalPoint(start), end: temporalPoint(end) };
}

function itemMedia(media, sequence) {
  const first = (sequence - 1) % media.length;
  const second = sequence % media.length;
  return [media[first], media[second]].map((src, index) => ({
    src,
    alt: `Public-domain illustration for story scene ${sequence}, view ${index + 1}`,
    caption: MEDIA_CAPTION,
  }));
}

function makeItem(story, scene, sequence) {
  const [
    id,
    start,
    title,
    description,
    categoryId,
    icon,
    variant,
    placeId,
    subjectId,
    objectId,
    predicate,
  ] = scene;
  return {
    id,
    kind: "event",
    start,
    end: null,
    time: temporalInstant(start),
    title,
    description,
    categoryId,
    presentation: { variant },
    evidenceIds: [story.evidence.id],
    tags: [{ label: story.title, icon, hue: (sequence * 47) % 360 }],
    extensions: {
      narrative: {
        fictional: true,
        storyId: story.id,
        sequence,
        displayTime: `Day ${sequence} · ${title}`,
        temporalReferenceFrame: story.cycle,
        spatialReferenceFrame: story.spatialFrame,
        validationProfile: "narrative",
      },
    },
    media: itemMedia(story.media, sequence),
    relationChanges: [],
    _edge: { placeId, subjectId, objectId, predicate },
  };
}

function makePlace(story, spec) {
  const [id, name, longitude, latitude, icon, markerShape] = spec;
  return {
    id,
    name,
    geographicIdentifier: `${story.cycle} · ${story.spatialFrame} · fictional staging anchor`,
    address: "",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    crs: "OGC:CRS84",
    radiusMeters: 180,
    icon,
    markerShape,
    attributes: { storyId: story.id, fictional: true },
  };
}

function storyAreaPlace(sample, storyId, id, name) {
  const points = sample.places
    .filter(
      (place) =>
        place.attributes?.storyId === storyId &&
        place.geometry?.type === "Point" &&
        Array.isArray(place.geometry.coordinates),
    )
    .map((place) => place.geometry.coordinates);
  if (!points.length || sample.places.some((place) => place.id === id)) return;

  const xs = points.map((point) => Number(point[0]));
  const ys = points.map((point) => Number(point[1]));
  const minX = Math.min(...xs) - 0.05;
  const maxX = Math.max(...xs) + 0.05;
  const minY = Math.min(...ys) - 0.05;
  const maxY = Math.max(...ys) + 0.05;
  sample.places.push({
    id,
    name,
    geographicIdentifier: `${name} · fictional staging anchor`,
    address: "",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY],
        ],
      ],
    },
    crs: "OGC:CRS84",
    icon: "danger",
    markerShape: "diamond",
    attributes: { storyId, fictional: true, lifecycleArea: true },
  });
}

function patchRelationship(sample, id, patch) {
  const relationship = sample.relationships.find((candidate) => candidate.id === id);
  if (relationship) Object.assign(relationship, patch);
}

function refreshStoryPlaces(sample) {
  const itemStory = new Map(
    sample.items.map((item) => [item.id, item.extensions?.narrative?.storyId]).filter((entry) => entry[1]),
  );
  for (const story of sample.stories) {
    const itemIds = new Set(story.itemIds);
    story.placeIds = [
      ...new Set(
        sample.relationships
          .filter((relationship) =>
            (relationship.itemIds || []).some(
              (itemId) => itemIds.has(itemId) && itemStory.get(itemId) === story.id,
            ),
          )
          .map((relationship) => relationship.placeId)
          .filter(Boolean),
      ),
    ];
  }
}

export function extendSampleCase(sample) {
  for (const category of EXTRA_CATEGORIES) {
    if (!sample.categories.some((candidate) => candidate.id === category.id)) {
      sample.categories.push(category);
    }
  }

  for (const story of STORY_SPECS) {
    sample.evidence.push(story.evidence);

    for (const [id, type, name] of story.entities) {
      sample.entities.push({
        id,
        type,
        name,
        identifiers: [],
        attributes: { storyId: story.id, fictional: true },
      });
    }
    for (const place of story.places) sample.places.push(makePlace(story, place));

    const itemIds = [];
    story.scenes.forEach((scene, index) => {
      const sequence = index + 1;
      const item = makeItem(story, scene, sequence);
      const edge = item._edge;
      delete item._edge;
      sample.items.push(item);
      itemIds.push(item.id);
      sample.relationships.push({
        id: `rel-${item.id}`,
        subjectId: edge.subjectId,
        objectId: edge.objectId,
        predicate: edge.predicate,
        time: temporalInstant(item.start),
        attributes: { storyId: story.id },
        placeId: edge.placeId,
        itemIds: [item.id],
      });
    });

    sample.stories.push({
      id: story.id,
      title: story.title,
      description: story.description,
      itemIds,
      placeIds: story.places.map((place) => place[0]),
      extensions: {
        narrative: {
          fictional: true,
          validationProfile: "narrative",
          temporalReferenceFrame: story.cycle,
          spatialReferenceFrame: story.spatialFrame,
        },
      },
    });
  }

  storyAreaPlace(
    sample,
    "story-three-little-pigs",
    "place-three-little-pigs-pursuit-corridor",
    "Pigwood Pursuit Corridor",
  );
  storyAreaPlace(
    sample,
    "story-snow-white",
    "place-snow-white-threat-corridor",
    "Snow White Threat Corridor",
  );

  patchRelationship(sample, "rel-pigs-wolf-threat", {
    time: temporalInterval("1000-04-20T08:00Z", "1000-04-30T08:00Z"),
    placeId: "place-three-little-pigs-pursuit-corridor",
    itemIds: ["pigs-wolf-straw", "pigs-brick-siege", "pigs-safe"],
  });
  patchRelationship(sample, "rel-snow-queen-threat", {
    time: temporalInterval("1000-04-05T09:00Z", "1000-05-22T12:00Z"),
    placeId: "place-snow-white-threat-corridor",
  });
  patchRelationship(sample, "rel-cinderella-prince-search", {
    time: temporalInterval("1000-05-07T00:02Z", "1000-06-02T14:00Z"),
    placeId: "place-cinderella-ashenvale-village-search-route",
  });
  patchRelationship(sample, "rel-cinderella-stepsisters", {
    placeId: "place-cinderella-cinderella-s-house",
  });
  patchRelationship(sample, "rel-cinderella-stepfamily-control", {
    placeId: "place-cinderella-cinderella-s-house",
  });
  patchRelationship(sample, "rel-cinderella-fairy-pumpkin", {
    placeId: "place-cinderella-garden-and-pumpkin-patch",
  });
  patchRelationship(sample, "rel-cinderella-herald-slipper", {
    placeId: "place-cinderella-ashenvale-village-search-route",
  });

  sample.title = "Six classic tales — distributed fictional casebook";
  const narrative = sample.extensions?.narrative;
  if (narrative) {
    narrative.temporalReferenceFrame = {
      fictional: true,
      name: "Storybook Anthology Cycles",
      interchangeEncoding: "ISO 8601 synthetic ordering anchors",
    };
    narrative.spatialReferenceFrame = {
      fictional: true,
      name: "Storybook Atlas",
      coordinateSemantics: "staging anchors for relative story geography; not Earth-location claims",
    };
    if (narrative.anthology) {
      narrative.anthology.storyIds = sample.stories.map((story) => story.id);
      narrative.anthology.distributedStoryCycles = true;
    }
  }

  refreshStoryPlaces(sample);
}
