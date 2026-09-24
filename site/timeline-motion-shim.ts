/**
 * Temporary compatibility shim for timeline-motion ESM migration
 * Sets TimelineMotion on globalThis for legacy global consumers
 */

import { TimelineMotion } from './timeline-motion.ts';

globalThis.TimelineMotion = TimelineMotion;

export {};
