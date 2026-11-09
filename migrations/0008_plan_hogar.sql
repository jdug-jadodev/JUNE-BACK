-- 0008_plan_hogar.sql
-- Flag de suscripción por hogar. Sin cobro todavía: se marca manualmente
-- (códigos/fundador/pruebas) hasta que exista Play Billing.

ALTER TABLE households ADD COLUMN plan TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE households ADD COLUMN plan_expires_at TEXT;
ALTER TABLE households ADD COLUMN plan_source TEXT;
