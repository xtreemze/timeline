import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("embed timeline and graph stay domain-neutral and expose host branding tokens", async () => {
  const [timeline, graph, theme] = await Promise.all([
    readFile(new URL("../site/components/reusable/embed-timeline.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/reusable/embed-graph.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/reusable/embed-theme.ts", import.meta.url), "utf8"),
  ]);

  for (const source of [timeline, graph]) {
    assert.doesNotMatch(
      source,
      /src\/domain|src\/application|timeline-view|world-projection|occurrence|project-repository/,
    );
    assert.match(source, /luum-embed-select/);
    assert.match(source, /--luum-embed-ink/);
    assert.match(source, /--luum-embed-paper/);
    assert.match(source, /--luum-embed-accent/);
    assert.match(source, /--luum-embed-font/);
  }

  assert.match(theme, /--luum-embed-focus/);
  assert.match(theme, /--luum-embed-radius/);
  assert.match(theme, /--luum-embed-shadow/);
});

test("embed timeline accepts projected records without owning chronology", async () => {
  const source = await readFile(
    new URL("../site/components/reusable/embed-timeline.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /export interface EmbedTimelineItem/);
  assert.match(source, /items:/);
  assert.match(source, /selectedId/);
  assert.match(source, /part="rail"/);
  assert.match(source, /part="item"/);
  assert.doesNotMatch(source, /Date\.parse|new Date|Temporal\./);
});

test("embed graph accepts canonical ids and treats positions as disposable presentation input", async () => {
  const source = await readFile(
    new URL("../site/components/reusable/embed-graph.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /export interface EmbedGraphNode/);
  assert.match(source, /export interface EmbedGraphEdge/);
  assert.match(source, /sourceId/);
  assert.match(source, /targetId/);
  assert.match(source, /position/);
  assert.match(source, /resolvedPosition/);
  assert.doesNotMatch(source, /localStorage|indexedDB|fetch\(/);
});

test("production build exposes a stable cross-project embed module entry", async () => {
  const vite = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /embed:\s*new URL\("\.\/site\/embed-entry\.ts"/);
  assert.match(vite, /embed\/luum-embed\.js/);
});
