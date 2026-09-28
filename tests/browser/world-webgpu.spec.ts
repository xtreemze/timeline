import { expect, test } from "@playwright/test";

/**
 * The WorldSurface keeps WebGL2 as the production default while WebGPU remains
 * an explicitly opted-in certification backend via `?renderer=webgpu`.
 * Chromium's software Vulkan (SwiftShader) gives CI a real WebGPU adapter.
 */
test.use({
  launchOptions: {
    args: [
      "--enable-unsafe-webgpu",
      "--use-webgpu-adapter=swiftshader",
      "--enable-features=Vulkan",
      "--use-vulkan=swiftshader",
      "--disable-vulkan-surface",
      "--ignore-gpu-blocklist",
    ],
  },
});

test("the production world defaults to WebGL2 and renders on WebGPU when opted in", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chrome", "one engine run is enough");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // Default production baseline remains WebGL2 while WebGPU parity is certified.
  await page.goto("/");
  await expect(page.locator(".temporal-graph-canvas").first()).toHaveAttribute(
    "data-world-renderer",
    "webgl",
  );

  await page.goto("/?renderer=webgpu");
  const container = page.locator(".temporal-graph-canvas").first();
  await expect(container).toHaveAttribute("data-world-renderer", "webgpu");
  await expect(container.locator('[role="status"]')).toContainText(/World view: [1-9]/);

  const canvas = container.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("World canvas has no layout box.");
  const before = await page.screenshot({ clip: box });
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect
    .poll(async () => Buffer.compare(await page.screenshot({ clip: box }), before) !== 0)
    .toBe(true);
  expect(errors).toEqual([]);
});
