/**
 * Temporary compatibility shim for webmcp ESM migration
 * Sets TimelineWebMCP on globalThis for legacy global consumers
 */

import { TimelineWebMCP } from "./webmcp.ts";

globalThis.TimelineWebMCP = TimelineWebMCP;
