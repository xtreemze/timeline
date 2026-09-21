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
    root.innerHTML = `
      <button id="tdd-orientation-toggle" type="button">Orientation</button>
      <div class="timeline-window-readout"></div>
      <div class="timeline-surface" tabindex="0"></div>
      <div class="timeline-focus-view" popover="manual"></div>
    `;
    document.body.append(root);

    const surface = root.querySelector(".timeline-surface");
    if (!(surface instanceof HTMLElement)) throw new Error("Missing timeline fixture surface");
    surface.style.width = "900px";
    surface.style.height = "520px";
    surface.style.position = "relative";

    const orientationToggle = root.querySelector("#tdd-orientation-toggle");
    orientationToggle?.setAttribute("id", "timeline-orientation-toggle");

    const { TimelineView } = await import("/timeline-view.ts");
    const controller = TimelineView.create(root);
    if (!controller) throw new Error("Timeline fixture controller did not initialize");

    controller.setItems([
      {
        id: "occurrence-a",
        kind: "event",
        title: "Alpha occurrence",
        start: Date.parse("2026-09-20T09:00:00Z"),
        startLabel: "20 Sep 2026",
      },
      {
        id: "occurrence-b",
        kind: "event",
        title: "Beta occurrence",
        start: Date.parse("2026-09-21T09:00:00Z"),
        startLabel: "21 Sep 2026",
      },
      {
        id: "occurrence-c",
        kind: "range",
        title: "Gamma range",
        start: Date.parse("2026-09-22T09:00:00Z"),
        end: Date.parse("2026-09-24T09:00:00Z"),
        startLabel: "22 Sep 2026",
        endLabel: "24 Sep 2026",
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
    page.locator("#tdd-timeline-view .timeline-event:not(.timeline-cluster):visible").first(),
  ).toBeVisible();
});

test("#269 focused occurrence survives an orientation transaction", async ({ page }) => {
  const root = page.locator("#tdd-timeline-view");
  const event = root.locator(".timeline-event:not(.timeline-cluster):visible").first();
  await expect(event).toBeVisible();
  await event.evaluate((element) => {
    element.dataset.tddIdentity = "focused-occurrence";
  });

  await event.locator(".timeline-event-terminal").click();
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
    .locator(".timeline-event:not(.timeline-cluster):visible .timeline-event-terminal")
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
