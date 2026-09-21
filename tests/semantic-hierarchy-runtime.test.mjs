import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("retained timeline pre-materializes the incoming semantic tick hierarchy", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /generateTicksForSpec\(extent, spec, 240\)/);
  assert.match(source, /incomingHierarchy =\s*this\.retention\.active/);
  assert.match(source, /selectedKey !== committedKey/);
  assert.match(source, /materializeTickHierarchy\([\s\S]*selectedSpec/);
  assert.match(source, /dataset\.incomingTickHierarchy = selectedKey/);
  assert.match(source, /dataset\.committedTickHierarchy = committedKey/);
});

test("incoming temporal context stays materialized and subdued until commit", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /node\.style\.opacity = "0\.35"/);
  assert.match(source, /dataset\.pendingHierarchy/);
  assert.match(source, /if \(!this\.retention\.active\)/);
  assert.match(source, /node\.style\.opacity = ""/);
  assert.match(source, /animateTemporalContextEntry\(node\)/);
});

test("outgoing hierarchy is removed only after replacement is committed", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(source, /retireTemporalContextNode\(node: HTMLElement\)/);
  assert.match(source, /animation\.addEventListener\([\s\S]*"finish"[\s\S]*node\.remove\(\)/);
  assert.match(source, /this\.tickScene\.delete\(key\);\s*this\.retireTemporalContextNode\(node\)/);
  assert.match(source, /this\.accentScene\.delete\(key\);\s*this\.retireTemporalContextNode\(node\)/);
});

test("reduced motion preserves hierarchy membership without interpolation", async () => {
  const source = await readFile(new URL("../site/timeline-view.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /if \(this\.reducedMotionQuery\?\.matches \|\| typeof node\.animate !== "function"\)/,
  );
  assert.match(source, /node\.remove\(\);\s*return;/);
});
