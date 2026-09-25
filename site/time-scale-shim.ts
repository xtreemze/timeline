/**
 * Temporary compatibility shim for time-scale ESM migration
 * Sets TimelineScale on globalThis for backward compatibility with IIFE code
 * This shim can be removed after app.ts conversion (Phase 4d)
 */

import { TimelineScale } from "./time-scale.ts";

globalThis.TimelineScale = TimelineScale;
