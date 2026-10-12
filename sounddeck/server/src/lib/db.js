// server/src/lib/db.js

export function getUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
}

export function getUserByDonorId(db, donorId) {
  return db.prepare('SELECT * FROM users WHERE donor_id = ?').bind(donorId).first()
}

export async function createUser(db, { id, email, passwordHash, passwordSalt, donorId, donorName, tier = 'pro' }) {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, donor_id, donor_name, tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, email, passwordHash, passwordSalt, donorId, donorName, tier, now, now)
    .run()
  return { id, email, donorId, donorName, tier }
}

export async function updateUserPassword(db, userId, passwordHash, passwordSalt) {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      'UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?'
    )
    .bind(passwordHash, passwordSalt, now, userId)
    .run()
}

export async function recordPayment(db, { id, stripeSessionId, stripePaymentId, email, amount, currency, donorId }) {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO payments (id, stripe_session_id, stripe_payment_id, email, amount, currency, donor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, stripeSessionId, stripePaymentId, email, amount, currency, donorId, now)
    .run()
}

export async function logAudit(db, { event, email = null, donorId = null, ip = null, userAgent = null, detail = null }) {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO audit_log (event, email, donor_id, ip, user_agent, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(event, email, donorId, ip, userAgent, detail, now)
    .run()
}

// ─── REDEEM CODES ──────────────────────────────────────────────────────

export async function insertRedeemCode(db, {
  code, tier = 'pro', note = null, emailHint = null, expiresAt = null, maxUses = 1,
}) {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO redeem_codes (code, tier, note, email_hint, created_at, expires_at, max_uses)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(code, tier, note, emailHint, now, expiresAt, maxUses)
    .run()
  return { code, tier, note, emailHint, expiresAt, maxUses }
}

export function getRedeemCode(db, code) {
  return db.prepare('SELECT * FROM redeem_codes WHERE code = ?').bind(code).first()
}

export async function markRedeemCodeUsed(db, code, userId, email) {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `UPDATE redeem_codes
       SET used_at = ?, used_by_email = ?, used_by_user_id = ?,
           current_uses = current_uses + 1
       WHERE code = ?`
    )
    .bind(now, email, userId, code)
    .run()
}

export async function revokeRedeemCode(db, code, reason = null) {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `UPDATE redeem_codes
       SET revoked = 1, revoked_at = ?, revoked_reason = ?
       WHERE code = ? AND used_at IS NULL`
    )
    .bind(now, reason, code)
    .run()
}

export function listRedeemCodes(db, { limit = 100, onlyUnused = false } = {}) {
  const query = onlyUnused
    ? `SELECT * FROM redeem_codes
       WHERE used_at IS NULL AND revoked = 0
         AND (expires_at IS NULL OR expires_at > strftime('%s','now'))
       ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM redeem_codes ORDER BY created_at DESC LIMIT ?`
  return db.prepare(query).bind(limit).all()
}