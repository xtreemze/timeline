import { TimelineSampleCase } from "./sample-case.ts";
import { applyStorybookEntityIcons } from "./storybook-entity-icons.ts";

applyStorybookEntityIcons(TimelineSampleCase.entities);
globalThis.TimelineSampleCase = TimelineSampleCase;
