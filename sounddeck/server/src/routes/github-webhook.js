/**
 * @file GitHub Sponsors webhook handler.
 *
 * Handles `POST /webhook/github-sponsor` — the entry point for the
 * "one-time donation = lifetime Pro access" flow.
 *
 * Only `sponsorship.created` events are processed; everything else is
 * accepted (200 OK) so GitHub doesn't retry.
 *
 * Two cases:
 * - **CASE A — public email**:
 *   - **New email** → create a lifetime-Pro user, generate a temp
 *     password, sign a token, send a welcome email.
 *   - **Existing trial user** → upgrade to lifetime Pro (clear
 *     `tier_expires_at`, keep the existing password), send a
 *     "pro upgrade" email.
 *   - **Existing lifetime Pro** → no-op.
 * - **CASE B — private email**: the sponsor's email is hidden. We store
 *   a `pending_sponsorships` row so the sponsor can later claim it via
 *   `/claim-sponsorship`.
 *
 * Idempotency: a duplicate `sponsorship.node_id` is silently accepted
 * (200 OK) without re-processing.
 *
 * @see ./claim.js — the "claim" route for CASE B
 * @see ../lib/crypto.js — `verifyGitHubSignature`
 * @see ../lib/email.js — `sendWelcomeEmail`, `sendProUpgradeEmail`
 */

import {
  verifyGitHubSignature,
  hashPassword,
  generateTempPassword,
  uuid,
} from "../lib/crypto.js";
import {
  insertPendingSponsorship,
  getPendingSponsorshipByNodeId,
  getUserByEmail,
  createUser,
  logAudit,
} from "../lib/db.js";
import { generateLicenseToken } from "../lib/license.js";
import { sendWelcomeEmail, sendProUpgradeEmail } from "../lib/email.js";

/** Only `sponsorship.created` events are processed; all other actions are a no-op. */
const SUPPORTED_ACTIONS = new Set(["created"]);

/**
 * Handles the GitHub Sponsors webhook (`sponsorship.created`).
 *
 * @param {Request} request
 * @param {Object} env - Worker environment bindings.
 * @param {string} env.DB - D1 database binding.
 * @param {string} env.GITHUB_SPONSOR_WEBHOOK_SECRET - HMAC signing secret.
 * @param {string} env.PRIVATE_KEY_HEX - Ed25519 private key (32 bytes hex).
 * @param {string} env.RESEND_API_KEY - Resend API key.
 * @returns {Promise<Response>} Plain-text response (GitHub expects 2xx).
 */
export async function handleGitHubSponsorWebhook(request, env) {
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (!signature) return new Response("Missing signature", { status: 400 });
  if (!env.GITHUB_SPONSOR_WEBHOOK_SECRET) {
    console.error("GITHUB_SPONSOR_WEBHOOK_SECRET not configured");
    return new Response("Config error", { status: 500 });
  }

  const body = await request.text();

  const valid = await verifyGitHubSignature(
    body,
    signature,
    env.GITHUB_SPONSOR_WEBHOOK_SECRET,
  );
  if (!valid) {
    await logAudit(env.DB, { event: "github_webhook_bad_signature" });
    return new Response("Invalid signature", { status: 401 });
  }

  // ─── Ping (webhook configuration test from GitHub UI) ─────────────
  if (event === "ping") {
    return json({ ok: true, pong: true });
  }

  // ─── Only handle `sponsorship` events ─────────────────────────────
  if (event !== "sponsorship") {
    return new Response("OK", { status: 200 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const action = payload.action;
  if (!SUPPORTED_ACTIONS.has(action)) {
    return new Response("OK", { status: 200 });
  }

  const sponsorship = payload.sponsorship;
  if (!sponsorship) return new Response("Missing sponsorship", { status: 400 });

  const nodeId = sponsorship.node_id;
  const sponsor = sponsorship.sponsor || {};
  const githubLogin = sponsor.login;
  const githubUserId = sponsor.id ? String(sponsor.id) : null;
  const sponsorEmail = sponsor.email
    ? String(sponsor.email).toLowerCase().trim()
    : null;
  const tier = sponsorship.tier || {};
  const amountCents = tier.monthly_price_in_cents ?? null;
  const isOneTime = tier.is_one_time !== false;
  const privacyLevel = sponsorship.privacy_level || null;

  if (!nodeId || !githubLogin) {
    await logAudit(env.DB, {
      event: "github_webhook_invalid",
      detail: `nodeId=${nodeId} login=${githubLogin}`,
    });
    return new Response("Missing required fields", { status: 400 });
  }

  // ─── Idempotency: ignore if we've already seen this node_id ──────
  const existing = await getPendingSponsorshipByNodeId(env.DB, nodeId);
  if (existing) {
    return new Response("Already processed", { status: 200 });
  }

  try {
    // ══════════════════════════════════════════════════════════════
    // CASE A — Public email
    // ══════════════════════════════════════════════════════════════
    if (sponsorEmail) {
      const existingUser = await getUserByEmail(env.DB, sponsorEmail);

      // Sub-case A1: existing lifetime Pro → no-op
      if (
        existingUser &&
        existingUser.tier === "pro" &&
        existingUser.tier_expires_at === null
      ) {
        await logAudit(env.DB, {
          event: "github_sponsor_already_pro",
          email: sponsorEmail,
          donorId: existingUser.donor_id,
          detail: `login=${githubLogin} nodeId=${nodeId}`,
        });
        return new Response("Already lifetime Pro", { status: 200 });
      }

      // Sub-case A2: existing trial user (or free) → upgrade to lifetime Pro
      if (existingUser) {
        const now = Math.floor(Date.now() / 1000);
        const previousTier = existingUser.tier;
        const previousExpiresAt = existingUser.tier_expires_at;

        await env.DB
          .prepare(
            `UPDATE users
             SET tier = 'pro',
                 tier_expires_at = NULL,
                 donor_name = COALESCE(donor_name, ?),
                 updated_at = ?
             WHERE id = ?`,
          )
          .bind(githubLogin, now, existingUser.id)
          .run();

        // Trace the sponsorship (claimed immediately, already has a user)
        await insertPendingSponsorship(env.DB, {
          id: uuid(),
          sponsorshipNodeId: nodeId,
          githubLogin,
          githubUserId,
          amountCents,
          currency: "USD",
          tier: "pro",
          isOneTime,
          privacyLevel,
        });

        const token = await generateLicenseToken({
          donorId: existingUser.donor_id,
          donorName: githubLogin,
          tier: "pro",
          expiresAt: null, // lifetime
          privateKeyHex: env.PRIVATE_KEY_HEX,
        });

        await sendProUpgradeEmail(env.RESEND_API_KEY, {
          email: sponsorEmail,
          token,
          donorName: githubLogin,
        });

        await logAudit(env.DB, {
          event: "github_sponsor_upgraded",
          email: sponsorEmail,
          donorId: existingUser.donor_id,
          detail: `login=${githubLogin} previousTier=${previousTier} previousExpiresAt=${previousExpiresAt ?? "null"}`,
        });

        console.log(
          `💖 Sponsor upgraded to lifetime Pro: @${githubLogin} <${sponsorEmail}>`,
        );
        return new Response("Upgraded to lifetime Pro", { status: 200 });
      }

      // Sub-case A3: new email → create user + welcome email
      const userId = uuid();
      const donorId = uuid();
      const tempPassword = generateTempPassword();
      const { hash, salt } = await hashPassword(tempPassword);

      await createUser(env.DB, {
        id: userId,
        email: sponsorEmail,
        passwordHash: hash,
        passwordSalt: salt,
        donorId,
        donorName: githubLogin,
        tier: "pro",
        tierExpiresAt: null, // lifetime
      });

      await insertPendingSponsorship(env.DB, {
        id: uuid(),
        sponsorshipNodeId: nodeId,
        githubLogin,
        githubUserId,
        amountCents,
        currency: "USD",
        tier: "pro",
        isOneTime,
        privacyLevel,
      });

      const token = await generateLicenseToken({
        donorId,
        donorName: githubLogin,
        tier: "pro",
        expiresAt: null, // lifetime
        privateKeyHex: env.PRIVATE_KEY_HEX,
      });

      await sendWelcomeEmail(env.RESEND_API_KEY, {
        email: sponsorEmail,
        password: tempPassword,
        token,
        donorName: githubLogin,
      });

      await logAudit(env.DB, {
        event: "github_sponsor_auto_created",
        email: sponsorEmail,
        donorId,
        detail: `login=${githubLogin}`,
      });

      console.log(`💖 Sponsor auto-created: @${githubLogin} <${sponsorEmail}>`);
      return new Response("OK", { status: 200 });
    }

    // ══════════════════════════════════════════════════════════════
    // CASE B — Private email: store a pending row to be claimed
    // ══════════════════════════════════════════════════════════════
    await insertPendingSponsorship(env.DB, {
      id: uuid(),
      sponsorshipNodeId: nodeId,
      githubLogin,
      githubUserId,
      amountCents,
      currency: "USD",
      tier: "pro",
      isOneTime,
      privacyLevel,
    });

    await logAudit(env.DB, {
      event: "github_sponsor_pending",
      detail: `login=${githubLogin} amount=${amountCents}`,
    });

    console.log(
      `💖 New pending sponsor: @${githubLogin} (${amountCents}¢) — private email`,
    );
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("GitHub sponsor webhook error:", e);
    await logAudit(env.DB, {
      event: "github_webhook_error",
      detail: e.message?.slice(0, 200),
    });
    return new Response("Internal error", { status: 500 });
  }
}

/**
 * Returns a JSON `Response` with the given payload and status code.
 *
 * @param {unknown} data
 * @param {number} [status=200]
 * @returns {Response}
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}