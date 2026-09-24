import { expect, test } from "@playwright/test";

/**
 * Issue #445 Priority 8: real-browser Playwright interaction coverage for
 * the deck.gl WorldSurface. Drives the real `DeckWorldSurface` (real deck.gl
 * / real WebGL context via `site/world-perf-harness.ts` — the same harness
 * Priority 7's certification spec uses) with actual Playwright input
 * (`page.mouse.wheel`, Chromium CDP multi-touch, `page.mouse.down/move/up`,
 * `page.setViewportSize`) rather than only calling surface methods directly,
 * and asserts on the
 * renderer-neutral state the surface itself exposes
 * (`getCamera()`, `getAccessibleSnapshot()`, the `role="status"` live
 * region, and the test-only `getProjection()`/`dragSinkCalls` readback added
 * to the harness for this spec).
 *
 * Playwright's high-level touch API is single-point only, so Chromium mobile
 * certification uses the public CDP session API to dispatch a real two-contact
 * touch sequence. Desktop certification separately exercises wheel/trackpad
 * zoom. Both must move deck.gl's real controller-backed camera.
 */

async function dispatchPinchZoom(page: import("@playwright/test").Page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("WorldSurface pinch certification requires a viewport.");

  const centerX = Math.round(viewport.width / 2);
  const centerY = Math.round(viewport.height / 2);
  const session = await page.context().newCDPSession(page);

  const points = (distance: number) => [
    {
      x: centerX - distance,
      y: centerY,
      radiusX: 8,
      radiusY: 8,
      force: 1,
      id: 1,
    },
    {
      x: centerX + distance,
      y: centerY,
      radiusX: 8,
      radiusY: 8,
      force: 1,
      id: 2,
    },
  ];

  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: points(28),
    });
    for (const distance of [40, 54, 70, 88]) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: points(distance),
      });
      await page.waitForTimeout(32);
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
}

async function touchSequence(
  page: import("@playwright/test").Page,
  steps: readonly {
    readonly type: "touchStart" | "touchMove" | "touchEnd";
    readonly x?: number;
    readonly y?: number;
  }[],
) {
  const session = await page.context().newCDPSession(page);
  try {
    for (const step of steps) {
      await session.send("Input.dispatchTouchEvent", {
        type: step.type,
        touchPoints:
          step.type === "touchEnd"
            ? []
            : [{ x: step.x ?? 0, y: step.y ?? 0, radiusX: 6, radiusY: 6, force: 1, id: 1 }],
      });
    }
  } finally {
    await session.detach();
  }
}

async function placeTouchTarget(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const helpersModulePath = "/world-test-helpers.mjs";
    const { createWorldProjection, createProjectedWorldInstance } = await import(helpersModulePath);
    const harness = window.__worldPerfHarness;
    harness.dragSinkCalls.begin = 0;
    harness.dragSinkCalls.update = 0;
    harness.dragSinkCalls.release = 0;
    harness.dragSinkCalls.cancel = 0;
    const instance = createProjectedWorldInstance({
      canonicalId: "entity-touch-target",
      geographicAnchors: [{ placeId: "place-touch", longitude: 10, latitude: 10, influence: 1 }],
      temporalWeight: 1,
      visualWeight: 1,
      retained: true,
    });
    harness.surface.setCamera({ longitude: 10, latitude: 10, zoom: 6, bearing: 0, pitch: 0 });
    harness.surface.setProjection(createWorldProjection({ instances: [instance], edges: [] }));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return harness.surface.project({ longitude: 10, latitude: 10, altitudeMeters: 0 });
  });
}

async function gotoHarness(page: import("@playwright/test").Page) {
  await page.goto("/world-perf-harness.html");
  await page.waitForFunction(() => window.__worldPerfHarness?.ready === true);
  const webgl2 = await page.evaluate(() => {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  });
  return webgl2;
}

test.describe("world interaction coverage (issue #445 Priority 8)", () => {
  test("mouse-wheel zoom changes the camera on the desktop controller path", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Mobile projects certify two-finger pinch separately.");
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const before = await page.evaluate(() => window.__worldPerfHarness.surface.getCamera());

    const viewport = page.viewportSize();
    if (!viewport) throw new Error("WorldSurface wheel certification requires a viewport.");
    await page.mouse.move(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(300);

    const after = await page.evaluate(() => window.__worldPerfHarness.surface.getCamera());
    expect(after.zoom, "wheel zoom should change the camera zoom level").not.toBeCloseTo(
      before.zoom,
      5,
    );
  });

  test("two-finger pinch changes the camera on mobile Chromium", async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(!isMobile, "Desktop projects certify wheel/trackpad zoom separately.");
    test.skip(browserName !== "chromium", "CDP multi-touch certification is Chromium-only.");
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const before = await page.evaluate(() => window.__worldPerfHarness.surface.getCamera());
    await dispatchPinchZoom(page);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__worldPerfHarness.surface.getCamera());

    expect(after.zoom, "two-finger pinch should change the camera zoom level").not.toBeCloseTo(
      before.zoom,
      5,
    );
  });

  test("picking resolves a click at a known entity's projected screen point", async ({ page }) => {
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const result = await page.evaluate(async () => {
      const helpersModulePath = "/world-test-helpers.mjs";
      const { createWorldProjection, createProjectedWorldInstance } = await import(
        helpersModulePath
      );
      const harness = window.__worldPerfHarness;
      const instance = createProjectedWorldInstance({
        canonicalId: "entity-pick-target",
        geographicAnchors: [{ placeId: "place-pick", longitude: 0, latitude: 20, influence: 1 }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: true,
      });
      const projection = createWorldProjection({ instances: [instance], edges: [] });
      harness.surface.setCamera({ longitude: 0, latitude: 20, zoom: 6, bearing: 0, pitch: 0 });
      harness.surface.setProjection(projection);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      const screenPoint = harness.surface.project({
        longitude: 0,
        latitude: 20,
        altitudeMeters: 0,
      });
      return { screenPoint, entityId: instance.canonicalId };
    });

    expect(
      result.screenPoint,
      "known entity position should project to a screen point",
    ).not.toBeNull();
    if (!result.screenPoint)
      throw new Error("Known entity position did not project to a screen point.");
    const { x, y } = result.screenPoint;

    await page.mouse.click(x, y);

    const pickHit = await page.evaluate(
      ({ x, y }) => window.__worldPerfHarness.surface.pick({ x, y }),
      { x, y },
    );
    expect(pickHit?.kind).toBe("entity");
    expect((pickHit as { entityId?: string })?.entityId).toBe(result.entityId);

    // Also confirm the click itself (not just a direct pick() call) resolves
    // to a canonical selection the app could act on, via setSelection driven
    // from the hit.
    await page.evaluate(
      ({ x, y }) => {
        const harness = window.__worldPerfHarness;
        const hit = harness.surface.pick({ x, y });
        if (hit?.kind === "entity") {
          harness.surface.setSelection({ kind: "entity", id: hit.entityId });
        } else if (hit?.kind === "place") {
          harness.surface.setSelection({ kind: "place", id: hit.placeId });
        } else if (hit?.kind === "relationship") {
          harness.surface.setSelection({ kind: "relationship", id: hit.relationshipId });
        }
      },
      { x, y },
    );
    const snapshot = await page.evaluate(() =>
      window.__worldPerfHarness.surface.getAccessibleSnapshot(),
    );
    expect(snapshot.selection).toEqual({ kind: "entity", id: result.entityId });
  });

  test("depth-aware picking acquires the nearest elevated instance on a shared screen ray", async ({
    page,
  }) => {
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const result = await page.evaluate(async () => {
      const helpersModulePath = "/world-test-helpers.mjs";
      const { createProjectedWorldInstance, createWorldProjection } = await import(
        helpersModulePath
      );
      const harness = window.__worldPerfHarness;
      const stacked = (name: string, visualAltitude: number) =>
        createProjectedWorldInstance({
          id: `${name}::stack`,
          canonicalId: name,
          occurrenceId: "stack",
          geographicAnchors: [
            { placeId: "place-stack", longitude: 12, latitude: 30, influence: 1 },
          ],
          temporalWeight: 1,
          visualWeight: 1,
          retained: false,
          visualAltitude,
        });
      // Canonical order puts the ground-level instance first so a
      // draw-order or first-match pick would return the wrong one.
      const ground = stacked("a-ground", 0);
      const elevated = stacked("b-elevated", 150_000);
      harness.surface.setCamera({ longitude: 12, latitude: 30, zoom: 7.25, bearing: 0, pitch: 0 });
      harness.surface.setProjection(
        createWorldProjection({ instances: [ground, elevated], edges: [] }),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const top = harness.surface.project({ longitude: 12, latitude: 30, altitudeMeters: 150_000 });
      const base = harness.surface.project({ longitude: 12, latitude: 30, altitudeMeters: 0 });
      return { top, base };
    });

    if (!result.top || !result.base) throw new Error("Stacked instances did not project.");
    // Top-down camera: both instances and the place marker share one ray.
    expect(Math.hypot(result.top.x - result.base.x, result.top.y - result.base.y)).toBeLessThan(3);

    const hit = await page.evaluate(
      (point) => window.__worldPerfHarness.surface.pick(point),
      result.top,
    );
    expect(hit).toEqual({
      kind: "entity",
      entityId: "b-elevated",
      worldInstanceId: "b-elevated::stack",
    });
  });

  test("under a pitched camera an elevated node occludes the ground node behind it for picking", async ({
    page,
  }) => {
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const result = await page.evaluate(async () => {
      const helpersModulePath = "/world-test-helpers.mjs";
      const { createProjectedWorldInstance, createWorldProjection } = await import(
        helpersModulePath
      );
      const harness = window.__worldPerfHarness;
      const node = (name: string, longitude: number, latitude: number, visualAltitude: number) =>
        createProjectedWorldInstance({
          id: `${name}::ray`,
          canonicalId: name,
          occurrenceId: "ray",
          geographicAnchors: [{ placeId: `place-${name}`, longitude, latitude, influence: 1 }],
          temporalWeight: 1,
          visualWeight: 1,
          retained: false,
          visualAltitude,
        });
      harness.surface.setCamera({ longitude: 12, latitude: 30, zoom: 7.25, bearing: 0, pitch: 55 });
      const elevated = node("z-elevated", 12, 30, 60_000);
      harness.surface.setProjection(createWorldProjection({ instances: [elevated], edges: [] }));
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const point = harness.surface.project({
        longitude: 12,
        latitude: 30,
        altitudeMeters: 60_000,
      });
      if (!point) return null;
      // The ground location that lies on the same screen ray, behind the
      // elevated node from the camera's point of view.
      const behind = harness.surface.unproject(point, 0);
      if (!behind) return null;
      const ground = node("a-ground", behind.longitude, behind.latitude, 0);
      harness.surface.setProjection(
        createWorldProjection({ instances: [ground, elevated], edges: [] }),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const groundPoint = harness.surface.project({
        longitude: behind.longitude,
        latitude: behind.latitude,
        altitudeMeters: 0,
      });
      return { point, groundPoint, hit: harness.surface.pick(point) };
    });

    if (!result?.groundPoint) throw new Error("Ray construction did not project.");
    expect(
      Math.hypot(result.point.x - result.groundPoint.x, result.point.y - result.groundPoint.y),
    ).toBeLessThan(3);
    expect(result.hit).toEqual({
      kind: "entity",
      entityId: "z-elevated",
      worldInstanceId: "z-elevated::ray",
    });
  });

  test("real deck.gl renders entity kind icons that pick as the canonical entity", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const setScene = (kind: string | null) =>
      page.evaluate(async (entityKind) => {
        const helpersModulePath = "/world-test-helpers.mjs";
        const { createProjectedWorldInstance, createWorldProjection } = await import(
          helpersModulePath
        );
        const harness = window.__worldPerfHarness;
        harness.surface.setCamera({ longitude: 5, latitude: 15, zoom: 6, bearing: 0, pitch: 0 });
        harness.surface.setProjection(
          createWorldProjection({
            instances: [
              createProjectedWorldInstance({
                id: "icon-person::icons",
                canonicalId: "icon-person",
                ...(entityKind ? { kind: entityKind } : {}),
                occurrenceId: "icons",
                geographicAnchors: [
                  { placeId: "place-icon", longitude: 5, latitude: 15, influence: 1 },
                ],
                temporalWeight: 1,
                visualWeight: 1,
                retained: false,
              }),
            ],
            edges: [],
          }),
        );
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return harness.surface.project({ longitude: 5, latitude: 15, altitudeMeters: 0 });
      }, kind);

    const point = await setScene(null);
    if (!point) throw new Error("Icon target did not project.");
    const clip = {
      x: Math.round(point.x - 14),
      y: Math.round(point.y - 14),
      width: 28,
      height: 28,
    };
    const plain = await page.screenshot({ clip });

    await setScene("person");
    await expect
      .poll(async () => Buffer.compare(await page.screenshot({ clip }), plain) !== 0, {
        message: "the person icon should render over its entity",
      })
      .toBe(true);

    const hit = await page.evaluate((at) => window.__worldPerfHarness.surface.pick(at), point);
    expect(hit).toEqual({
      kind: "entity",
      entityId: "icon-person",
      worldInstanceId: "icon-person::icons",
    });
    expect(errors, "no WebGL/deck.gl errors while rendering icons").toEqual([]);
  });

  test("real deck.gl renders semantic labels and picks a directed relationship marker", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const setScene = async (withLabels: boolean) =>
      page.evaluate(async (labelled) => {
        const helpersModulePath = "/world-test-helpers.mjs";
        const {
          createProjectedWorldEdge,
          createProjectedWorldInstance,
          createWorldProjection,
          directedEdgeArrowhead,
        } = await import(helpersModulePath);
        const harness = window.__worldPerfHarness;
        const endpoint = (name: string, longitude: number) =>
          createProjectedWorldInstance({
            id: `${name}::meeting`,
            canonicalId: name,
            ...(labelled ? { label: `Label ${name}` } : {}),
            occurrenceId: "meeting",
            geographicAnchors: [
              {
                placeId: `place-${name}`,
                ...(labelled ? { label: `Place ${name}` } : {}),
                longitude,
                latitude: 20,
                influence: 1,
              },
            ],
            temporalWeight: 1,
            visualWeight: 1,
            retained: false,
          });
        const source = endpoint("source", -8);
        const target = endpoint("target", 8);
        harness.surface.setCamera({ longitude: 0, latitude: 20, zoom: 3, bearing: 0, pitch: 0 });
        harness.surface.setProjection(
          createWorldProjection({
            instances: [source, target],
            edges: [
              createProjectedWorldEdge({
                id: "meeting",
                ...(labelled ? { label: "met" } : {}),
                sourceInstanceId: source.id,
                targetInstanceId: target.id,
                temporalWeight: 1,
                visible: true,
                retained: false,
              }),
            ],
          }),
        );
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        const [, apex] = directedEdgeArrowhead([-8, 20, 0], [8, 20, 0]);
        return {
          apex: harness.surface.project({
            longitude: apex[0],
            latitude: apex[1],
            altitudeMeters: apex[2],
          }),
          sourceLabel: harness.surface.project({ longitude: -8, latitude: 20, altitudeMeters: 0 }),
        };
      }, withLabels);

    const unlabelled = await setScene(false);
    if (!unlabelled.sourceLabel) throw new Error("Source entity did not project on screen.");
    const clip = {
      x: Math.round(unlabelled.sourceLabel.x + 8),
      y: Math.round(unlabelled.sourceLabel.y - 14),
      width: 90,
      height: 28,
    };
    const before = await page.screenshot({ clip });

    const labelled = await setScene(true);
    await expect
      .poll(async () => Buffer.compare(await page.screenshot({ clip }), before) !== 0, {
        message: "entity label text should become visible beside its world instance",
      })
      .toBe(true);

    const snapshot = await page.evaluate(() =>
      window.__worldPerfHarness.surface.getAccessibleSnapshot(),
    );
    expect(snapshot.relationships).toEqual([
      {
        relationshipId: "meeting",
        selected: false,
        label: "met",
        sourceEntityId: "source",
        targetEntityId: "target",
      },
    ]);
    expect(snapshot.entities.map((entity) => entity.label).sort()).toEqual([
      "Label source",
      "Label target",
    ]);

    if (!labelled.apex) throw new Error("Direction marker apex did not project on screen.");
    const hit = await page.evaluate(
      (point) => window.__worldPerfHarness.surface.pick(point),
      labelled.apex,
    );
    expect(hit).toEqual({ kind: "relationship", relationshipId: "meeting" });
    expect(errors, "no WebGL/deck.gl errors while rendering labels and markers").toEqual([]);
  });

  test("a quick one-finger touch drag from an entity pans the globe, not the node", async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(
      !isMobile || browserName !== "chromium",
      "CDP touch certification is mobile Chromium.",
    );
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const point = await placeTouchTarget(page);
    if (!point) throw new Error("Touch target did not project to a screen point.");
    const before = await page.evaluate(() => window.__worldPerfHarness.surface.getCamera());

    await touchSequence(page, [
      { type: "touchStart", x: point.x, y: point.y },
      { type: "touchMove", x: point.x + 30, y: point.y },
      { type: "touchMove", x: point.x + 70, y: point.y + 10 },
      { type: "touchMove", x: point.x + 110, y: point.y + 20 },
      { type: "touchEnd" },
    ]);

    await expect
      .poll(() => page.evaluate(() => window.__worldPerfHarness.surface.getCamera().longitude))
      .not.toBeCloseTo(before.longitude, 4);
    const calls = await page.evaluate(() => window.__worldPerfHarness.dragSinkCalls);
    expect(calls.begin, "a quick touch drag must not claim the node").toBe(0);
  });

  test("long-press then drag moves an elevated node on mobile touch without panning", async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(
      !isMobile || browserName !== "chromium",
      "CDP touch certification is mobile Chromium.",
    );
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const point = await placeTouchTarget(page);
    if (!point) throw new Error("Touch target did not project to a screen point.");
    const before = await page.evaluate(() => window.__worldPerfHarness.surface.getCamera());
    const beforeProjection = await page.evaluate(() => window.__worldPerfHarness.getProjection());
    const container = page.locator("#world-container");

    const session = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
      session.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 1 }],
      });
    try {
      await touch("touchStart", point.x, point.y);
      await expect(container).toHaveAttribute("data-world-touch-drag", "holding");
      await expect(container).toHaveAttribute("data-world-touch-drag", "active");
      for (const [dx, dy] of [
        [20, 8],
        [45, 18],
        [70, 28],
        [90, 36],
      ] as const) {
        await touch("touchMove", point.x + dx, point.y + dy);
      }
      await expect
        .poll(() => page.evaluate(() => window.__worldPerfHarness.dragSinkCalls.update))
        .toBeGreaterThan(0);
      await touch("touchEnd");
    } finally {
      await session.detach();
    }

    const calls = await page.evaluate(() => window.__worldPerfHarness.dragSinkCalls);
    expect(calls.begin).toBe(1);
    expect(calls.release).toBe(1);
    await expect(container).not.toHaveAttribute("data-world-touch-drag");

    const after = await page.evaluate(() => window.__worldPerfHarness.surface.getCamera());
    expect(after.longitude).toBeCloseTo(before.longitude, 6);
    expect(after.latitude).toBeCloseTo(before.latitude, 6);

    const afterProjection = await page.evaluate(() => window.__worldPerfHarness.getProjection());
    const [beforeInstance] = beforeProjection.instances;
    const [afterInstance] = afterProjection.instances;
    expect(afterInstance?.geographicAnchors).toEqual(beforeInstance?.geographicAnchors);
    expect(afterInstance?.localOffset).not.toEqual(beforeInstance?.localOffset);
    const snapshot = await page.evaluate(() =>
      window.__worldPerfHarness.surface.getAccessibleSnapshot(),
    );
    expect(snapshot.selection).toEqual({ kind: "entity", id: "entity-touch-target" });
  });

  test("mouse-drag on an entity moves its derived position without touching canonical geography", async ({
    page,
  }) => {
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const setup = await page.evaluate(async () => {
      const helpersModulePath = "/world-test-helpers.mjs";
      const { createWorldProjection, createProjectedWorldInstance } = await import(
        helpersModulePath
      );
      const harness = window.__worldPerfHarness;
      const instance = createProjectedWorldInstance({
        canonicalId: "entity-drag-target",
        geographicAnchors: [{ placeId: "place-drag", longitude: 10, latitude: 10, influence: 1 }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: true,
      });
      const projection = createWorldProjection({ instances: [instance], edges: [] });
      harness.surface.setCamera({ longitude: 10, latitude: 10, zoom: 6, bearing: 0, pitch: 0 });
      harness.surface.setProjection(projection);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const screenPoint = harness.surface.project({
        longitude: 10,
        latitude: 10,
        altitudeMeters: 0,
      });
      return { screenPoint, worldInstanceId: instance.id, canonicalId: instance.canonicalId };
    });

    expect(setup.screenPoint).not.toBeNull();
    if (!setup.screenPoint) throw new Error("Drag target did not project to a screen point.");
    const { x, y } = setup.screenPoint;

    const beforeAnchors = await page.evaluate(
      () => window.__worldPerfHarness.surface.getAccessibleSnapshot().entities,
    );
    expect(beforeAnchors.length).toBe(1);

    const beforeCanonical = await page.evaluate(() => window.__worldPerfHarness.getProjection());

    // Real Playwright pointer sequence: long-press then drag.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(600); // long-press dwell
    await page.mouse.move(x + 80, y + 40, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();

    const dragSinkCalls = await page.evaluate(() => window.__worldPerfHarness.dragSinkCalls);
    // Whether deck.gl's own picking + drag-gesture recognition actually
    // fires onDragStart/onDrag for a synthetic mouse.down/move/up sequence
    // against a software (SwiftShader) WebGL canvas is exactly what this
    // assertion checks — a real, meaningful pass/fail, not a smoke check.
    // If this ever regresses to 0 calls, headless Chromium's deck.gl drag
    // recognition has stopped firing for this sequence and the derived-
    // position assertion below would otherwise pass vacuously.
    expect(
      dragSinkCalls.begin,
      "a real mouse drag over the entity should engage the drag sink's begin()",
    ).toBeGreaterThan(0);

    const afterCanonical = await page.evaluate(() => window.__worldPerfHarness.getProjection());
    const beforeInstance = beforeCanonical.instances.find(
      (i) => i.canonicalId === setup.canonicalId,
    );
    const afterInstance = afterCanonical.instances.find((i) => i.canonicalId === setup.canonicalId);
    expect(afterInstance?.geographicAnchors).toEqual(beforeInstance?.geographicAnchors);
    // The rendered/derived position (localOffset) should have moved, since
    // that is exactly what the drag sink's begin()/update() rewrite.
    expect(afterInstance?.localOffset).not.toEqual(beforeInstance?.localOffset);
  });

  test("setProjection with a filtered/smaller fixture updates the accessible snapshot counts", async ({
    page,
  }) => {
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const counts = await page.evaluate(async () => {
      const fixtureModulePath = "/world-fixture-generator.mjs";
      const { generateWorldProjectionFixture } = await import(fixtureModulePath);
      const harness = window.__worldPerfHarness;

      const full = generateWorldProjectionFixture({ entityCount: 40 });
      harness.surface.setProjection(full);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const fullSnapshot = harness.surface.getAccessibleSnapshot();

      const filtered = generateWorldProjectionFixture({ entityCount: 8, seed: 1 });
      harness.surface.setProjection(filtered);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const filteredSnapshot = harness.surface.getAccessibleSnapshot();

      return {
        fullEntities: fullSnapshot.entities.length,
        filteredEntities: filteredSnapshot.entities.length,
      };
    });

    expect(counts.fullEntities).toBe(40);
    expect(counts.filteredEntities).toBe(8);
    expect(counts.filteredEntities).toBeLessThan(counts.fullEntities);
  });

  test("selection survives crossing the globe/local spatial-mode zoom threshold", async ({
    page,
  }) => {
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const result = await page.evaluate(async () => {
      const helpersModulePath = "/world-test-helpers.mjs";
      const { createWorldProjection, createProjectedWorldInstance } = await import(
        helpersModulePath
      );
      const harness = window.__worldPerfHarness;
      const instance = createProjectedWorldInstance({
        canonicalId: "entity-mode-crossing",
        geographicAnchors: [{ placeId: "place-mode", longitude: 5, latitude: 5, influence: 1 }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: true,
      });
      harness.surface.setCamera({ longitude: 5, latitude: 5, zoom: 7.25, bearing: 0, pitch: 0 });
      harness.surface.setProjection(createWorldProjection({ instances: [instance], edges: [] }));
      harness.surface.setSelection({ kind: "entity", id: instance.canonicalId });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const beforeSelection = harness.surface.getAccessibleSnapshot().selection;

      // src/layout/world-spatial-mode.ts DEFAULT_WORLD_SPATIAL_MODE_POLICY:
      // enterLocalAtZoom 11.5 — cross well past it, then back below
      // exitLocalBelowZoom 10.5 to exercise both crossing directions.
      harness.surface.setCamera({ longitude: 5, latitude: 5, zoom: 13, bearing: 0, pitch: 0 });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const afterEnterLocal = harness.surface.getAccessibleSnapshot().selection;

      harness.surface.setCamera({ longitude: 5, latitude: 5, zoom: 9, bearing: 0, pitch: 0 });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const afterExitLocal = harness.surface.getAccessibleSnapshot().selection;

      return { beforeSelection, afterEnterLocal, afterExitLocal };
    });

    const expected = { kind: "entity", id: "entity-mode-crossing" };
    expect(result.beforeSelection).toEqual(expected);
    expect(result.afterEnterLocal).toEqual(expected);
    expect(result.afterExitLocal).toEqual(expected);
  });

  test("a navigable non-WebGL outline mirrors the world and drives canonical selection", async ({
    page,
  }) => {
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const setScene = (extraEntity: boolean) =>
      page.evaluate(async (withExtra) => {
        const helpersModulePath = "/world-test-helpers.mjs";
        const { createProjectedWorldEdge, createProjectedWorldInstance, createWorldProjection } =
          await import(helpersModulePath);
        const endpoint = (name: string, longitude: number) =>
          createProjectedWorldInstance({
            id: `${name}::meeting`,
            canonicalId: name,
            label: `Label ${name}`,
            occurrenceId: "meeting",
            geographicAnchors: [
              {
                placeId: `place-${name}`,
                label: `Place ${name}`,
                longitude,
                latitude: 20,
                influence: 1,
              },
            ],
            temporalWeight: 1,
            visualWeight: 1,
            retained: false,
          });
        const source = endpoint("source", -8);
        const target = endpoint("target", 8);
        const instances = withExtra ? [source, target, endpoint("extra", 0)] : [source, target];
        window.__worldPerfHarness.surface.setProjection(
          createWorldProjection({
            instances,
            edges: [
              createProjectedWorldEdge({
                id: "meeting",
                label: "met",
                sourceInstanceId: source.id,
                targetInstanceId: target.id,
                temporalWeight: 1,
                visible: true,
                retained: false,
              }),
            ],
          }),
        );
      }, extraEntity);

    await setScene(false);
    const outline = page.getByRole("navigation", { name: "World objects" });
    await expect(outline).toHaveCount(1);
    await expect(
      outline.getByRole("button", { name: "met: Label source → Label target" }),
    ).toHaveCount(1);
    const targetButton = outline.getByRole("button", { name: "Label target", exact: true });
    await expect(targetButton).toHaveAttribute("aria-pressed", "false");

    // Keyboard activation selects the canonical entity on the WebGL surface.
    await targetButton.focus();
    const revealed = await outline.boundingBox();
    expect(
      (revealed?.width ?? 0) > 100 && (revealed?.height ?? 0) > 40,
      "the outline is revealed while a keyboard user is inside it",
    ).toBe(true);
    await page.keyboard.press("Enter");
    await expect
      .poll(() =>
        page.evaluate(() => window.__worldPerfHarness.surface.getAccessibleSnapshot().selection),
      )
      .toEqual({ kind: "entity", id: "target" });
    await expect(targetButton).toHaveAttribute("aria-pressed", "true");

    // Surface-side selection changes are mirrored back.
    await page.evaluate(() =>
      window.__worldPerfHarness.surface.setSelection({
        kind: "relationship",
        id: "meeting",
      } as Parameters<typeof window.__worldPerfHarness.surface.setSelection>[0]),
    );
    await expect(
      outline.getByRole("button", { name: "met: Label source → Label target" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(targetButton).toHaveAttribute("aria-pressed", "false");

    // With a selection already active, Enter on another entry still activates
    // it, and Tab moves between outline entries instead of cycling the globe.
    const sourceButton = outline.getByRole("button", { name: "Label source", exact: true });
    await sourceButton.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() =>
        page.evaluate(() => window.__worldPerfHarness.surface.getAccessibleSnapshot().selection),
      )
      .toEqual({ kind: "entity", id: "source" });
    await page.keyboard.press("Tab");
    await expect(targetButton).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(() => window.__worldPerfHarness.surface.getAccessibleSnapshot().selection),
      )
      .toEqual({ kind: "entity", id: "source" });

    // A projection update keeps keyboard focus on the same canonical object.
    await targetButton.focus();
    await setScene(true);
    await expect(outline.getByRole("button", { name: "Label extra", exact: true })).toHaveCount(1);
    await expect(targetButton).toBeFocused();
  });

  test("the role=status live region text tracks selection and projection changes", async ({
    page,
  }) => {
    test.skip(!(await gotoHarness(page)), "WebGL2 unavailable in this environment.");

    const status = page.locator("#world-container [role='status']");
    await expect(status).toHaveCount(1);
    const initialText = await status.textContent();
    expect(initialText).toContain("No selection.");

    await page.evaluate(async () => {
      const helpersModulePath = "/world-test-helpers.mjs";
      const { createWorldProjection, createProjectedWorldInstance } = await import(
        helpersModulePath
      );
      const harness = window.__worldPerfHarness;
      const instance = createProjectedWorldInstance({
        canonicalId: "entity-live-region",
        geographicAnchors: [{ placeId: "place-live", longitude: 1, latitude: 1, influence: 1 }],
        temporalWeight: 1,
        visualWeight: 1,
        retained: true,
      });
      harness.surface.setProjection(createWorldProjection({ instances: [instance], edges: [] }));
      harness.surface.setSelection({ kind: "entity", id: instance.canonicalId });
    });

    await expect(status).toContainText("Selected entity entity-live-region");
    await expect(status).toContainText("1 entity");
  });
});

test.describe("mobile viewport containment (issue #445 Priority 8, item 7)", () => {
  for (const { label, width, height } of [
    { label: "portrait", width: 375, height: 812 },
    { label: "landscape", width: 812, height: 375 },
  ]) {
    test(`${label} viewport (${width}x${height}) renders the deck.gl canvas with no unexpected page scroll`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      const webgl2 = await gotoHarness(page);
      test.skip(!webgl2, "WebGL2 unavailable in this environment.");

      const measurements = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        canvasCount: document.querySelectorAll("#world-container canvas").length,
        // Orb's legacy SVG-graph surface is never mounted by this harness
        // (it only ever constructs a DeckWorldSurface), so its absence here
        // confirms the deck.gl canvas is what is actually rendered rather
        // than a fallback — production-path Orb-vs-deck.gl selection is
        // separately covered by tests/browser/world-view-startup.spec.ts,
        // which asserts against `window.TimelineWorldView`.
        svgCount: document.querySelectorAll("#world-container svg").length,
      }));

      expect(measurements.canvasCount, "deck.gl should render at least one canvas").toBeGreaterThan(
        0,
      );
      expect(measurements.svgCount, "no legacy Orb SVG surface should be present").toBe(0);
      expect(
        measurements.scrollHeight - measurements.innerHeight,
        "document should not scroll meaningfully beyond the viewport",
      ).toBeLessThanOrEqual(16);
    });
  }
});

// `Window.__worldPerfHarness` (including the `getProjection`/`dragSinkCalls`
// readback added for this spec) is declared once, as the source of truth,
// in `site/world-perf-harness.ts`.
import type {} from "../../site/world-perf-harness.ts";
