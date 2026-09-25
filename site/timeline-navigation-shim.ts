/**
 * Temporary compatibility shim for timeline-navigation ESM migration
 * Sets TimelineNavigation on globalThis for backward compatibility with IIFE code
 */

import { TimelineNavigation } from "./timeline-navigation.ts";

globalThis.TimelineNavigation = TimelineNavigation;
