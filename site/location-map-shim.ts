/**
 * Temporary compatibility shim for location-map ESM migration
 * Sets TimelineLocationMap on globalThis for legacy global consumers
 */

import { TimelineLocationMap } from "./location-map.ts";

globalThis.TimelineLocationMap = TimelineLocationMap;
