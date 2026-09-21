/**
 * Temporary compatibility shim for location-map ESM migration
 * Sets TimelineLocationMap on globalThis for backward compatibility with IIFE code
 */

import { TimelineLocationMap } from './location-map.ts';

globalThis.TimelineLocationMap = TimelineLocationMap;

export {};
