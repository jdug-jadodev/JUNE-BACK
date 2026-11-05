-- 0006_clasificacion_hogar.sql
-- Correcciones de clasificación por hogar y descripción opcional del término.

CREATE TABLE IF NOT EXISTS concept_overrides (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  termino TEXT NOT NULL,
  concepto_id TEXT NOT NULL,
  nota TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (household_id, termino)
);

CREATE INDEX IF NOT EXISTS idx_concept_overrides_hogar
  ON concept_overrides (household_id);
