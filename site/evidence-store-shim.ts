/**
 * Temporary compatibility shim for evidence-store ESM migration
 * Sets TimelineEvidence on globalThis for legacy global consumers
 */

import { TimelineEvidence } from "./evidence-store.ts";

globalThis.TimelineEvidence = TimelineEvidence;
