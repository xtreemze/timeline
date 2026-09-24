/**
 * Temporary compatibility shim for timeline-migration ESM migration
 * Sets TimelineMigration on globalThis for legacy global consumers
 */

import { TimelineMigration } from './timeline-migration.ts';

globalThis.TimelineMigration = TimelineMigration;

export {};
