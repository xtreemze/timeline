import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const postgresPath = new URL(
  "../experiments/hosted-persistence/postgres/kernel-v0.sql",
  import.meta.url,
);
const surrealPath = new URL(
  "../experiments/hosted-persistence/surrealdb/kernel-v0.surql",
  import.meta.url,
);

test("PostgreSQL spike preserves project-scoped endpoint integrity and revision CAS", async () => {
  const sql = await readFile(postgresPath, "utf8");

  assert.match(sql, /PRIMARY KEY \(project_key, entity_id\)/);
  assert.match(sql, /CHECK \(subject_id <> object_id\)/);
  assert.match(sql, /FOREIGN KEY \(project_key, subject_id\)/);
  assert.match(sql, /FOREIGN KEY \(project_key, object_id\)/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /v_actual_revision <> p_expected_revision/);
  assert.match(sql, /project_checkpoints/);
});

test("SurrealDB spike uses an enforced relation and explicit revision snapshots", async () => {
  const surql = await readFile(surrealPath, "utf8");

  assert.match(surql, /TYPE RELATION IN entity OUT entity ENFORCED/);
  assert.match(surql, /ASSERT \$value != in/);
  assert.match(surql, /DEFINE TABLE project_revision SCHEMAFULL/);
  assert.match(surql, /FIELDS project, revision UNIQUE/);
  assert.match(surql, /revision-conflict/);
});

test("hosted persistence schemas remain outside rendering and interaction concerns", async () => {
  const contents = (
    await Promise.all([readFile(postgresPath, "utf8"), readFile(surrealPath, "utf8")])
  ).join("\n");

  assert.doesNotMatch(contents, /deck\.gl|sigma|d3-force|camera|hover|pointer/i);
});
