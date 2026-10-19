// server/src/routes/claim.js
import { hashPassword, uuid } from '../lib/crypto.js'
import {
  findClaimableSponsorshipForLogin,
  markSponsorshipClaimed,
  getUserByEmail,
  createUser,
  logAudit,
} from '../lib/db.js'
import { generateLicenseToken } from '../lib/license.js'

/**
 *
 * @param request
 * @param env
 */
export async function handleClaimSponsorship(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const githubLogin = String(body.githubLogin || '').trim().replace(/^@/, '')
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (!githubLogin || !email || !password) {
    return json({ error: 'missing_fields' }, 400)
  }
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(githubLogin)) {
    return json({ error: 'invalid_github_login' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid_email' }, 400)
  }
  if (password.length < 6) {
    return json({ error: 'password_too_short' }, 400)
  }

  const sponsorship = await findClaimableSponsorshipForLogin(env.DB, githubLogin)
  if (!sponsorship) {
    await logAudit(env.DB, {
      event: 'claim_sponsorship_not_found',
      email,
      detail: `login=${githubLogin}`,
    })
    return json({ error: 'sponsorship_not_found' }, 404)
  }

  const existingUser = await getUserByEmail(env.DB, email)
  if (existingUser) {
    return json({ error: 'email_already_exists' }, 409)
  }

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
      donorName: githubLogin,
      tier: sponsorship.tier || 'pro',
    })

    await markSponsorshipClaimed(env.DB, sponsorship.id, userId)

    const token = await generateLicenseToken({
      donorId,
      donorName: githubLogin,
      tier: sponsorship.tier || 'pro',
      privateKeyHex: env.PRIVATE_KEY_HEX,
    })

    await logAudit(env.DB, {
      event: 'claim_sponsorship_success',
      email,
      donorId,
      detail: `login=${githubLogin}`,
    })

    return json({
      token,
      email,
      tier: sponsorship.tier || 'pro',
      donorId,
      donorName: githubLogin,
    })
  } catch (e) {
    await logAudit(env.DB, {
      event: 'claim_sponsorship_error',
      email,
      detail: e.message?.slice(0, 200),
    })
    console.error('Claim sponsorship error:', e)
    return json({ error: 'internal_error' }, 500)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}