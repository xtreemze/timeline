import { expect, type Locator, type Page, test } from "@playwright/test";
import { touchscreen } from "../support/touch-gestures.ts";

async function twoFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function installContinuityFixture(page: Page) {
  await page.evaluate(async () => {
    document.querySelector("#timeline-continuity-host")?.remove();

    const root = document.createElement("section");
    root.id = "timeline-continuity-host";
    root.className = "timeline-view";
    Object.assign(root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      background: "white",
    });

    const surface = document.createElement("div");
    surface.className = "timeline-surface";
    surface.tabIndex = 0;
    Object.assign(surface.style, {
      width: "100vw",
      height: "min(72dvh, 560px)",
      position: "relative",
    });

    const readout = document.createElement("output");
    readout.className = "timeline-window-readout";

    const focus = document.createElement("div");
    focus.className = "timeline-focus-view";
    focus.setAttribute("popover", "manual");

    root.append(surface, readout, focus);
    document.body.append(root);

    const { TimelineView } = await import(/* @vite-ignore */ "/timeline-view.ts");
    const controller = TimelineView.create(root);
    if (!controller) throw new Error("Timeline continuity fixture did not initialize.");

    const origin = Date.parse("2026-01-01T00:00:00Z");
    const day = 86_400_000;
    controller.setItems([
      { id: "continuity-a", kind: "event", title: "A", start: origin, startLabel: "A" },
      {
        id: "continuity-probe",
        kind: "event",
        title: "Continuity probe",
        start: origin + day * 23,
        startLabel: "Probe",
      },
      { id: "continuity-e", kind: "event", title: "E", start: origin + day * 45, startLabel: "E" },
    ]);
    controller.fitAll();

    Reflect.set(globalThis, "__timelineContinuityController", controller);
  });
  await twoFrames(page);
}

async function sampleProbe(page: Page) {
  return page.locator('#timeline-continuity-host .timeline-event[data-id="continuity-probe"]');
}

async function dragAndSample(
  page: Page,
  surface: Locator,
  orientation: "horizontal" | "vertical",
  pointerType: "mouse" | "touch",
) {
  const box = await surface.boundingBox();
  if (!box) throw new Error("Timeline continuity surface has no bounding box.");

  const start =
    orientation === "horizontal"
      ? { x: box.x + box.width * 0.72, y: box.y + box.height * 0.54 }
      : { x: box.x + box.width * 0.54, y: box.y + box.height * 0.72 };
  const end =
    orientation === "horizontal"
      ? { x: box.x + box.width * 0.28, y: start.y }
      : { x: start.x, y: box.y + box.height * 0.28 };

  const finger = pointerType === "touch" ? await touchscreen(page) : null;
  if (finger) {
    await finger.move([start]);
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
  }

  const samples: Array<{
    side: string | null;
    transform: string;
    primary: number;
    cross: number;
    identity: string | null;
  }> = [];

  for (let step = 1; step <= 12; step += 1) {
    const ratio = step / 12;
    const clientX = start.x + (end.x - start.x) * ratio;
    const clientY = start.y + (end.y - start.y) * ratio;
    if (finger) {
      await finger.move([{ x: clientX, y: clientY }]);
    } else {
      await page.mouse.move(clientX, clientY);
    }
    await twoFrames(page);

    const probe = await sampleProbe(page);
    const sample = await probe.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const horizontal =
        node.closest(".timeline-view")?.getAttribute("data-orientation") !== "portrait";
      return {
        side: (node as HTMLElement).dataset.side ?? null,
        transform: (node as HTMLElement).style.transform,
        primary: horizontal ? rect.x : rect.y,
        cross: horizontal ? rect.y : rect.x,
        identity: (node as HTMLElement).dataset.continuityIdentity ?? null,
      };
    });
    samples.push(sample);
  }

  if (finger) {
    await finger.end();
  } else {
    await page.mouse.up();
  }
  await twoFrames(page);
  return samples;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await installContinuityFixture(page);
});

for (const orientation of ["horizontal", "vertical"] as const) {
  test(`retained timeline preserves geometric continuity during ${orientation} drag`, async ({
    page,
  }, testInfo) => {
    const root = page.locator("#timeline-continuity-host");
    const surface = root.locator(".timeline-surface");
    const probe = await sampleProbe(page);

    if (orientation === "vertical") {
      await page.evaluate(() => {
        const controller = Reflect.get(globalThis, "__timelineContinuityController") as
          | { setOrientation(value: string): void }
          | undefined;
        controller?.setOrientation("vertical");
      });
      await twoFrames(page);
    }

    await expect(probe).toBeVisible();
    await probe.evaluate((node) => {
      (node as HTMLElement).dataset.continuityIdentity = "probe-stable-dom";
    });

    const pointerType = testInfo.project.use.hasTouch ? "touch" : "mouse";
    const samples = await dragAndSample(page, surface, orientation, pointerType);

    expect(samples.length).toBe(12);
    expect(new Set(samples.map((sample) => sample.identity))).toEqual(
      new Set(["probe-stable-dom"]),
    );
    expect(new Set(samples.map((sample) => sample.side)).size).toBe(1);
    expect(samples.every((sample) => sample.transform.startsWith("translate3d("))).toBeTruthy();

    const primary = samples.map((sample) => sample.primary);
    const cross = samples.map((sample) => sample.cross);
    expect(Math.max(...primary) - Math.min(...primary)).toBeGreaterThan(48);
    expect(Math.max(...cross) - Math.min(...cross)).toBeLessThanOrEqual(2);

    await expect(root).not.toHaveAttribute("data-scene-state", "interacting");
    await expect(probe).toHaveAttribute("data-continuity-identity", "probe-stable-dom");
  });
}
