/**
 * @file Login route.
 *
 * Handles `POST /login` — email + password authentication for the Pro
 * account system. On success, issues a **fresh** Ed25519 license token
 * (the private key never leaves the operator's machine).
 *
 * Security notes:
 * - The email lookup and the password check return the *same* generic
 *   `401 invalid_credentials`, so an attacker cannot enumerate registered
 *   emails by observing different error codes.
 * - The `email_verified` check runs **after** the password check for the
 *   same reason: an unverified account that provides the correct password
 *   gets `403 email_not_verified`, which is actionable; without the
 *   correct password, it stays a generic 401.
 *
 * @see ../lib/crypto.js — `verifyPassword` (PBKDF2-SHA256, constant-time compare)
 * @see ../lib/license.js — `generateLicenseToken`
 */

import { verifyPassword } from "../lib/crypto.js";
import { getUserByEmail, logAudit } from "../lib/db.js";
import { generateLicenseToken } from "../lib/license.js";

/**
 * Handles `POST /login`.
 *
 * @param {Request} request
 * @param {Object} env - Worker environment bindings.
 * @param {string} env.DB - D1 database binding.
 * @param {string} env.PRIVATE_KEY_HEX - Ed25519 private key (32 bytes hex).
 * @returns {Promise<Response>} JSON with `{token, email, tier, donorId, donorName}`.
 */
export async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return jsonResponse({ error: "missing_credentials" }, 400);
  }

  const user = await getUserByEmail(env.DB, email);
  if (!user) {
    await logAudit(env.DB, {
      event: "login_failed",
      email,
      ip: request.headers.get("CF-Connecting-IP"),
      userAgent: request.headers.get("User-Agent"),
      detail: "user_not_found",
    });
    // Generic message to avoid leaking whether the email exists
    return jsonResponse({ error: "invalid_credentials" }, 401);
  }

  const ok = await verifyPassword(
    password,
    user.password_hash,
    user.password_salt,
  );
  if (!ok) {
    await logAudit(env.DB, {
      event: "login_failed",
      email,
      donorId: user.donor_id,
      ip: request.headers.get("CF-Connecting-IP"),
      userAgent: request.headers.get("User-Agent"),
      detail: "wrong_password",
    });
    return jsonResponse({ error: "invalid_credentials" }, 401);
  }

  // ✅ Email verified?
  // We check this AFTER the password so we don't leak email existence
  // to someone who doesn't know the password.
  if (!user.email_verified) {
    await logAudit(env.DB, {
      event: "login_failed",
      email,
      donorId: user.donor_id,
      ip: request.headers.get("CF-Connecting-IP"),
      userAgent: request.headers.get("User-Agent"),
      detail: "email_not_verified",
    });
    return jsonResponse({ error: "email_not_verified" }, 403);
  }

  // Issue a fresh token on every login (private key is never exposed)
  const token = await generateLicenseToken({
    donorId: user.donor_id,
    donorName: user.donor_name,
    tier: user.tier,
    privateKeyHex: env.PRIVATE_KEY_HEX,
  });

  await logAudit(env.DB, {
    event: "login_success",
    email,
    donorId: user.donor_id,
    ip: request.headers.get("CF-Connecting-IP"),
    userAgent: request.headers.get("User-Agent"),
  });

  return jsonResponse({
    token,
    email: user.email,
    tier: user.tier,
    donorId: user.donor_id,
    donorName: user.donor_name,
  });
}

/**
 * Returns a JSON `Response` with the given payload and status code.
 *
 * @param {unknown} data
 * @param {number} [status=200]
 * @returns {Response}
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}