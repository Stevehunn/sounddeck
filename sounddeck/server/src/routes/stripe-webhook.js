/**
 * @file Stripe webhook handler (dormant).
 *
 * Handles `POST /webhook/stripe` — the historical "one-time donation =
 * lifetime Pro" flow via Stripe Checkout. It is currently **dormant**
 * (Stripe was replaced by GitHub Sponsors), but the code is kept so the
 * flow can be re-enabled by flipping `STRIPE_WEBHOOK_SECRET` back on.
 *
 * Flow on `checkout.session.completed`:
 * 1. Verify the HMAC-SHA256 signature (`Stripe-Signature` header with a
 *    5-minute replay window).
 * 2. Ignore any event other than `checkout.session.completed`.
 * 3. If the checkout email is already registered, log and return 200
 *    (idempotency — Stripe retries on failures).
 * 4. Otherwise: create the user, record the payment, issue a fresh
 *    Ed25519 license token, and send the welcome email.
 *
 * @see ../lib/crypto.js — `verifyStripeSignature`, `hashPassword`, `uuid`
 * @see ../lib/db.js — `recordPayment`, `createUser`
 * @see ../lib/email.js — `sendWelcomeEmail`
 */

import {
  uuid,
  hashPassword,
  generateTempPassword,
  verifyStripeSignature,
} from "../lib/crypto.js";
import {
  getUserByEmail,
  createUser,
  recordPayment,
  logAudit,
} from "../lib/db.js";
import { generateLicenseToken } from "../lib/license.js";
import { sendWelcomeEmail } from "../lib/email.js";

/**
 * Handles the Stripe webhook (`checkout.session.completed`).
 *
 * @param {Request} request
 * @param {Object} env - Worker environment bindings.
 * @param {string} env.DB - D1 database binding.
 * @param {string} env.STRIPE_WEBHOOK_SECRET - Stripe webhook signing secret.
 * @param {string} env.PRIVATE_KEY_HEX - Ed25519 private key (32 bytes hex).
 * @param {string} env.RESEND_API_KEY - Resend API key.
 * @returns {Promise<Response>} Plain-text response (Stripe expects 2xx).
 */
export async function handleStripeWebhook(request, env) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await request.text();

  const valid = await verifyStripeSignature(
    body,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );

  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // ─── Only handle `checkout.session.completed` ────────────────────
  if (event.type !== "checkout.session.completed") {
    return new Response("OK", { status: 200 });
  }

  const session = event.data?.object;
  if (!session) {
    return new Response("No session", { status: 400 });
  }

  const email = (
    session.customer_details?.email ||
    session.customer_email ||
    ""
  )
    .trim()
    .toLowerCase();

  const amount = (session.amount_total || 0) / 100; // Stripe amount is in cents
  const currency = (session.currency || "eur").toUpperCase();

  if (!email) {
    await logAudit(env.DB, {
      event: "stripe_webhook_no_email",
      detail: session.id,
    });
    return new Response("No email in session", { status: 400 });
  }

  // ─── Idempotency: don't recreate if the email already exists ─────
  const existing = await getUserByEmail(env.DB, email);
  if (existing) {
    await logAudit(env.DB, {
      event: "stripe_webhook_duplicate",
      email,
      donorId: existing.donor_id,
      detail: session.id,
    });
    return new Response("Already processed", { status: 200 });
  }

  // ─── Create the user ─────────────────────────────────────────────
  const userId = uuid();
  const donorId = uuid();
  const tempPassword = generateTempPassword();
  const { hash, salt } = await hashPassword(tempPassword);

  // Donor name from Stripe (if provided)
  const donorName = session.customer_details?.name || null;

  try {
    await createUser(env.DB, {
      id: userId,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      donorId,
      donorName,
      tier: "pro",
    });

    await recordPayment(env.DB, {
      id: uuid(),
      stripeSessionId: session.id,
      stripePaymentId: session.payment_intent || null,
      email,
      amount,
      currency,
      donorId,
    });

    // ─── Generate the Ed25519 token ────────────────────────────────
    const token = await generateLicenseToken({
      donorId,
      donorName,
      tier: "pro",
      privateKeyHex: env.PRIVATE_KEY_HEX,
    });

    // ─── Send the welcome email ────────────────────────────────────
    await sendWelcomeEmail(env.RESEND_API_KEY, {
      email,
      password: tempPassword,
      token,
      donorName,
    });

    await logAudit(env.DB, {
      event: "user_created",
      email,
      donorId,
      detail: `amount=${amount} ${currency}`,
    });

    return new Response("OK", { status: 200 });
  } catch (e) {
    // Log the error for investigation
    await logAudit(env.DB, {
      event: "stripe_webhook_error",
      email,
      detail: e.message?.slice(0, 200),
    });
    console.error("Stripe webhook error:", e);
    return new Response("Internal error", { status: 500 });
  }
}