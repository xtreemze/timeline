-- Lūm hosted persistence spike: PostgreSQL kernel v0
-- Provisional schema for the current CanonicalProject entity/relationship kernel.
-- This is intentionally provider-neutral and can run on Supabase, RDS/Aurora,
-- Azure Database for PostgreSQL, or self-hosted PostgreSQL.

CREATE SCHEMA IF NOT EXISTS lum;

CREATE TABLE IF NOT EXISTS lum.projects (
  project_key text PRIMARY KEY,
  current_revision bigint NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lum.project_revisions (
  project_key text NOT NULL REFERENCES lum.projects(project_key) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  saved_at timestamptz NOT NULL,
  snapshot jsonb NOT NULL,
  PRIMARY KEY (project_key, revision)
);

CREATE TABLE IF NOT EXISTS lum.entities (
  project_key text NOT NULL REFERENCES lum.projects(project_key) ON DELETE CASCADE,
  entity_id text NOT NULL,
  entity_type text NOT NULL CHECK (btrim(entity_type) <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  alternate_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (project_key, entity_id)
);

CREATE TABLE IF NOT EXISTS lum.relationships (
  project_key text NOT NULL REFERENCES lum.projects(project_key) ON DELETE CASCADE,
  relationship_id text NOT NULL,
  subject_id text NOT NULL,
  object_id text NOT NULL,
  predicate text NOT NULL CHECK (btrim(predicate) <> ''),
  role text,
  place_id text,
  item_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence double precision CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  time_json jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (project_key, relationship_id),
  CONSTRAINT relationship_not_self CHECK (subject_id <> object_id),
  CONSTRAINT relationship_subject_fk
    FOREIGN KEY (project_key, subject_id)
    REFERENCES lum.entities(project_key, entity_id)
    ON DELETE RESTRICT,
  CONSTRAINT relationship_object_fk
    FOREIGN KEY (project_key, object_id)
    REFERENCES lum.entities(project_key, entity_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS relationships_subject_idx
  ON lum.relationships(project_key, subject_id);
CREATE INDEX IF NOT EXISTS relationships_object_idx
  ON lum.relationships(project_key, object_id);
CREATE INDEX IF NOT EXISTS relationships_place_idx
  ON lum.relationships(project_key, place_id)
  WHERE place_id IS NOT NULL;

-- Compare-and-swap the canonical revision. The caller performs normalized
-- entity/relationship replacement in the same transaction, then calls this
-- function before COMMIT. A serialization failure is surfaced for stale writes.
CREATE OR REPLACE FUNCTION lum.save_project_revision(
  p_project_key text,
  p_expected_revision bigint,
  p_saved_at timestamptz,
  p_snapshot jsonb
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_actual_revision bigint;
  v_next_revision bigint;
BEGIN
  IF p_expected_revision < 0 THEN
    RAISE EXCEPTION 'expected revision must be non-negative';
  END IF;

  INSERT INTO lum.projects(project_key)
  VALUES (p_project_key)
  ON CONFLICT (project_key) DO NOTHING;

  SELECT current_revision
    INTO v_actual_revision
    FROM lum.projects
    WHERE project_key = p_project_key
    FOR UPDATE;

  IF v_actual_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'project % expected revision %, actual revision %',
      p_project_key, p_expected_revision, v_actual_revision
      USING ERRCODE = '40001';
  END IF;

  v_next_revision := v_actual_revision + 1;

  INSERT INTO lum.project_revisions(project_key, revision, saved_at, snapshot)
  VALUES (p_project_key, v_next_revision, p_saved_at, p_snapshot);

  UPDATE lum.projects
    SET current_revision = v_next_revision,
        updated_at = p_saved_at
    WHERE project_key = p_project_key;

  RETURN v_next_revision;
END;
$$;

-- Recovery contract: the last-known-good checkpoint is the revision directly
-- before current_revision. The application decides whether to restore it.
CREATE OR REPLACE VIEW lum.project_checkpoints AS
SELECT r.project_key, r.revision, r.saved_at, r.snapshot
FROM lum.project_revisions r
JOIN lum.projects p ON p.project_key = r.project_key
WHERE r.revision = p.current_revision - 1;
