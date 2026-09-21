import { expect, test } from "@playwright/test";

test("semantic chronology preserves canonical reading order and focus parity", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline-view")).toBeVisible();

  await page.evaluate(() => {
    const host = document.createElement("section");
    host.id = "semantic-chronology-test-host";
    host.innerHTML = [
      '<div class="timeline-surface" tabindex="0"></div>',
      '<div class="timeline-focus-view" hidden></div>',
      '<output class="timeline-window-readout"></output>',
    ].join("");
    document.body.append(host);

    const api = globalThis.TimelineView;
    if (!api) throw new Error("TimelineView global is unavailable.");
    const controller = api.create(host);
    if (!controller) throw new Error("TimelineView controller was not created.");

    controller.setItems([
      {
        id: "rel-late",
        title: "Alice reported Bob",
        categoryName: "Relation",
        start: Date.parse("2026-09-21T12:00:00Z"),
        startLabel: "2026-09-21 12:00",
        editable: false,
      },
      {
        id: "legacy-item",
        title: "Legacy event",
        categoryName: "Event",
        start: Date.parse("2026-09-01T00:00:00Z"),
        startLabel: "2026-09-01",
      },
      {
        id: "rel-middle",
        title: "Alice worked Acme",
        categoryName: "Relation",
        start: Date.parse("2026-09-10T00:00:00Z"),
        startLabel: "2026-09-10",
        editable: false,
      },
    ]);
  });

  const list = page.locator("#semantic-chronology-test-host .timeline-semantic-list");
  await expect(list).toHaveAttribute("aria-label", "Chronological timeline navigation");

  const entries = list.locator(".timeline-semantic-occurrence");
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText("Legacy event");
  await expect(entries.nth(1)).toContainText("Alice worked Acme");
  await expect(entries.nth(2)).toContainText("Alice reported Bob");

  await entries.nth(1).focus();
  await expect(entries.nth(1)).toBeFocused();
  const revealed = await list.boundingBox();
  expect(revealed).not.toBeNull();
  expect(revealed!.width).toBeGreaterThan(100);
  expect(revealed!.height).toBeGreaterThan(40);

  await entries.nth(1).click();
  await expect(entries.nth(1)).toHaveAttribute("aria-current", "true");
  await expect(
    page.locator('#semantic-chronology-test-host .timeline-event[data-id="rel-middle"]'),
  ).toHaveClass(/is-selected/);
});
