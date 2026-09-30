import { expect, test } from "@playwright/test";

test("composer supports filtered keyboard and multi-select interaction", async ({ page }) => {
  await page.goto("/component-lab.html");

  const composer = page.locator("component-lab-composer");
  const input = composer.getByRole("combobox");
  await input.fill("Ada");

  const option = composer.getByRole("option", { name: /Ada Lovelace/ });
  await expect(option).toBeVisible();
  await input.press("Space");

  await expect(composer.locator('[part="chip"]')).toContainText("Ada Lovelace");
  await expect(page.locator("[data-composer-output]")).toContainText("Ada Lovelace");
});

test("composer keeps active suggestion visible during navigation", async ({ page }) => {
  await page.goto("/component-lab.html");

  const input = page.locator("component-lab-composer").getByRole("combobox");
  await input.focus();
  await input.press("ArrowDown");
  await input.press("ArrowDown");

  const active = page.locator('component-lab-composer [part="option"][data-active="true"]');
  await expect(active).toBeVisible();
  await expect(active).toBeInViewport();
});

test("retained timeline controller populates the host without Lit scene reconciliation", async ({ page }) => {
  await page.goto("/component-lab.html");

  const timeline = page.locator("component-lab-timeline");
  await expect(timeline.locator(".demo-timeline-rail")).toBeVisible();
  await expect(timeline.getByRole("button")).toHaveCount(3);
});


test("retained timeline destroys and recreates its controller across disconnects", async ({ page }) => {
  await page.goto("/component-lab.html");

  const timeline = page.locator("component-lab-timeline");
  await expect(timeline.locator(".demo-timeline-rail")).toBeVisible();
  const firstGeneration = await timeline.getAttribute("data-controller-generation");
  expect(firstGeneration).toBeTruthy();

  await timeline.evaluate((element) => {
    const parent = element.parentElement;
    if (!parent) throw new Error("timeline has no parent");
    element.remove();
    (window as any).__detachedTimeline = element;
    (window as any).__timelineParent = parent;
  });

  await expect.poll(async () =>
    page.evaluate(() => (window as any).__detachedTimeline?.dataset.controllerDestroyed),
  ).toBe("true");

  await page.evaluate(() => {
    (window as any).__timelineParent.append((window as any).__detachedTimeline);
  });

  await expect(timeline.locator(".demo-timeline-rail")).toBeVisible();
  await expect(timeline.getByRole("button")).toHaveCount(3);
  await expect.poll(() => timeline.getAttribute("data-controller-generation")).not.toBe(firstGeneration);
  await expect(timeline.locator(".demo-timeline-rail")).toHaveCount(1);
});
