/**
 * Temporary compatibility shim for evidence-store ESM migration
 * Sets TimelineEvidence on globalThis for backward compatibility with IIFE code
 */

import { TimelineEvidence } from './evidence-store.ts';

globalThis.TimelineEvidence = TimelineEvidence;

export {};
