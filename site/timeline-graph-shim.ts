import { TimelineGraph } from "./timeline-graph.ts";

/**
 * Temporary global compatibility shim while callers migrate to ESM imports.
 *
 * TimelineGraph is renderer-neutral. Its neighborhood and temporal projection
 * helpers are pure application/projection functions and must not be replaced
 * with renderer-availability fallbacks.
 */
globalThis.TimelineGraph = TimelineGraph;
