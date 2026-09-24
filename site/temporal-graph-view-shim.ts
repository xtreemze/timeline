/**
 * Temporary compatibility shim for temporal-graph-view ESM migration
 * Sets TemporalGraphView on globalThis for backward compatibility with IIFE code
 */

import { TimelineOrbGraph } from "../src/orb-graph-entry.js";
import { TemporalGraphView } from "./temporal-graph-view.ts";

globalThis.TemporalGraphView = TemporalGraphView;

export { TimelineOrbGraph };
