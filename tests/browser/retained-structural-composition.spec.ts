import { expect, test, type Locator, type Page } from "@playwright/test";

async function frame(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

async function activateOccurrence(terminal: Locator, hasTouch: boolean) {
  if (hasTouch) {
    await terminal.tap();
    return;
  }
  await terminal.click();
}

async function beginCameraDrag(page: Page, surface: Locator, hasTouch: boolean) {
  const box = await surface.boundingBox();
  if (!box) throw new Error("Timeline surface has no bounding box.");

  const start = { x: box.x + box.width * 0.68, y: box.y + box.height * 0.58 };
  const end = { x: box.x + box.width * 0.58, y: box.y + box.height * 0.58 };

  if (!hasTouch) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let step = 1; step <= 4; step += 1) {
      await page.mouse.move(
        start.x + ((end.x - start.x) * step) / 4,
        start.y + ((end.y - start.y) * step) / 4,
      );
      await frame(page);
    }
    return () => page.mouse.up();
  }

  const pointerId = 27;
  await surface.dispatchEvent("pointerdown", {
    pointerId,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: start.x,
    clientY: start.y,
  });

  for (let step = 1; step <= 4; step += 1) {
    await surface.dispatchEvent("pointermove", {
      pointerId,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: start.x + ((end.x - start.x) * step) / 4,
      clientY: start.y + ((end.y - start.y) * step) / 4,
    });
    await frame(page);
  }

  return () =>
    surface.dispatchEvent("pointerup", {
      pointerId,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: end.x,
      clientY: end.y,
    });
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

    const timelineViewModulePath = "/timeline-view.ts";
    const { TimelineView } = await import(/* @vite-ignore */ timelineViewModulePath);
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

test("#269 focused occurrence survives an orientation transaction", async ({ page }, testInfo) => {
  const root = page.locator("#tdd-timeline-view");
  const terminal = root
    .locator(".timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible")
    .first();
  await expect(terminal).toBeVisible();
  await terminal.evaluate((element) => {
    element.closest(".timeline-event")?.setAttribute("data-tdd-identity", "focused-occurrence");
  });

  await activateOccurrence(terminal, Boolean(testInfo.project.use.hasTouch));
  await expect(root).toHaveAttribute("data-scene-state", "focused");

  await page.evaluate(() => {
    globalThis.__retainedStructuralTddController?.setOrientation("vertical");
  });
  await frame(page);

  await expect(root.locator('[data-tdd-identity="focused-occurrence"]')).toHaveCount(1);
  await expect(root).toHaveAttribute("data-scene-state", "focused");
});

test("#269 keyboard focus identity survives a buffered camera interaction", async ({ page }, testInfo) => {
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
  const releaseCameraDrag = await beginCameraDrag(
    page,
    surface,
    Boolean(testInfo.project.use.hasTouch),
  );

  const focusedIdentity = await page.evaluate(
    () =>
      document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.tddFocusIdentity ?? null
        : null,
  );
  expect(focusedIdentity).toBe("keyboard-target");

  await releaseCameraDrag();
});


test("#271 live retained renderer reports interaction and commit metrics", async ({ page }, testInfo) => {
  const root = page.locator("#tdd-timeline-view");
  await page.evaluate(() => {
    globalThis.__retainedStructuralTddController?.resetPerformanceMetrics();
  });

  const surface = root.locator(".timeline-surface");
  const releaseCameraDrag = await beginCameraDrag(
    page,
    surface,
    Boolean(testInfo.project.use.hasTouch),
  );
  await releaseCameraDrag();

  await page.evaluate(() => {
    globalThis.__retainedStructuralTddController?.commitInteraction();
  });
  await frame(page);

  const summary = await page.evaluate(() =>
    globalThis.__retainedStructuralTddController?.getPerformanceMetrics(),
  );

  expect(summary).toBeTruthy();
  expect(summary.interaction.frameCount).toBeGreaterThan(0);
  expect(summary.commit.frameCount).toBeGreaterThan(0);
  expect(summary.interaction.destroyedNodes).toBe(0);
  expect(summary.retainedPeak).toBeGreaterThan(0);
  expect(summary.interaction.queryDurationMs).toBeGreaterThanOrEqual(0);
  expect(summary.commit.plannerDurationMs).toBeGreaterThanOrEqual(0);
  expect(summary.violations).toEqual([]);
});
