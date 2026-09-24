import { expect, test, type Page } from "@playwright/test";

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

function dispatchTouchPointer(
  page: Page,
  type: "pointerdown" | "pointermove" | "pointerup",
  point: GraphPosition,
) {
  return page.evaluate(
    ({ eventType, x, y }) => {
      const canvas = document.querySelector<HTMLCanvasElement>("#touch-node-drag-fixture canvas");
      if (!canvas) throw new Error("Graph canvas not found");
      canvas.dispatchEvent(
        new PointerEvent(eventType, {
          pointerId: 41,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          buttons: eventType === "pointerup" ? 0 : 1,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
    },
    { eventType: type, ...point },
  );
}

test("long-press touch moves an Orb node", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, "touch-only graph interaction contract");
  expect(testInfo.project.use.hasTouch).toBe(true);
  await page.goto("/");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(async () => {
    const { createTouchGraphController } = await import("/orb-graph-test-helper.ts");
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

    const graph = createTouchGraphController(fixture);
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

  await dispatchTouchPointer(page, "pointerdown", startClient);
  await expect(fixture).toHaveAttribute("data-touch-drag", "holding");
  await expect(fixture).toHaveAttribute("data-touch-drag", "active");

  const beforeMove = await page.evaluate(() => window.__touchNodeGraph?.getNodePosition(1));
  if (!beforeMove) throw new Error("Graph node has no simulation position before drag");

  const dragClient = { x: startClient.x + 72, y: startClient.y + 24 };
  await dispatchTouchPointer(page, "pointermove", dragClient);

  await page.waitForFunction(
    ({ x, y }) => {
      const next = window.__touchNodeGraph?.getNodePosition(1);
      return Boolean(next && Math.hypot(next.x - x, next.y - y) > 5);
    },
    beforeMove,
  );

  const moved = await page.evaluate(() => window.__touchNodeGraph?.getNodePosition(1));
  if (!moved) throw new Error("Graph node has no simulation position after drag");
  expect(Math.hypot(moved.x - beforeMove.x, moved.y - beforeMove.y)).toBeGreaterThan(5);

  await dispatchTouchPointer(page, "pointerup", dragClient);
  await expect(fixture).not.toHaveAttribute("data-touch-drag");

  await page.evaluate(() => {
    window.__touchNodeGraph?.destroy();
    delete window.__touchNodeGraph;
    document.querySelector("#touch-node-drag-fixture")?.remove();
  });
});
