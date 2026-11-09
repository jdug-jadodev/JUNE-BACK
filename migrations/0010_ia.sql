-- 0010_ia.sql
-- Clasificación con IA: caché por hogar y uso mensual para el tope de presupuesto.

CREATE TABLE IF NOT EXISTS ai_classifications (
  household_id TEXT NOT NULL,
  termino TEXT NOT NULL,
  concepto_id TEXT NOT NULL,
  confianza REAL,
  explicacion TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (household_id, termino)
);

CREATE INDEX IF NOT EXISTS idx_ai_classifications_hogar
  ON ai_classifications (household_id);

CREATE TABLE IF NOT EXISTS ai_usage (
  month TEXT PRIMARY KEY,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  requests INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
