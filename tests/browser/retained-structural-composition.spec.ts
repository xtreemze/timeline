import { expect, test } from "@playwright/test";

async function frame(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

async function installRetainedTimelineFixture(page) {
  await page.evaluate(async () => {
    document.querySelector("#tdd-timeline-view")?.remove();

    const root = document.createElement("section");
    root.id = "tdd-timeline-view";
    root.className = "timeline-view";

    const orientationToggle = document.createElement("button");
    orientationToggle.id = "timeline-orientation-toggle";
    orientationToggle.type = "button";
    orientationToggle.textContent = "Orientation";

    const readout = document.createElement("div");
    readout.className = "timeline-window-readout";

    const surface = document.createElement("div");
    surface.className = "timeline-surface";
    surface.tabIndex = 0;

    const focusView = document.createElement("div");
    focusView.className = "timeline-focus-view";
    focusView.setAttribute("popover", "manual");

    root.append(orientationToggle, readout, surface, focusView);
    document.body.append(root);
    surface.style.width = "900px";
    surface.style.height = "520px";
    surface.style.position = "relative";

    const { TimelineView } = await import("/timeline-view.ts");
    const controller = TimelineView.create(root);
    if (!controller) throw new Error("Timeline fixture controller did not initialize");

    controller.setItems([
      {
        id: "occurrence-a",
        kind: "event",
        title: "Alpha occurrence",
        start: Date.parse("2026-01-01T09:00:00Z"),
        startLabel: "1 Jan 2026",
      },
    ]);

    Object.assign(globalThis, { __retainedStructuralTddController: controller });
  });
  await frame(page);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await installRetainedTimelineFixture(page);
  await expect(
    page
      .locator(
        "#tdd-timeline-view .timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible",
      )
      .first(),
  ).toBeVisible();
});

test("#269 focused occurrence survives an orientation transaction", async ({ page }) => {
  const root = page.locator("#tdd-timeline-view");
  const terminal = root
    .locator(".timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible")
    .first();
  await expect(terminal).toBeVisible();
  await terminal.evaluate((element) => {
    element.closest(".timeline-event")?.setAttribute("data-tdd-identity", "focused-occurrence");
  });

  await terminal.click();
  await expect(root).toHaveAttribute("data-scene-state", "focused");

  await page.evaluate(() => {
    globalThis.__retainedStructuralTddController?.setOrientation("vertical");
  });
  await frame(page);

  await expect(root.locator('[data-tdd-identity="focused-occurrence"]')).toHaveCount(1);
  await expect(root).toHaveAttribute("data-scene-state", "focused");
});

test("#269 keyboard focus identity survives a buffered camera interaction", async ({ page }) => {
  const root = page.locator("#tdd-timeline-view");
  const terminal = root
    .locator(".timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible")
    .first();
  await expect(terminal).toBeVisible();
  await terminal.evaluate((element) => {
    element.dataset.tddFocusIdentity = "keyboard-target";
    element.focus();
  });
  await expect(terminal).toBeFocused();

  const surface = root.locator(".timeline-surface");
  const box = await surface.boundingBox();
  if (!box) throw new Error("Timeline surface has no bounding box.");

  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.6, { steps: 3 });
  await frame(page);

  const focusedIdentity = await page.evaluate(
    () =>
      document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.tddFocusIdentity ?? null
        : null,
  );
  expect(focusedIdentity).toBe("keyboard-target");

  await page.mouse.up();
});
