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

test("#269 focused occurrence survives an orientation transaction", async ({ page }) => {
  const event = page.locator(".timeline-event").first();
  await expect(event).toBeVisible();
  await event.evaluate((element) => {
    element.dataset.tddIdentity = "focused-occurrence";
  });

  await event.locator(".timeline-event-terminal").click();
  await expect(page.locator("#timeline-view")).toHaveAttribute("data-scene-state", "focused");

  await page.locator("#timeline-orientation-toggle").click();
  await frame(page);

  await expect(page.locator('[data-tdd-identity="focused-occurrence"]')).toHaveCount(1);
  await expect(page.locator("#timeline-view")).toHaveAttribute("data-scene-state", "focused");
});

test("#269 keyboard focus identity survives a buffered camera interaction", async ({ page }) => {
  const terminal = page.locator(".timeline-event-terminal").first();
  await expect(terminal).toBeVisible();
  await terminal.evaluate((element) => {
    element.dataset.tddFocusIdentity = "keyboard-target";
    element.focus();
  });
  await expect(terminal).toBeFocused();

  const surface = page.locator(".timeline-surface");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.6, { steps: 3 });
  await frame(page);

  const focusedIdentity = await page.evaluate(
    () => document.activeElement?.dataset?.tddFocusIdentity ?? null,
  );
  expect(focusedIdentity).toBe("keyboard-target");

  await page.mouse.up();
});
