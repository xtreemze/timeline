/**
 * Temporary compatibility shim for spatial ESM migration
 * Sets TimelineSpatial on globalThis for legacy global consumers
 * This shim can be removed after app.ts conversion (Phase 4d)
 */

import { TimelineSpatial } from "./spatial.ts";

globalThis.TimelineSpatial = TimelineSpatial;
