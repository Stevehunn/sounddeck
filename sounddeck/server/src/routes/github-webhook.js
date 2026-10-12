// server/src/routes/github-webhook.js
import { verifyGitHubSignature, hashPassword, generateTempPassword, uuid } from '../lib/crypto.js'
import {
  insertPendingSponsorship,
  getPendingSponsorshipByNodeId,
  getUserByEmail,
  createUser,
  logAudit,
} from '../lib/db.js'
import { generateLicenseToken } from '../lib/license.js'
import { sendWelcomeEmail } from '../lib/email.js'

const SUPPORTED_ACTIONS = new Set(['created'])

export async function handleGitHubSponsorWebhook(request, env) {
  const signature = request.headers.get('x-hub-signature-256')
  const event = request.headers.get('x-github-event')

  if (!signature) return new Response('Missing signature', { status: 400 })
  if (!env.GITHUB_SPONSOR_WEBHOOK_SECRET) {
    console.error('GITHUB_SPONSOR_WEBHOOK_SECRET not configured')
    return new Response('Config error', { status: 500 })
  }

  const body = await request.text()

  const valid = await verifyGitHubSignature(body, signature, env.GITHUB_SPONSOR_WEBHOOK_SECRET)
  if (!valid) {
    await logAudit(env.DB, { event: 'github_webhook_bad_signature' })
    return new Response('Invalid signature', { status: 401 })
  }

  // ─── Ping (test de configuration) ─────────────────────────────────
  if (event === 'ping') {
    return json({ ok: true, pong: true })
  }

  // ─── On ne traite que sponsorship.created ─────────────────────────
  if (event !== 'sponsorship') {
    return new Response('OK', { status: 200 })
  }

  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const action = payload.action
  if (!SUPPORTED_ACTIONS.has(action)) {
    return new Response('OK', { status: 200 })
  }

  const sponsorship = payload.sponsorship
  if (!sponsorship) return new Response('Missing sponsorship', { status: 400 })

  const nodeId = sponsorship.node_id
  const sponsor = sponsorship.sponsor || {}
  const githubLogin = sponsor.login
  const githubUserId = sponsor.id ? String(sponsor.id) : null
  const sponsorEmail = sponsor.email ? String(sponsor.email).toLowerCase().trim() : null
  const tier = sponsorship.tier || {}
  const amountCents = tier.monthly_price_in_cents ?? null
  const isOneTime = tier.is_one_time !== false
  const privacyLevel = sponsorship.privacy_level || null

  if (!nodeId || !githubLogin) {
    await logAudit(env.DB, {
      event: 'github_webhook_invalid',
      detail: `nodeId=${nodeId} login=${githubLogin}`,
    })
    return new Response('Missing required fields', { status: 400 })
  }

  // Idempotence
  const existing = await getPendingSponsorshipByNodeId(env.DB, nodeId)
  if (existing) {
    return new Response('Already processed', { status: 200 })
  }

  try {
    // ═════════════════════════════════════════════════════════════════
    // CAS A — Email public : création automatique + envoi mail
    // ═════════════════════════════════════════════════════════════════
    if (sponsorEmail) {
      const existingUser = await getUserByEmail(env.DB, sponsorEmail)
      if (existingUser) {
        // L'utilisateur a déjà un compte — on log et on sort
        await logAudit(env.DB, {
          event: 'github_sponsor_email_exists',
          email: sponsorEmail,
          detail: `login=${githubLogin} nodeId=${nodeId}`,
        })
        return new Response('User already exists', { status: 200 })
      }

      const userId = uuid()
      const donorId = uuid()
      const tempPassword = generateTempPassword()
      const { hash, salt } = await hashPassword(tempPassword)

      await createUser(env.DB, {
        id: userId,
        email: sponsorEmail,
        passwordHash: hash,
        passwordSalt: salt,
        donorId,
        donorName: githubLogin,
        tier: 'pro',
      })

      // Trace dans pending_sponsorships (avec claimed = immédiat)
      await insertPendingSponsorship(env.DB, {
        id: uuid(),
        sponsorshipNodeId: nodeId,
        githubLogin,
        githubUserId,
        amountCents,
        currency: 'USD',
        tier: 'pro',
        isOneTime,
        privacyLevel,
      })

      const token = await generateLicenseToken({
        donorId,
        donorName: githubLogin,
        tier: 'pro',
        privateKeyHex: env.PRIVATE_KEY_HEX,
      })

      await sendWelcomeEmail(env.RESEND_API_KEY, {
        email: sponsorEmail,
        password: tempPassword,
        token,
        donorName: githubLogin,
      })

      await logAudit(env.DB, {
        event: 'github_sponsor_auto_created',
        email: sponsorEmail,
        donorId,
        detail: `login=${githubLogin}`,
      })

      console.log(`💖 Sponsor auto-créé: @${githubLogin} <${sponsorEmail}>`)
      return new Response('OK', { status: 200 })
    }

    // ═════════════════════════════════════════════════════════════════
    // CAS B — Email privé : pending à réclamer
    // ═════════════════════════════════════════════════════════════════
    await insertPendingSponsorship(env.DB, {
      id: uuid(),
      sponsorshipNodeId: nodeId,
      githubLogin,
      githubUserId,
      amountCents,
      currency: 'USD',
      tier: 'pro',
      isOneTime,
      privacyLevel,
    })

    await logAudit(env.DB, {
      event: 'github_sponsor_pending',
      detail: `login=${githubLogin} amount=${amountCents}`,
    })

    console.log(`💖 Nouveau sponsor en attente: @${githubLogin} (${amountCents}¢) — email privé`)
    return new Response('OK', { status: 200 })
  } catch (e) {
    console.error('GitHub sponsor webhook error:', e)
    await logAudit(env.DB, {
      event: 'github_webhook_error',
      detail: e.message?.slice(0, 200),
    })
    return new Response('Internal error', { status: 500 })
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}