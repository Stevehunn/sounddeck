-- User de test généré par hash-password.mjs le 2026-10-09T14:40:45.685Z
-- Email    : testnonpro@example.com
-- Password : (celui que tu as passé en argument)

INSERT INTO users
  (id, email, password_hash, password_salt, donor_id, donor_name, tier, created_at, updated_at)
VALUES
  ('1b7ee756-c61a-4d14-b312-7df062c74e9e', 'testnonpro@example.com', '0671369ef079cc9b9566755f3b333c58f8b66f68d928f4e1c206652cdece629e', '0f4db1a2dc6a37c18d6ab1fef1bbd14e', 'ca564b5e-ebf0-41f2-a833-c93b70ee64fe', 'Test Donateur', 'pro', 1791556845, 1791556845);
