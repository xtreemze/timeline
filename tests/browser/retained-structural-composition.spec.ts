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
    Object.assign(root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      margin: "0",
      background: "var(--paper, white)",
    });

    const orientationToggle = document.createElement("button");
    orientationToggle.id = "timeline-orientation-toggle";
    orientationToggle.type = "button";
    orientationToggle.textContent = "Orientation";

    const readout = document.createElement("div");
    readout.className = "timeline-window-readout";

    const surface = document.createElement("div");
    surface.className = "timeline-surface";
    surface.tabIndex = 0;
    Object.assign(surface.style, {
      width: "100%",
      height: "min(70dvh, 520px)",
      position: "relative",
    });

    const focusView = document.createElement("div");
    focusView.className = "timeline-focus-view";
    focusView.setAttribute("popover", "manual");

    root.append(orientationToggle, readout, surface, focusView);
    document.body.append(root);

    const timelineViewModulePath = "/timeline-view.ts";
    const { TimelineView } = await import(timelineViewModulePath);
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

async function activateOccurrence(terminal, testInfo) {
  if (testInfo.project.use.hasTouch) await terminal.tap();
  else await terminal.click();
}

async function dispatchCameraGesture(surface, pointerType, { cancel = false } = {}) {
  const box = await surface.boundingBox();
  if (!box) throw new Error("Timeline surface has no bounding box.");
  const pointerId = 71;
  const startX = box.x + box.width * 0.65;
  const endX = box.x + box.width * 0.56;
  const y = box.y + box.height * 0.6;

  await surface.dispatchEvent("pointerdown", {
    pointerId,
    pointerType,
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: startX,
    clientY: y,
  });
  await surface.dispatchEvent("pointermove", {
    pointerId,
    pointerType,
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: endX,
    clientY: y,
  });

  return async () => {
    await surface.dispatchEvent(cancel ? "pointercancel" : "pointerup", {
      pointerId,
      pointerType,
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: endX,
      clientY: y,
    });
  };
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
  await terminal.evaluate((element) => {
    element.closest(".timeline-event")?.setAttribute("data-tdd-identity", "focused-occurrence");
  });

  await activateOccurrence(terminal, testInfo);
  await expect(root).toHaveAttribute("data-scene-state", "focused");

  await page.evaluate(() => {
    globalThis.__retainedStructuralTddController?.setOrientation("vertical");
  });
  await frame(page);

  await expect(root.locator('[data-tdd-identity="focused-occurrence"]')).toHaveCount(1);
  await expect(root).toHaveAttribute("data-scene-state", "focused");
  await expect(root).toHaveAttribute("data-orientation", "portrait");
});

test(
  "#269 retained focus identity survives a buffered camera interaction",
  async ({ page }, testInfo) => {
    const root = page.locator("#tdd-timeline-view");
    const terminal = root
      .locator(".timeline-event:not(.timeline-cluster) .timeline-event-terminal:visible")
      .first();

    await terminal.evaluate((element) => {
      element.dataset.tddFocusIdentity = "keyboard-target";
      element.closest(".timeline-event")?.setAttribute("data-tdd-identity", "focused-occurrence");
      element.focus();
    });
    await expect(terminal).toBeFocused();
    await page.evaluate(() => {
      globalThis.__retainedStructuralTddController?.focusItem?.("occurrence-a", {
        moveViewport: false,
      });
    });
    await expect(root).toHaveAttribute("data-scene-state", "focused");

    const surface = root.locator(".timeline-surface");
    const finish = await dispatchCameraGesture(
      surface,
      testInfo.project.use.hasTouch ? "touch" : "mouse",
    );
    await frame(page);

    await expect(root).toHaveAttribute("data-scene-state", "interacting");
    await expect(root.locator('[data-tdd-identity="focused-occurrence"]')).toHaveCount(1);
    if (!testInfo.project.use.hasTouch) await expect(terminal).toBeFocused();

    await finish();
    await frame(page);

    await expect(root).toHaveAttribute("data-scene-state", "focused");
    await expect(root.locator('[data-tdd-identity="focused-occurrence"]')).toHaveCount(1);
    if (!testInfo.project.use.hasTouch) await expect(terminal).toBeFocused();
  },
);

test("#271 live retained renderer reports interaction and commit metrics", async ({ page }, testInfo) => {
  const root = page.locator("#tdd-timeline-view");
  await page.evaluate(() => {
    globalThis.__retainedStructuralTddController?.resetPerformanceMetrics();
  });

  const surface = root.locator(".timeline-surface");
  const finish = await dispatchCameraGesture(
    surface,
    testInfo.project.use.hasTouch ? "touch" : "mouse",
    { cancel: true },
  );
  await frame(page);
  await finish();
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
