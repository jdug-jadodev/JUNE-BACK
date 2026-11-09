-- 0011_ai_analisis.sql
-- Caché del análisis narrativo con IA, por huella de datos del hogar.

CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  texto TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_hogar
  ON ai_analyses (household_id, fingerprint);
