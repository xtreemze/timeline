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
  assert.equal(manifest.version, "0.4.0");
  assert.match(manifest.description, /MCP/i);
  assert.equal(manifest.extensions?.["com.openai"]?.interface?.displayName, "Lūm Continuum");
});


test("public MCP template uses Streamable HTTP without inventing a deployment hostname", async () => {
  const config = await readJson("mcp.public.template.json");
  const server = config.mcpServers?.lum_public;

  assert.equal(server?.type, "streamable-http");
  assert.match(server?.url || "", /^https:\/\//);
  assert.match(server?.url || "", /\/mcp$/);
  assert.match(server?.url || "", /YOUR-LUM-MCP-HOST/);
});

test("portable document-to-story skill requires source-first generation and user verification", async () => {
  const skill = await readFile(
    new URL("../skills/document-to-lum-story/SKILL.md", import.meta.url),
    "utf8",
  );

  assert.match(skill, /Read all user-provided documents and text before authoring/i);
  assert.match(skill, /lum\.get_story_authoring_guide/);
  assert.match(skill, /lum\.stage_story_project/);
  assert.match(skill, /Do not add facts from model memory/i);
  assert.match(skill, /has not yet been factually verified/i);
});

test("application exposes an explicit MCP relay opt-in", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(source, /TimelineMCPRelay/);
  assert.match(source, /searchParams\.get\("mcp-relay"\) === "1"/);
  assert.match(source, /timelineMcpRelay\.connect\(\)/);
  assert.match(source, /webMcpRegistration\?\.registered/);
});
