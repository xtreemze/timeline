import assert from "node:assert/strict";
import test from "node:test";

await import("../site/time-scale-shim.ts");
const scale = globalThis.TimelineScale;

test("zoom preserves the temporal coordinate under the anchor", () => {
  const viewport = { start: 0, end: 1000 };
  const next = scale.zoom(viewport, 0.5, 250);
  assert.equal(next.start, 125);
  assert.equal(next.end, 625);
  assert.equal((250 - next.start) / (next.end - next.start), 0.25);
});

test("pan preserves the viewport span", () => {
  const next = scale.pan({ start: 100, end: 300 }, 50);
  assert.deepEqual(next, { start: 150, end: 350 });
});

test("millisecond-scale view chooses millisecond ticks", () => {
  const spec = scale.selectTickSpec({ start: 0, end: 100 }, 1000, 100);
  assert.equal(spec.unit, "millisecond");
  assert.equal(spec.step, 10);
});

test("century-scale view chooses calendar year ticks", () => {
  const start = scale.createUtcDate(1500, 0, 1).getTime();
  const end = scale.createUtcDate(2500, 0, 1).getTime();
  const spec = scale.selectTickSpec({ start, end }, 1000, 100);
  assert.equal(spec.unit, "year");
  assert.ok(spec.step >= 100);
});

test("month ticks remain calendar aligned", () => {
  const start = scale.createUtcDate(2024, 0, 15).getTime();
  const end = scale.createUtcDate(2024, 6, 15).getTime();
  const ticks = scale.generateTicks({ start, end }, 900, 120);
  assert.equal(ticks[0].spec.unit, "month");
  for (const tick of ticks) {
    assert.equal(new Date(tick.value).getUTCDate(), 1);
  }
});

test("years 0-99 are not remapped to 1900 by the helper", () => {
  const date = scale.createUtcDate(42, 0, 1);
  assert.equal(date.getUTCFullYear(), 42);
});

test("fit adds useful span around a single instant", () => {
  const viewport = scale.fit([1000], { minSpanMs: 1000, paddingRatio: 0 });
  assert.equal(viewport.end - viewport.start, 1000);
  assert.equal((viewport.start + viewport.end) / 2, 1000);
});

test("explicit hierarchy generation preserves the requested semantic unit and step", () => {
  const start = scale.createUtcDate(2024, 0, 15).getTime();
  const end = scale.createUtcDate(2024, 5, 15).getTime();
  const ticks = scale.generateTicksForSpec(
    { start, end },
    { unit: "month", step: 2, approxMs: 60 * 86_400_000 },
  );

  assert.ok(ticks.length >= 2);
  assert.ok(ticks.every((tick) => tick.spec.unit === "month" && tick.spec.step === 2));
  assert.ok(ticks.every((tick) => new Date(tick.value).getUTCDate() === 1));
});

test("explicit hierarchy generation does not reselect a different viewport-dependent hierarchy", () => {
  const start = scale.createUtcDate(1800, 0, 1).getTime();
  const end = scale.createUtcDate(2200, 0, 1).getTime();
  const ticks = scale.generateTicksForSpec(
    { start, end },
    { unit: "year", step: 25, approxMs: 25 * 365.2425 * 86_400_000 },
  );

  assert.ok(ticks.length > 0);
  assert.ok(ticks.every((tick) => tick.spec.unit === "year" && tick.spec.step === 25));
});
