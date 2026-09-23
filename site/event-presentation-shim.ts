/**
 * Temporary compatibility shim for event-presentation ESM migration
 * Sets TimelinePresentation on globalThis for backward compatibility with IIFE code
 */

import { TimelinePresentation } from "./event-presentation.ts";

globalThis.TimelinePresentation = TimelinePresentation;

export {};
