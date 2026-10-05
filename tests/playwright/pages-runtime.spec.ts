import { expect, test } from "@playwright/test";

test("built Pages shell boots application runtime on mobile", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto("/timeline/lum/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  const shell = page.locator("#app-shell");
  const edit = page.locator("#editor-toggle");
  const browse = page.locator("#timeline-browser-toggle");
  const view = page.locator("#timeline-view-controls");
  const project = page.locator("#project-menu-toggle");

  await expect(shell).toHaveAttribute("data-mode", "view");
  await expect(edit.locator(".semantic-icon")).toHaveCount(1);
  await expect(browse.locator(".semantic-icon")).toHaveCount(1);
  await expect(view).toBeVisible();
  await expect(view.locator("#timeline-orientation-toggle .semantic-icon")).toHaveCount(1);
  await expect(view.locator(".world-camera-control .semantic-icon").first()).toHaveCount(1);

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

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.locator("#clear-timeline").click();
  await expect(page.locator("#timeline-title")).toHaveValue("");
  await expect(page.locator("#item-count")).toHaveText("0 items");
  await expect(shell).toHaveAttribute("data-mode", "view");

  await project.click();
  await expect(page.locator("#project-menu:popover-open")).toBeVisible();
  await page.locator("#load-sample").click();
  await expect(page.locator("#timeline-title")).toHaveValue(
    "Nine classic tales — distributed fictional casebook",
  );
  await expect(page.locator("#item-count")).not.toHaveText("0 items");
  await expect(shell).toHaveAttribute("data-mode", "view");
  await page.keyboard.press("Escape");

  await edit.click();
  expect(pageErrors).toEqual([]);
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

test("built Pages runtime initializes the production WorldSurface", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (/Failed to initialize the deck\.gl world view|ReferenceError/.test(message.text())) {
      runtimeErrors.push(message.text());
    }
  });

  const response = await page.goto("/timeline/lum/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  const webgl2 = await page.evaluate(() =>
    Boolean(document.createElement("canvas").getContext("webgl2")),
  );
  test.skip(!webgl2, "WebGL2 unavailable; the legacy fallback is expected.");

  const worldStatus = page.locator('.temporal-graph-canvas [role="status"]');
  await expect(worldStatus).toContainText(
    /World view: [1-9]\d* places?, [1-9]\d* relationships?, [1-9]\d* entit/,
  );
  await expect(page.locator(".temporal-graph-canvas canvas").first()).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
