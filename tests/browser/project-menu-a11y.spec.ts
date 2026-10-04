import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/lum/");
  await expect(page.locator("#project-menu-toggle")).toBeVisible();
});

const visibleItems = (page: import("@playwright/test").Page) =>
  page.locator("#project-menu [role=menuitem]:visible");

test("opening the project menu moves focus to its first item and keeps one tab stop", async ({
  page,
}) => {
  const toggle = page.locator("#project-menu-toggle");
  await toggle.click();
  const items = visibleItems(page);
  await expect(page.locator("#project-menu")).toBeVisible();
  await expect(items.first()).toBeFocused();

  const tabStops = await page
    .locator("#project-menu [role=menuitem]")
    .evaluateAll((nodes) => nodes.filter((node) => (node as HTMLElement).tabIndex === 0).length);
  expect(tabStops).toBe(1);
});

test("arrow keys, Home and End move through menu items and wrap", async ({ page }) => {
  await page.locator("#project-menu-toggle").click();
  const items = visibleItems(page);
  const count = await items.count();
  await expect(items.first()).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(items.nth(count - 1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(items.nth(count - 1)).toBeFocused();
  await page.keyboard.press("Home");
  await expect(items.first()).toBeFocused();
});

test("Escape and Tab close the menu and return focus to its trigger", async ({ page }) => {
  const toggle = page.locator("#project-menu-toggle");
  await toggle.click();
  await expect(visibleItems(page).first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#project-menu")).toBeHidden();
  await expect(toggle).toBeFocused();

  await toggle.click();
  await expect(visibleItems(page).first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#project-menu")).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("menu exposes a valid ARIA structure and a stable trigger name", async ({ page }) => {
  const toggle = page.locator("#project-menu-toggle");
  await expect(toggle).toHaveAttribute("aria-haspopup", "menu");
  await expect(toggle).toHaveAttribute("aria-controls", "project-menu");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAttribute("aria-label", "Project actions");

  const structure = await page.locator("#project-menu").evaluate((menu) => ({
    role: menu.getAttribute("role"),
    // Only menuitems, groups and separators may be owned by a menu; headings or landmarks may not.
    groupRoles: [...menu.querySelectorAll("section")].map((node) => node.getAttribute("role")),
    describedby: menu.getAttribute("aria-describedby"),
    describedTextExists: Boolean(
      document.getElementById(menu.getAttribute("aria-describedby") ?? "__none__"),
    ),
    headerHidden: menu.querySelector("header")?.getAttribute("aria-hidden"),
  }));
  expect(structure.role).toBe("menu");
  expect(structure.groupRoles.every((role) => role === "group")).toBe(true);
  expect(structure.describedTextExists).toBe(true);
  expect(structure.headerHidden).toBe("true");
});
