-- User de test généré par hash-password.mjs le 2026-10-08T10:43:57.928Z
-- Email    : prode2e@example.com
-- Password : (celui que tu as passé en argument)

INSERT INTO users
  (id, email, password_hash, password_salt, donor_id, donor_name, tier, created_at, updated_at)
VALUES
  ('a8376391-6fef-40a1-b347-d6fc268ae167', 'prode2e@example.com', '42521da8f8e464eceef6e266b32821c0d5bbf41d61c5b7b260fab32c687ca58e', 'd67cdb6b93ee8a8d00ff41ce313d1c6a', 'cf469d70-da7f-4206-918e-53cea2f00333', 'Test Donateur', 'pro', 1791456237, 1791456237);
