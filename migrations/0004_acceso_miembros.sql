-- 0004_acceso_miembros.sql
-- Permiso de escritura por miembro: LECTURA o ESCRITURA.

ALTER TABLE members ADD COLUMN access_level TEXT NOT NULL DEFAULT 'ESCRITURA';
