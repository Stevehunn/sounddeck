PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  donor_id      TEXT UNIQUE NOT NULL,
  donor_name    TEXT,
  tier          TEXT NOT NULL DEFAULT 'pro',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
, email_verified INTEGER NOT NULL DEFAULT 0, verify_token TEXT, verify_token_expires INTEGER);
INSERT INTO "users" ("id","email","password_hash","password_salt","donor_id","donor_name","tier","created_at","updated_at","email_verified","verify_token","verify_token_expires") VALUES('56f8ddd1-9876-4819-b35c-ceaa30f545cb','stevehun09@gmail.com','7b90c0b9f487c7adfeb24e3f44031e63494ac2494d268781e5120b0e5888599f','e131a0be0cfd798ced999f81ef627ebc','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc','Test Donateur','pro',1791474699,1792161616,1,NULL,NULL);
INSERT INTO "users" ("id","email","password_hash","password_salt","donor_id","donor_name","tier","created_at","updated_at","email_verified","verify_token","verify_token_expires") VALUES('cd9052d0-9786-4b70-adca-da313db28715','nicolas.bitaillou@gmail.com','c17b5cdfbe37ba7bf362bf7bc1eddd636a40a636c550352cbc2127bcdc45d17b','dd1d6f01a7e7cbed1c8d3d320bc0a0b2','free-cd9052d0',NULL,'free',1792159860,1792160792,1,NULL,NULL);
INSERT INTO "users" ("id","email","password_hash","password_salt","donor_id","donor_name","tier","created_at","updated_at","email_verified","verify_token","verify_token_expires") VALUES('db981ab7-acd7-43ce-bac4-b7a76d027a89','smurfcocodile@gmail.com','c8c1afee59ab9ab7ab6bfff247c6268a4dcb3c17d614bfc1a07461beab50927c','297f7e6d6a63e28bf2acfe6dbf54ef4b','free-db981ab7',NULL,'free',1792163787,1792163808,1,NULL,NULL);
INSERT INTO "users" ("id","email","password_hash","password_salt","donor_id","donor_name","tier","created_at","updated_at","email_verified","verify_token","verify_token_expires") VALUES('a13409ef-a7f1-4901-951e-418f99db80f5','stevehun09+test-verify@gmail.com','a841fda7116d4e8e2a75caf2abf4fd943b78e7b4b887057e7649f8f014955b39','18ca776409cdb8144d951cac944758e0','free-a13409ef',NULL,'free',1792164366,1792164366,0,'3f8c5419f4c94fd98c2b472ca0b74f422e31815c1ec74038ac264384f6c671de',1792250766);
INSERT INTO "users" ("id","email","password_hash","password_salt","donor_id","donor_name","tier","created_at","updated_at","email_verified","verify_token","verify_token_expires") VALUES('a433ea01-342c-4585-a9ce-92659bebba37','stevehun09+test-doc2@gmail.com','785f4bd10ee69ce83400db0b4428de31614b2479cd03d2742599c03191d14b2c','4fb9a14b3adaffd9d8f9522d013c875f','free-a433ea01',NULL,'free',1792405738,1792405738,0,'05d5acbc96ad4928820b04908a0bb44fe9bfc1f2988f4f768c2b00ea1259b935',1792492138);
CREATE TABLE payments (
  id                  TEXT PRIMARY KEY,
  stripe_session_id   TEXT UNIQUE,
  stripe_payment_id   TEXT,
  email               TEXT NOT NULL,
  amount              REAL NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'EUR',
  donor_id            TEXT,
  created_at          INTEGER NOT NULL
);
INSERT INTO "payments" ("id","stripe_session_id","stripe_payment_id","email","amount","currency","donor_id","created_at") VALUES('cc40975c-739f-42d9-9848-723206dee924','cs_test_a17ABsM2vCfDcjLht8tGq1NGoayokxpYKntJ6pK7Q3lBlXzfsV1kLceskp','pi_3UOJbZ66GySxOhEo01NrlrJ2','stevehun09@gmail.com',9.99,'EUR','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc',1791474699);
INSERT INTO "payments" ("id","stripe_session_id","stripe_payment_id","email","amount","currency","donor_id","created_at") VALUES('a055d6f3-7ba9-42c6-a22f-3f00a8460744','cs_test_a1uB4ssfEWh9DHvqMJZsAc4DAjc52sZxGkPmIPVVuY7SDnzNsEgArYPfa3','pi_3UOK7T66GySxOhEo0gpozRji','stripe@example.com',30,'USD','4bdbd3cd-90cc-49b9-9a25-33b8047ab3b7',1791476676);
CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event      TEXT NOT NULL,
  email      TEXT,
  donor_id   TEXT,
  ip         TEXT,
  user_agent TEXT,
  detail     TEXT,
  created_at INTEGER NOT NULL
);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(1,'login_failed','test@example.com',NULL,'2001:861:2822:77d0:21a6:e364:9606:6ec9','curl/8.12.1','user_not_found',1791454154);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(2,'login_success','prode2e@example.com','cf469d70-da7f-4206-918e-53cea2f00333','2001:861:2822:77d0:21a6:e364:9606:6ec9','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.3.0 Chrome/148.0.7778.280 Electron/42.11.11 Safari/537.36',NULL,1791456384);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(3,'stripe_webhook_error','stevehun09@gmail.com',NULL,NULL,NULL,'Resend error (403): {"message":"The sounddeck.app domain is not verified. Please, add and verify your domain on https://resend.com/domains","name":"validation_error","statusCode":403}',1791474700);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(4,'stripe_webhook_duplicate','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc',NULL,NULL,'cs_test_a17ABsM2vCfDcjLht8tGq1NGoayokxpYKntJ6pK7Q3lBlXzfsV1kLceskp',1791474714);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(5,'stripe_webhook_duplicate','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc',NULL,NULL,'cs_test_a12pMTHWpxowmwQycRWT5O0h0DhTGsMpk3GkVfN0nu9cTUHe6PLKSGxz33',1791474881);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(6,'stripe_webhook_duplicate','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc',NULL,NULL,'cs_test_a1x17lyF7eYf2N2da4kVztd0AaiJcytlo9YlONtJO1FC8Eq53Cz7WjNcmA',1791475045);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(7,'stripe_webhook_duplicate','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc',NULL,NULL,'cs_test_a1N2yD3sU7jTzjEOml5mDwA2YUSjVKnp9cz4S0t8TRQ0A2b0ChtFwyHzUp',1791476239);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(8,'stripe_webhook_error','stripe@example.com',NULL,NULL,NULL,'Resend error (422): {"message":"Invalid `to` field. Please use our testing email address instead of domains like `example.com`. See our documentation for more information.","name":"validation_error","',1791476677);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(9,'stripe_webhook_duplicate','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc',NULL,NULL,'cs_test_a18xzO5MXzzBgsnsV36shlveB6PBO0sZZkUZe7pDRkg8c4K16BKZ6X7F54',1791476792);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(10,'stripe_webhook_duplicate','stripe@example.com','4bdbd3cd-90cc-49b9-9a25-33b8047ab3b7',NULL,NULL,'cs_test_a16SENNmScnR99wAXAhkzTO1tB2FQAGCtRms4iVWLNXGvGFqXeMl6VJtz7',1791476820);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(11,'stripe_webhook_duplicate','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc',NULL,NULL,'cs_test_a1xfEeqV9eCItJHb8g3bpW9J0dfadudZmwTmX2X3C2OlqQ1WjIBYiVFqiN',1791476949);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(12,'stripe_webhook_duplicate','stripe@example.com','4bdbd3cd-90cc-49b9-9a25-33b8047ab3b7',NULL,NULL,'cs_test_a1DEUZx6AnpZ6mpi3hmdxBv9SVSniEmgJA73Ae9re7cSLHnXhjTAiq7sjC',1791476965);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(13,'stripe_webhook_duplicate','stripe@example.com','4bdbd3cd-90cc-49b9-9a25-33b8047ab3b7',NULL,NULL,'cs_test_a1uB4ssfEWh9DHvqMJZsAc4DAjc52sZxGkPmIPVVuY7SDnzNsEgArYPfa3',1791480276);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(14,'login_failed','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36','wrong_password',1792156752);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(15,'login_success','test2@example.com','admin-9cef99a3','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792158111);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(16,'signup','newuser3@example.com',NULL,'2001:861:2822:77d0:5dfa:c26d:9595:afb2','curl/8.12.1','email_failed',1792159543);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(17,'signup','newuser3@example.com',NULL,'2001:861:2822:77d0:5dfa:c26d:9595:afb2','curl/8.12.1','email_failed',1792159593);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(18,'signup','nicolas.bitaillou@gmail.com',NULL,'2001:861:2822:77d0:5dfa:c26d:9595:afb2','curl/8.12.1','email_sent',1792159860);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(19,'email_verified','nicolas.bitaillou@gmail.com','free-cd9052d0','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',NULL,1792159984);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(20,'login_success','nicolas.bitaillou@gmail.com','free-cd9052d0','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792160132);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(21,'forgot_password_unknown_email','nicolas.bitallou@gmail.com',NULL,'2001:861:2822:77d0:5dfa:c26d:9595:afb2','curl/8.12.1',NULL,1792160570);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(22,'forgot_password_sent','nicolas.bitaillou@gmail.com','free-cd9052d0','2001:861:2822:77d0:5dfa:c26d:9595:afb2','curl/8.12.1',NULL,1792160731);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(23,'password_reset_success','nicolas.bitaillou@gmail.com','free-cd9052d0','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',NULL,1792160792);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(24,'login_failed','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36','wrong_password',1792161501);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(25,'forgot_password_sent','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792161550);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(26,'password_reset_success','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',NULL,1792161616);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(27,'login_success','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792161652);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(28,'login_success','nicolas.bitaillou@gmail.com','free-cd9052d0','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792161703);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(29,'login_success','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792161917);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(30,'login_success','nicolas.bitaillou@gmail.com','free-cd9052d0','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792161940);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(31,'login_success','stevehun09@gmail.com','1cea5ff9-ccdd-438d-af8e-9bb48fb6fedc','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792162967);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(32,'signup','smurfcocodile@gmail.com',NULL,'2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36','email_sent',1792163787);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(33,'email_verified','smurfcocodile@gmail.com','free-db981ab7','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',NULL,1792163808);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(34,'login_success','smurfcocodile@gmail.com','free-db981ab7','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36',NULL,1792163820);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(35,'signup','stevehun09+test-verify@gmail.com',NULL,'2001:861:2822:77d0:5dfa:c26d:9595:afb2','curl/8.12.1','email_sent',1792164366);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(36,'login_failed','stevehun09+test-verify@gmail.com','free-a13409ef','2001:861:2822:77d0:5dfa:c26d:9595:afb2','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) sounddeck/1.4.11 Chrome/148.0.7778.280 Electron/42.11.15 Safari/537.36','email_not_verified',1792164473);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(37,'signup','stevehun09+test-doc2@gmail.com',NULL,'2001:861:2822:77d0:3521:3769:2753:a3c2','curl/8.12.1','email_sent',1792405738);
INSERT INTO "audit_log" ("id","event","email","donor_id","ip","user_agent","detail","created_at") VALUES(38,'forgot_password_sent','stevehun09+test-doc2@gmail.com','free-a433ea01','2001:861:2822:77d0:3521:3769:2753:a3c2','curl/8.12.1',NULL,1792405739);
CREATE TABLE redeem_codes (
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
INSERT INTO "redeem_codes" ("code","tier","note","email_hint","created_at","expires_at","used_at","used_by_email","used_by_user_id","max_uses","current_uses","revoked","revoked_at","revoked_reason") VALUES('SDCK-KMP7-48AH-89TJ','pro','test','stevehun09@gmail.com',1792170071,1794762071,NULL,NULL,NULL,1,0,0,NULL,NULL);
INSERT INTO "redeem_codes" ("code","tier","note","email_hint","created_at","expires_at","used_at","used_by_email","used_by_user_id","max_uses","current_uses","revoked","revoked_at","revoked_reason") VALUES('SDCK-E9VU-79WQ-NV6A','pro',NULL,NULL,1792170256,1794762256,NULL,NULL,NULL,1,0,0,NULL,NULL);
INSERT INTO "redeem_codes" ("code","tier","note","email_hint","created_at","expires_at","used_at","used_by_email","used_by_user_id","max_uses","current_uses","revoked","revoked_at","revoked_reason") VALUES('SDCK-38C2-7P55-P8XM','pro',NULL,NULL,1792252308,1800028308,NULL,NULL,NULL,1,0,0,NULL,NULL);
INSERT INTO "redeem_codes" ("code","tier","note","email_hint","created_at","expires_at","used_at","used_by_email","used_by_user_id","max_uses","current_uses","revoked","revoked_at","revoked_reason") VALUES('SDCK-Q72Y-NSD6-6NE4','pro',NULL,NULL,1792252317,1800028317,NULL,NULL,NULL,1,0,0,NULL,NULL);
INSERT INTO "redeem_codes" ("code","tier","note","email_hint","created_at","expires_at","used_at","used_by_email","used_by_user_id","max_uses","current_uses","revoked","revoked_at","revoked_reason") VALUES('SDCK-TWZM-EH7M-9PCH','pro',NULL,NULL,1792252370,1800028370,NULL,NULL,NULL,1,0,0,NULL,NULL);
CREATE TABLE pending_sponsorships (
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
CREATE TABLE password_resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  ip TEXT,
  user_agent TEXT
);
INSERT INTO "password_resets" ("token","user_id","email","created_at","expires_at","used_at","ip","user_agent") VALUES('68380239c10745259c5a074dc22f87aeb402552f10834e35b8918ad460290f59','a433ea01-342c-4585-a9ce-92659bebba37','stevehun09+test-doc2@gmail.com',1792405739,1792409339,NULL,'2001:861:2822:77d0:3521:3769:2753:a3c2','curl/8.12.1');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('audit_log',38);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_donor_id ON users(donor_id);
CREATE INDEX idx_payments_email ON payments(email);
CREATE INDEX idx_audit_event ON audit_log(event);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_redeem_codes_email    ON redeem_codes(email_hint);
CREATE INDEX idx_redeem_codes_used     ON redeem_codes(used_at);
CREATE INDEX idx_redeem_codes_expires  ON redeem_codes(expires_at);
CREATE INDEX idx_redeem_codes_revoked  ON redeem_codes(revoked);
CREATE INDEX idx_pending_login   ON pending_sponsorships(github_login);
CREATE INDEX idx_pending_claimed ON pending_sponsorships(claimed_at);
CREATE INDEX idx_pending_revoked ON pending_sponsorships(revoked);
CREATE INDEX idx_pending_created ON pending_sponsorships(created_at DESC);
CREATE INDEX idx_users_verify_token ON users(verify_token);
CREATE INDEX idx_password_resets_email ON password_resets(email);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);
