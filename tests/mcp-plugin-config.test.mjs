import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}

test("local MCP config uses the pinned origin-restricted WebMCP relay", async () => {
  const config = await readJson(".mcp.json");
  const server = config.mcpServers?.lum_browser;

  assert.equal(server?.type, "stdio");
  assert.equal(server?.command, "npx");
  assert.ok(server.args.includes("@mcp-b/webmcp-local-relay@5.1.0"));
  assert.ok(!server.args.some((entry) => String(entry).includes("@latest")));
  const originIndex = server.args.indexOf("--widget-origin");
  assert.ok(originIndex >= 0);
  assert.equal(
    server.args[originIndex + 1],
    "http://localhost:5173,http://localhost:4173,https://xtreemze.github.io",
  );
});

test("portable Agent Plugins MCP config matches the local relay contract", async () => {
  const config = await readJson("mcp.json");
  const server = config.mcpServers?.lum_browser;

  assert.equal(
    config.$schema,
    "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  );
  assert.equal(server?.type, "stdio");
  assert.equal(server?.command, "npx");
  assert.ok(server.args.includes("@mcp-b/webmcp-local-relay@5.1.0"));
});

test("portable plugin manifest identifies the Lūm MCP package", async () => {
  const manifest = await readJson("plugin.json");

  assert.equal(
    manifest.$schema,
    "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  );
  assert.equal(manifest.name, "lum-continuum");
  assert.match(manifest.description, /MCP/i);
  assert.equal(manifest.extensions?.["com.openai"]?.interface?.displayName, "Lūm Continuum");
});

test("application exposes an explicit MCP relay opt-in", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(source, /TimelineMCPRelay/);
  assert.match(source, /searchParams\.get\("mcp-relay"\) === "1"/);
  assert.match(source, /timelineMcpRelay\.connect\(\)/);
  assert.match(source, /webMcpRegistration\?\.registered/);
});
