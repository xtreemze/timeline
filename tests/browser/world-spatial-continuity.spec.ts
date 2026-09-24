import { expect, test } from "@playwright/test";

async function gotoHarness(page: import("@playwright/test").Page) {
  await page.goto("/world-perf-harness.html");
  await page.waitForFunction(() => window.__worldPerfHarness?.ready === true);
  return page.evaluate(() => {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  });
}

test.describe("WorldSurface globe/local precision continuity (issue #547)", () => {
  test("handoff preserves geometry, canonical identity, selection, and picking within a measured bound", async ({
    page,
  }, testInfo) => {
    expect(
      await gotoHarness(page),
      "WorldSurface precision certification requires WebGL2 on every required Chromium project.",
    ).toBe(true);

    const metrics = await page.evaluate(async () => {
      const helpersModulePath = "/world-test-helpers.mjs";
      const { createProjectedWorldInstance, createWorldProjection, resolveWorldRenderPosition } =
        await import(helpersModulePath);
      const harness = window.__worldPerfHarness;

      type Metric = {
        name: string;
        enterPrimaryJumpPx: number;
        enterRepeatedJumpPx: number;
        exitRepeatedJumpPx: number;
        roundTripErrorMeters: number;
        repeatedRoundTripErrorMeters: number;
        enterFrameMs: number;
        exitFrameMs: number;
        globePick: ReturnType<typeof harness.surface.pick>;
        localPick: ReturnType<typeof harness.surface.pick>;
        selectionBefore: ReturnType<typeof harness.surface.getAccessibleSnapshot>["selection"];
        selectionAfter: ReturnType<typeof harness.surface.getAccessibleSnapshot>["selection"];
        worldInstanceIdsBefore: string[];
        worldInstanceIdsAfter: string[];
        projectionObjectPreserved: boolean;
        projectionInstanceIdsBefore: string[];
        projectionInstanceIdsAfter: string[];
        occurrenceIdsBefore: string[];
        occurrenceIdsAfter: string[];
      };

      const frame = () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      const screenDistance = (
        left: { readonly x: number; readonly y: number },
        right: { readonly x: number; readonly y: number },
      ) => Math.hypot(left.x - right.x, left.y - right.y);
      const radians = (degrees: number) => (degrees * Math.PI) / 180;
      const metersBetween = (
        left: { readonly longitude: number; readonly latitude: number },
        right: { readonly longitude: number; readonly latitude: number },
      ) => {
        const earthRadiusMeters = 6_371_008.8;
        const latitude1 = radians(left.latitude);
        const latitude2 = radians(right.latitude);
        const deltaLatitude = latitude2 - latitude1;
        const rawDeltaLongitude = right.longitude - left.longitude;
        const deltaLongitude = radians(((rawDeltaLongitude + 540) % 360) - 180);
        const sinLatitude = Math.sin(deltaLatitude / 2);
        const sinLongitude = Math.sin(deltaLongitude / 2);
        const a =
          sinLatitude * sinLatitude +
          Math.cos(latitude1) * Math.cos(latitude2) * sinLongitude * sinLongitude;
        return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(a)));
      };
      const projectRequired = (position: {
        readonly longitude: number;
        readonly latitude: number;
        readonly altitudeMeters: number;
      }) => {
        const point = harness.surface.project(position);
        if (!point) throw new Error("WorldSurface failed to project a continuity probe.");
        return point;
      };

      const scenarios = [
        {
          name: "exact-local",
          longitude: 12.5683,
          latitude: 55.6761,
          precisionRadiusMeters: 5,
        },
        {
          name: "approximate-dateline",
          longitude: 179.92,
          latitude: 12.25,
          precisionRadiusMeters: 25_000,
        },
        {
          name: "high-latitude",
          longitude: 24.94,
          latitude: 79.65,
          precisionRadiusMeters: 250,
        },
      ] as const;

      const results: Metric[] = [];
      for (const scenario of scenarios) {
        const canonicalId = "entity-" + scenario.name;
        const repeatedLongitude = scenario.longitude + 0.002;
        const repeatedLatitude = Math.min(89.9, scenario.latitude + 0.001);

        const primary = createProjectedWorldInstance({
          id: canonicalId + "::primary",
          canonicalId,
          occurrenceId: "occurrence-" + scenario.name + "-primary",
          geographicAnchors: [
            {
              placeId: "place-" + scenario.name + "-primary",
              longitude: scenario.longitude,
              latitude: scenario.latitude,
              precisionRadiusMeters: scenario.precisionRadiusMeters,
              certainty: scenario.precisionRadiusMeters <= 10 ? 1 : 0.6,
              influence: 1,
            },
          ],
          temporalWeight: 1,
          visualWeight: 1,
          visualAltitude: 1_500,
          localOffset: { eastMeters: 4_000, northMeters: 2_000 },
          retained: true,
        });
        const repeated = createProjectedWorldInstance({
          id: canonicalId + "::repeat",
          canonicalId,
          occurrenceId: "occurrence-" + scenario.name + "-repeat",
          geographicAnchors: [
            {
              placeId: "place-" + scenario.name + "-repeat",
              longitude: repeatedLongitude,
              latitude: repeatedLatitude,
              precisionRadiusMeters: scenario.precisionRadiusMeters,
              certainty: 0.8,
              influence: 1,
            },
          ],
          temporalWeight: 0.8,
          visualWeight: 1,
          visualAltitude: 2_000,
          localOffset: { eastMeters: -3_500, northMeters: 2_500 },
          retained: true,
        });

        const resolvedPrimary = resolveWorldRenderPosition(primary);
        const resolvedRepeated = resolveWorldRenderPosition(repeated);
        if (!resolvedPrimary || !resolvedRepeated) {
          throw new Error("Placed continuity probes must resolve to render positions.");
        }
        const primaryPosition = {
          longitude: resolvedPrimary[0],
          latitude: resolvedPrimary[1],
          altitudeMeters: resolvedPrimary[2],
        };
        const repeatedPosition = {
          longitude: resolvedRepeated[0],
          latitude: resolvedRepeated[1],
          altitudeMeters: resolvedRepeated[2],
        };

        const projection = createWorldProjection({
          instances: [primary, repeated],
          edges: [],
        });
        harness.surface.setProjection(projection);
        harness.surface.setSelection({ kind: "entity", id: primary.canonicalId });
        harness.surface.focusEntity(primary.canonicalId);

        // Keep the canonical focused instance at the camera center. The
        // secondary instance stays displaced, so continuity is measured both
        // at the focus and away from the center without undoing focus first.
        harness.surface.setCamera({
          longitude: primaryPosition.longitude,
          latitude: primaryPosition.latitude,
          zoom: 9,
          bearing: 0,
          pitch: 20,
        });
        await frame();

        const sharedCamera = {
          longitude: primaryPosition.longitude,
          latitude: primaryPosition.latitude,
          zoom: 11.49,
          bearing: 0,
          pitch: 20,
        };
        harness.surface.setCamera(sharedCamera);
        await frame();
        const globePrimary = projectRequired(primaryPosition);
        const globeRepeated = projectRequired(repeatedPosition);
        const globePick = harness.surface.pick(globePrimary);
        const beforeSnapshot = harness.surface.getAccessibleSnapshot();
        const beforeProjection = harness.getProjection();

        const enterStart = performance.now();
        harness.surface.setCamera({ ...sharedCamera, zoom: 11.51 });
        await frame();
        const enterFrameMs = performance.now() - enterStart;

        // Hysteresis keeps MapView active at 11.49, giving us the exact same
        // camera state on both renderer strategies.
        harness.surface.setCamera(sharedCamera);
        await frame();

        const localPrimary = projectRequired(primaryPosition);
        const localRepeated = projectRequired(repeatedPosition);
        const localPick = harness.surface.pick(localPrimary);
        const localRoundTrip = harness.surface.unproject(
          localPrimary,
          primaryPosition.altitudeMeters,
        );
        const localRepeatedRoundTrip = harness.surface.unproject(
          localRepeated,
          repeatedPosition.altitudeMeters,
        );
        if (!localRoundTrip || !localRepeatedRoundTrip) {
          throw new Error("WorldSurface failed to unproject a local-mode continuity probe.");
        }
        const afterSnapshot = harness.surface.getAccessibleSnapshot();
        const afterProjection = harness.getProjection();

        // Reverse handoff: remain local at 10.51, cross below 10.5, then
        // return to the same 10.51 camera while GlobeView remains active.
        const reverseCamera = { ...sharedCamera, zoom: 10.51 };
        harness.surface.setCamera(reverseCamera);
        await frame();
        const localBeforeExit = projectRequired(repeatedPosition);

        const exitStart = performance.now();
        harness.surface.setCamera({ ...reverseCamera, zoom: 10.49 });
        await frame();
        const exitFrameMs = performance.now() - exitStart;

        harness.surface.setCamera(reverseCamera);
        await frame();
        const globeAfterExit = projectRequired(repeatedPosition);

        results.push({
          name: scenario.name,
          enterPrimaryJumpPx: screenDistance(globePrimary, localPrimary),
          enterRepeatedJumpPx: screenDistance(globeRepeated, localRepeated),
          exitRepeatedJumpPx: screenDistance(localBeforeExit, globeAfterExit),
          roundTripErrorMeters: metersBetween(primaryPosition, localRoundTrip),
          repeatedRoundTripErrorMeters: metersBetween(repeatedPosition, localRepeatedRoundTrip),
          enterFrameMs,
          exitFrameMs,
          globePick,
          localPick,
          selectionBefore: beforeSnapshot.selection,
          selectionAfter: afterSnapshot.selection,
          worldInstanceIdsBefore: beforeSnapshot.entities
            .map((entity) => String(entity.worldInstanceId))
            .sort(),
          worldInstanceIdsAfter: afterSnapshot.entities
            .map((entity) => String(entity.worldInstanceId))
            .sort(),
          projectionObjectPreserved: beforeProjection === afterProjection,
          projectionInstanceIdsBefore: beforeProjection.instances
            .map((instance) => String(instance.id))
            .sort(),
          projectionInstanceIdsAfter: afterProjection.instances
            .map((instance) => String(instance.id))
            .sort(),
          occurrenceIdsBefore: beforeProjection.instances
            .map((instance) => String(instance.occurrenceId ?? ""))
            .sort(),
          occurrenceIdsAfter: afterProjection.instances
            .map((instance) => String(instance.occurrenceId ?? ""))
            .sort(),
        });
      }

      return results;
    });

    const MAX_HANDOFF_JUMP_PX = 4;
    const MAX_ROUND_TRIP_ERROR_METERS = 1;

    for (const scenario of metrics) {
      expect(
        scenario.enterPrimaryJumpPx,
        scenario.name + ": focused elevated instance should not jump at globe-to-local handoff",
      ).toBeLessThanOrEqual(MAX_HANDOFF_JUMP_PX);
      expect(
        scenario.enterRepeatedJumpPx,
        scenario.name + ": repeated canonical instance should not jump at globe-to-local handoff",
      ).toBeLessThanOrEqual(MAX_HANDOFF_JUMP_PX);
      expect(
        scenario.exitRepeatedJumpPx,
        scenario.name + ": repeated canonical instance should not jump at local-to-globe handoff",
      ).toBeLessThanOrEqual(MAX_HANDOFF_JUMP_PX);
      expect(
        scenario.roundTripErrorMeters,
        scenario.name + ": focused local project/unproject error should remain within one meter",
      ).toBeLessThanOrEqual(MAX_ROUND_TRIP_ERROR_METERS);
      expect(
        scenario.repeatedRoundTripErrorMeters,
        scenario.name + ": off-center local project/unproject error should remain within one meter",
      ).toBeLessThanOrEqual(MAX_ROUND_TRIP_ERROR_METERS);

      expect(scenario.projectionObjectPreserved).toBe(true);
      expect(scenario.projectionInstanceIdsAfter).toEqual(scenario.projectionInstanceIdsBefore);
      expect(scenario.occurrenceIdsAfter).toEqual(scenario.occurrenceIdsBefore);
      expect(scenario.worldInstanceIdsAfter).toEqual(scenario.worldInstanceIdsBefore);
      expect(scenario.selectionAfter).toEqual(scenario.selectionBefore);
      expect(scenario.selectionAfter?.kind).toBe("entity");
      expect(scenario.globePick?.kind).toBe("entity");
      expect(scenario.localPick?.kind).toBe("entity");
      expect((scenario.globePick as { entityId?: string })?.entityId).toBe(
        (scenario.localPick as { entityId?: string })?.entityId,
      );
    }

    await testInfo.attach("world-spatial-continuity.json", {
      body: Buffer.from(
        JSON.stringify(
          {
            bounds: {
              maxHandoffJumpPx: MAX_HANDOFF_JUMP_PX,
              maxRoundTripErrorMeters: MAX_ROUND_TRIP_ERROR_METERS,
            },
            scenarios: metrics,
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
  });
});

import type {} from "../../site/world-perf-harness.ts";
