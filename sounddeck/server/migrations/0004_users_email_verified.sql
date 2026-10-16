-- Ajout de la vérification email
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN verify_token TEXT;
ALTER TABLE users ADD COLUMN verify_token_expires INTEGER;

-- Index pour lookup rapide par token
CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(verify_token);