import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("application owns WebMCP registration and disposes it on page lifecycle end", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");

  assert.match(source, /let webMcpRegistration: WebMcpRegistration \| null = null/);
  assert.match(source, /webMcpRegistration\?\.dispose\?\.\(\)/);
  assert.match(source, /webMcpRegistration = registration/);
  assert.match(source, /const disposeWebMcpRegistration = \(\): void =>/);
  assert.match(source, /webMcpRegistration = null/);
  assert.match(
    source,
    /window\.addEventListener\("pagehide", disposeWebMcpRegistration, \{ once: true \}\)/,
  );
});

test("registration failure handling no longer depends on an undeclared binding", async () => {
  const source = await readFile(new URL("../site/app.ts", import.meta.url), "utf8");
  const declaration = source.indexOf("let webMcpRegistration:");
  const assignment = source.indexOf("webMcpRegistration = registration");

  assert.ok(declaration >= 0);
  assert.ok(assignment > declaration);
});
