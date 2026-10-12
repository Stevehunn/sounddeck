-- ─── REDEEM CODES ──────────────────────────────────────────────────────
-- Codes d'activation Pro à usage unique (générés par l'admin).

CREATE TABLE IF NOT EXISTS redeem_codes (
  code            TEXT PRIMARY KEY,
  tier            TEXT NOT NULL DEFAULT 'pro',
  note            TEXT,
  email_hint      TEXT,                 -- Email attendu (si null, accepte n'importe qui)
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER,              -- null = jamais expiré
  used_at         INTEGER,
  used_by_email   TEXT,
  used_by_user_id TEXT,
  max_uses        INTEGER NOT NULL DEFAULT 1,
  current_uses    INTEGER NOT NULL DEFAULT 0,
  revoked         INTEGER NOT NULL DEFAULT 0,
  revoked_at      INTEGER,
  revoked_reason  TEXT
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_email    ON redeem_codes(email_hint);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_used     ON redeem_codes(used_at);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_expires  ON redeem_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_revoked  ON redeem_codes(revoked);