const SOURCE_TEXT = "Fictional narrative ordering coordinate; not a real-world date.";
const MEDIA_CAPTION =
  "Public-domain story illustration via Wikimedia Commons; illustrative only, not evidence or a real-place depiction.";

const EXTRA_CATEGORIES = [
  { id: "deception", name: "Deception / Manipulation", color: "#9333ea" },
  { id: "exchange", name: "Exchange / Bargain", color: "#a16207" },
  { id: "obligation", name: "Promise / Obligation", color: "#0f766e" },
];

const STORY_SPECS =
  // biome-ignore format: compact scene tuples keep each authored fixture record reviewable as one unit
  [
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
      ["jack-first-theft", "1043-05-13T12:00Z", "Jack steals from Castle Giant", "Jack steals from Castle Giant after the household settles, beginning the material escalation and creating the conflict that will eventually turn the return route into a pursuit.", "conflict", "object", "hero-split", "jack-sky-hall-place", "jack", "jack-giant", "robs"],
      ["jack-goose", "1043-05-15T13:00Z", "Jack seizes Golden Goose", "Jack seizes Golden Goose during a later visit, making the object itself a canonical graph participant and distinguishing this action from the earlier theft.", "exchange", "object", "editorial-mosaic", "jack-sky-hall-place", "jack", "jack-golden-goose", "seizes"],
      ["jack-pursuit", "1043-05-18T14:00Z", "Castle Giant chases Jack", "Castle Giant chases Jack across the sky-castle yard toward the vertical route, turning the connection into an escape path and linking the remote cluster back to the farm below.", "conflict", "danger", "evidence-dossier", "jack-sky-yard-place", "jack-giant", "jack", "chases"],
      ["jack-cuts-beanstalk", "1043-05-21T16:00Z", "Jack cuts Beanstalk", "Jack cuts Beanstalk after reaching the ground, severing the dangerous route and providing a spatially explicit resolution to the pursuit rather than ending at the moment of escape.", "resolution", "decision", "hero-split", "jack-bean-field-place", "jack", "jack-beanstalk", "cuts"],
    ],
  },
  {
    id: "story-rapunzel",
    title: "Rapunzel",
    description:
      "A child raised under isolation in a remote tower forms a hidden connection with a visiting prince, is displaced into a separate wilderness, and eventually reunites with him far from the tower.",
    cycle: "Storybook Cycle 1061",
    spatialFrame: "Briarvale Realm",
    evidence: {
      id: "src-rapunzel",
      type: "article",
      title: "Rapunzel — narrative source card",
      sourceName: "Storybook fixture",
      note: "A fictional narrative source used to demonstrate isolation, repeated visits, displacement, deception, and reunion across separated places.",
      publishedAt: "1061-06-01",
    },
    media: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Arthur%20Rackham%20Rapunzel.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Rapunzel%2C%20Let%20Down%20Your%20Hair%20-%20Anne%20Anderson.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/RapunzelWalterCrane.jpg",
    ],
    entities: [
      ["rapunzel", "person", "Rapunzel"],
      ["rapunzel-gothel", "person", "Mother Gothel"],
      ["rapunzel-prince", "person", "Tower Prince"],
    ],
    places: [
      ["rapunzel-garden-place", "Briarvale Walled Garden", -58.4, -12.1, "place", "square"],
      ["rapunzel-cottage-place", "Gothel's Briarvale Cottage", -58.0, -11.85, "home", "square"],
      ["rapunzel-tower-clearing-place", "Briarvale Tower Clearing", -57.55, -11.5, "place", "pin"],
      ["rapunzel-tower-chamber-place", "Briarvale Tower Chamber", -57.5, -11.45, "crown", "diamond"],
      ["rapunzel-thornwood-place", "Briarvale Thornwood", -57.1, -11.15, "danger", "pin"],
      ["rapunzel-reunion-valley-place", "Briarvale Reunion Valley", -56.65, -10.85, "magic", "diamond"],
    ],
    scenes: [
      ["rapunzel-taken", "1061-06-01T07:30Z", "Mother Gothel takes Rapunzel", "Mother Gothel takes Rapunzel into her care and removes her from the ordinary household world, establishing the controlling relationship that shapes the rest of the story.", "state-change", "home", "hero-split", "rapunzel-garden-place", "rapunzel-gothel", "rapunzel", "takes"],
      ["rapunzel-raised", "1061-06-03T08:00Z", "Mother Gothel raises Rapunzel", "Mother Gothel raises Rapunzel in increasing isolation and controls the boundaries of her daily life, turning a family relationship into a long-running condition of dependence.", "relationship", "relation", "editorial-mosaic", "rapunzel-cottage-place", "rapunzel-gothel", "rapunzel", "raises"],
      ["rapunzel-confined", "1061-06-05T09:00Z", "Mother Gothel confines Rapunzel", "Mother Gothel confines Rapunzel in the remote tower and restricts ordinary access to the chamber, making the tower a concrete spatial expression of control rather than mere background.", "conflict", "danger", "evidence-dossier", "rapunzel-tower-chamber-place", "rapunzel-gothel", "rapunzel", "confines"],
      ["rapunzel-obeys", "1061-06-07T10:15Z", "Rapunzel obeys Mother Gothel", "Rapunzel obeys Mother Gothel at the tower window and preserves the established access ritual, showing how the confinement is maintained through repeated interpersonal action.", "obligation", "relation", "hero-split", "rapunzel-tower-clearing-place", "rapunzel", "rapunzel-gothel", "obeys"],
      ["rapunzel-prince-hears", "1061-06-09T11:00Z", "Tower Prince hears Rapunzel", "Tower Prince hears Rapunzel singing from the isolated tower and recognizes a person where the landscape first appeared inaccessible, creating the discovery that motivates later visits.", "discovery", "search", "editorial-mosaic", "rapunzel-tower-clearing-place", "rapunzel-prince", "rapunzel", "hears"],
      ["rapunzel-prince-visits", "1061-06-11T12:00Z", "Tower Prince visits Rapunzel", "Tower Prince visits Rapunzel inside the chamber after learning the tower's access pattern, converting distant observation into a direct relationship hidden from the controlling household.", "relationship", "crown", "evidence-dossier", "rapunzel-tower-chamber-place", "rapunzel-prince", "rapunzel", "visits"],
      ["rapunzel-trusts-prince", "1061-06-13T13:30Z", "Rapunzel trusts Tower Prince", "Rapunzel trusts Tower Prince during a later meeting and begins treating the secret visits as a path toward a different life, giving the relationship a clear decision point.", "decision", "relation", "hero-split", "rapunzel-tower-chamber-place", "rapunzel", "rapunzel-prince", "trusts"],
      ["rapunzel-banished", "1061-06-16T14:00Z", "Mother Gothel banishes Rapunzel", "Mother Gothel banishes Rapunzel from the tower after discovering the hidden relationship, abruptly moving the story from controlled isolation into an unfamiliar wilderness.", "conflict", "danger", "editorial-mosaic", "rapunzel-thornwood-place", "rapunzel-gothel", "rapunzel", "banishes"],
      ["rapunzel-prince-deceived", "1061-06-19T15:00Z", "Mother Gothel deceives Tower Prince", "Mother Gothel deceives Tower Prince when he returns to the tower and expects the familiar meeting, turning the old access route into a deliberate trap and severing his certainty about Rapunzel's location.", "deception", "magic", "evidence-dossier", "rapunzel-tower-chamber-place", "rapunzel-gothel", "rapunzel-prince", "deceives"],
      ["rapunzel-reunion", "1061-06-23T17:00Z", "Tower Prince reunites with Rapunzel", "Tower Prince reunites with Rapunzel in a distant valley after both have been displaced from the tower, closing the story in a new location rather than returning to the original site of confinement.", "resolution", "relation", "hero-split", "rapunzel-reunion-valley-place", "rapunzel-prince", "rapunzel", "reunitesWith"],
    ],
  },
  {
    id: "story-frog-prince",
    title: "The Frog Prince",
    description:
      "A lost keepsake at a palace well creates a promise between a princess and a frog, and the ignored obligation follows them from the garden into the palace before the relationship changes.",
    cycle: "Storybook Cycle 1078",
    spatialFrame: "Merecourt Realm",
    evidence: {
      id: "src-frog-prince",
      type: "document",
      title: "The Frog Prince — narrative source card",
      sourceName: "Storybook fixture",
      note: "A fictional narrative source used to demonstrate promises, object recovery, following movement, household enforcement, and transformation.",
      publishedAt: "1078-09-04",
    },
    media: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Walter%20Crane%20The%20Frog%20Prince.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Frog%20Prince%20and%20Other%20Stories-illus010%2011s.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Walter%20Crane-The%20Frog%20Prince.jpg",
    ],
    entities: [
      ["frog-princess", "person", "Princess"],
      ["frog-prince", "person", "Frog Prince"],
      ["frog-king", "person", "King"],
      ["frog-golden-ball", "object", "Golden Ball"],
    ],
    places: [
      ["frog-palace-garden-place", "Merecourt Palace Garden", 6.2, -38.0, "crown", "square"],
      ["frog-well-place", "Merecourt Old Well", 6.55, -38.25, "place", "diamond"],
      ["frog-garden-path-place", "Merecourt Garden Path", 6.85, -38.05, "place", "pin"],
      ["frog-banquet-hall-place", "Merecourt Banquet Hall", 7.15, -37.8, "home", "square"],
      ["frog-princess-chamber-place", "Merecourt Princess Chamber", 7.2, -37.7, "danger", "diamond"],
      ["frog-castle-gate-place", "Merecourt Castle Gate", 7.55, -37.5, "crown", "pin"],
    ],
    scenes: [
      ["frog-king-gift", "1078-09-04T08:00Z", "King gives Princess a keepsake", "King gives Princess a cherished keepsake for play in the palace garden, establishing the valued possession whose loss will make an unlikely bargain suddenly important.", "relationship", "crown", "hero-split", "frog-palace-garden-place", "frog-king", "frog-princess", "gives"],
      ["frog-ball-lost", "1078-09-06T09:15Z", "Princess drops Golden Ball", "Princess drops Golden Ball beside the old well and cannot recover it herself, turning a routine garden moment into a practical problem with a specific object at stake.", "state-change", "object", "editorial-mosaic", "frog-well-place", "frog-princess", "frog-golden-ball", "drops"],
      ["frog-offers-help", "1078-09-08T10:00Z", "Frog Prince offers Princess help", "Frog Prince offers Princess help at the well after hearing her distress, introducing a negotiator whose requested companionship matters more than the material reward she first imagines.", "relationship", "relation", "evidence-dossier", "frog-well-place", "frog-prince", "frog-princess", "offers"],
      ["frog-promise", "1078-09-10T10:30Z", "Princess promises Frog Prince companionship", "Princess promises Frog Prince companionship in exchange for assistance, creating an explicit obligation that remains meaningful after the immediate problem at the well is solved.", "obligation", "relation", "hero-split", "frog-well-place", "frog-princess", "frog-prince", "promises"],
      ["frog-ball-retrieved", "1078-09-12T11:00Z", "Frog Prince retrieves Golden Ball", "Frog Prince retrieves Golden Ball from the well and completes his side of the bargain, making the recovered object a visible marker that the earlier promise now has consequences.", "resolution", "magic", "editorial-mosaic", "frog-well-place", "frog-prince", "frog-golden-ball", "retrieves"],
      ["frog-princess-leaves", "1078-09-14T12:00Z", "Princess abandons Frog Prince", "Princess abandons Frog Prince on the garden path after recovering what she wanted, creating the conflict between a spoken obligation and her immediate attempt to escape it.", "conflict", "danger", "evidence-dossier", "frog-garden-path-place", "frog-princess", "frog-prince", "abandons"],
      ["frog-follows", "1078-09-16T13:00Z", "Frog Prince follows Princess", "Frog Prince follows Princess from the garden toward the palace instead of accepting the broken promise, moving the unresolved relationship into the household where others can witness it.", "movement", "place", "hero-split", "frog-castle-gate-place", "frog-prince", "frog-princess", "follows"],
      ["frog-king-orders", "1078-09-18T14:00Z", "King orders Princess to honor her promise", "King orders Princess to honor her promise once the dispute reaches the banquet hall, converting a private bargain at the well into a household obligation backed by authority.", "obligation", "crown", "editorial-mosaic", "frog-banquet-hall-place", "frog-king", "frog-princess", "orders"],
      ["frog-thrown", "1078-09-21T15:00Z", "Princess throws Frog Prince", "Princess throws Frog Prince inside her chamber after resisting his continued presence, creating the abrupt physical confrontation that precedes the tale's transformation.", "conflict", "danger", "evidence-dossier", "frog-princess-chamber-place", "frog-princess", "frog-prince", "throws"],
      ["frog-departure", "1078-09-25T16:30Z", "Frog Prince escorts Princess", "Frog Prince escorts Princess through the castle gate after the relationship has changed, closing the story with purposeful movement away from the sites of the bargain and dispute.", "resolution", "crown", "hero-split", "frog-castle-gate-place", "frog-prince", "frog-princess", "escorts"],
    ],
  },
  {
    id: "story-rumpelstiltskin",
    title: "Rumpelstiltskin",
    description:
      "A boast at court traps a young woman in escalating demands, magical assistance becomes a dangerous bargain, and the final obligation turns on discovering the helper's hidden name.",
    cycle: "Storybook Cycle 1096",
    spatialFrame: "Goldmarsh Realm",
    evidence: {
      id: "src-rumpelstiltskin",
      type: "pdf",
      title: "Rumpelstiltskin — narrative source card",
      sourceName: "Storybook fixture",
      note: "A fictional narrative source used to demonstrate escalating demands, exchange, promise obligations, identity discovery, and release.",
      publishedAt: "1096-02-02",
    },
    media: [
      "https://commons.wikimedia.org/wiki/Special:FilePath/Rumpelstiltskin-Crane1886.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Rumpelstiltskin.jpg",
      "https://commons.wikimedia.org/wiki/Special:FilePath/Rumplestiltskin%20-%20Anne%20Anderson.jpg",
    ],
    entities: [
      ["rumpel-father", "person", "Her Father"],
      ["rumpel-daughter", "person", "Miller's Daughter"],
      ["rumpel-king", "person", "Goldmarsh King"],
      ["rumpel-helper", "person", "Rumpelstiltskin"],
      ["rumpel-child", "person", "Royal Child"],
    ],
    places: [
      ["rumpel-mill-place", "Goldmarsh Mill House", 58.0, -48.2, "home", "square"],
      ["rumpel-throne-hall-place", "Goldmarsh Throne Hall", 58.45, -47.95, "crown", "square"],
      ["rumpel-spinning-room-place", "Goldmarsh Spinning Room", 58.6, -47.65, "object", "diamond"],
      ["rumpel-palace-place", "Goldmarsh Palace", 58.9, -47.4, "crown", "pin"],
      ["rumpel-nursery-place", "Goldmarsh Royal Nursery", 59.15, -47.15, "home", "square"],
      ["rumpel-name-clearing-place", "Goldmarsh Name Clearing", 59.55, -46.85, "search", "diamond"],
    ],
    scenes: [
      ["rumpel-boast", "1096-02-02T07:00Z", "Her Father boasts to Goldmarsh King", "Her Father boasts to Goldmarsh King about impossible spinning skill in the family, turning ordinary court ambition into a claim that places another person under dangerous scrutiny.", "deception", "crown", "hero-split", "rumpel-throne-hall-place", "rumpel-father", "rumpel-king", "boasts"],
      ["rumpel-first-demand", "1096-02-04T08:00Z", "Goldmarsh King orders Miller's Daughter", "Goldmarsh King orders Miller's Daughter to complete an impossible spinning task under threat, transforming the earlier boast into a direct and measurable demand.", "conflict", "danger", "editorial-mosaic", "rumpel-spinning-room-place", "rumpel-king", "rumpel-daughter", "orders"],
      ["rumpel-first-help", "1096-02-06T22:00Z", "Rumpelstiltskin helps Miller's Daughter", "Rumpelstiltskin helps Miller's Daughter during the first night of confinement and demonstrates a solution that appears miraculous while introducing a new dependency.", "relationship", "magic", "evidence-dossier", "rumpel-spinning-room-place", "rumpel-helper", "rumpel-daughter", "helps"],
      ["rumpel-necklace", "1096-02-08T22:30Z", "Miller's Daughter gives Rumpelstiltskin payment", "Miller's Daughter gives Rumpelstiltskin a personal payment for further assistance, making the magical help an explicit exchange rather than an unexplained intervention.", "exchange", "object", "hero-split", "rumpel-spinning-room-place", "rumpel-daughter", "rumpel-helper", "gives"],
      ["rumpel-second-demand", "1096-02-10T08:30Z", "Goldmarsh King pressures Miller's Daughter", "Goldmarsh King pressures Miller's Daughter with a larger demand after seeing the earlier result, escalating the court's expectations instead of treating the first success as sufficient.", "conflict", "danger", "editorial-mosaic", "rumpel-throne-hall-place", "rumpel-king", "rumpel-daughter", "pressures"],
      ["rumpel-final-bargain", "1096-02-12T23:00Z", "Rumpelstiltskin bargains with Miller's Daughter", "Rumpelstiltskin bargains with Miller's Daughter when ordinary payment is exhausted, shifting the exchange from possessions to a future obligation with much greater stakes.", "exchange", "relation", "evidence-dossier", "rumpel-spinning-room-place", "rumpel-helper", "rumpel-daughter", "bargainsWith"],
      ["rumpel-promise", "1096-02-14T23:30Z", "Miller's Daughter promises Rumpelstiltskin", "Miller's Daughter promises Rumpelstiltskin the future payment he requests, creating the obligation that survives the immediate spinning crisis and returns later in the story.", "obligation", "relation", "hero-split", "rumpel-spinning-room-place", "rumpel-daughter", "rumpel-helper", "promises"],
      ["rumpel-marriage", "1096-02-17T12:00Z", "Goldmarsh King marries Miller's Daughter", "Goldmarsh King marries Miller's Daughter after the impossible demands are satisfied, changing her position at court while leaving the private bargain unresolved.", "relationship", "crown", "editorial-mosaic", "rumpel-palace-place", "rumpel-king", "rumpel-daughter", "marries"],
      ["rumpel-claim", "1096-02-20T14:00Z", "Rumpelstiltskin claims Royal Child", "Rumpelstiltskin claims Royal Child under the earlier bargain and makes the deferred cost immediate, turning a past promise into the central conflict of the final sequence.", "conflict", "danger", "evidence-dossier", "rumpel-nursery-place", "rumpel-helper", "rumpel-child", "claims"],
      ["rumpel-name-found", "1096-02-24T17:00Z", "Miller's Daughter identifies Rumpelstiltskin", "Miller's Daughter identifies Rumpelstiltskin after the hidden name is discovered, satisfying the condition that breaks the dangerous obligation and resolves the bargain.", "resolution", "search", "hero-split", "rumpel-name-clearing-place", "rumpel-daughter", "rumpel-helper", "identifies"],
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
    sample.items
      .map((item) => [item.id, item.extensions?.narrative?.storyId])
      .filter((entry) => entry[1]),
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

    const itemIds: string[] = [];
    story.scenes.forEach((scene, index) => {
      const sequence = index + 1;
      const generated = makeItem(story, scene, sequence);
      const { _edge: edge, ...item } = generated;
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

  sample.title = "Nine classic tales — distributed fictional casebook";
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
      coordinateSemantics:
        "staging anchors for relative story geography; not Earth-location claims",
    };
    if (narrative.anthology) {
      narrative.anthology.storyIds = sample.stories.map((story) => story.id);
      narrative.anthology.distributedStoryCycles = true;
    }
  }

  refreshStoryPlaces(sample);
}
