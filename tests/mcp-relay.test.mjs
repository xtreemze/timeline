import assert from "node:assert/strict";
import test from "node:test";

import { createMcpRelayBridge } from "../site/mcp-relay.ts";

function fakeBrowser({ hasRuntime = false } = {}) {
  const scripts = [];
  const document = {
    modelContext: hasRuntime ? { registerTool() {} } : undefined,
    head: {
      append(script) {
        scripts.push(script);
        if (script.dataset.lumMcp === "runtime") {
          document.modelContext = { registerTool() {} };
        }
        queueMicrotask(() => script.listeners.load?.());
      },
    },
    documentElement: {
      append(script) {
        document.head.append(script);
      },
    },
    querySelector(selector) {
      const kind = selector.match(/data-lum-mcp="([^"]+)"/)?.[1];
      return scripts.find((script) => script.dataset.lumMcp === kind) || null;
    },
    createElement(name) {
      assert.equal(name, "script");
      return {
        src: "",
        async: false,
        dataset: {},
        listeners: {},
        addEventListener(type, listener) {
          this.listeners[type] = listener;
        },
        removeEventListener(type, listener) {
          if (this.listeners[type] === listener) delete this.listeners[type];
        },
        remove() {
          const index = scripts.indexOf(this);
          if (index >= 0) scripts.splice(index, 1);
        },
      };
    },
  };
  return { document, scripts };
}

test("MCP relay bridge is inert until explicitly connected", () => {
  const browser = fakeBrowser();
  const bridge = createMcpRelayBridge({ document: browser.document });

  assert.equal(browser.scripts.length, 0);
  assert.equal(bridge.status().runtimeReady, false);
  assert.equal(bridge.status().relayLoaded, false);
  assert.equal(bridge.version, "5.1.0");
});

test("MCP relay loads a pinned runtime and relay when WebMCP is absent", async () => {
  const browser = fakeBrowser();
  const bridge = createMcpRelayBridge({ document: browser.document });

  const status = await bridge.connect({ port: 9444, requestTimeoutMs: 120000 });

  assert.equal(browser.scripts.length, 2);
  assert.match(browser.scripts[0].src, /@mcp-b\/global@5\.1\.0\/dist\/index\.iife\.js$/);
  assert.match(
    browser.scripts[1].src,
    /@mcp-b\/webmcp-local-relay@5\.1\.0\/dist\/browser\/embed\.js$/,
  );
  assert.equal(browser.scripts[1].dataset.relayPort, "9444");
  assert.equal(browser.scripts[1].dataset.requestTimeout, "120000");
  assert.equal(status.runtimeReady, true);
  assert.equal(status.relayLoaded, true);
});

test("MCP relay reuses an existing WebMCP runtime and deduplicates connection", async () => {
  const browser = fakeBrowser({ hasRuntime: true });
  const bridge = createMcpRelayBridge({ document: browser.document });

  await Promise.all([bridge.connect(), bridge.connect()]);

  assert.equal(browser.scripts.length, 1);
  assert.match(
    browser.scripts[0].src,
    /@mcp-b\/webmcp-local-relay@5\.1\.0\/dist\/browser\/embed\.js$/,
  );
});

test("MCP relay validates local relay configuration", async () => {
  const browser = fakeBrowser({ hasRuntime: true });
  const bridge = createMcpRelayBridge({ document: browser.document });

  await assert.rejects(bridge.connect({ port: 70000 }), /between 1 and 65535/);
  await assert.rejects(
    bridge.connect({ requestTimeoutMs: 700000 }),
    /between 1 and 600000/,
  );
});
