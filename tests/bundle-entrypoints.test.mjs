import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createDeferredSpatialViewFactory } from "../site/deferred-spatial-view.ts";

test("deferred spatial view replays state after its renderer loads", async () => {
  let resolveFactory;
  const events = [];
  const factory = createDeferredSpatialViewFactory(
    () =>
      new Promise((resolve) => {
        resolveFactory = resolve;
      }),
  );

  const view = factory.create({});
  assert.ok(view);
  view.setModel({ id: "model" });
  view.setWindow({ start: 1, end: 2 });
  view.setFocus("alice");
  view.setPresentationMode?.(true);
  view.refreshLayout?.();

  resolveFactory({
    create() {
      return {
        setModel(value) {
          events.push(["model", value]);
        },
        setWindow(value) {
          events.push(["window", value]);
        },
        setFocus(value) {
          events.push(["focus", value]);
        },
        setPresentationMode(value) {
          events.push(["presentation", value]);
        },
        refreshLayout() {
          events.push(["refresh"]);
        },
      };
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events, [
    ["model", { id: "model" }],
    ["window", { start: 1, end: 2 }],
    ["focus", "alice"],
    ["presentation", true],
    ["refresh"],
  ]);
});

test("deferred spatial view reports renderer state replay failures", async () => {
  const errors = [];
  const factory = createDeferredSpatialViewFactory(
    async () => ({
      create() {
        return {
          setModel() {
            throw new Error("projection replay failed");
          },
          setWindow() {},
          setFocus() {},
        };
      },
    }),
    {
      onError(error) {
        errors.push(error);
      },
    },
  );

  const view = factory.create({});
  assert.ok(view);
  view.setModel({ id: "model" });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(errors.length, 1);
  assert.match(String(errors[0]), /projection replay failed/);
});

test("production entrypoints keep PDF, deck/luma, and Orb behind dynamic imports", async () => {
  const [app, worldShim, worldBindings, legacyShim] = await Promise.all([
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/world-view-shim.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/world/deck-world-bindings.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view-shim.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(app, /from\s+["']\.\.\/src\/evidence-extraction-entry\.js["']/);
  assert.match(app, /import\(["']\.\.\/src\/evidence-extraction-entry\.js["']\)/);

  assert.doesNotMatch(worldShim, /from\s+["']\.\/world\/deck-world-bindings\.ts["']/);
  assert.match(worldShim, /import\(["']\.\/world\/deck-world-bindings\.ts["']\)/);
  assert.doesNotMatch(
    worldBindings,
    /import\s+\{\s*webgpuAdapter\s*\}\s+from\s+["']@luma\.gl\/webgpu["']/,
  );
  assert.match(worldBindings, /import\(["']@luma\.gl\/webgpu["']\)/);

  assert.doesNotMatch(legacyShim, /from\s+["']\.\.\/src\/orb-graph-entry\.js["']/);
  assert.doesNotMatch(legacyShim, /from\s+["']\.\/temporal-graph-view\.ts["']/);
  assert.match(legacyShim, /import\(["']\.\/temporal-graph-view\.ts["']\)/);
});

test("Vite keeps the 500 kB warning meaningful instead of raising its threshold", async () => {
  const config = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.doesNotMatch(config, /chunkSizeWarningLimit/);
  assert.match(config, /codeSplitting/);
  assert.match(config, /maxSize:\s*400_000/);
});

test("Vite keeps deck.gl layers splittable without disabling the WebGPU build", async () => {
  const config = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(config, /@deck\.gl\/layers\/src\/index\.ts/);
  assert.doesNotMatch(config, /visgl:webgl-only/);
});
