// server/src/routes/stripe-webhook.js
import {
  uuid,
  hashPassword,
  generateTempPassword,
  verifyStripeSignature,
} from '../lib/crypto.js'
import { getUserByEmail, createUser, recordPayment, logAudit } from '../lib/db.js'
import { generateLicenseToken } from '../lib/license.js'
import { sendWelcomeEmail } from '../lib/email.js'

/**
 *
 * @param request
 * @param env
 */
export async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await request.text()

  const valid = await verifyStripeSignature(
    body,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  )

  if (!valid) {
    return new Response('Invalid signature', { status: 401 })
  }

  let event
  try {
    event = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // ─── On traite uniquement checkout.session.completed ────────────────
  if (event.type !== 'checkout.session.completed') {
    return new Response('OK', { status: 200 })
  }

  const session = event.data?.object
  if (!session) {
    return new Response('No session', { status: 400 })
  }

  const email = (session.customer_details?.email || session.customer_email || '')
    .trim()
    .toLowerCase()

  const amount = (session.amount_total || 0) / 100 // Stripe en centimes
  const currency = (session.currency || 'eur').toUpperCase()

  if (!email) {
    await logAudit(env.DB, {
      event: 'stripe_webhook_no_email',
      detail: session.id,
    })
    return new Response('No email in session', { status: 400 })
  }

  // ─── Idempotence : ne pas recréer si l'email existe déjà ────────────
  const existing = await getUserByEmail(env.DB, email)
  if (existing) {
    await logAudit(env.DB, {
      event: 'stripe_webhook_duplicate',
      email,
      donorId: existing.donor_id,
      detail: session.id,
    })
    return new Response('Already processed', { status: 200 })
  }

  // ─── Créer l'utilisateur ────────────────────────────────────────────
  const userId = uuid()
  const donorId = uuid()
  const tempPassword = generateTempPassword()
  const { hash, salt } = await hashPassword(tempPassword)

  // Le nom du donateur depuis Stripe (si fourni)
  const donorName = session.customer_details?.name || null

  try {
    await createUser(env.DB, {
      id: userId,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      donorId,
      donorName,
      tier: 'pro',
    })

    await recordPayment(env.DB, {
      id: uuid(),
      stripeSessionId: session.id,
      stripePaymentId: session.payment_intent || null,
      email,
      amount,
      currency,
      donorId,
    })

    // ─── Génère le token Ed25519 ────────────────────────────────────
    const token = await generateLicenseToken({
      donorId,
      donorName,
      tier: 'pro',
      privateKeyHex: env.PRIVATE_KEY_HEX,
    })

    // ─── Envoie le mail ─────────────────────────────────────────────
    await sendWelcomeEmail(env.RESEND_API_KEY, {
      email,
      password: tempPassword,
      token,
      donorName,
    })

    await logAudit(env.DB, {
      event: 'user_created',
      email,
      donorId,
      detail: `amount=${amount} ${currency}`,
    })

    return new Response('OK', { status: 200 })
  } catch (e) {
    // Log l'erreur pour investigation
    await logAudit(env.DB, {
      event: 'stripe_webhook_error',
      email,
      detail: e.message?.slice(0, 200),
    })
    console.error('Stripe webhook error:', e)
    return new Response('Internal error', { status: 500 })
  }
}