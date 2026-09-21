/**
 * Sample timeline case: Three classic tales — parallel fictional casebook
 * Provides example data for timeline demonstration
 */

const SAMPLE = {
  version: 2,
  title: "Three classic tales — parallel fictional casebook",
  categories: [
    { id: "context", name: "Background / Condition", color: "#667085" },
    { id: "movement", name: "Movement / Transition", color: "#0e7090" },
    { id: "creation", name: "Creation / Preparation", color: "#b54708" },
    { id: "conflict", name: "Conflict / Threat", color: "#b42318" },
    { id: "decision", name: "Decision / Choice", color: "#7a5af8" },
    { id: "discovery", name: "Discovery / Information", color: "#2563eb" },
    { id: "relationship", name: "Relationship / Social", color: "#027a48" },
    { id: "state-change", name: "State Change / Transformation", color: "#c11574" },
    { id: "resolution", name: "Resolution / Outcome", color: "#067647" },
  ],
  items: [],
  stories: [],
  entities: [],
  places: [],
  relationships: [],
  evidence: [],
};

globalThis.TimelineSampleCase = Object.freeze(SAMPLE);

export const TimelineSampleCase = SAMPLE;
