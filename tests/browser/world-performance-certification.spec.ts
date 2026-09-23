import { expect, test } from "@playwright/test";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Issue #445 Priority 7: real-renderer performance certification.
 *
 * Drives the real `DeckWorldSurface` (real deck.gl / real WebGL context via
 * `site/world-perf-harness.ts`, which wires the same `realDeckWorldBindings`
 * production uses) at three interactive scales plus a larger render-only
 * case, and measures the metrics called out in issue #445: first usable
 * frame, sustained frame time, input-to-paint latency, picking latency,
 * incremental-update cost (small delta vs full swap), and sustained
 * navigation memory growth.
 *
 * This does not do per-frame GPU readback: every measurement here is
 * `performance.now()` around calls the app itself makes (`setProjection`,
 * `setCamera`, `pick`), or `requestAnimationFrame` for paint timing — never
 * `deck.readPixels()`.
 *
 * Results are written to `tests/browser/world-performance-report.json` (a
 * human-reviewable artifact) and softly checked against generous sanity
 * bounds in `world-performance-baseline.json` — loose enough to avoid CI
 * flakiness across machines, tight enough to catch a total collapse (e.g. a
 * 50k-entity scene taking whole seconds per frame).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = join(__dirname, "world-performance-report.json");
const BASELINE_PATH = join(__dirname, "fixtures", "world-performance-baseline.json");

const SCALES = [
  { label: "1k", entityCount: 1000, interactive: true },
  { label: "10k", entityCount: 10000, interactive: true },
  { label: "50k", entityCount: 50000, interactive: true },
  { label: "150k-render-only", entityCount: 150000, interactive: false },
] as const;

interface ScaleReport {
  readonly label: string;
  readonly entityCount: number;
  readonly firstUsableFrameMs: number;
  readonly sustainedFrame: { readonly p50Ms: number; readonly p95Ms: number; readonly samples: number };
  readonly inputToPaintMs: number | null;
  readonly pickingLatencyMs: number | null;
  readonly incrementalUpdate: {
    readonly smallDeltaMs: number;
    readonly fullSwapMs: number;
  } | null;
  readonly sustainedNavigation: {
    readonly durationMs: number;
    readonly frames: number;
    readonly heapGrowthBytes: number | null;
    readonly heapStartBytes: number | null;
    readonly heapEndBytes: number | null;
  } | null;
}

test.describe.configure({ mode: "serial" });

test.describe("world performance certification (issue #445 Priority 7)", () => {
  test.setTimeout(300_000);

  const report: { readonly generatedAt: string; readonly scales: ScaleReport[] } = {
    generatedAt: new Date().toISOString(),
    scales: [],
  };

  for (const scale of SCALES) {
    test(`scale ${scale.label} (${scale.entityCount} entities)`, async ({ page }) => {
      // Headless Chromium's software (SwiftShader) WebGL rasterizer scales
      // per-frame cost with entity count far more steeply than a real GPU
      // would, so the largest render-only scale needs generous headroom.
      if (scale.entityCount >= 100000) test.setTimeout(420_000);
      const webgl2 = await page.evaluate(() => {
        try {
          return Boolean(document.createElement("canvas").getContext("webgl2"));
        } catch {
          return false;
        }
      });
      test.skip(!webgl2, "WebGL2 unavailable in this environment; skipping real-renderer certification.");

      await page.goto("/world-perf-harness.html");
      await page.waitForFunction(() => window.__worldPerfHarness?.ready === true);

      // --- First usable frame: construction -> first redraw completing. ---
      const firstUsableFrameMs = await page.evaluate(async ({ entityCount }) => {
        const fixtureModulePath = "/world-fixture-generator.mjs";
        const { generateWorldProjectionFixture } = await import(fixtureModulePath);
        const fixture = generateWorldProjectionFixture({ entityCount });
        const harness = window.__worldPerfHarness;
        const start = performance.now();
        harness.surface.setProjection(fixture);
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        window.__worldPerfFixture = fixture;
        return performance.now() - start;
      }, { entityCount: scale.entityCount });

      // --- Sustained frame time: drive camera through an orbit path. ---
      // Step count is scaled down at larger entity counts: headless
      // Chromium's software (SwiftShader) WebGL rasterizer is far slower
      // per-frame than a real GPU, so a fixed 60-step orbit at 50k+ entities
      // would blow the test timeout without adding measurement value — 20
      // steps is still enough for a stable p50/p95 read.
      const sustainedFrame = await page.evaluate(async ({ entityCount }) => {
        const harness = window.__worldPerfHarness;
        const camera = harness.surface.getCamera();
        const samples: number[] = [];
        const steps = entityCount >= 100000 ? 5 : entityCount >= 50000 ? 20 : 60;
        for (let i = 0; i < steps; i++) {
          const start = performance.now();
          harness.surface.setCamera({
            ...camera,
            longitude: camera.longitude + Math.sin(i / 10) * 5,
            bearing: (i * 6) % 360,
          });
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          samples.push(performance.now() - start);
        }
        samples.sort((a, b) => a - b);
        const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0;
        const p95 = samples[Math.floor(samples.length * 0.95)] ?? 0;
        return { p50Ms: p50, p95Ms: p95, samples: samples.length };
      }, { entityCount: scale.entityCount });

      let inputToPaintMs: number | null = null;
      let pickingLatencyMs: number | null = null;
      let incrementalUpdate: ScaleReport["incrementalUpdate"] = null;
      let sustainedNavigation: ScaleReport["sustainedNavigation"] = null;

      if (scale.interactive) {
        // --- Input-to-visual latency: synthetic wheel event -> next paint. ---
        inputToPaintMs = await page.evaluate(async () => {
          const container = document.getElementById("world-container");
          if (!container) throw new Error("World performance harness container is unavailable.");
          const start = performance.now();
          container.dispatchEvent(
            new WheelEvent("wheel", { deltaY: -100, clientX: 512, clientY: 384, bubbles: true }),
          );
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return performance.now() - start;
        });

        // --- Picking latency. ---
        pickingLatencyMs = await page.evaluate(() => {
          const harness = window.__worldPerfHarness;
          const start = performance.now();
          harness.surface.pick({ x: 512, y: 384 });
          return performance.now() - start;
        });

        // --- Incremental update cost: small delta vs full fixture swap. ---
        incrementalUpdate = await page.evaluate(async () => {
          const fixtureModulePath = "/world-fixture-generator.mjs";
          const { generateWorldProjectionFixture, generateSmallDeltaFixture } =
            await import(fixtureModulePath);
          const harness = window.__worldPerfHarness;
          const base = window.__worldPerfFixture;
          if (!base) throw new Error("World performance fixture is unavailable.");

          const delta = generateSmallDeltaFixture(base, 25);
          const deltaStart = performance.now();
          harness.surface.setProjection(delta);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const smallDeltaMs = performance.now() - deltaStart;

          const swap = generateWorldProjectionFixture({
            entityCount: base.instances.length,
            seed: 999,
          });
          const swapStart = performance.now();
          harness.surface.setProjection(swap);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const fullSwapMs = performance.now() - swapStart;

          // Restore the base fixture so subsequent phases measure the
          // original scale's data.
          harness.surface.setProjection(base);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

          return { smallDeltaMs, fullSwapMs };
        });

        // --- Sustained navigation: repeated camera changes, memory proxy. ---
        sustainedNavigation = await page.evaluate(async ({ entityCount }) => {
          const harness = window.__worldPerfHarness;
          const camera = harness.surface.getCamera();
          const memoryCandidate = Reflect.get(performance, "memory");
          const perfMemory =
            memoryCandidate &&
            typeof memoryCandidate === "object" &&
            "usedJSHeapSize" in memoryCandidate &&
            typeof memoryCandidate.usedJSHeapSize === "number"
              ? { usedJSHeapSize: memoryCandidate.usedJSHeapSize }
              : null;
          const heapStartBytes = perfMemory ? perfMemory.usedJSHeapSize : null;
          const start = performance.now();
          let frames = 0;
          // Shorter budget at large scale for the same SwiftShader-latency
          // reason as the sustained-frame loop above.
          const durationBudgetMs = entityCount >= 50000 ? 1500 : 3000;
          while (performance.now() - start < durationBudgetMs) {
            harness.surface.setCamera({
              ...camera,
              longitude: (camera.longitude + frames * 0.7) % 180,
              zoom: 1 + Math.abs(Math.sin(frames / 20)) * 3,
            });
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            frames++;
          }
          const heapEndBytes = perfMemory ? perfMemory.usedJSHeapSize : null;
          return {
            durationMs: performance.now() - start,
            frames,
            heapStartBytes,
            heapEndBytes,
            heapGrowthBytes:
              heapStartBytes !== null && heapEndBytes !== null ? heapEndBytes - heapStartBytes : null,
          };
        }, { entityCount: scale.entityCount });
      }

      const scaleReport: ScaleReport = {
        label: scale.label,
        entityCount: scale.entityCount,
        firstUsableFrameMs,
        sustainedFrame,
        inputToPaintMs,
        pickingLatencyMs,
        incrementalUpdate,
        sustainedNavigation,
      };
      report.scales.push(scaleReport);

      // Loose sanity bounds: catch a total collapse, not a tight regression
      // gate. See world-performance-baseline.json for the documented
      // rationale and per-scale ceilings.
      const baseline = loadBaseline();
      const bound = baseline.scales[scale.label];
      if (bound) {
        expect(
          scaleReport.firstUsableFrameMs,
          `first usable frame at ${scale.label} should stay under the sanity ceiling`,
        ).toBeLessThan(bound.maxFirstUsableFrameMs);
        expect(
          scaleReport.sustainedFrame.p95Ms,
          `p95 frame time at ${scale.label} should stay under the sanity ceiling`,
        ).toBeLessThan(bound.maxSustainedFrameP95Ms);
      }
    });
  }

  test.afterAll(() => {
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  });
});

function loadBaseline(): {
  scales: Record<string, { maxFirstUsableFrameMs: number; maxSustainedFrameP95Ms: number }>;
} {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
  } catch {
    return { scales: {} };
  }
}

// `Window.__worldPerfHarness` is declared once, as the source of truth, in
// `site/world-perf-harness.ts` (imported for its ambient `declare global`
// side effect throughout this test program); redeclaring it here would
// conflict once that shape grows (see world-interaction-coverage.spec.ts).
import type {} from "../../site/world-perf-harness.ts";
