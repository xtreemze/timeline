-- Lūm hosted persistence spike: SurrealDB kernel v0
-- Provisional schema for the current CanonicalProject entity/relationship kernel.

DEFINE TABLE project SCHEMAFULL TYPE NORMAL;
DEFINE FIELD revision ON TABLE project TYPE int ASSERT $value >= 0;
DEFINE FIELD created_at ON TABLE project TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON TABLE project TYPE datetime DEFAULT time::now();

DEFINE TABLE project_revision SCHEMAFULL TYPE NORMAL;
DEFINE FIELD project ON TABLE project_revision TYPE record<project>;
DEFINE FIELD revision ON TABLE project_revision TYPE int ASSERT $value > 0;
DEFINE FIELD saved_at ON TABLE project_revision TYPE datetime;
DEFINE FIELD snapshot ON TABLE project_revision TYPE object FLEXIBLE;
DEFINE INDEX project_revision_unique
  ON TABLE project_revision FIELDS project, revision UNIQUE;

DEFINE TABLE entity SCHEMAFULL TYPE NORMAL;
DEFINE FIELD project ON TABLE entity TYPE record<project>;
DEFINE FIELD entity_id ON TABLE entity TYPE string ASSERT string::len(string::trim($value)) > 0;
DEFINE FIELD entity_type ON TABLE entity TYPE string ASSERT string::len(string::trim($value)) > 0;
DEFINE FIELD name ON TABLE entity TYPE string ASSERT string::len(string::trim($value)) > 0;
DEFINE FIELD alternate_names ON TABLE entity TYPE array<string> DEFAULT [];
DEFINE FIELD source_ids ON TABLE entity TYPE array<string> DEFAULT [];
DEFINE FIELD attributes ON TABLE entity TYPE object FLEXIBLE DEFAULT {};
DEFINE INDEX entity_project_identity
  ON TABLE entity FIELDS project, entity_id UNIQUE;

DEFINE TABLE relationship
  SCHEMAFULL
  TYPE RELATION IN entity OUT entity ENFORCED;
DEFINE FIELD project ON TABLE relationship TYPE record<project>;
DEFINE FIELD relationship_id ON TABLE relationship TYPE string
  ASSERT string::len(string::trim($value)) > 0;
DEFINE FIELD in ON TABLE relationship TYPE record<entity>;
DEFINE FIELD out ON TABLE relationship TYPE record<entity> ASSERT $value != in;
DEFINE FIELD predicate ON TABLE relationship TYPE string
  ASSERT string::len(string::trim($value)) > 0;
DEFINE FIELD role ON TABLE relationship TYPE option<string>;
DEFINE FIELD place_id ON TABLE relationship TYPE option<string>;
DEFINE FIELD item_ids ON TABLE relationship TYPE array<string> DEFAULT [];
DEFINE FIELD source_ids ON TABLE relationship TYPE array<string> DEFAULT [];
DEFINE FIELD confidence ON TABLE relationship TYPE option<number>
  ASSERT $value = NONE OR ($value >= 0 AND $value <= 1);
DEFINE FIELD time_json ON TABLE relationship TYPE option<object> FLEXIBLE;
DEFINE FIELD attributes ON TABLE relationship TYPE object FLEXIBLE DEFAULT {};
DEFINE INDEX relationship_project_identity
  ON TABLE relationship FIELDS project, relationship_id UNIQUE;
DEFINE INDEX relationship_project_predicate
  ON TABLE relationship FIELDS project, predicate;
DEFINE INDEX relationship_project_place
  ON TABLE relationship FIELDS project, place_id;

-- Repository compare-and-swap is intentionally implemented in the adapter
-- transaction rather than encoded as renderer/application logic:
--
-- BEGIN TRANSACTION;
-- LET $p = SELECT VALUE revision FROM ONLY project:$project_key;
-- IF ($p ?? 0) != $expected_revision {
--   THROW "revision-conflict";
-- };
-- CREATE project_revision CONTENT {
--   project: type::record("project", $project_key),
--   revision: $expected_revision + 1,
--   saved_at: $saved_at,
--   snapshot: $snapshot
-- };
-- UPSERT project:$project_key SET
--   revision = $expected_revision + 1,
--   updated_at = $saved_at;
-- COMMIT TRANSACTION;
--
-- Live benchmarking must verify transaction/conflict behavior against the
-- selected SurrealDB version before this becomes a production adapter.
