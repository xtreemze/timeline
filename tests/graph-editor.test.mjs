import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("graph editor exposes noun nodes, action edges, properties, and temporal ranges", async () => {
  const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(html, /id="tab-graph"/);
  assert.match(html, /id="panel-graph"/);
  assert.match(html, /id="graph-node-form"/);
  assert.match(html, /id="graph-node-properties"/);
  assert.match(html, /id="graph-edge-subject"/);
  assert.match(html, /id="graph-edge-predicate"/);
  assert.match(html, /id="graph-edge-object"/);
  assert.match(html, /id="graph-edge-properties"/);
  assert.match(html, /id="graph-edge-time-kind"/);
  assert.match(html, /id="graph-edge-date-range"/);
});

test("timeline includes an interactive temporal node-edge graph lens", async () => {
  const [html, source, css] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/temporal-graph-view.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="temporal-graph-view"/);
  assert.match(html, /class="temporal-graph-canvas"/);
  assert.match(source, /graphForWindow/);
  assert.match(source, /temporalState/);
  assert.match(source, /graphnodefocus/);
  assert.match(source, /layoutGraph/);
  assert.match(css, /\.temporal-graph-edge\.is-active/);
  assert.match(css, /\.temporal-graph-edge\.is-inactive/);
  assert.match(css, /\.temporal-graph-node/);
});

test("application provides CRUD handlers for graph nodes and labeled edges", async () => {
  const source = await readFile(new URL("../site/app.js", import.meta.url), "utf8");
  assert.match(source, /beginGraphNodeEdit/);
  assert.match(source, /removeGraphNode/);
  assert.match(source, /beginGraphEdgeEdit/);
  assert.match(source, /removeGraphEdge/);
  assert.match(source, /parseJsonObject/);
  assert.match(source, /buildGraphEdgeTime/);
  assert.match(source, /timelineviewportchange/);
  assert.match(source, /temporalGraphView\?\.setWindow/);
});
