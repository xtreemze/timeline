/**
 * Temporary compatibility shim for memgraph-interchange ESM migration
 * Sets TimelineMemgraphInterchange on globalThis for legacy global consumers
 */

import { TimelineMemgraphInterchange } from "./memgraph-interchange.ts";

globalThis.TimelineMemgraphInterchange = TimelineMemgraphInterchange;
