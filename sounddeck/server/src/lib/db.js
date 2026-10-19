/**
 * @file D1 database helpers.
 *
 * Every function takes `db` (the D1 binding) as its first argument so it
 * can be mocked easily in tests. All timestamps are Unix seconds (integers),
 * consistent across all tables.
 *
 * Grouped by domain:
 * - Users (CRUD, list, password updates)
 * - Email verification (tokens, mark-as-verified)
 * - Password resets (tokens, single-use, expiry)
 * - Payments (Stripe history)
 * - Audit log (all sensitive events)
 * - Redeem codes (generate, use, revoke, list)
 * - Pending sponsorships (GitHub webhook → claim flow)
 *
 * @see ../migrations/*.sql for the schema.
 */

// ═══════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetches a user by email (case-sensitive match — callers must lowercase).
 *
 * @param {D1Database} db
 * @param {string} email
 * @returns {Promise<Object|undefined>} User row, or undefined if not found.
 */
export function getUserByEmail(db, email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
}

/**
 * Fetches a user by their unique donor ID (the ID embedded in license tokens).
 *
 * @param {D1Database} db
 * @param {string} donorId
 * @returns {Promise<Object|undefined>}
 */
export function getUserByDonorId(db, donorId) {
  return db
    .prepare("SELECT * FROM users WHERE donor_id = ?")
    .bind(donorId)
    .first();
}

/**
 * Inserts a user with a verified email (`email_verified = 1`).
 *
 * Used by the admin CLI (`admin.mjs create-user`) and by the sponsor webhook
 * when the GitHub email is public.
 *
 * @param {D1Database} db
 * @param {Object} params
 * @param {string} params.id - UUID.
 * @param {string} params.email - Already lowercased.
 * @param {string} params.passwordHash - Hex hash (from crypto.js).
 * @param {string} params.passwordSalt - Hex salt.
 * @param {string} params.donorId - Unique donor ID.
 * @param {string|null} params.donorName - Display name.
 * @param {'pro'|'free'|'dev'} [params.tier='pro']
 * @returns {Promise<{id: string, email: string, donorId: string, donorName: string|null, tier: string}>}
 */
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

/**
 * Updates a user's password hash + salt. Also bumps `updated_at`.
 *
 * @param {D1Database} db
 * @param {string} userId
 * @param {string} passwordHash
 * @param {string} passwordSalt
 * @returns {Promise<void>}
 */
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

/**
 * Lists users ordered by `created_at DESC`.
 *
 * @param {D1Database} db
 * @param {Object} [options]
 * @param {number} [options.limit=100]
 * @returns {Promise<{results: Object[]}>} D1 result wrapper.
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetches a user by their email verification token.
 *
 * @param {D1Database} db
 * @param {string} token
 * @returns {Promise<Object|undefined>}
 */
export function getUserByVerifyToken(db, token) {
  return db
    .prepare("SELECT * FROM users WHERE verify_token = ?")
    .bind(token)
    .first();
}

/**
 * Sets (or replaces) a user's email verification token.
 *
 * @param {D1Database} db
 * @param {string} userId
 * @param {string} token
 * @param {number} expiresAt - Unix timestamp (seconds).
 * @returns {Promise<void>}
 */
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

/**
 * Marks a user's email as verified and clears the verification token.
 *
 * @param {D1Database} db
 * @param {string} userId
 * @returns {Promise<void>}
 */
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
 * Inserts a new user with `email_verified = 0` and a pending verification
 * token. Called from the public signup route.
 *
 * @param {D1Database} db
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.email
 * @param {string} params.passwordHash
 * @param {string} params.passwordSalt
 * @param {string} params.donorId
 * @param {string|null} [params.donorName=null]
 * @param {'free'|'pro'} [params.tier='free']
 * @param {string} params.verifyToken
 * @param {number} params.verifyTokenExpires - Unix seconds.
 * @returns {Promise<{id: string, email: string, donorId: string, tier: string}>}
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

// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD RESETS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Stores a password reset token.
 *
 * @param {D1Database} db
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.userId
 * @param {string} params.email
 * @param {number} params.expiresAt - Unix seconds.
 * @param {string|null} [params.ip=null]
 * @param {string|null} [params.userAgent=null]
 * @returns {Promise<void>}
 */
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

/**
 * Fetches a password reset token row.
 *
 * @param {D1Database} db
 * @param {string} token
 * @returns {Promise<Object|undefined>}
 */
export function getPasswordReset(db, token) {
  return db
    .prepare("SELECT * FROM password_resets WHERE token = ?")
    .bind(token)
    .first();
}

/**
 * Marks a reset token as used (single-use).
 *
 * @param {D1Database} db
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function markPasswordResetUsed(db, token) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("UPDATE password_resets SET used_at = ? WHERE token = ?")
    .bind(now, token)
    .run();
}

/**
 * Deletes all expired reset tokens. Cheap maintenance call, called
 * opportunistically from `/forgot-password` (fire-and-forget).
 *
 * @param {D1Database} db
 * @returns {Promise<void>}
 */
export async function deleteExpiredPasswordResets(db) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("DELETE FROM password_resets WHERE expires_at < ?")
    .bind(now)
    .run();
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Records a Stripe payment in the `payments` table (audit + reconciliation).
 *
 * Currently dormant (Stripe disabled), kept for future use.
 *
 * @param {D1Database} db
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.stripeSessionId
 * @param {string|null} params.stripePaymentId
 * @param {string} params.email
 * @param {number} params.amount
 * @param {string} params.currency
 * @param {string|null} params.donorId
 * @returns {Promise<void>}
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Appends an entry to the `audit_log` table.
 *
 * Called from login, signup, redeem, forgot-password, admin actions, etc.
 * Used for detecting anomalies (unknown emails, wrong passwords, brute force).
 *
 * @param {D1Database} db
 * @param {Object} params
 * @param {string} params.event - Event name (e.g. `login_success`, `signup`).
 * @param {string|null} [params.email=null]
 * @param {string|null} [params.donorId=null]
 * @param {string|null} [params.ip=null]
 * @param {string|null} [params.userAgent=null]
 * @param {string|null} [params.detail=null] - Free-form extra context.
 * @returns {Promise<void>}
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// REDEEM CODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inserts a redeem code.
 *
 * @param {D1Database} db
 * @param {Object} params
 * @param {string} params.code - `SDCK-XXXX-XXXX-XXXX`.
 * @param {'pro'|'free'} [params.tier='pro']
 * @param {string|null} [params.note=null]
 * @param {string|null} [params.emailHint=null] - If set, only this email can redeem.
 * @param {number|null} [params.expiresAt=null] - Unix seconds; null = never.
 * @param {number} [params.maxUses=1]
 * @returns {Promise<{code: string, tier: string, note: string|null, emailHint: string|null, expiresAt: number|null, maxUses: number}>}
 */
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

/**
 * Fetches a redeem code row.
 *
 * @param {D1Database} db
 * @param {string} code
 * @returns {Promise<Object|undefined>}
 */
export function getRedeemCode(db, code) {
  return db
    .prepare("SELECT * FROM redeem_codes WHERE code = ?")
    .bind(code)
    .first();
}

/**
 * Marks a redeem code as used by a given user, and bumps `current_uses`.
 *
 * @param {D1Database} db
 * @param {string} code
 * @param {string} userId
 * @param {string} email
 * @returns {Promise<void>}
 */
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

/**
 * Revokes an unused redeem code. No-op if already used or already revoked.
 *
 * @param {D1Database} db
 * @param {string} code
 * @param {string|null} [reason=null]
 * @returns {Promise<void>}
 */
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

/**
 * Lists redeem codes, most recent first.
 *
 * @param {D1Database} db
 * @param {Object} [options]
 * @param {number} [options.limit=100]
 * @param {boolean} [options.onlyUnused=false] - Only unused, non-revoked, non-expired.
 * @returns {Promise<{results: Object[]}>} D1 result wrapper.
 */
export function listRedeemCodes(db, { limit = 100, onlyUnused = false } = {}) {
  const query = onlyUnused
    ? `SELECT * FROM redeem_codes
       WHERE used_at IS NULL AND revoked = 0
         AND (expires_at IS NULL OR expires_at > strftime('%s','now'))
       ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM redeem_codes ORDER BY created_at DESC LIMIT ?`;
  return db.prepare(query).bind(limit).all();
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING SPONSORSHIPS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Stores a GitHub Sponsorship that doesn't yet have an email attached
 * (user's email is private on GitHub). The user can later "claim" it from
 * the app via `/claim-sponsorship`.
 *
 * @param {D1Database} db
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.sponsorshipNodeId - GitHub node_id (idempotence key).
 * @param {string} params.githubLogin
 * @param {string|null} params.githubUserId
 * @param {number} params.amountCents
 * @param {string} [params.currency='USD']
 * @param {'pro'} [params.tier='pro']
 * @param {boolean} [params.isOneTime=true]
 * @param {string|null} [params.privacyLevel=null] - 'public' | 'private'.
 * @returns {Promise<void>}
 */
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

/**
 * Fetches a pending sponsorship by its GitHub `node_id` (used for
 * idempotence when GitHub retries a webhook delivery).
 *
 * @param {D1Database} db
 * @param {string} nodeId
 * @returns {Promise<Object|undefined>}
 */
export function getPendingSponsorshipByNodeId(db, nodeId) {
  return db
    .prepare("SELECT * FROM pending_sponsorships WHERE sponsorship_node_id = ?")
    .bind(nodeId)
    .first();
}

/**
 * Finds the oldest claimable sponsorship for a given GitHub login.
 *
 * "Claimable" = `claimed_at IS NULL` and `revoked = 0`.
 *
 * @param {D1Database} db
 * @param {string} githubLogin - Case-insensitive.
 * @returns {Promise<Object|undefined>}
 */
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

/**
 * Marks a pending sponsorship as claimed by a user.
 *
 * @param {D1Database} db
 * @param {string} sponsorshipId
 * @param {string} userId
 * @returns {Promise<void>}
 */
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

/**
 * Lists pending sponsorships (all, or only unclaimed).
 *
 * @param {D1Database} db
 * @param {Object} [options]
 * @param {number} [options.limit=100]
 * @param {boolean} [options.onlyUnclaimed=false]
 * @returns {Promise<{results: Object[]}>}
 */
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

/**
 * Revokes an unclaimed pending sponsorship.
 *
 * @param {D1Database} db
 * @param {string} id
 * @param {string|null} [reason=null]
 * @returns {Promise<void>}
 */
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
