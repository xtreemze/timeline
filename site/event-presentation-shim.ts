/**
 * Temporary compatibility shim for event-presentation ESM migration
 * Sets TimelinePresentation on globalThis for legacy global consumers
 */

import { TimelinePresentation } from './event-presentation.ts';

globalThis.TimelinePresentation = TimelinePresentation;

export {};
