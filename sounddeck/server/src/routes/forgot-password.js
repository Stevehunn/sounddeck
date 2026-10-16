// server/src/routes/forgot-password.js
import {
  getUserByEmail,
  createPasswordReset,
  deleteExpiredPasswordResets,
  logAudit,
} from '../lib/db.js'
import { sendPasswordResetEmail } from '../lib/email.js'

const RESET_TOKEN_TTL = 60 * 60 // 1h en secondes

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function generateResetToken() {
  // 2 UUID = 72 chars, largement suffisant
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
}

/**
 * POST /forgot-password
 * Body : { email }
 *
 * ⚠️ Répond TOUJOURS 200 OK, même si l'email n'existe pas
 * (évite de révéler quels emails sont enregistrés).
 */
export async function handleForgotPassword(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const email = String(body.email || '').trim().toLowerCase()
  if (!email) {
    return jsonResponse({ error: 'missing_email' }, 400)
  }

  const genericResponse = jsonResponse({
    ok: true,
    message:
      'Si un compte existe avec cet email, un lien de réinitialisation vient d\'être envoyé.',
  })

  // Lookup user (mais on ne dit rien si introuvable)
  const user = await getUserByEmail(env.DB, email)

  if (!user) {
    // Log silencieux pour détecter du brute force
    await logAudit(env.DB, {
      event: 'forgot_password_unknown_email',
      email,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent'),
    })
    return genericResponse
  }

  // Nettoyage opportuniste (une requête rapide de temps en temps)
  deleteExpiredPasswordResets(env.DB).catch(() => {})

  // Génère + stocke le token
  const token = generateResetToken()
  const expiresAt = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL

  await createPasswordReset(env.DB, {
    token,
    userId: user.id,
    email: user.email,
    expiresAt,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
  })

  // Envoie l'email
  const apiBase = env.API_BASE_URL || 'https://api.sounddeck.stream'
  const resetUrl = `${apiBase}/reset-password?token=${token}`

  try {
    await sendPasswordResetEmail(env.RESEND_API_KEY, {
      email: user.email,
      resetUrl,
    })
  } catch (e) {
    console.error('sendPasswordResetEmail error:', e.message)
    // On ne bloque pas — l'utilisateur peut retenter
  }

  await logAudit(env.DB, {
    event: 'forgot_password_sent',
    email: user.email,
    donorId: user.donor_id,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
  })

  return genericResponse
}