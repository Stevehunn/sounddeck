/**
 * @file Claim-sponsorship route.
 *
 * Handles `POST /claim-sponsorship` — the second half of the GitHub
 * Sponsors flow, for sponsors whose GitHub email was **private** at the
 * time of donation.
 *
 * Flow:
 * 1. GitHub webhook (see `github-webhook.js`) stores a `pending_sponsorships`
 *    row when the email is private.
 * 2. The user opens the app, chooses "Claim a sponsorship", enters their
 *    GitHub login + a new email + password.
 * 3. This route:
 *    - Finds the pending sponsorship for that GitHub login
 *    - Creates a regular verified user
 *    - Marks the sponsorship as claimed
 *    - Issues a fresh Ed25519 license token
 *    - Returns `{ token, email, tier, donorId, donorName }`
 *
 * All errors are logged to `audit_log` so support can see what happened.
 *
 * @see ./github-webhook.js — the route that fills `pending_sponsorships`
 * @see ../lib/db.js — `findClaimableSponsorshipForLogin`, `markSponsorshipClaimed`
 * @see ../lib/license.js — `generateLicenseToken`
 */

import { hashPassword, uuid } from "../lib/crypto.js";
import {
  findClaimableSponsorshipForLogin,
  markSponsorshipClaimed,
  getUserByEmail,
  createUser,
  logAudit,
} from "../lib/db.js";
import { generateLicenseToken } from "../lib/license.js";

/**
 * Handles `POST /claim-sponsorship`.
 *
 * @param {Request} request
 * @param {Object} env - Worker environment bindings.
 * @param {string} env.DB - D1 database binding.
 * @param {string} env.PRIVATE_KEY_HEX - Ed25519 private key (32 bytes hex).
 * @returns {Promise<Response>} JSON response with `{ token, email, tier, donorId, donorName }`.
 */
export async function handleClaimSponsorship(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const githubLogin = String(body.githubLogin || "")
    .trim()
    .replace(/^@/, "");
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");

  // ─── Input validation ─────────────────────────────────────────────
  if (!githubLogin || !email || !password) {
    return json({ error: "missing_fields" }, 400);
  }
  // GitHub login rules: 1-39 chars, alphanumeric + hyphens, no leading/trailing hyphen
  if (
    !/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(githubLogin)
  ) {
    return json({ error: "invalid_github_login" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "invalid_email" }, 400);
  }
  if (password.length < 6) {
    return json({ error: "password_too_short" }, 400);
  }

  // ─── Find a matching pending sponsorship ──────────────────────────
  const sponsorship = await findClaimableSponsorshipForLogin(
    env.DB,
    githubLogin,
  );
  if (!sponsorship) {
    await logAudit(env.DB, {
      event: "claim_sponsorship_not_found",
      email,
      detail: `login=${githubLogin}`,
    });
    return json({ error: "sponsorship_not_found" }, 404);
  }

  // Refuse if the email is already registered (the user should log in
  // with their existing account instead of claiming again).
  const existingUser = await getUserByEmail(env.DB, email);
  if (existingUser) {
    return json({ error: "email_already_exists" }, 409);
  }

  // ─── Create the user + mark the sponsorship as claimed ────────────
  try {
    const userId = uuid();
    const donorId = uuid();
    const { hash, salt } = await hashPassword(password);

    await createUser(env.DB, {
      id: userId,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      donorId,
      donorName: githubLogin,
      tier: sponsorship.tier || "pro",
    });

    await markSponsorshipClaimed(env.DB, sponsorship.id, userId);

    // Issue a fresh Ed25519 license token (signed with the operator's key)
    const token = await generateLicenseToken({
      donorId,
      donorName: githubLogin,
      tier: sponsorship.tier || "pro",
      privateKeyHex: env.PRIVATE_KEY_HEX,
    });

    await logAudit(env.DB, {
      event: "claim_sponsorship_success",
      email,
      donorId,
      detail: `login=${githubLogin}`,
    });

    return json({
      token,
      email,
      tier: sponsorship.tier || "pro",
      donorId,
      donorName: githubLogin,
    });
  } catch (e) {
    await logAudit(env.DB, {
      event: "claim_sponsorship_error",
      email,
      detail: e.message?.slice(0, 200),
    });
    console.error("Claim sponsorship error:", e);
    return json({ error: "internal_error" }, 500);
  }
}

/**
 * Returns a JSON `Response` with the given payload and status code.
 *
 * @param {unknown} data - Any JSON-serializable value.
 * @param {number} [status=200] - HTTP status code.
 * @returns {Response}
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
