/**
 * Temporary compatibility shim for date-range-picker ESM migration
 * Sets TimelineDateRangePicker on globalThis for legacy global consumers
 */

import { TimelineDateRangePicker } from "./date-range-picker.ts";

globalThis.TimelineDateRangePicker = TimelineDateRangePicker;
