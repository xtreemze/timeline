import { expect, test } from "@playwright/test";

const MARKER_RGB = [210, 63, 49];

/** Counts screenshot pixels close to `rgb` inside `clip`. */
async function colourPixels(page, clip, rgb) {
  const png = (await page.screenshot({ clip })).toString("base64");
  return page.evaluate(
    async ({ data, target }) => {
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
      for (let index = 0; index < pixels.length; index += 4) {
        const distance =
          Math.abs((pixels[index] ?? 0) - target[0]) +
          Math.abs((pixels[index + 1] ?? 0) - target[1]) +
          Math.abs((pixels[index + 2] ?? 0) - target[2]);
        if (distance <= 60) count += 1;
      }
      return count;
    },
    { data: png, target: rgb },
  );
}

async function mountMap(page, id, location) {
  await page.evaluate(
    async ({ id, location, colour }) => {
      const container = document.createElement("div");
      container.id = id;
      container.className = "presentation-map";
      // Above the full-screen app shell so screenshots and pointer input reach it.
      container.style.cssText =
        "position:fixed;inset-block-start:8px;inset-inline-start:8px;z-index:2147483647;width:360px;height:260px";
      document.body.append(container);
      const view = globalThis.TimelineLocationMap.createReadOnly({
        container,
        location,
        color: colour,
        label: location.name,
        interactive: false,
      });
      await view.ready;
    },
    { id, location, colour: `rgb(${MARKER_RGB.join(",")})` },
  );
}

test("the place marker survives a complete basemap failure", async ({ page }) => {
  // The vector basemap is the only geography data the map loads.
  await page.route(/countries-110m/, (route) => route.abort());
  await page.goto("/");

  await mountMap(page, "map-resilience-test", {
    name: "Test place",
    geometry: { type: "Point", coordinates: [18.0686, 59.3293] },
    style: { marker: { color: "#d23f31" } },
  });

  const map = page.locator("#map-resilience-test");
  await expect(map).toHaveAttribute("data-map-state", "ready");
  await expect(map).toHaveAttribute("data-basemap-state", "unavailable");
  await expect(map.locator("canvas")).toBeVisible();
  const box = await map.boundingBox();
  if (!box) throw new Error("Map has no layout box.");
  await expect
    .poll(() => colourPixels(page, box, MARKER_RGB), {
      message: "the place marker is drawn without a basemap",
    })
    .toBeGreaterThan(40);
});

test("place without geometry exposes an explicit state instead of a blank map", async ({
  page,
}) => {
  await page.goto("/");
  await mountMap(page, "map-no-geometry-test", { name: "Unmapped place" });

  const map = page.locator("#map-no-geometry-test");
  await expect(map).toHaveAttribute("data-map-state", "geometry-unavailable");
  await expect(map.getByText("No mapped coordinates")).toBeVisible();
});

test("the location editor places coordinates by click and by keyboard", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const form = document.createElement("form");
    form.id = "map-editor-test";
    form.style.cssText =
      "position:fixed;inset-block-start:8px;inset-inline-start:8px;z-index:2147483647;background:#fff";
    const mapContainer = document.createElement("div");
    mapContainer.className = "location-map";
    mapContainer.style.cssText = "width:360px;height:260px;margin:0";
    form.append(mapContainer);
    for (const name of ["lat", "lng", "accuracy", "source"]) {
      const field = document.createElement("input");
      field.name = name;
      form.append(field);
    }
    document.body.append(form);
    const input = (name) => form.querySelector(`input[name="${name}"]`);
    const controller = globalThis.TimelineLocationMap.create({
      container: form.querySelector(".location-map"),
      latitude: input("lat"),
      longitude: input("lng"),
      accuracy: input("accuracy"),
      source: input("source"),
    });
    await controller.ensureMap();
  });

  const map = page.locator("#map-editor-test .location-map");
  await expect(map).toHaveAttribute("data-map-state", "ready");
  await expect(map.getByRole("button", { name: "Zoom in" })).toBeVisible();
  const box = await map.boundingBox();
  if (!box) throw new Error("Map has no layout box.");

  // The default camera faces the globe; its centre is on the sphere.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const latitude = page.locator('#map-editor-test input[name="lat"]');
  const longitude = page.locator('#map-editor-test input[name="lng"]');
  await expect(latitude).not.toHaveValue("");
  await expect(longitude).not.toHaveValue("");
  const clicked = [Number(await latitude.inputValue()), Number(await longitude.inputValue())];
  expect(Math.abs(clicked[0])).toBeLessThanOrEqual(90);
  expect(Math.abs(clicked[1])).toBeLessThanOrEqual(180);
  await expect(page.locator('#map-editor-test input[name="source"]')).toHaveValue("manual");

  await latitude.fill("");
  await longitude.fill("");
  await map.focus();
  await page.keyboard.press("Enter");
  await expect(latitude).not.toHaveValue("");
  await expect(longitude).not.toHaveValue("");
});
