-- 0002_indice_fecha.sql
-- Acelera las consultas por rango de fechas (mes actual y carpetas de meses).

CREATE INDEX IF NOT EXISTS ix_expenses_household_fecha
  ON expenses (household_id, fecha);
