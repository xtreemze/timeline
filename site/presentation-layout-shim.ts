/**
 * Temporary compatibility shim for presentation-layout ESM migration
 * Sets TimelinePresentationLayout on globalThis for backward compatibility with IIFE code
 */

import { TimelinePresentationLayout } from "./presentation-layout.ts";

globalThis.TimelinePresentationLayout = TimelinePresentationLayout;

export {};
