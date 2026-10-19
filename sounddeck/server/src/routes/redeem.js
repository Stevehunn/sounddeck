// server/src/routes/redeem.js
import { hashPassword } from '../lib/crypto.js'
import { normalizeCode, isValidCodeFormat } from '../lib/codeGen.js'
import {
  getRedeemCode,
  markRedeemCodeUsed,
  getUserByEmail,
  createUser,
  logAudit,
} from '../lib/db.js'
import { generateLicenseToken } from '../lib/license.js'
import { uuid } from '../lib/crypto.js'

/**
 *
 * @param request
 * @param env
 */
export async function handleRedeem(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const code = normalizeCode(body.code)

  // ─── Validations de base ───────────────────────────────────────────
  if (!email || !password || !code) {
    return json({ error: 'missing_fields' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid_email' }, 400)
  }
  if (password.length < 6) {
    return json({ error: 'password_too_short' }, 400)
  }
  if (!isValidCodeFormat(code)) {
    return json({ error: 'invalid_code_format' }, 400)
  }

  // ─── Vérifications en base ─────────────────────────────────────────
  const codeRow = await getRedeemCode(env.DB, code)

  if (!codeRow) {
    await logAudit(env.DB, {
      event: 'redeem_unknown_code',
      email,
      ip: request.headers.get('CF-Connecting-IP'),
      detail: code.slice(0, 8) + '…',
    })
    return json({ error: 'code_not_found' }, 404)
  }

  if (codeRow.revoked) {
    return json({ error: 'code_revoked' }, 403)
  }

  if (codeRow.current_uses >= codeRow.max_uses) {
    return json({ error: 'code_already_used' }, 409)
  }

  if (codeRow.expires_at && codeRow.expires_at < Math.floor(Date.now() / 1000)) {
    return json({ error: 'code_expired' }, 410)
  }

  // Email strict : si le code a un email_hint, on vérifie qu'il matche
  if (codeRow.email_hint && codeRow.email_hint.toLowerCase() !== email) {
    return json({ error: 'email_mismatch' }, 403)
  }

  // Email déjà utilisé ?
  const existing = await getUserByEmail(env.DB, email)
  if (existing) {
    return json({ error: 'email_already_exists' }, 409)
  }

  // ─── Création du compte ────────────────────────────────────────────
  try {
    const userId = uuid()
    const donorId = uuid()
    const { hash, salt } = await hashPassword(password)

    await createUser(env.DB, {
      id: userId,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      donorId,
      donorName: null,
      tier: codeRow.tier || 'pro',
    })

    await markRedeemCodeUsed(env.DB, code, userId, email)

    // ─── Token Ed25519 ─────────────────────────────────────────────
    const token = await generateLicenseToken({
      donorId,
      donorName: null,
      tier: codeRow.tier || 'pro',
      privateKeyHex: env.PRIVATE_KEY_HEX,
    })

    await logAudit(env.DB, {
      event: 'redeem_success',
      email,
      donorId,
      ip: request.headers.get('CF-Connecting-IP'),
      detail: `code=${code.slice(0, 8)}… tier=${codeRow.tier}`,
    })

    return json({
      token,
      email,
      tier: codeRow.tier || 'pro',
      donorId,
      donorName: null,
    })
  } catch (e) {
    await logAudit(env.DB, {
      event: 'redeem_error',
      email,
      detail: e.message?.slice(0, 200),
    })
    console.error('Redeem error:', e)
    return json({ error: 'internal_error' }, 500)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}