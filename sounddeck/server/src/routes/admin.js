// server/src/routes/admin.js
import { generateCode, parseExpiry, normalizeCode } from '../lib/codeGen.js'
import {
  insertRedeemCode,
  listRedeemCodes,
  revokeRedeemCode,
  getRedeemCode,
} from '../lib/db.js'
import { sendRedeemCodeEmail } from '../lib/email.js'

/**
 * Vérifie le token admin dans l'Authorization header (constant-time).
 */
function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const expected = (env.ADMIN_TOKEN || '').trim()

  if (!expected || !token) return false
  if (token.length !== expected.length) return false

  let diff = 0
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

/**
 * POST /admin/generate-code
 * Body : { email, expiresIn, note, tier, sendEmail }
 */
export async function handleGenerateCode(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: 'unauthorized' }, 401)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const email = (body.email || '').trim().toLowerCase() || null
  const note = body.note || null
  const tier = body.tier || 'pro'
  const expiresIn = body.expiresIn || '30d'
  const sendEmail = body.sendEmail !== false // par défaut, envoie

  let expiresAt
  try {
    expiresAt = parseExpiry(expiresIn)
  } catch (e) {
    return json({ error: 'invalid_expiry', message: e.message }, 400)
  }

  const code = generateCode()

  try {
    await insertRedeemCode(env.DB, {
      code,
      tier,
      note,
      emailHint: email,
      expiresAt,
    })
  } catch (e) {
    console.error('Insert redeem code error:', e)
    return json({ error: 'db_error', message: e.message }, 500)
  }

  // Envoi du mail (non bloquant)
  let emailSent = false
  let emailError = null

  if (sendEmail && email) {
    try {
      await sendRedeemCodeEmail(env.RESEND_API_KEY, {
        email,
        code,
        expiresAt,
        donorName: body.donorName || null,
      })
      emailSent = true
    } catch (e) {
      console.error('Email send error:', e)
      emailError = e.message
    }
  }

  return json({
    code,
    tier,
    email,
    note,
    expiresAt,
    expiresIn,
    emailSent,
    emailError,
  })
}

/**
 * GET /admin/list-codes
 */
export async function handleListCodes(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: 'unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const onlyUnused = url.searchParams.get('onlyUnused') === '1'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500)

  const codes = await listRedeemCodes(env.DB, { limit, onlyUnused })
  return json({ codes })
}

/**
 * POST /admin/revoke-code
 * Body : { code, reason }
 */
export async function handleRevokeCode(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: 'unauthorized' }, 401)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const code = normalizeCode(body.code)
  if (!code) return json({ error: 'missing_code' }, 400)

  const row = await getRedeemCode(env.DB, code)
  if (!row) return json({ error: 'code_not_found' }, 404)
  if (row.used_at) return json({ error: 'code_already_used' }, 409)
  if (row.revoked) return json({ error: 'code_already_revoked' }, 409)

  await revokeRedeemCode(env.DB, code, body.reason || null)
  return json({ success: true, code })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}