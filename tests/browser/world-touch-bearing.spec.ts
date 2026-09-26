import { expect, test } from "@playwright/test";
import { swipe } from "../support/touch-gestures.ts";

async function gotoHarness(page: import("@playwright/test").Page) {
  await page.goto("/world-perf-harness.html");
  await page.waitForFunction(() => window.__worldPerfHarness?.ready === true);
  return page.evaluate(() => {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  });
}

test.describe("world single-touch bearing constraint", () => {
  test("one-finger diagonal globe pan preserves the bearing present at touch-down", async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(!isMobile || browserName !== "chromium", "Trusted touch certification is mobile Chromium.");
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const viewport = page.viewportSize();
    if (!viewport) throw new Error("World touch-bearing certification requires a viewport.");

    const before = await page.evaluate(async () => {
      const helpersModulePath = "/world-test-helpers.mjs";
      const { createWorldProjection } = await import(helpersModulePath);
      const harness = window.__worldPerfHarness;
      harness.surface.setProjection(createWorldProjection({ instances: [], edges: [] }));
      harness.surface.setCamera({
        longitude: 12,
        latitude: 58,
        zoom: 2.8,
        bearing: 27,
        pitch: 10,
      });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return harness.surface.getCamera();
    });

    await swipe(
      page,
      { x: viewport.width / 2, y: viewport.height / 2 },
      { dx: 120, dy: 90 },
      { speed: 260 },
    );

    await expect
      .poll(() => page.evaluate(() => window.__worldPerfHarness.surface.getCamera().longitude), {
        message: "one-finger pan should still move the globe",
      })
      .not.toBeCloseTo(before.longitude, 4);

    const after = await page.evaluate(() => window.__worldPerfHarness.surface.getCamera());
    expect(after.bearing, "single touch must not add globe roll").toBeCloseTo(before.bearing, 6);
    expect(after.pitch, "single touch must not change globe pitch").toBeCloseTo(before.pitch, 6);
  });
});

import type {} from "../../site/world-perf-harness.ts";
