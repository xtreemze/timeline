/**
 * Temporary compatibility shim for timeline-clustering ESM migration
 * Sets TimelineClustering on globalThis for backward compatibility with IIFE code
 */

import { TimelineClustering } from './timeline-clustering.ts';

globalThis.TimelineClustering = TimelineClustering;

export {};
