/**
 * Temporary compatibility shim for date-range-picker ESM migration
 * Sets TimelineDateRangePicker on globalThis for backward compatibility with IIFE code
 */

import { TimelineDateRangePicker } from "./date-range-picker.ts";

globalThis.TimelineDateRangePicker = TimelineDateRangePicker;

export {};
