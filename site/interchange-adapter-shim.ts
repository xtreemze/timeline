/**
 * Temporary compatibility shim for interchange-adapter ESM migration
 * Sets TimelineInterchangeAdapter on globalThis for backward compatibility with IIFE code
 * This shim can be removed after app.ts conversion (Phase 4d)
 */

import { TimelineInterchangeAdapter } from "./interchange-adapter.ts";

globalThis.TimelineInterchangeAdapter = TimelineInterchangeAdapter;

export {};
