-- 0001_init.sql
-- Esquema inicial de Andrómeda (Cloudflare D1 / SQLite)

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE households (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  admin_password_hash TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MIEMBRO')),
  joined_at TEXT NOT NULL,
  UNIQUE (household_id, user_id),
  FOREIGN KEY (household_id) REFERENCES households(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  producto TEXT NOT NULL,
  monto_cents INTEGER NOT NULL CHECK (monto_cents > 0),
  fecha TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (household_id) REFERENCES households(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX ix_expenses_household_updated ON expenses (household_id, updated_at);
CREATE INDEX ix_members_household ON members (household_id);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);
