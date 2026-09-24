import { expect, type Page, test } from "@playwright/test";

/**
 * The production app's graph area must show the globe WorldSurface with the
 * loaded project on it, on the app's own (light) theme, and respond to
 * interaction. Regression coverage for the WorldSurface receiving no places
 * (nothing could be anchored), marks too pale for the app background, and a
 * camera left at a fixed overview instead of fitting the content.
 */

// WORLD_PALETTE.entity in site/world/deck-world-surface.ts.
const ENTITY_RGB = [37, 99, 235] as const;

async function graphCanvasBox(page: Page) {
  const canvas = page.locator(".temporal-graph-canvas canvas").first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("World canvas has no layout box.");
  return box;
}

/** Counts pixels of the entity colour and their horizontal/vertical spread. */
async function entityPixels(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
) {
  const png = (await page.screenshot({ clip })).toString("base64");
  return page.evaluate(
    async ({ data, rgb }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2D context unavailable.");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height).data;
      let count = 0;
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < pixels.length; index += 4) {
        const distance =
          Math.abs((pixels[index] ?? 0) - rgb[0]) +
          Math.abs((pixels[index + 1] ?? 0) - rgb[1]) +
          Math.abs((pixels[index + 2] ?? 0) - rgb[2]);
        if (distance > 60) continue;
        const pixel = index / 4;
        const x = pixel % image.width;
        const y = Math.floor(pixel / image.width);
        count += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      return {
        count,
        spreadX: count ? (maxX - minX) / image.width : 0,
        spreadY: count ? (maxY - minY) / image.height : 0,
      };
    },
    { data: png, rgb: ENTITY_RGB },
  );
}

test.describe("production WorldSurface in the app", () => {
  test("shows the loaded project on a fitted globe and responds to interaction", async ({
    page,
  }) => {
    const glErrors: string[] = [];
    page.on("console", (message) => {
      if (/WebGL: [A-Z_]+/.test(message.text())) glErrors.push(message.text());
    });
    page.on("pageerror", (error) => glErrors.push(error.message));
    await page.goto("/");
    const webgl2 = await page.evaluate(() =>
      Boolean(document.createElement("canvas").getContext("webgl2")),
    );
    test.skip(!webgl2, "WebGL2 unavailable; the Orb fallback is used instead.");

    const status = page.locator('.temporal-graph-canvas [role="status"]');
    await expect(status).toContainText(
      /World view: [1-9]\d* places?, [1-9]\d* relationships?, [1-9]\d* entit/,
    );

    const box = await graphCanvasBox(page);
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };

    // Opens on the whole rotatable globe turned towards the content; the
    // content fit is one control away.
    await expect(page.getByRole("button", { name: "Show whole globe" })).toBeVisible();
    await page.getByRole("button", { name: "Fit to content" }).click();

    await expect
      .poll(async () => (await entityPixels(page, clip)).count, {
        message: "entity marks must be drawn in a colour visible on the app background",
      })
      .toBeGreaterThan(40);
    const fitted = await entityPixels(page, clip);
    expect(
      Math.max(fitted.spreadX, fitted.spreadY),
      "the camera fits the content instead of leaving it as a speck",
    ).toBeGreaterThan(0.2);

    // Selection through the synchronized outline reaches the globe.
    const outline = page.getByRole("navigation", { name: "World objects" });
    const firstEntity = outline
      .locator("h2", { hasText: "Entities" })
      .locator("xpath=following-sibling::ul[1]//button")
      .first();
    await firstEntity.focus();
    await page.keyboard.press("Enter");
    await expect(status).toContainText("Selected entity");

    // Wheel input over the globe changes what is rendered (camera moves).
    const before = await page.screenshot({ clip });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -500);
    await expect
      .poll(async () => Buffer.compare(await page.screenshot({ clip }), before) !== 0)
      .toBe(true);

    // Visible camera controls: zoom in changes the view, fit restores it.
    const controls = page.getByRole("toolbar", { name: "Globe camera" });
    await expect(controls).toBeVisible();
    const beforeZoom = await page.screenshot({ clip });
    await controls.getByRole("button", { name: "Zoom in" }).click();
    await expect
      .poll(async () => Buffer.compare(await page.screenshot({ clip }), beforeZoom) !== 0)
      .toBe(true);
    await controls.getByRole("button", { name: "Fit to content" }).click();
    await expect
      .poll(async () => {
        const refit = await entityPixels(page, clip);
        return Math.max(refit.spreadX, refit.spreadY);
      })
      .toBeGreaterThan(0.2);
    expect(glErrors, "the world renders without WebGL or page errors").toEqual([]);
  });
});
