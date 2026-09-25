/**
 * Temporary compatibility shim for memgraph-interchange ESM migration
 * Sets TimelineMemgraphInterchange on globalThis for backward compatibility with IIFE code
 */

import { TimelineMemgraphInterchange } from "./memgraph-interchange.ts";

globalThis.TimelineMemgraphInterchange = TimelineMemgraphInterchange;
