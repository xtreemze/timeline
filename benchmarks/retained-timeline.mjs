import { performance } from "node:perf_hooks";
import process from "node:process";
import { queryOccurrences } from "../src/projection/temporal-scene.ts";

function makeOccurrences(count, seed = 17) {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_00_00_00_00;
  };

  const origin = Date.UTC(1800, 0, 1);
  const span = Date.UTC(2200, 0, 1) - origin;
  return Array.from({ length: count }, (_, index) => {
    const start = origin + Math.floor(next() * span);
    const ranged = index % 5 === 0;
    const duration = ranged ? Math.floor(next() * 365 * 86_400_000) : 0;
    return {
      id: `occurrence-${String(index).padStart(6, "0")}`,
      start,
      end: ranged ? start + duration : null,
    };
  });
}

function benchmarkQuery(occurrences, iterations = 120) {
  const totalSpan = Date.UTC(2200, 0, 1) - Date.UTC(1800, 0, 1);
  const windowSpan = 5 * 365.2425 * 86_400_000;
  const durations = [];
  let resultCount = 0;

  for (let index = 0; index < iterations; index += 1) {
    const ratio = index / Math.max(1, iterations - 1);
    const start = Date.UTC(1800, 0, 1) + ratio * (totalSpan - windowSpan);
    const before = performance.now();
    const result = queryOccurrences(occurrences, {
      start,
      end: start + windowSpan,
    });
    durations.push(performance.now() - before);
    resultCount += result.length;
  }

  durations.sort((a, b) => a - b);
  const total = durations.reduce((sum, value) => sum + value, 0);
  const p95 = durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] ?? 0;
  return {
    iterations,
    averageMs: total / durations.length,
    p95Ms: p95,
    maximumMs: durations.at(-1) ?? 0,
    averageMatches: resultCount / iterations,
  };
}

const fixtureSizes = [10_000, 50_000, 100_000];
const results = fixtureSizes.map((count) => ({
  count,
  linearWindowQuery: benchmarkQuery(makeOccurrences(count)),
}));

process.stdout.write(
  `${JSON.stringify(
    {
      benchmark: "retained-timeline-temporal-query",
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      fixture: "seeded sparse/range-heavy 1800-2200 chronology",
      results,
    },
    null,
    2,
  )}\n`,
);
