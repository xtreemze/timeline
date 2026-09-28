export const STORYBOOK_ENTITY_ICONS = Object.freeze({
  "pigs-first": "pig",
  "pigs-second": "pig",
  "pigs-third": "pig",
  "pigs-mother": "pig",
  "pigs-wolf": "wolf",
  "pigs-brothers": "pig",
  "pigs-brick-house": "home",
  "pigs-material-vendors": "merchant",
  "pigs-straw-bundle": "straw",
  "pigs-stick-bundle": "sticks",
  "pigs-brick-load": "bricks",
  "pigs-straw-house-object": "home",
  "pigs-stick-house-object": "home",

  "snow-white": "crown",
  "snow-queen": "crown",
  "snow-huntsman": "axe",
  "snow-prince": "crown",
  "snow-dwarfs": "pickaxe",
  "snow-mirror-object": "mirror",
  "snow-apple-object": "apple",
  "snow-laces-object": "laces",
  "snow-comb-object": "comb",
  "snow-coffin-object": "coffin",
  "snow-royal-family": "crown",
  "snow-dwarfs-cottage": "home",
  "snow-peddler-disguise": "disguise",

  cinderella: "crown",
  "cinderella-stepmother": "parent",
  "cinderella-stepsisters": "gown",
  "cinderella-fairy": "magic",
  "cinderella-prince": "crown",
  "cinderella-slipper-object": "slipper",
  "cinderella-coach": "carriage",
  "cinderella-father": "parent",
  "cinderella-pumpkin": "pumpkin",
  "cinderella-gown": "gown",
  "cinderella-herald": "trumpet",
  "cinderella-late-mother": "parent",
  "cinderella-household": "home",

  "red-riding-hood": "hood",
  "red-wolf": "wolf",
  "red-grandmother": "elder",
  "red-woodcutter": "axe",
  "red-mother": "parent",

  "hg-hansel": "child",
  "hg-gretel": "child",
  "hg-father": "parent",
  "hg-stepmother": "parent",
  "hg-witch": "witch",

  jack: "child",
  "jack-mother": "parent",
  "jack-bean-merchant": "merchant",
  "jack-giant": "giant",
  "jack-giants-wife": "giant",
  "jack-beanstalk": "beanstalk",
  "jack-golden-goose": "goose",

  rapunzel: "hair",
  "rapunzel-gothel": "witch",
  "rapunzel-prince": "crown",

  "frog-princess": "crown",
  "frog-prince": "frog",
  "frog-king": "crown",
  "frog-golden-ball": "ball",

  "rumpel-father": "merchant",
  "rumpel-daughter": "spindle",
  "rumpel-king": "crown",
  "rumpel-helper": "magic",
  "rumpel-child": "baby",
} as const);

type StorybookEntityIcon = (typeof STORYBOOK_ENTITY_ICONS)[keyof typeof STORYBOOK_ENTITY_ICONS];

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function storybookEntityIcon(entityId: string): StorybookEntityIcon | null {
  return STORYBOOK_ENTITY_ICONS[entityId as keyof typeof STORYBOOK_ENTITY_ICONS] ?? null;
}

export function applyStorybookEntityIcons(entities: any[]): void {
  for (const entity of entities) {
    const icon = storybookEntityIcon(String(entity?.id ?? ""));
    if (!icon) continue;
    const attributes = record(entity.attributes);
    const style = record(attributes.style);
    entity.attributes = {
      ...attributes,
      style: {
        ...style,
        icon,
      },
    };
  }
}
