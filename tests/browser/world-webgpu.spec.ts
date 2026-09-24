import { expect, test } from "@playwright/test";

/**
 * The WorldSurface prefers WebGPU and falls back to WebGL2. Chromium's
 * software Vulkan (SwiftShader) gives CI a real WebGPU adapter, so this spec
 * proves the production app negotiates WebGPU and still draws and responds.
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

test("the production world renders on WebGPU and falls back to WebGL on request", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chrome", "one engine run is enough");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
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

  await page.goto("/?renderer=webgl");
  await expect(page.locator(".temporal-graph-canvas").first()).toHaveAttribute(
    "data-world-renderer",
    "webgl",
  );
  expect(errors).toEqual([]);
});
