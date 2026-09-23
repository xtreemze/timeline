import { expect, test } from "@playwright/test";

test("semantic chronology preserves canonical reading order and focus parity", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline-view")).toBeVisible();

  await page.evaluate(async () => {
    const host = document.createElement("section");
    host.id = "semantic-chronology-test-host";

    const surface = document.createElement("div");
    surface.className = "timeline-surface";
    surface.tabIndex = 0;
    const focus = document.createElement("div");
    focus.className = "timeline-focus-view";
    focus.hidden = true;
    const readout = document.createElement("output");
    readout.className = "timeline-window-readout";
    host.append(surface, focus, readout);
    document.body.append(host);

    const timelineViewModulePath = "/timeline-view.ts";
    const { TimelineView } = await import(/* @vite-ignore */ timelineViewModulePath);
    const controller = TimelineView.create(host);
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
  if (!revealed) throw new Error("Semantic chronology did not produce visible bounds.");
  expect(revealed.width).toBeGreaterThan(100);
  expect(revealed.height).toBeGreaterThan(40);

  await entries.nth(1).click();
  await expect(entries.nth(1)).toHaveAttribute("aria-current", "true");
  await expect(
    page.locator('#semantic-chronology-test-host .timeline-event[data-id="rel-middle"]'),
  ).toHaveClass(/is-selected/);
});
