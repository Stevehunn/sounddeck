/**
 * @file Admin routes — protected by `ADMIN_TOKEN` (Bearer).
 *
 * All endpoints require `Authorization: Bearer <ADMIN_TOKEN>`. The token is
 * compared in constant-time. If `ADMIN_TOKEN` is unset or empty, ALL admin
 * endpoints return `401 unauthorized` (fail-safe default).
 *
 * Endpoints:
 * - POST /admin/generate-code    → create a redeem code
 * - GET  /admin/list-codes       → list codes
 * - POST /admin/revoke-code      → revoke an unused code
 * - POST /admin/create-user      → create a verified user (bypass signup)
 * - POST /admin/reset-password   → reset a user's password by email
 * - GET  /admin/list-users       → list users
 *
 * @see ../lib/db.js for the D1 helpers.
 * @see ../lib/codeGen.js for code generation / parsing.
 * @see ../lib/email.js for the redeem-code email.
 */

import { generateCode, parseExpiry, normalizeCode } from "../lib/codeGen.js";
import {
  insertRedeemCode,
  listRedeemCodes,
  revokeRedeemCode,
  getRedeemCode,
  createUser,
  updateUserPassword,
  getUserByEmail,
  listUsers,
} from "../lib/db.js";
import { hashPassword } from "../lib/crypto.js";
import { sendRedeemCodeEmail } from "../lib/email.js";

/**
 * Checks the `Authorization: Bearer <token>` header against `ADMIN_TOKEN`.
 *
 * Uses constant-time comparison to prevent timing leaks.
 *
 * @param {Request} request
 * @param {Object} env
 * @param {string} [env.ADMIN_TOKEN]
 * @returns {boolean}
 */
function checkAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const expected = (env.ADMIN_TOKEN || "").trim();

  if (!expected || !token) return false;
  if (token.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
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

// ═══════════════════════════════════════════════════════════════════════════
// REDEEM CODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handles `POST /admin/generate-code`.
 *
 * Request body:
 * - `email` (optional)   — if set, only this email can redeem the code
 * - `expiresIn` (string) — e.g. "30d", "1y". Default: "30d".
 * - `note` (optional)    — free-form note for the admin
 * - `tier` (optional)    — "pro" (default) or "free"
 * - `sendEmail` (bool)   — default: true. Sends the code by email if `email` set.
 *
 * @param {Request} request
 * @param {Object} env
 * @param {string} env.DB - D1 binding.
 * @param {string} env.RESEND_API_KEY - Resend key.
 * @param {string} [env.ADMIN_TOKEN] - Bearer token for auth.
 * @returns {Promise<Response>}
 */
export async function handleGenerateCode(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase() || null;
  const note = body.note || null;
  const tier = body.tier || "pro";
  const expiresIn = body.expiresIn || "30d";
  const sendEmail = body.sendEmail !== false; // send by default

  let expiresAt;
  try {
    expiresAt = parseExpiry(expiresIn);
  } catch (e) {
    return json({ error: "invalid_expiry", message: e.message }, 400);
  }

  const code = generateCode();

  try {
    await insertRedeemCode(env.DB, {
      code,
      tier,
      note,
      emailHint: email,
      expiresAt,
    });
  } catch (e) {
    console.error("Insert redeem code error:", e);
    return json({ error: "db_error", message: e.message }, 500);
  }

  // Email sending is best-effort: it doesn't break code generation
  let emailSent = false;
  let emailError = null;

  if (sendEmail && email) {
    try {
      await sendRedeemCodeEmail(env.RESEND_API_KEY, {
        email,
        code,
        expiresAt,
        donorName: body.donorName || null,
      });
      emailSent = true;
    } catch (e) {
      console.error("Email send error:", e);
      emailError = e.message;
    }
  }

  return json({
    code,
    tier,
    email,
    note,
    expiresAt,
    expiresIn,
    emailSent,
    emailError,
  });
}

/**
 * Handles `GET /admin/list-codes`.
 *
 * Query params:
 * - `onlyUnused=1` — filter to unused, non-revoked, non-expired codes
 * - `limit` (number) — max results, capped at 500
 *
 * @param {Request} request
 * @param {Object} env
 * @returns {Promise<Response>}
 */
export async function handleListCodes(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const onlyUnused = url.searchParams.get("onlyUnused") === "1";
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "100", 10),
    500,
  );

  // ⚠️ `.all()` returns `{results, meta, success}` — not an array.
  const result = await listRedeemCodes(env.DB, { limit, onlyUnused });
  return json({ codes: result.results || [] });
}

/**
 * Handles `POST /admin/revoke-code`.
 *
 * Request body: `{ code: string, reason?: string }`
 *
 * Refuses if the code doesn't exist, is already used, or is already revoked.
 *
 * @param {Request} request
 * @param {Object} env
 * @returns {Promise<Response>}
 */
export async function handleRevokeCode(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const code = normalizeCode(body.code);
  if (!code) return json({ error: "missing_code" }, 400);

  const row = await getRedeemCode(env.DB, code);
  if (!row) return json({ error: "code_not_found" }, 404);
  if (row.used_at) return json({ error: "code_already_used" }, 409);
  if (row.revoked) return json({ error: "code_already_revoked" }, 409);

  await revokeRedeemCode(env.DB, code, body.reason || null);
  return json({ success: true, code });
}

// ═══════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handles `POST /admin/create-user`.
 *
 * Creates a user **already verified** (`email_verified = 1`), bypassing the
 * signup flow. Useful to seed accounts / grant Pro access directly.
 *
 * Request body:
 * - `email` (string, required)
 * - `password` (string, required, min 6)
 * - `tier` (optional, `pro` | `free` | `dev`, default `pro`)
 * - `donorName` (optional)
 *
 * @param {Request} request
 * @param {Object} env
 * @returns {Promise<Response>}
 */
export async function handleCreateUser(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const tier = body.tier || "pro";
  const donorName = body.donorName || null;

  if (!email || !password) {
    return json({ error: "missing_fields" }, 400);
  }
  if (password.length < 6) {
    return json(
      { error: "password_too_short", message: "Min 6 characters" },
      400,
    );
  }
  if (!["pro", "dev", "free"].includes(tier)) {
    return json({ error: "invalid_tier" }, 400);
  }

  const existing = await getUserByEmail(env.DB, email);
  if (existing) {
    return json({ error: "email_already_exists" }, 409);
  }

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const donorId = `admin-${id.slice(0, 8)}`;

  try {
    const user = await createUser(env.DB, {
      id,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      donorId,
      donorName,
      tier,
    });
    return json({ success: true, user });
  } catch (e) {
    console.error("Insert user error:", e);
    return json({ error: "db_error", message: e.message }, 500);
  }
}

/**
 * Handles `POST /admin/reset-password`.
 *
 * Request body:
 * - `email` (string)
 * - `newPassword` (string, min 6)
 *
 * @param {Request} request
 * @param {Object} env
 * @returns {Promise<Response>}
 */
export async function handleResetPassword(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const newPassword = body.newPassword || "";

  if (!email || !newPassword) {
    return json({ error: "missing_fields" }, 400);
  }
  if (newPassword.length < 6) {
    return json(
      { error: "password_too_short", message: "Min 6 characters" },
      400,
    );
  }

  const user = await getUserByEmail(env.DB, email);
  if (!user) {
    return json({ error: "user_not_found" }, 404);
  }

  const { hash, salt } = await hashPassword(newPassword);

  try {
    await updateUserPassword(env.DB, user.id, hash, salt);
    return json({ success: true, email, userId: user.id });
  } catch (e) {
    console.error("Reset password error:", e);
    return json({ error: "db_error", message: e.message }, 500);
  }
}

/**
 * Handles `GET /admin/list-users`.
 *
 * Query params:
 * - `limit` (number) — max results, capped at 500. Default: 100.
 *
 * @param {Request} request
 * @param {Object} env
 * @returns {Promise<Response>}
 */
export async function handleListUsers(request, env) {
  if (!checkAuth(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "100", 10),
    500,
  );

  const result = await listUsers(env.DB, { limit });
  return json({ users: result.results || [] });
}
