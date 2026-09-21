/**
 * Temporary compatibility shim for temporal-standards ESM migration
 * Sets TimelineTemporal on globalThis for backward compatibility with IIFE code
 * This shim can be removed after app.ts conversion (Phase 4d)
 */

import { TimelineTemporal } from './temporal-standards.ts';

globalThis.TimelineTemporal = TimelineTemporal;

export {};
