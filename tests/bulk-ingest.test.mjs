import assert from "node:assert/strict";
import test from "node:test";

import { parseBulkRows, profileBulkRows } from "../src/application/bulk-ingest.ts";

test("CSV and TSV ingest preserve source values without silent type coercion", async () => {
  const csv = await parseBulkRows({
    format: "csv",
    data: 'id,name,note\n1,Alice,"hello, world"\n2,Bob,\n',
  });
  assert.deepEqual(csv, [
    { id: "1", name: "Alice", note: "hello, world" },
    { id: "2", name: "Bob", note: null },
  ]);

  const tsv = await parseBulkRows({
    format: "tsv",
    data: "id\tactive\n1\ttrue\n",
  });
  assert.deepEqual(tsv, [{ id: "1", active: "true" }]);
});

test("JSON ingest preserves typed source values", async () => {
  const rows = await parseBulkRows({
    format: "json",
    data: JSON.stringify([
      { id: "a", score: 2, active: true },
      { id: "b", score: 4, active: false },
    ]),
  });

  assert.deepEqual(rows, [
    { id: "a", score: 2, active: true },
    { id: "b", score: 4, active: false },
  ]);
});

test("delimited ingest rejects malformed headers and quoted fields", async () => {
  await assert.rejects(
    () => parseBulkRows({ format: "csv", data: "id,id\n1,2\n" }),
    /duplicate column names/i,
  );
  await assert.rejects(
    () => parseBulkRows({ format: "csv", data: 'id,note\n1,"unterminated\n' }),
    /unterminated quoted field/i,
  );
});

test("Arrow and Parquet use the same ingest contract through binary adapters", async () => {
  const calls = [];
  const adapters = {
    arrow: {
      parse(data) {
        calls.push(["arrow", [...data]]);
        return [{ id: "arrow-row", score: 3 }];
      },
    },
    parquet: {
      async parse(data) {
        calls.push(["parquet", [...data]]);
        return [{ id: "parquet-row", score: 5 }];
      },
    },
  };

  assert.deepEqual(
    await parseBulkRows({ format: "arrow", data: new Uint8Array([1, 2]) }, adapters),
    [{ id: "arrow-row", score: 3 }],
  );
  assert.deepEqual(
    await parseBulkRows({ format: "parquet", data: new Uint8Array([3, 4]) }, adapters),
    [{ id: "parquet-row", score: 5 }],
  );
  assert.deepEqual(calls, [
    ["arrow", [1, 2]],
    ["parquet", [3, 4]],
  ]);

  await assert.rejects(
    () => parseBulkRows({ format: "arrow", data: new Uint8Array() }),
    /configured binary tabular adapter/i,
  );
});

test("profiling reports null, unique, numeric, and quantile summaries", () => {
  const profile = profileBulkRows([
    { id: "a", score: 1, category: "x" },
    { id: "b", score: 2, category: "x" },
    { id: "c", score: 3, category: null },
    { id: "d", score: 4, category: "y" },
  ]);

  assert.equal(profile.rowCount, 4);

  const score = profile.columns.find((column) => column.name === "score");
  assert.equal(score.inferredType, "number");
  assert.equal(score.uniqueCount, 4);
  assert.deepEqual(score.numeric, {
    min: 1,
    max: 4,
    mean: 2.5,
    standardDeviation: Math.sqrt(1.25),
    q25: 1.75,
    q50: 2.5,
    q75: 3.25,
  });

  const category = profile.columns.find((column) => column.name === "category");
  assert.equal(category.nullCount, 1);
  assert.equal(category.nullFraction, 0.25);
  assert.equal(category.uniqueCount, 2);
  assert.deepEqual(category.samples, ["x", "y"]);
});

test("mixed columns are profiled without coercing strings to numbers", () => {
  const profile = profileBulkRows([{ value: 1 }, { value: "2" }, { value: null }]);

  const value = profile.columns.find((column) => column.name === "value");
  assert.equal(value.inferredType, "mixed");
  assert.equal(value.numeric, undefined);
});
