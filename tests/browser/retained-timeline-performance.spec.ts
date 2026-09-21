import { expect, test } from "@playwright/test";

async function frame(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".timeline-surface")).toBeVisible();
});

test("#271 pointer cancellation settles the retained epoch and publishes metrics", async ({ page }) => {
  const root = page.locator("#timeline-view");
  const surface = page.locator(".timeline-surface");
  const box = await surface.boundingBox();
  if (!box) throw new Error("Timeline surface has no bounding box.");

  await root.evaluate((element) => {
    element.addEventListener(
      "timelineperformancemetrics",
      (event) => {
        globalThis.__timelinePerformanceSnapshot = event.detail;
      },
      { once: true },
    );
  });

  await surface.evaluate((element) => {
    element.addEventListener(
      "pointerdown",
      (event) => {
        globalThis.__timelinePointerId = event.pointerId;
      },
      { once: true },
    );
  });

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2, { steps: 2 });
  await expect(root).toHaveAttribute("data-scene-state", "interacting");

  const pointerId = await page.evaluate(() => globalThis.__timelinePointerId);
  await surface.dispatchEvent("pointercancel", {
    pointerId,
    pointerType: "mouse",
    clientX: box.x + box.width * 0.45,
    clientY: box.y + box.height / 2,
  });
  await frame(page);

  await expect(root).not.toHaveAttribute("data-scene-state", "interacting");
  const snapshot = await page.evaluate(() => globalThis.__timelinePerformanceSnapshot ?? null);
  expect(snapshot).not.toBeNull();
  expect(snapshot.interaction.frameCount).toBeGreaterThan(0);
  expect(snapshot.commit.frameCount).toBeGreaterThan(0);
});
