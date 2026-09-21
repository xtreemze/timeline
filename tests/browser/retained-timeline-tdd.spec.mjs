import { expect, test } from "@playwright/test";

async function frame(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".timeline-surface")).toBeVisible();
});

test("#267 occurrence DOM identity survives direct pan while retained", async ({
  page,
}) => {
  const event = page.locator(".timeline-event").first();
  await expect(event).toBeVisible();
  await event.evaluate((element) => {
    element.dataset.tddIdentity = "occurrence";
  });

  const surface = page.locator(".timeline-surface");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.5,
    box.y + box.height * 0.55,
    { steps: 3 },
  );
  await frame(page);

  await expect(
    page.locator('[data-tdd-identity="occurrence"]'),
  ).toHaveCount(1);
  await page.mouse.up();
});

test("#267 tick DOM identity survives an ordinary pan within one hierarchy", async ({
  page,
}) => {
  const tick = page.locator(".timeline-tick").first();
  await expect(tick).toBeVisible();
  await tick.evaluate((element) => {
    element.dataset.tddIdentity = "tick";
  });

  const surface = page.locator(".timeline-surface");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.52,
    box.y + box.height * 0.55,
    { steps: 2 },
  );
  await frame(page);

  await expect(page.locator('[data-tdd-identity="tick"]')).toHaveCount(1);
  await page.mouse.up();
});

test("#267 semantic zoom never exposes a blank temporal-context frame", async ({
  page,
}) => {
  await expect(page.locator(".timeline-tick").first()).toBeVisible();

  await page.locator(".timeline-stage").evaluate((stage) => {
    const state = {
      blanked: false,
      samples: 0,
    };
    globalThis.__retainedTimelineContextTdd = state;
    const observer = new MutationObserver(() => {
      state.samples += 1;
      const count = stage.querySelectorAll(
        ".timeline-tick, .timeline-month-accent, .timeline-axis-month-label",
      ).length;
      if (count === 0) state.blanked = true;
    });
    observer.observe(stage, { childList: true, subtree: true });
    globalThis.__retainedTimelineContextObserver = observer;
  });

  const surface = page.locator(".timeline-surface");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  for (let index = 0; index < 12; index += 1) {
    await page.mouse.wheel(0, -120);
  }
  await frame(page);

  const result = await page.evaluate(() => {
    globalThis.__retainedTimelineContextObserver?.disconnect();
    return globalThis.__retainedTimelineContextTdd;
  });

  expect(result.blanked).toBe(false);
});

test("#269 focused occurrence survives an orientation transaction", async ({
  page,
}) => {
  const event = page.locator(".timeline-event").first();
  await expect(event).toBeVisible();
  await event.evaluate((element) => {
    element.dataset.tddIdentity = "focused-occurrence";
  });

  await event.locator(".timeline-event-terminal").click();
  await expect(page.locator("#timeline-view")).toHaveAttribute(
    "data-scene-state",
    "focused",
  );

  await page.locator("#timeline-orientation-toggle").click();
  await frame(page);

  await expect(
    page.locator('[data-tdd-identity="focused-occurrence"]'),
  ).toHaveCount(1);
  await expect(page.locator("#timeline-view")).toHaveAttribute(
    "data-scene-state",
    "focused",
  );
});

test("#271 pointer cancellation always settles the retained interaction epoch", async ({
  page,
}) => {
  const surface = page.locator(".timeline-surface");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2, {
    steps: 2,
  });
  await expect(page.locator("#timeline-view")).toHaveAttribute(
    "data-scene-state",
    "interacting",
  );

  await surface.dispatchEvent("pointercancel", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + box.width * 0.45,
    clientY: box.y + box.height / 2,
  });
  await frame(page);

  await expect(page.locator("#timeline-view")).not.toHaveAttribute(
    "data-scene-state",
    "interacting",
  );
});
