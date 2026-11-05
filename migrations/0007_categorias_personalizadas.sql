-- 0007_categorias_personalizadas.sql
-- Categorías creadas por cada hogar para clasificar sus propios gastos.

CREATE TABLE IF NOT EXISTS custom_categories (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  nombre_normalizado TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'VARIABLE',
  es_gusto INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (household_id, nombre_normalizado)
);

CREATE INDEX IF NOT EXISTS idx_custom_categories_hogar
  ON custom_categories (household_id);
