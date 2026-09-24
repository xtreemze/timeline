/**
 * Temporary compatibility shim for timeline-navigation ESM migration
 * Sets TimelineNavigation on globalThis for legacy global consumers
 */

import { TimelineNavigation } from './timeline-navigation.ts';

globalThis.TimelineNavigation = TimelineNavigation;

export {};
