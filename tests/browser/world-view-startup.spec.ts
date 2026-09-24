import { expect, test } from "@playwright/test";

test.describe("production world view startup", () => {
  test("registers a real deck.gl-backed TimelineWorldView and selects it over Orb", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    page.on("requestfailed", (request) =>
      failedRequests.push(`${request.url()} :: ${request.failure()?.errorText}`),
    );
    page.on("response", (response) => {
      if (response.status() >= 400 && response.url().includes("world-view")) {
        failedRequests.push(`${response.url()} :: HTTP ${response.status()}`);
      }
    });

    await page.goto("/");
    await page.waitForLoadState("load");

    const registration = await page.evaluate(() => {
      const worldView = Reflect.get(globalThis, "TimelineWorldView") as unknown;
      return {
        hasWorldView: Boolean(worldView),
        hasCreate:
          typeof worldView === "object" &&
          worldView !== null &&
          typeof (worldView as Record<string, unknown>).create === "function",
        webgl2: (() => {
          try {
            return Boolean(document.createElement("canvas").getContext("webgl2"));
          } catch {
            return false;
          }
        })(),
      };
    });

    if (!registration.webgl2) {
      test.skip(true, "WebGL2 unavailable in this environment; Orb fallback is expected.");
      return;
    }

    expect(consoleErrors, "no console/page errors while registering the world view").toEqual([]);
    expect(failedRequests, "no failed requests while loading the world view shim").toEqual([]);
    expect(registration.hasWorldView).toBe(true);
    expect(registration.hasCreate).toBe(true);

    await page.evaluate(() => {
      const sample = Reflect.get(globalThis, "TimelineSampleCase");
      if (!sample) throw new Error("Timeline sample case is unavailable.");
      localStorage.setItem("timeline:v2", JSON.stringify(sample));
    });
    await page.reload({ waitUntil: "load" });

    const worldSummary = page.locator(
      "#temporal-graph-view .temporal-graph-canvas [role=\"status\"]",
    );
    await expect(worldSummary).toHaveText(
      /World view: [1-9]\d* places, [1-9]\d* relationships, [1-9]\d* entities visible\./,
    );
    expect(consoleErrors, "persisted project must initialize the world without errors").toEqual([]);
  });
});
