/**
 * Temporary compatibility shim for temporal-graph-view ESM migration
 * Sets TemporalGraphView on globalThis for backward compatibility with IIFE code
 */

import { TemporalGraphView } from "./temporal-graph-view.ts";

globalThis.TemporalGraphView = TemporalGraphView;
