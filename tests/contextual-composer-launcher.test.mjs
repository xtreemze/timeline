import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("empty-world context request launches the existing footer occurrence composer at the picked coordinate", async () => {
  const [world, app] = await Promise.all([
    readFile(new URL("../site/world/deck-world-surface.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    world,
    /new CustomEvent\("worldcontextrequest"[\s\S]*bubbles:\s*true[\s\S]*cancelable:\s*true/,
  );
  assert.match(world, /position:\s*this\.unproject\(point,\s*0\)/);
  assert.match(world, /#handleTouchContextMenu[\s\S]*#dispatchAuthoringContext/);

  assert.match(
    app,
    /graphViewRoot\.addEventListener\("worldcontextrequest"[\s\S]*setOccurrenceComposerOpen\(true\)/,
  );
  assert.match(
    app,
    /worldcontextrequest[\s\S]*occurrenceComposer\.setWorldContext\([\s\S]*longitude,[\s\S]*latitude,[\s\S]*(?:zoom|Number\.isFinite\(zoom\))/,
  );
  assert.doesNotMatch(app, /worldcontextrequest[\s\S]*luum-authoring-menu/);
});

test("keyboard context invocation seeds authoring from the current world center", async () => {
  const world = await readFile(
    new URL("../site/world/deck-world-surface.ts", import.meta.url),
    "utf8",
  );

  assert.match(world, /event\.key === "ContextMenu"/);
  assert.match(world, /event\.shiftKey[\s\S]*event\.key === "F10"/);
  assert.match(
    world,
    /worldcontextrequest[\s\S]*longitude:\s*this\.#camera\.longitude[\s\S]*latitude:\s*this\.#camera\.latitude/,
  );
  assert.match(world, /#handleKeyDown[\s\S]*preventDefault/);
});
