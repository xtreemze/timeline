import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const RESPONSIVE_DEBT_BASELINE = Object.freeze({
  "site/styles.css": 15,
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


test("focused timeline styling stays free of legacy sizing and directional keyframes", async () => {
  const [styles, timeline] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(styles, /\.app-shell\s*\{[\s\S]{0,220}min-height:\s*780px/);
  assert.doesNotMatch(
    timeline,
    /@keyframes\s+timeline-(?:chronology|focus)-(?:open|close|old|new|forward|backward)/,
  );
  assert.doesNotMatch(timeline, /\b100vh\b/);
  assert.doesNotMatch(timeline, /timeline-focus-place-map/);
  assert.doesNotMatch(timeline, /grid-template-rows:\s*auto\s+minmax\(720px,\s*1fr\)/);
  assert.doesNotMatch(timeline, /(?:min-)?height:\s*720px/);
  assert.doesNotMatch(timeline, /height:\s*210px/);
  assert.doesNotMatch(
    timeline,
    /data-scene-state="interacting"[\s\S]{0,220}transition-duration:\s*80ms/,
  );
});
