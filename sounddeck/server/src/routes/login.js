// server/src/routes/login.js
import { verifyPassword } from '../lib/crypto.js'
import { getUserByEmail, logAudit } from '../lib/db.js'
import { generateLicenseToken } from '../lib/license.js'

/**
 *
 * @param request
 * @param env
 */
export async function handleLogin(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (!email || !password) {
    return jsonResponse({ error: 'missing_credentials' }, 400)
  }

  const user = await getUserByEmail(env.DB, email)
  if (!user) {
    await logAudit(env.DB, {
      event: 'login_failed',
      email,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent'),
      detail: 'user_not_found',
    })
    // Message générique pour ne pas révéler si l'email existe
    return jsonResponse({ error: 'invalid_credentials' }, 401)
  }

  const ok = await verifyPassword(password, user.password_hash, user.password_salt)
  if (!ok) {
    await logAudit(env.DB, {
      event: 'login_failed',
      email,
      donorId: user.donor_id,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent'),
      detail: 'wrong_password',
    })
    return jsonResponse({ error: 'invalid_credentials' }, 401)
  }

  // ✅ Email vérifié ?
  // On le vérifie APRÈS le password pour ne pas révéler l'existence
  // d'un email à quelqu'un qui ne connaît pas le mot de passe.
  if (!user.email_verified) {
    await logAudit(env.DB, {
      event: 'login_failed',
      email,
      donorId: user.donor_id,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent'),
      detail: 'email_not_verified',
    })
    return jsonResponse({ error: 'email_not_verified' }, 403)
  }

  // Renouvelle le token à chaque login (la clé privée n'est jamais exposée)
  const token = await generateLicenseToken({
    donorId: user.donor_id,
    donorName: user.donor_name,
    tier: user.tier,
    privateKeyHex: env.PRIVATE_KEY_HEX,
  })

  await logAudit(env.DB, {
    event: 'login_success',
    email,
    donorId: user.donor_id,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
  })

  return jsonResponse({
    token,
    email: user.email,
    tier: user.tier,
    donorId: user.donor_id,
    donorName: user.donor_name,
  })
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}