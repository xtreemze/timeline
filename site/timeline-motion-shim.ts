/**
 * Temporary compatibility shim for timeline-motion ESM migration
 * Sets TimelineMotion on globalThis for backward compatibility with IIFE code
 */

import { TimelineMotion } from "./timeline-motion.ts";

globalThis.TimelineMotion = TimelineMotion;
