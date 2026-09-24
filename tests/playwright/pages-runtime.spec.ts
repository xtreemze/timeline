import { expect, test } from "@playwright/test";

test("built Pages shell boots application runtime on mobile", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto("/timeline/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  const shell = page.locator("#app-shell");
  const edit = page.locator("#editor-toggle");
  const browse = page.locator("#timeline-browser-toggle");
  const view = page.locator("#timeline-view-controls-toggle");
  const project = page.locator("#project-menu-toggle");

  await expect(shell).toHaveAttribute("data-mode", "view");
  await expect(edit.locator(".semantic-icon")).toHaveCount(1);
  await expect(browse.locator(".semantic-icon")).toHaveCount(1);
  await expect(view.locator(".semantic-icon")).toHaveCount(1);

  await project.click();
  await expect(page.locator("#project-menu:popover-open")).toBeVisible();
  await expect(page.locator("#load-sample")).toBeEnabled();
  await expect(page.locator("#import-json-trigger")).toBeEnabled();
  await expect(page.locator("#import-interchange-trigger")).toBeEnabled();
  await expect(page.locator("#export-json")).toBeEnabled();
  await expect(page.locator("#export-interchange")).toBeEnabled();
  await expect(page.locator("#export-markdown")).toBeEnabled();
  await expect(page.locator("#clear-timeline")).toBeEnabled();
  await expect(page.locator('#project-menu a[role="menuitem"]')).toBeVisible();
  await page.keyboard.press("Escape");

  await edit.click();
  await expect(shell).toHaveAttribute("data-mode", "edit");
  await expect(page.locator("#control-panel")).toBeVisible();
  await expect(edit.locator(".app-tool-label")).toHaveText("Done");

  await project.click();
  await expect(page.locator("#project-menu:popover-open")).toBeVisible();
  await expect(page.locator("#load-sample")).toBeEnabled();
  await expect(page.locator("#import-json-trigger")).toBeEnabled();
  await expect(page.locator("#clear-timeline")).toBeEnabled();

  expect(pageErrors).toEqual([]);
});


test("project load and clear mutate persisted state from view mode", async ({ page }) => {
  const response = await page.goto("/timeline/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  const shell = page.locator("#app-shell");
  const project = page.locator("#project-menu-toggle");

  await expect(shell).toHaveAttribute("data-mode", "view");

  await project.click();
  await page.locator("#load-sample").click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem("timeline:v2") || "{}");
        return Array.isArray(saved.items) ? saved.items.length : 0;
      }),
    )
    .toBeGreaterThan(0);
  await expect(page.locator("#item-count")).not.toHaveText("0");
  await expect(shell).toHaveAttribute("data-mode", "view");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Clear this timeline?");
    await dialog.accept();
  });

  await project.click();
  await page.locator("#clear-timeline").click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem("timeline:v2") || "{}");
        return {
          items: Array.isArray(saved.items) ? saved.items.length : -1,
          stories: Array.isArray(saved.stories) ? saved.stories.length : -1,
          entities: Array.isArray(saved.entities) ? saved.entities.length : -1,
          places: Array.isArray(saved.places) ? saved.places.length : -1,
          relationships: Array.isArray(saved.relationships) ? saved.relationships.length : -1,
        };
      }),
    )
    .toEqual({ items: 0, stories: 0, entities: 0, places: 0, relationships: 0 });

  await expect(page.locator("#item-count")).toHaveText("0");
  await expect(shell).toHaveAttribute("data-mode", "view");
});
