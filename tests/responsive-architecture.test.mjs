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


function cssTransitionDeclarationCount(source) {
  return (source.match(/^[ \\t]*transition\\s*:/gm) || []).length;
}

function cssKeyframeCount(source) {
  return (source.match(/@keyframes\s+[A-Za-z0-9_-]+/g) || []).length;
}

test("presentation CSS does not reintroduce decorative transition or keyframe debt", async () => {
  const [styles, timeline] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8"),
  ]);

  assert.equal(
    cssTransitionDeclarationCount(styles),
    0,
    "site/styles.css should not animate state/layout with CSS transitions; interaction motion belongs to explicit browser/runtime primitives.",
  );
  assert.equal(
    cssTransitionDeclarationCount(timeline),
    0,
    "site/timeline-view.css should not animate timeline geometry with CSS transitions; retained interaction motion is requestAnimationFrame-driven.",
  );
  assert.equal(
    cssKeyframeCount(timeline),
    0,
    "timeline focus/navigation should use named View Transition participants without hand-authored CSS keyframes.",
  );
  assert.doesNotMatch(styles, /scroll-behavior:\\s*smooth/);
  assert.doesNotMatch(timeline, /scroll-behavior:\\s*smooth/);
});

test("application shell has no legacy fixed minimum page height", async () => {
  const source = await readFile(new URL("../site/styles.css", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.app-shell\s*\{[\s\S]{0,500}min-height:\s*780px/);
});
