// server/src/lib/db.js

// ─── USERS ─────────────────────────────────────────────────────────────

export function getUserByEmail(db, email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
}

export function getUserByDonorId(db, donorId) {
  return db
    .prepare("SELECT * FROM users WHERE donor_id = ?")
    .bind(donorId)
    .first();
}

export async function createUser(
  db,
  { id, email, passwordHash, passwordSalt, donorId, donorName, tier = "pro" },
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, donor_id, donor_name, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      email,
      passwordHash,
      passwordSalt,
      donorId,
      donorName,
      tier,
      now,
      now,
    )
    .run();
  return { id, email, donorId, donorName, tier };
}

export async function updateUserPassword(
  db,
  userId,
  passwordHash,
  passwordSalt,
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      "UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?",
    )
    .bind(passwordHash, passwordSalt, now, userId)
    .run();
}

export function listUsers(db, { limit = 100 } = {}) {
  return db
    .prepare(
      `SELECT id, email, tier, donor_id, donor_name, email_verified, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all();
}

// ─── EMAIL VERIFICATION (nouveau) ──────────────────────────────────────

export function getUserByVerifyToken(db, token) {
  return db
    .prepare("SELECT * FROM users WHERE verify_token = ?")
    .bind(token)
    .first();
}

export async function setUserVerifyToken(db, userId, token, expiresAt) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE users
       SET verify_token = ?, verify_token_expires = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(token, expiresAt, now, userId)
    .run();
}

export async function markEmailVerified(db, userId) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE users
       SET email_verified = 1, verify_token = NULL, verify_token_expires = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .bind(now, userId)
    .run();
}

/**
 * Crée un user avec un token de vérification (signup public).
 * email_verified = 0 par défaut.
 */
export async function createUserUnverified(
  db,
  {
    id,
    email,
    passwordHash,
    passwordSalt,
    donorId,
    donorName = null,
    tier = "free",
    verifyToken,
    verifyTokenExpires,
  },
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO users
       (id, email, password_hash, password_salt, donor_id, donor_name, tier,
        email_verified, verify_token, verify_token_expires, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      email,
      passwordHash,
      passwordSalt,
      donorId,
      donorName,
      tier,
      verifyToken,
      verifyTokenExpires,
      now,
      now,
    )
    .run();
  return { id, email, donorId, tier };
}

// ─── PASSWORD RESETS (nouveau) ─────────────────────────────────────────

export async function createPasswordReset(
  db,
  { token, userId, email, expiresAt, ip = null, userAgent = null },
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO password_resets (token, user_id, email, created_at, expires_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(token, userId, email, now, expiresAt, ip, userAgent)
    .run();
}

export function getPasswordReset(db, token) {
  return db
    .prepare("SELECT * FROM password_resets WHERE token = ?")
    .bind(token)
    .first();
}

export async function markPasswordResetUsed(db, token) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("UPDATE password_resets SET used_at = ? WHERE token = ?")
    .bind(now, token)
    .run();
}

export async function deleteExpiredPasswordResets(db) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("DELETE FROM password_resets WHERE expires_at < ?")
    .bind(now)
    .run();
}

// ─── PAYMENTS ──────────────────────────────────────────────────────────

export async function recordPayment(
  db,
  { id, stripeSessionId, stripePaymentId, email, amount, currency, donorId },
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO payments (id, stripe_session_id, stripe_payment_id, email, amount, currency, donor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      stripeSessionId,
      stripePaymentId,
      email,
      amount,
      currency,
      donorId,
      now,
    )
    .run();
}

// ─── AUDIT ─────────────────────────────────────────────────────────────

export async function logAudit(
  db,
  {
    event,
    email = null,
    donorId = null,
    ip = null,
    userAgent = null,
    detail = null,
  },
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO audit_log (event, email, donor_id, ip, user_agent, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(event, email, donorId, ip, userAgent, detail, now)
    .run();
}

// ─── REDEEM CODES ──────────────────────────────────────────────────────

export async function insertRedeemCode(
  db,
  {
    code,
    tier = "pro",
    note = null,
    emailHint = null,
    expiresAt = null,
    maxUses = 1,
  },
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO redeem_codes (code, tier, note, email_hint, created_at, expires_at, max_uses)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(code, tier, note, emailHint, now, expiresAt, maxUses)
    .run();
  return { code, tier, note, emailHint, expiresAt, maxUses };
}

export function getRedeemCode(db, code) {
  return db
    .prepare("SELECT * FROM redeem_codes WHERE code = ?")
    .bind(code)
    .first();
}

export async function markRedeemCodeUsed(db, code, userId, email) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE redeem_codes
       SET used_at = ?, used_by_email = ?, used_by_user_id = ?,
           current_uses = current_uses + 1
       WHERE code = ?`,
    )
    .bind(now, email, userId, code)
    .run();
}

export async function revokeRedeemCode(db, code, reason = null) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE redeem_codes
       SET revoked = 1, revoked_at = ?, revoked_reason = ?
       WHERE code = ? AND used_at IS NULL`,
    )
    .bind(now, reason, code)
    .run();
}

export function listRedeemCodes(db, { limit = 100, onlyUnused = false } = {}) {
  const query = onlyUnused
    ? `SELECT * FROM redeem_codes
       WHERE used_at IS NULL AND revoked = 0
         AND (expires_at IS NULL OR expires_at > strftime('%s','now'))
       ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM redeem_codes ORDER BY created_at DESC LIMIT ?`;
  return db.prepare(query).bind(limit).all();
}

// ─── PENDING SPONSORSHIPS ──────────────────────────────────────────────

export async function insertPendingSponsorship(
  db,
  {
    id,
    sponsorshipNodeId,
    githubLogin,
    githubUserId,
    amountCents,
    currency = "USD",
    tier = "pro",
    isOneTime = true,
    privacyLevel = null,
  },
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO pending_sponsorships
         (id, sponsorship_node_id, github_login, github_user_id,
          amount_cents, currency, tier, is_one_time, privacy_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      sponsorshipNodeId,
      githubLogin,
      githubUserId,
      amountCents,
      currency,
      tier,
      isOneTime ? 1 : 0,
      privacyLevel,
      now,
    )
    .run();
}

export function getPendingSponsorshipByNodeId(db, nodeId) {
  return db
    .prepare("SELECT * FROM pending_sponsorships WHERE sponsorship_node_id = ?")
    .bind(nodeId)
    .first();
}

export function findClaimableSponsorshipForLogin(db, githubLogin) {
  return db
    .prepare(
      `SELECT * FROM pending_sponsorships
       WHERE github_login = ? COLLATE NOCASE
         AND claimed_at IS NULL
         AND revoked = 0
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .bind(githubLogin)
    .first();
}

export async function markSponsorshipClaimed(db, sponsorshipId, userId) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE pending_sponsorships
       SET claimed_at = ?, claimed_by_user_id = ?
       WHERE id = ? AND claimed_at IS NULL`,
    )
    .bind(now, userId, sponsorshipId)
    .run();
}

export function listPendingSponsorships(
  db,
  { limit = 100, onlyUnclaimed = false } = {},
) {
  const query = onlyUnclaimed
    ? `SELECT * FROM pending_sponsorships
       WHERE claimed_at IS NULL AND revoked = 0
       ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM pending_sponsorships ORDER BY created_at DESC LIMIT ?`;
  return db.prepare(query).bind(limit).all();
}

export async function revokePendingSponsorship(db, id, reason = null) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE pending_sponsorships
       SET revoked = 1, revoked_at = ?, revoked_reason = ?
       WHERE id = ? AND claimed_at IS NULL`,
    )
    .bind(now, reason, id)
    .run();
}
