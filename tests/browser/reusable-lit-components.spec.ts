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

test("multiple composer instances own unique ARIA relationships", async ({ page }) => {
  await page.goto("/component-lab.html");

  await page.evaluate(() => {
    const first = document.querySelector("component-lab-composer");
    if (!first) throw new Error("missing composer");
    const second = document.createElement("component-lab-composer") as typeof first;
    (second as any).suggestions = (first as any).suggestions;
    first.parentElement?.append(second);
  });

  const composers = page.locator("component-lab-composer");
  await expect(composers).toHaveCount(2);

  const firstInput = composers.nth(0).getByRole("combobox");
  const secondInput = composers.nth(1).getByRole("combobox");
  const firstControls = await firstInput.getAttribute("aria-controls");
  const secondControls = await secondInput.getAttribute("aria-controls");

  expect(firstControls).toBeTruthy();
  expect(secondControls).toBeTruthy();
  expect(firstControls).not.toBe(secondControls);
  await expect(composers.nth(0).locator(`#${firstControls}`)).toHaveCount(1);
  await expect(composers.nth(1).locator(`#${secondControls}`)).toHaveCount(1);
});

test("IME composition never selects or commits intermediate text", async ({ page }) => {
  await page.goto("/component-lab.html");

  const composer = page.locator("component-lab-composer");
  const input = composer.getByRole("combobox");
  await input.focus();

  const result = await input.evaluate((element) => {
    let selections = 0;
    let commits = 0;
    element.closest("component-lab-composer")?.addEventListener("composer-selection-change", () => { selections += 1; });
    element.closest("component-lab-composer")?.addEventListener("composer-commit", () => { commits += 1; });

    element.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      composed: true,
      isComposing: true,
    }));
    element.dispatchEvent(new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      composed: true,
      isComposing: true,
    }));

    return { selections, commits };
  });

  expect(result).toEqual({ selections: 0, commits: 0 });
});

test("keyboard navigation skips disabled suggestions and supports boundaries", async ({ page }) => {
  await page.goto("/component-lab.html");

  const composer = page.locator("component-lab-composer");
  await composer.evaluate((element: any) => {
    element.suggestions = [
      { id: "first", label: "First" },
      { id: "disabled", label: "Unavailable", disabled: true },
      { id: "last", label: "Last" },
    ];
    element.value = "";
  });

  const input = composer.getByRole("combobox");
  await input.focus();
  await input.press("ArrowDown");
  await expect(composer.locator('[part="option"][data-active="true"]')).toContainText("Last");

  await input.press("Home");
  await expect(composer.locator('[part="option"][data-active="true"]')).toContainText("First");

  await input.press("End");
  await expect(composer.locator('[part="option"][data-active="true"]')).toContainText("Last");
});

test("retained timeline controller populates the host without Lit scene reconciliation", async ({ page }) => {
  await page.goto("/component-lab.html");

  const timeline = page.locator("component-lab-timeline");
  await expect(timeline.locator(".demo-timeline-rail")).toBeVisible();
  await expect(timeline.getByRole("button")).toHaveCount(3);
});
