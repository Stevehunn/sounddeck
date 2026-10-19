/**
 * @file Redeem-code route.
 *
 * Handles `POST /redeem` — exchanges a one-time Pro activation code
 * (`SDCK-XXXX-XXXX-XXXX`) for a real account.
 *
 * The flow:
 * 1. Validate the request body (email + password + code).
 * 2. Check the code exists, isn't revoked, isn't used, hasn't expired.
 * 3. If the code has an `email_hint`, enforce that the provided email matches.
 * 4. Ensure the email isn't already registered.
 * 5. Create the user, mark the code as used, and issue a fresh Ed25519
 *    license token.
 *
 * Every failure is logged to `audit_log` under `event: "redeem_<reason>"`.
 *
 * @see ../lib/codeGen.js — `normalizeCode`, `isValidCodeFormat`
 * @see ../lib/db.js — `getRedeemCode`, `markRedeemCodeUsed`
 * @see ../lib/license.js — `generateLicenseToken`
 */

import { hashPassword, uuid } from "../lib/crypto.js";
import { normalizeCode, isValidCodeFormat } from "../lib/codeGen.js";
import {
  getRedeemCode,
  markRedeemCodeUsed,
  getUserByEmail,
  createUser,
  logAudit,
} from "../lib/db.js";
import { generateLicenseToken } from "../lib/license.js";

/**
 * Handles `POST /redeem`.
 *
 * @param {Request} request
 * @param {Object} env - Worker environment bindings.
 * @param {string} env.DB - D1 database binding.
 * @param {string} env.PRIVATE_KEY_HEX - Ed25519 private key (32 bytes hex).
 * @returns {Promise<Response>} JSON with `{token, email, tier, donorId, donorName}`.
 */
export async function handleRedeem(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");
  const code = normalizeCode(body.code);

  // ─── Basic validation ────────────────────────────────────────────
  if (!email || !password || !code) {
    return json({ error: "missing_fields" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "invalid_email" }, 400);
  }
  if (password.length < 6) {
    return json({ error: "password_too_short" }, 400);
  }
  if (!isValidCodeFormat(code)) {
    return json({ error: "invalid_code_format" }, 400);
  }

  // ─── DB-level checks ─────────────────────────────────────────────
  const codeRow = await getRedeemCode(env.DB, code);

  if (!codeRow) {
    await logAudit(env.DB, {
      event: "redeem_unknown_code",
      email,
      ip: request.headers.get("CF-Connecting-IP"),
      detail: code.slice(0, 8) + "…",
    });
    return json({ error: "code_not_found" }, 404);
  }

  if (codeRow.revoked) {
    return json({ error: "code_revoked" }, 403);
  }

  if (codeRow.current_uses >= codeRow.max_uses) {
    return json({ error: "code_already_used" }, 409);
  }

  if (
    codeRow.expires_at &&
    codeRow.expires_at < Math.floor(Date.now() / 1000)
  ) {
    return json({ error: "code_expired" }, 410);
  }

  // Strict email match: if the code has an `email_hint`, enforce it
  if (codeRow.email_hint && codeRow.email_hint.toLowerCase() !== email) {
    return json({ error: "email_mismatch" }, 403);
  }

  // Refuse if the email is already registered
  const existing = await getUserByEmail(env.DB, email);
  if (existing) {
    return json({ error: "email_already_exists" }, 409);
  }

  // ─── Create the account ──────────────────────────────────────────
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
      donorName: null,
      tier: codeRow.tier || "pro",
    });

    await markRedeemCodeUsed(env.DB, code, userId, email);

    // ─── Ed25519 token ─────────────────────────────────────────────
    const token = await generateLicenseToken({
      donorId,
      donorName: null,
      tier: codeRow.tier || "pro",
      privateKeyHex: env.PRIVATE_KEY_HEX,
    });

    await logAudit(env.DB, {
      event: "redeem_success",
      email,
      donorId,
      ip: request.headers.get("CF-Connecting-IP"),
      detail: `code=${code.slice(0, 8)}… tier=${codeRow.tier}`,
    });

    return json({
      token,
      email,
      tier: codeRow.tier || "pro",
      donorId,
      donorName: null,
    });
  } catch (e) {
    await logAudit(env.DB, {
      event: "redeem_error",
      email,
      detail: e.message?.slice(0, 200),
    });
    console.error("Redeem error:", e);
    return json({ error: "internal_error" }, 500);
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