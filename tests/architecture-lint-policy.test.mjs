import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const lintScript = fileURLToPath(new URL("../scripts/lint-architecture.mjs", import.meta.url));

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "timeline-architecture-lint-"));
  await Promise.all(
    ["config", "site", "src", "tests", "benchmarks"].map((directory) =>
      mkdir(path.join(root, directory), { recursive: true }),
    ),
  );
  await writeFile(
    path.join(root, "config", "architecture-lint-baseline.json"),
    JSON.stringify({
      typescript: {},
      css: {},
      architecture: { ambientTimelineGlobals: {}, directCanonicalMutations: {} },
    }),
  );
  await writeFile(
    path.join(root, "site", "index.html"),
    '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">',
  );
  await writeFile(path.join(root, "site", "styles.css"), "body { margin: 0; }\n");
  await writeFile(path.join(root, "site", "good.ts"), "export const good = true;\n");
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [lintScript], {
    cwd: root,
    encoding: "utf8",
  });
}

test("strict architecture lint accepts mobile-first pointer-neutral fixtures", async () => {
  const root = await fixture();
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
});

test("strict architecture lint rejects responsive repair antipatterns", async () => {
  const root = await fixture();
  await writeFile(
    path.join(root, "site", "styles.css"),
    `@container utility (max-width: 320px) {
  .app-shell {
    left: 0;
    width: 70vw;
    overflow: hidden;
  }
}
`,
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /mobile-first-container-query/);
  assert.match(result.stderr, /prefer-logical-properties/);
  assert.match(result.stderr, /no-viewport-width-sizing/);
  assert.match(result.stderr, /no-primary-surface-overflow-masking/);
});

test("strict architecture lint rejects split mouse-touch input paths and incomplete capture", async () => {
  const root = await fixture();
  await writeFile(
    path.join(root, "site", "input.ts"),
    `const target = document.createElement("div");
target.addEventListener("mousedown", () => {});
target.setPointerCapture?.(1);
`,
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pointer-events-only/);
  assert.match(result.stderr, /pointer-capture-needs-cancel/);
  assert.match(result.stderr, /pointer-capture-needs-lost-capture/);
});

test("strict architecture lint rejects viewport zoom restrictions and inline event handlers", async () => {
  const root = await fixture();
  await writeFile(
    path.join(root, "site", "index.html"),
    '<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no"><button onclick="void 0">Bad</button>',
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /viewport-meta-no-zoom-restrictions/);
  assert.match(result.stderr, /no-inline-event-handlers/);
});


test("strict architecture lint rejects ambient Timeline globals in core layers", async () => {
  const root = await fixture();
  await mkdir(path.join(root, "src", "projection"), { recursive: true });
  await writeFile(
    path.join(root, "src", "projection", "bad.ts"),
    "export const graph = globalThis.TimelineGraph;\n",
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no-ambient-timeline-global-in-core/);
});

test("strict architecture lint rejects direct canonical collection mutation from UI", async () => {
  const root = await fixture();
  await writeFile(
    path.join(root, "site", "mutation.ts"),
    "export function bad(state) { state.relationships.push({}); }\n",
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /direct-canonical-mutation/);
});

test("strict architecture lint enforces inward application dependency direction", async () => {
  const root = await fixture();
  await mkdir(path.join(root, "src", "application"), { recursive: true });
  await mkdir(path.join(root, "src", "projection"), { recursive: true });
  await writeFile(
    path.join(root, "src", "projection", "view.ts"),
    "export const view = true;\n",
  );
  await writeFile(
    path.join(root, "src", "application", "bad.ts"),
    'import { view } from "../projection/view.ts"; export const bad = view;\n',
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /application-dependency-direction/);
});

test("strict architecture lint keeps layout and interaction cores renderer-neutral", async () => {
  const root = await fixture();
  await mkdir(path.join(root, "src", "layout"), { recursive: true });
  await mkdir(path.join(root, "src", "interaction"), { recursive: true });
  await writeFile(
    path.join(root, "src", "layout", "bad.ts"),
    'export const width = document.documentElement.clientWidth;\n',
  );
  await writeFile(
    path.join(root, "src", "interaction", "bad.ts"),
    'export const frame = requestAnimationFrame(() => {});\n',
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /renderer-neutral-core/);
});

test("strict architecture lint prevents projections from importing layout or interaction", async () => {
  const root = await fixture();
  await mkdir(path.join(root, "src", "projection"), { recursive: true });
  await mkdir(path.join(root, "src", "layout"), { recursive: true });
  await writeFile(path.join(root, "src", "layout", "layout.ts"), "export const layout = true;\n");
  await writeFile(
    path.join(root, "src", "projection", "bad.ts"),
    'import { layout } from "../layout/layout.ts"; export const bad = layout;\n',
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /projection-dependency-direction/);
});


test("renderer adapter exception is restricted to the established GraphSurface seam", async () => {
  const root = await fixture();
  await mkdir(path.join(root, "src", "layout"), { recursive: true });
  await writeFile(
    path.join(root, "src", "layout", "graph-surface.ts"),
    "export interface SurfaceFactory { create(container: HTMLElement): unknown; }\n",
  );
  await writeFile(
    path.join(root, "src", "layout", "other-surface.ts"),
    "export const root = document.documentElement;\n",
  );

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /src\/layout\/other-surface\.ts: renderer-neutral-core/);
  assert.doesNotMatch(result.stderr, /src\/layout\/graph-surface\.ts: renderer-neutral-core/);
});
