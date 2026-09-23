/**
 * Temporary compatibility shim for webmcp ESM migration
 * Sets TimelineWebMCP on globalThis for backward compatibility with IIFE code
 */

import { TimelineWebMCP } from "./webmcp.ts";

globalThis.TimelineWebMCP = TimelineWebMCP;

export {};
