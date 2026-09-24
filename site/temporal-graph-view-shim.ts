/**
 * Temporary compatibility shim for temporal-graph-view ESM migration
 * Sets TemporalGraphView on globalThis for legacy global consumers
 */

import { TemporalGraphView } from "./temporal-graph-view.ts";

globalThis.TemporalGraphView = TemporalGraphView;
