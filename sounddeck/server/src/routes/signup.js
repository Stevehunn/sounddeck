// server/src/routes/signup.js
import { hashPassword } from '../lib/crypto.js'
import {
  getUserByEmail,
  getUserByVerifyToken,
  createUserUnverified,
  setUserVerifyToken,
  updateUserPassword,
  markEmailVerified,
  logAudit,
} from '../lib/db.js'
import { sendVerifyEmail } from '../lib/email.js'

const VERIFY_TOKEN_TTL = 24 * 60 * 60 // 24h en secondes

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function isValidEmail(email) {
  // Regex simple mais suffisante
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function generateVerifyToken() {
  // 2 UUID = 72 chars, plus que suffisant
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
}

// ─── POST /signup ──────────────────────────────────────────────────────
export async function handleSignup(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  // Validation
  if (!email || !password) {
    return jsonResponse({ error: 'missing_fields' }, 400)
  }
  if (!isValidEmail(email)) {
    return jsonResponse({ error: 'invalid_email' }, 400)
  }
  if (password.length < 6) {
    return jsonResponse({ error: 'password_too_short', message: 'Min 6 caractères' }, 400)
  }
  if (password.length > 100) {
    return jsonResponse({ error: 'password_too_long' }, 400)
  }

  const existing = await getUserByEmail(env.DB, email)

  // Cas 1 : email existe ET déjà vérifié → refus
  if (existing && existing.email_verified) {
    return jsonResponse({ error: 'email_already_exists' }, 409)
  }

  // Hash password
  const { hash, salt } = await hashPassword(password)

  // Token de vérification
  const verifyToken = generateVerifyToken()
  const verifyTokenExpires = Math.floor(Date.now() / 1000) + VERIFY_TOKEN_TTL

  if (existing) {
    // Cas 2 : email existe mais pas vérifié → on met à jour (nouveau mdp + nouveau token)
    await updateUserPassword(env.DB, existing.id, hash, salt)
    await setUserVerifyToken(env.DB, existing.id, verifyToken, verifyTokenExpires)
  } else {
    // Cas 3 : nouvel utilisateur
    const id = crypto.randomUUID()
    const donorId = `free-${id.slice(0, 8)}`
    await createUserUnverified(env.DB, {
      id,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      donorId,
      tier: 'free',
      verifyToken,
      verifyTokenExpires,
    })
  }

  // Envoi email
  const apiBase = env.API_BASE_URL || 'https://api.sounddeck.stream'
  const verifyUrl = `${apiBase}/verify-email?token=${verifyToken}`

  let emailSent = false
  try {
    await sendVerifyEmail(env.RESEND_API_KEY, { email, verifyUrl })
    emailSent = true
  } catch (e) {
    console.error('sendVerifyEmail error:', e.message)
  }

  await logAudit(env.DB, {
    event: 'signup',
    email,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
    detail: emailSent ? 'email_sent' : 'email_failed',
  })

  return jsonResponse({
    ok: true,
    message: 'Un email de vérification t\'a été envoyé.',
  })
}

// ─── GET /verify-email?token=xxx ───────────────────────────────────────
export async function handleVerifyEmail(request, env) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return htmlResponse(buildErrorPage('Lien invalide', 'Aucun token fourni.'), 400)
  }

  const user = await getUserByVerifyToken(env.DB, token)

  if (!user) {
    return htmlResponse(
      buildErrorPage(
        'Lien invalide ou déjà utilisé',
        'Ce lien a peut-être déjà été utilisé, ou il est incorrect.'
      ),
      400
    )
  }

  const now = Math.floor(Date.now() / 1000)
  if (user.verify_token_expires < now) {
    return htmlResponse(
      buildErrorPage(
        'Lien expiré',
        'Ce lien est valable 24h. Refais une inscription pour en recevoir un nouveau.'
      ),
      400
    )
  }

  await markEmailVerified(env.DB, user.id)

  await logAudit(env.DB, {
    event: 'email_verified',
    email: user.email,
    donorId: user.donor_id,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
  })

  return htmlResponse(buildSuccessPage(user.email))
}

// ─── Templates HTML ────────────────────────────────────────────────────
function buildSuccessPage(email) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Email vérifié — SoundDeck</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #111113; color: #f0f0f2; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1a1a1e; border: 1px solid #2e2e36; border-radius: 14px; padding: 40px; max-width: 460px; text-align: center; }
    .icon { width: 72px; height: 72px; border-radius: 50%; background: #1d9e75; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 36px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #a0a0b0; line-height: 1.6; margin: 0 0 16px; }
    .email { font-family: monospace; color: #7c6ff7; }
    .steps { text-align: left; background: #222228; border-radius: 10px; padding: 16px 20px; margin: 24px 0; font-size: 14px; color: #a0a0b0; line-height: 1.8; }
    .steps strong { color: #f0f0f2; }
    .btn { display: inline-block; background: #7c6ff7; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Email vérifié !</h1>
    <p>Bienvenue sur SoundDeck, <span class="email">${email}</span></p>
    <div class="steps">
      <strong>Prochaines étapes :</strong><br>
      1. Ouvre SoundDeck<br>
      2. Va dans <strong>Options → Soutenir SoundDeck</strong><br>
      3. Clique sur <strong>Se connecter</strong><br>
      4. Entre ton email et ton mot de passe
    </div>
    <p style="font-size: 13px; color: #606070;">
      Ton compte est en version <strong>gratuite</strong>. Passe à Pro à tout moment avec un don GitHub Sponsors.
    </p>
  </div>
</body>
</html>`
}

function buildErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — SoundDeck</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #111113; color: #f0f0f2; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1a1a1e; border: 1px solid #2e2e36; border-radius: 14px; padding: 40px; max-width: 460px; text-align: center; }
    .icon { width: 72px; height: 72px; border-radius: 50%; background: #e05252; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 36px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #a0a0b0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
}