import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#occurrence-composer .compact")).toBeVisible();
});

test("one composer card previews incomplete icons and chips select exact grammar spans", async ({
  page,
}) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');
  await input.fill("Alice(icon: pi");
  await expect(composer.locator(".composer-world-preview .preview-node").first()).toContainText(
    "Alice",
  );
  const before = await composer
    .locator(".composer-world-preview .preview-node svg path")
    .first()
    .getAttribute("d");
  const iconOption = composer.locator(".option").filter({ hasText: "icon: pig" });
  await expect(iconOption).toBeVisible();
  await iconOption.hover();
  const after = await composer
    .locator(".composer-world-preview .preview-node svg path")
    .first()
    .getAttribute("d");
  expect(after).not.toBe(before);
  await input.fill("@alice meets @bob at Stockholm");
  const place = composer.locator('.grammar-chip[aria-label^="Edit place:"]');
  await place.click();
  await expect
    .poll(() =>
      input.evaluate((element: HTMLInputElement) =>
        element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
      ),
    )
    .toBe("Stockholm");
  await expect(composer.locator('input[role="combobox"]')).toHaveCount(1);
});

test("unresolved clue remains editable and cannot be approved as a fact", async ({ page }) => {
  const composer = page.locator("#occurrence-composer");
  await composer.locator(".compact").click();
  const input = composer.locator('input[role="combobox"]');
  await input.fill("man? calls @alice");
  const clue = composer.locator(".qualifier-chip");
  await expect(clue).toHaveCount(1);
  await clue.click();
  await expect
    .poll(() =>
      input.evaluate((element: HTMLInputElement) =>
        element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
      ),
    )
    .toBe("man?");
  await composer.getByRole("button", { name: "Approve occurrence" }).click();
  await expect(composer.locator(".diagnostic")).toContainText("Resolve or persist");
  await expect(input).toHaveValue("man? calls @alice");
  await expect(composer.getByRole("button", { name: "Ask this question" })).toBeVisible();
  await expect(composer.getByRole("table", { name: "Candidate comparison" })).toBeVisible();
  await expect(composer.locator(".candidate-row")).not.toHaveCount(0);
  await expect(composer.getByRole("button", { name: "Compare candidates" })).toBeVisible();
  await expect(composer.locator(".option")).toHaveCount(0);
  await expect(composer.locator('.candidate-row[data-active="true"]')).toHaveCount(1);
  const firstCandidate = await composer.locator('.candidate-row[data-active="true"]').textContent();
  await input.press("ArrowDown");
  const secondCandidate = await composer.locator('.candidate-row[data-active="true"]').textContent();
  expect(secondCandidate).not.toBe(firstCandidate);
  await input.press("End");
  await expect(composer.locator('.candidate-row[data-active="true"]')).toContainText(
    "None of the currently known candidates",
  );
  const interpretationBefore = await composer
    .locator('.interpretation-chip[aria-pressed="true"]')
    .textContent();
  await input.press("ArrowRight");
  const interpretationAfter = await composer
    .locator('.interpretation-chip[aria-pressed="true"]')
    .textContent();
  expect(interpretationAfter).not.toBe(interpretationBefore);
  await expect(input).toHaveValue("man? calls @alice");
});
