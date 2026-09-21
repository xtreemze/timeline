import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const RESPONSIVE_DEBT_BASELINE = Object.freeze({
  "site/styles.css": 16,
  "site/timeline-view.css": 28,
});

function maxWidthMediaQueryCount(source) {
  return (source.match(/@media\s*\([^)]*max-width[^)]*\)/g) || []).length;
}

test("responsive CSS does not increase legacy max-width breakpoint debt", async () => {
  for (const [path, baseline] of Object.entries(RESPONSIVE_DEBT_BASELINE)) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const count = maxWidthMediaQueryCount(source);
    assert.ok(
      count <= baseline,
      `${path} contains ${count} max-width media queries; the mobile-first debt baseline is ${baseline}. ` +
        "Prefer narrow-screen defaults, min-width progressive enhancement, intrinsic layout, or container queries. " +
        "If a max-width condition is truly necessary, reduce or justify an existing case instead of increasing the debt. See #243.",
    );
  }
});

test("responsive architecture documents mobile-first and container-responsive rules", async () => {
  const source = await readFile(new URL("../docs/FRONTEND-UI-MOTION.md", import.meta.url), "utf8");
  assert.match(source, /Mobile-first responsive contract/);
  assert.match(source, /Prefer container queries/);
  assert.match(source, /prefer `min-width` progressive enhancements/);
  assert.match(source, /No essential action may depend on hover/);
  assert.match(source, /Touch\/coarse-pointer capability must not be inferred from viewport width/);
  assert.match(source, /#243/);
});
