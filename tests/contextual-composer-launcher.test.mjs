import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("empty-world context request launches the existing footer occurrence composer at the picked coordinate", async () => {
  const [world, app] = await Promise.all([
    readFile(new URL("../site/world/deck-world-surface.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);

  assert.match(world, /new CustomEvent\("worldcontextrequest"[\s\S]*bubbles:\s*true[\s\S]*cancelable:\s*true/);
  assert.match(world, /position:\s*this\.unproject\(point,\s*0\)/);
  assert.match(world, /#handleTouchContextMenu[\s\S]*#dispatchAuthoringContext/);

  assert.match(
    app,
    /graphViewRoot\.addEventListener\("worldcontextrequest"[\s\S]*setOccurrenceComposerOpen\(true\)/,
  );
  assert.match(
    app,
    /worldcontextrequest[\s\S]*occurrenceComposer\.setWorldContext\(longitude, latitude, zoom\)/,
  );
  assert.doesNotMatch(app, /worldcontextrequest[\s\S]*luum-authoring-menu/);
});
