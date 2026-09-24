/**
 * Temporary compatibility shim for timeline-clustering ESM migration
 * Sets TimelineClustering on globalThis for legacy global consumers
 */

import { TimelineClustering } from './timeline-clustering.ts';

globalThis.TimelineClustering = TimelineClustering;

export {};
