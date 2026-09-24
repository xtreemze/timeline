/**
 * Temporary compatibility shim for presentation-layout ESM migration
 * Sets TimelinePresentationLayout on globalThis for legacy global consumers
 */

import { TimelinePresentationLayout } from './presentation-layout.ts';

globalThis.TimelinePresentationLayout = TimelinePresentationLayout;

export {};
