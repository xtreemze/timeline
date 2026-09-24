import { expect, test } from "@playwright/test";
import { touchscreen } from "../support/touch-gestures.ts";

type GraphPosition = { x: number; y: number };
type GraphData = {
  nodes: Array<{ id: number; label: string; properties: { timelineType: string } }>;
  edges: never[];
};

interface TouchGraphController {
  setData(data: GraphData): void;
  recenter(): void;
  getNodePosition(id: number): GraphPosition | null;
  getNodeCanvasPosition(id: number): GraphPosition | null;
  destroy(): void;
}

declare global {
  interface Window {
    __touchNodeGraph?: TouchGraphController;
  }
}

test("long-press touch moves an Orb node", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, "touch-only graph interaction contract");
  expect(testInfo.project.use.hasTouch).toBe(true);
  await page.goto("/");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(async () => {
    const moduleUrl = "/temporal-graph-view-shim.ts";
    const { loadTimelineOrbGraph } = await import(moduleUrl);
    const TimelineOrbGraph = await loadTimelineOrbGraph();
    const fixture = document.createElement("div");
    fixture.id = "touch-node-drag-fixture";
    Object.assign(fixture.style, {
      position: "fixed",
      inset: "0 auto auto 0",
      width: "360px",
      height: "520px",
      zIndex: "2147483647",
      touchAction: "none",
      background: "white",
    });
    document.body.append(fixture);

    const graph = TimelineOrbGraph.create(fixture);
    if (!graph) throw new Error("Timeline Orb graph bridge unavailable");
    window.__touchNodeGraph = graph;
    graph.setData({
      nodes: [{ id: 1, label: "Touch node", properties: { timelineType: "person" } }],
      edges: [],
    });
  });

  const fixture = page.locator("#touch-node-drag-fixture");
  const canvas = fixture.locator("canvas");
  await expect(canvas).toBeVisible();

  await page.waitForFunction(() => Boolean(window.__touchNodeGraph?.getNodePosition(1)));
  await page.evaluate(() => window.__touchNodeGraph?.recenter());
  await page.waitForFunction(() => {
    const graph = window.__touchNodeGraph;
    const canvas = document.querySelector<HTMLCanvasElement>("#touch-node-drag-fixture canvas");
    const point = graph?.getNodeCanvasPosition(1);
    return Boolean(
      canvas &&
        point &&
        point.x >= 0 &&
        point.x <= canvas.clientWidth &&
        point.y >= 0 &&
        point.y <= canvas.clientHeight,
    );
  });

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Graph canvas has no layout box");

  const nodeCanvas = await page.evaluate(() => window.__touchNodeGraph?.getNodeCanvasPosition(1));
  if (!nodeCanvas) throw new Error("Graph node has no canvas position");

  const startClient = {
    x: box.x + nodeCanvas.x,
    y: box.y + nodeCanvas.y,
  };

  const finger = await touchscreen(page);
  await finger.move([startClient]);
  await expect(fixture).toHaveAttribute("data-touch-drag", "holding");
  await expect(fixture).toHaveAttribute("data-touch-drag", "active");

  const beforeMove = await page.evaluate(() => window.__touchNodeGraph?.getNodePosition(1));
  if (!beforeMove) throw new Error("Graph node has no simulation position before drag");

  const dragClient = { x: startClient.x + 72, y: startClient.y + 24 };
  await finger.move([dragClient]);

  await page.waitForFunction(({ x, y }) => {
    const next = window.__touchNodeGraph?.getNodePosition(1);
    return Boolean(next && Math.hypot(next.x - x, next.y - y) > 5);
  }, beforeMove);

  const moved = await page.evaluate(() => window.__touchNodeGraph?.getNodePosition(1));
  if (!moved) throw new Error("Graph node has no simulation position after drag");
  expect(Math.hypot(moved.x - beforeMove.x, moved.y - beforeMove.y)).toBeGreaterThan(5);

  await finger.end();
  await expect(fixture).not.toHaveAttribute("data-touch-drag");

  await page.evaluate(() => {
    window.__touchNodeGraph?.destroy();
    delete window.__touchNodeGraph;
    document.querySelector("#touch-node-drag-fixture")?.remove();
  });
});
