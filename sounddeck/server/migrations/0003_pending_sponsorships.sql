-- ─── PENDING SPONSORSHIPS ──────────────────────────────────────────────
-- Stocke les sponsorships GitHub dont on n'a pas l'email.
-- L'utilisateur peut les "réclamer" depuis l'app avec son login GitHub.

CREATE TABLE IF NOT EXISTS pending_sponsorships (
  id                  TEXT PRIMARY KEY,
  sponsorship_node_id TEXT UNIQUE NOT NULL,   -- idempotence
  github_login        TEXT NOT NULL,
  github_user_id      TEXT,
  amount_cents        INTEGER,
  currency            TEXT DEFAULT 'USD',
  tier                TEXT NOT NULL DEFAULT 'pro',
  is_one_time         INTEGER DEFAULT 1,
  privacy_level       TEXT,                    -- 'public' | 'private'
  created_at          INTEGER NOT NULL,
  claimed_at          INTEGER,
  claimed_by_user_id  TEXT,
  revoked             INTEGER NOT NULL DEFAULT 0,
  revoked_at          INTEGER,
  revoked_reason      TEXT
);

CREATE INDEX IF NOT EXISTS idx_pending_login   ON pending_sponsorships(github_login);
CREATE INDEX IF NOT EXISTS idx_pending_claimed ON pending_sponsorships(claimed_at);
CREATE INDEX IF NOT EXISTS idx_pending_revoked ON pending_sponsorships(revoked);

-- ─── TRACK AUTO-EMAIL (cas A : email public) ───────────────────────────
-- Évite de recréer un user si GitHub envoie 2× le même event.
-- On utilise déjà sponsorship_node_id UNIQUE pour ça.

-- ─── INDEX SUPPLÉMENTAIRE pour la recherche rapide ─────────────────────
CREATE INDEX IF NOT EXISTS idx_pending_created ON pending_sponsorships(created_at DESC);