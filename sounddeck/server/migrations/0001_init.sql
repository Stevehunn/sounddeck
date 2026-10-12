-- ─── USERS ─────────────────────────────────────────────────────────────
-- Un utilisateur = un email + un password + un donorId (lié au token Ed25519)

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  donor_id      TEXT UNIQUE NOT NULL,
  donor_name    TEXT,
  tier          TEXT NOT NULL DEFAULT 'pro',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_donor_id ON users(donor_id);

-- ─── PAYMENTS ──────────────────────────────────────────────────────────
-- Historique des paiements Stripe (pour audit + réconciliation)

CREATE TABLE IF NOT EXISTS payments (
  id                  TEXT PRIMARY KEY,
  stripe_session_id   TEXT UNIQUE,
  stripe_payment_id   TEXT,
  email               TEXT NOT NULL,
  amount              REAL NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'EUR',
  donor_id            TEXT,
  created_at          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);

-- ─── AUDIT LOG ─────────────────────────────────────────────────────────
-- Log de tous les événements sensibles (login, webhook, etc.)

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event      TEXT NOT NULL,
  email      TEXT,
  donor_id   TEXT,
  ip         TEXT,
  user_agent TEXT,
  detail     TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);