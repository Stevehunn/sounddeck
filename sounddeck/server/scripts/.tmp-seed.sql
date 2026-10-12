-- Seed généré par scripts/seed.mjs
-- Date : 2026-10-09T14:43:56.403Z

INSERT OR REPLACE INTO users (id, email, password_hash, password_salt, donor_id, donor_name, tier, created_at, updated_at)
VALUES ('7783f3d7-fe0f-4907-89e1-6da346c56c48', 'test@example.com', '3ab5f9c03f29cd09a7949b417a97ec6112eb8e9cb63304d982db185c71d0eda9', 'bbbbecda3eb56dba3cf0c1df05ca4c69', '25876613-f48c-421e-8f8e-c7e971a50efc', 'Test test', 'pro', 1791557036, 1791557036);

INSERT OR REPLACE INTO users (id, email, password_hash, password_salt, donor_id, donor_name, tier, created_at, updated_at)
VALUES ('5056747b-a71b-4a7a-9be6-a21b38e3cc03', 'prod-test@example.com', '5aab97ca36ee9f7056b6da2199e7b0160970a2b4aaf5e67873cb8470acfc6a4d', 'bae01a791b164d731563a02d3ed41d29', '8428f3c3-8430-490c-a7fb-2d52864209b8', 'Test prod-test', 'pro', 1791557036, 1791557036);
