/**
 * Temporary compatibility shim for timeline-migration ESM migration
 * Sets TimelineMigration on globalThis for backward compatibility with IIFE code
 */

import { TimelineMigration } from './timeline-migration.ts';

globalThis.TimelineMigration = TimelineMigration;

export {};
