import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("focus and orientation share the retained structural transaction boundary", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /runStructuralTransaction\(update: \(\) => void\)/);
  assert.match(source, /this\.beginInteraction\(\)/);
  assert.match(source, /this\.root\.dataset\.sceneState = "settling"/);
  assert.match(source, /document\.startViewTransition\(commit\)/);
  assert.match(source, /update\(\);\s*this\.commitInteraction\(\)/);
  assert.match(source, /activeElement\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /setOrientation[\s\S]*this\.runStructuralTransaction\(\(\) => \{/);
  assert.match(source, /focusItem[\s\S]*this\.runStructuralTransaction\(update\)/);
  assert.match(source, /closeFocus[\s\S]*this\.runStructuralTransaction\(update\)/);
});

test("structural transactions preserve reduced-motion semantic commits", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /!this\.reducedMotionQuery\?\.matches/);
  assert.match(source, /if \(canTransition\)[\s\S]*document\.startViewTransition\(commit\)/);
  assert.match(source, /}\s*commit\(\);\s*}/);
});
