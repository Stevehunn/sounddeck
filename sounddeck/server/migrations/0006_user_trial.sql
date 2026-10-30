-- ─── USER TRIAL ────────────────────────────────────────────────────────
-- Pro trial (verification month + 3 following months)
--
-- NULL  = never expires (donor / redeem code / admin / dev)
-- INTEGER = Unix seconds when the trial ends (auto-downgrade to 'free')

ALTER TABLE users ADD COLUMN tier_expires_at INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN trial_activated_at INTEGER DEFAULT NULL;

-- Fast lookup for scheduled downgrades (cron, admin queries, etc.)
CREATE INDEX IF NOT EXISTS idx_users_tier_expires
  ON users(tier_expires_at);