-- 0009_ingresos.sql
-- Ingresos del hogar (mensuales o quincenales). Base para que la IA
-- compare gastos contra lo que entra. Sin cobro ni UI todavía.

CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  nombre TEXT,
  monto_cents INTEGER NOT NULL CHECK (monto_cents > 0),
  periodicidad TEXT NOT NULL CHECK (periodicidad IN ('MENSUAL', 'QUINCENAL')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE INDEX IF NOT EXISTS idx_incomes_hogar
  ON incomes (household_id);
