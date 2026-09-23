# Example narrative source catalog

This catalog defines the evidence-first expansion policy for bundled fictional examples. A story is eligible only when Lūm can cite a stable primary/public-domain text, distinguish source claims from synthetic timeline/map coordinates, and provide public-domain or otherwise suitable illustrative media.

## Included in the bundled dataset

| Story | Primary narrative evidence | Illustration source strategy | Status |
| --- | --- | --- | --- |
| The Three Little Pigs | Project Gutenberg #18155, L. Leslie Brooke, *The Story of the Three Little Pigs* — https://www.gutenberg.org/ebooks/18155 | Public-domain Brooke illustrations via Wikimedia Commons | Included |
| Snow White | Project Gutenberg #11027, Grimm's *Fairy Stories*, “Little Snow White” — https://www.gutenberg.org/ebooks/11027 | Public-domain historical Snow White illustrations via Wikimedia Commons | Included |
| Cinderella | Project Gutenberg #10830, *Cinderella; or, The Little Glass Slipper* — https://www.gutenberg.org/ebooks/10830 | Public-domain illustrated edition / Wikimedia Commons | Included |
| Little Red Riding Hood | Project Gutenberg #11027, Grimm's *Fairy Stories*, “Little Red Cap” — https://www.gutenberg.org/ebooks/11027 | Jessie Willcox Smith and other public-domain Commons illustrations | Included |
| Hansel and Gretel | Project Gutenberg #11027, Grimm's *Fairy Stories*, “Hansel and Grethel” — https://www.gutenberg.org/ebooks/11027 | Arthur Rackham public-domain Commons illustrations | Included |

## Next strong candidates

These are suitable future fixtures because they have recognizable action chains, durable actors/objects, reusable places, and public-domain sources or illustrations.

| Candidate | Why it is graphically useful | Primary source |
| --- | --- | --- |
| Alice's Adventures in Wonderland | Dense directed encounters, transformations, movement between places, many durable characters and artifacts | Project Gutenberg #11 — https://www.gutenberg.org/ebooks/11 |
| Rapunzel | Small cast, repeated visits, tower as durable dwelling/place pair, movement and rescue arc | Grimm's Fairy Stories #11027 — https://www.gutenberg.org/ebooks/11027 |
| Rumpelstiltskin | Clear promises, exchanges, naming/discovery actions, repeated temporal structure | Grimm's Fairy Stories #11027 — https://www.gutenberg.org/ebooks/11027 |
| The Frog Prince | Transformation, promise, retrieval and relationship changes with a compact cast | Grimm's Fairy Stories #11027 — https://www.gutenberg.org/ebooks/11027 |
| Briar Rose / Sleeping Beauty | Long temporal interval, curse, sleep/wake state changes, castle place hierarchy | Grimm's Fairy Stories #11027 and *The Blue Fairy Book* #503 — https://www.gutenberg.org/ebooks/503 |
| Beauty and the Beast | Rich relationship evolution, travel between household/castle, promises and transformations | *The Blue Fairy Book* #503 — https://www.gutenberg.org/ebooks/503 |
| Aladdin and the Wonderful Lamp | Artifacts, transfers of possession, travel, deception, transformations, palace/market places | *The Blue Fairy Book* #503 — https://www.gutenberg.org/ebooks/503 |
| Aesop mini-anthology | Short, high-clarity action facts suitable for stress-testing many small stories simultaneously | *The Aesop for Children* #19994, illustrated by Milo Winter — https://www.gutenberg.org/ebooks/19994 |

## Admission rules

1. Model source text, not a blended cultural memory of the story. Record the exact edition used.
2. Every durable named subject/object becomes a canonical node with the narrowest defensible domain type. Generic `entity`/`object` placeholder types are not accepted.
3. Every modeled action becomes a directed predicate with direct source provenance. Time/place are qualifiers/context on the edge.
4. A named place is a reusable canonical place record. A physical building may also be a durable entity when actions target the building itself, but the place record remains the sole owner of map geometry.
5. Every story must have enough chronology detail to expose causal transitions rather than a synopsis: at least ten ordered items, several distinct categories, at least five reusable places where the source supports meaningful spatial distinctions, and an action edge for every item.
6. Public-domain illustrations are preferred. Media captions must identify them as illustrative material, not evidence of fictional coordinates or synthetic dates.
7. Synthetic ISO dates and Storybook Realm coordinates exist only to exercise rendering, projection, filtering and interaction. They must be explicitly labeled as fictional/inferred and never attributed to the source edition.
8. New fixtures must pass the same provenance, referential-integrity, semantic-presentation, narrative-mention coverage, duplicate-edge, orphan-node and property-naming checks as the bundled stories.
