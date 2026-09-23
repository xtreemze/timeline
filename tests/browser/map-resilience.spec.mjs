import { expect, test } from "@playwright/test";

test("semantic place marker survives complete basemap tile failure", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/");

  await page.evaluate(async () => {
    const container = document.createElement("div");
    container.id = "map-resilience-test";
    container.style.width = "360px";
    container.style.height = "260px";
    document.body.append(container);

    const view = globalThis.TimelineLocationMap.createReadOnly({
      container,
      location: {
        id: "test-place",
        name: "Test place",
        geometry: {
          type: "Point",
          coordinates: [18.0686, 59.3293],
        },
      },
      label: "Test place",
      interactive: false,
    });
    globalThis.__mapResilienceView = view;
    await view.ready;
  });

  const map = page.locator("#map-resilience-test");
  const marker = map.locator(".timeline-map-marker");

  await expect(marker).toBeVisible();
  await expect(map).toHaveAttribute("data-map-state", "ready");
  await expect(map).toHaveAttribute("data-basemap-state", "unavailable");
  await expect(marker).toBeVisible();
});

test("place without geometry exposes an explicit state instead of a blank map", async ({
  page,
}) => {
  await page.goto("/");

  await page.evaluate(async () => {
    const container = document.createElement("div");
    container.id = "map-no-geometry-test";
    container.style.width = "360px";
    container.style.height = "260px";
    document.body.append(container);

    const view = globalThis.TimelineLocationMap.createReadOnly({
      container,
      location: {
        id: "unmapped-place",
        name: "Unmapped place",
      },
      label: "Unmapped place",
      interactive: false,
    });
    globalThis.__mapNoGeometryView = view;
    await view.ready;
  });

  const map = page.locator("#map-no-geometry-test");
  await expect(map).toHaveAttribute("data-map-state", "geometry-unavailable");
  await expect(map.getByText("No mapped coordinates")).toBeVisible();
});
