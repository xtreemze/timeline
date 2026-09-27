import { expect, test } from "@playwright/test";

test("deployed GitHub Pages boots and renders the WorldSurface", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto("./", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  const shell = page.locator("#app-shell");
  await expect(shell).toBeVisible();

  const worldStatus = page.locator('.temporal-graph-canvas [role="status"]');
  await expect(worldStatus).toContainText(
    /World view: [1-9]\d* places?, [1-9]\d* relationships?, [1-9]\d* entit/,
  );

  const canvas = page.locator(".temporal-graph-canvas canvas").first();
  await expect(canvas).toBeVisible();

  const renderer = page.locator("[data-world-renderer]").first();
  await expect(renderer).toHaveAttribute("data-world-renderer", /webgl|webgpu/);

  const fit = page.getByRole("button", { name: "Fit to content" });
  await expect(fit).toBeVisible();
  await fit.click();

  const outline = page.getByRole("navigation", { name: "World objects" });
  const firstEntity = outline
    .locator("h2", { hasText: "Entities" })
    .locator("xpath=following-sibling::ul[1]//button")
    .first();
  await expect(firstEntity).toBeVisible();
  await firstEntity.focus();
  await page.keyboard.press("Enter");
  await expect(worldStatus).toContainText("Selected entity");

  await page.waitForTimeout(250);
  expect(pageErrors).toEqual([]);
});
