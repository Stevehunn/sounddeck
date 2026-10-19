/**
 * @file Forgot-password route.
 *
 * Flow:
 * 1. User submits their email via POST /forgot-password.
 * 2. If the email exists, we create a one-time reset token (valid 1 hour)
 *    in the `password_resets` table and send a reset link by email.
 * 3. The user clicks the link → GET /reset-password?token=X (see
 *    reset-password.js).
 *
 * Anti-enumeration:
 * - The response is ALWAYS the same 200 OK, whether the email exists or not.
 *   This prevents attackers from checking which emails are registered.
 */

import {
  getUserByEmail,
  createPasswordReset,
  deleteExpiredPasswordResets,
  logAudit,
} from "../lib/db.js";
import { sendPasswordResetEmail } from "../lib/email.js";

/** Validity of the reset token, in seconds (1 hour). */
const RESET_TOKEN_TTL = 60 * 60;

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

/**
 * Generates a long random token for password reset.
 *
 * Two UUIDv4 concatenated without hyphens = 64 hex chars. This token is
 * single-use and expires after 1 hour (see RESET_TOKEN_TTL).
 *
 * @returns {string}
 */
function generateResetToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

/**
 * Handles `POST /forgot-password`.
 *
 * Request body: `{ email: string }`
 *
 * Always returns the same 200 OK message to prevent email enumeration:
 * > "If an account exists with this email, a reset link has been sent."
 *
 * Side effects:
 * - If the user exists, a token is stored in `password_resets` and an email
 *   is sent (best-effort: failures are logged but don't break the response).
 * - If the user doesn't exist, an audit log entry `forgot_password_unknown_email`
 *   is recorded (useful to detect enumeration attempts).
 *
 * @param {Request} request
 * @param {Object} env
 * @param {string} env.DB - D1 database binding.
 * @param {string} env.RESEND_API_KEY - Resend API key.
 * @param {string} [env.API_BASE_URL='https://api.sounddeck.stream']
 *   Base URL used to build the reset link.
 * @returns {Promise<Response>}
 */
export async function handleForgotPassword(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return jsonResponse({ error: "missing_email" }, 400);
  }

  // Generic response, used for both existing and unknown emails
  const genericResponse = jsonResponse({
    ok: true,
    message:
      "If an account exists with this email, a reset link has been sent.",
  });

  const user = await getUserByEmail(env.DB, email);

  if (!user) {
    // Log unknown email attempts (helps detect brute force / enumeration)
    await logAudit(env.DB, {
      event: "forgot_password_unknown_email",
      email,
      ip: request.headers.get("CF-Connecting-IP"),
      userAgent: request.headers.get("User-Agent"),
    });
    return genericResponse;
  }

  // Best-effort cleanup of expired tokens (fire-and-forget, not awaited)
  deleteExpiredPasswordResets(env.DB).catch(() => {});

  // Store the new reset token
  const token = generateResetToken();
  const expiresAt = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL;

  await createPasswordReset(env.DB, {
    token,
    userId: user.id,
    email: user.email,
    expiresAt,
    ip: request.headers.get("CF-Connecting-IP"),
    userAgent: request.headers.get("User-Agent"),
  });

  // Send the email (best-effort: never block the response on it)
  const apiBase = env.API_BASE_URL || "https://api.sounddeck.stream";
  const resetUrl = `${apiBase}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(env.RESEND_API_KEY, {
      email: user.email,
      resetUrl,
    });
  } catch (e) {
    console.error("sendPasswordResetEmail error:", e.message);
    // Do not return an error: the user can retry from the app
  }

  await logAudit(env.DB, {
    event: "forgot_password_sent",
    email: user.email,
    donorId: user.donor_id,
    ip: request.headers.get("CF-Connecting-IP"),
    userAgent: request.headers.get("User-Agent"),
  });

  return genericResponse;
}