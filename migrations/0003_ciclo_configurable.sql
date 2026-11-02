-- 0003_ciclo_configurable.sql
-- Día de corte del ciclo mensual por hogar (1 = mes calendario).

ALTER TABLE households ADD COLUMN cutoff_day INTEGER NOT NULL DEFAULT 1;
