-- 0005_recuperacion_password.sql
-- Pregunta de seguridad, llave de recuperación y control de intentos.

ALTER TABLE users ADD COLUMN security_question TEXT;
ALTER TABLE users ADD COLUMN security_answer_hash TEXT;
ALTER TABLE users ADD COLUMN recovery_code_hash TEXT;
ALTER TABLE users ADD COLUMN reset_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN reset_locked_until TEXT;
