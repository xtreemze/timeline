/**
 * Temporary compatibility shim for interchange-adapter ESM migration
 * Sets TimelineInterchangeAdapter on globalThis for legacy global consumers
 * This shim can be removed after app.ts conversion (Phase 4d)
 */

import { TimelineInterchangeAdapter } from './interchange-adapter.ts';

globalThis.TimelineInterchangeAdapter = TimelineInterchangeAdapter;

export {};
