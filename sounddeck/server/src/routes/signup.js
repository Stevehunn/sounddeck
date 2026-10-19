/**
 * @file Public signup + email verification routes.
 *
 * The signup flow has 3 possible branches depending on the existing
 * user state:
 *
 * 1. **Email already verified** → `409 email_already_exists` (the user
 *    should log in with their existing account).
 * 2. **Email exists but unverified** → resets the password (in case the
 *    user forgot what they chose), issues a fresh verification token,
 *    re-sends the verification email.
 * 3. **Email is new** → creates an `email_verified = 0` account with
 *    `tier = 'free'`, issues a token, sends the verification email.
 *
 * This is **anti-enumeration-safe**: the response for `/signup` never
 * reveals whether the email exists (we always return 200 OK).
 *
 * The verification flow (`GET /verify-email?token=X`) marks the user as
 * verified and renders a self-contained HTML success page (dark theme,
 * inline CSS, no JS, no external assets).
 *
 * Verification tokens:
 * - 256 bits of entropy (2× UUIDv4 concatenated, hyphens stripped)
 * - Single-use (cleared as soon as `email_verified = 1`)
 * - Expire after 24 hours (`VERIFY_TOKEN_TTL`)
 *
 * @see ../lib/crypto.js — `hashPassword` (PBKDF2-SHA256, 100k iters)
 * @see ../lib/db.js — `createUserUnverified`, `setUserVerifyToken`,
 *      `markEmailVerified`
 * @see ../lib/email.js — `sendVerifyEmail`
 */

import { hashPassword } from "../lib/crypto.js";
import {
  getUserByEmail,
  getUserByVerifyToken,
  createUserUnverified,
  setUserVerifyToken,
  updateUserPassword,
  markEmailVerified,
  logAudit,
} from "../lib/db.js";
import { sendVerifyEmail } from "../lib/email.js";

/** Validity of the verification token, in seconds (24 hours). */
const VERIFY_TOKEN_TTL = 24 * 60 * 60;

/**
 * Returns a JSON `Response` with the given payload and status code.
 *
 * @param {unknown} data - Any JSON-serializable value.
 * @param {number} [status=200] - HTTP status code.
 * @returns {Response}
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Returns an HTML `Response` with the given body and status code.
 *
 * @param {string} html
 * @param {number} [status=200]
 * @returns {Response}
 */
function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Lightweight email sanity check.
 *
 * The regex is intentionally permissive: we don't want to reject valid
 * addresses like `foo+bar@baz.qux`. If we're wrong, the verification email
 * simply won't be delivered — which is not a hard failure for the flow
 * (the user can retry with a different address).
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Generates a long random token for email verification.
 *
 * Two UUIDv4 concatenated without hyphens = 64 hex chars = 256 bits of
 * entropy. Overkill for this use-case, but cheap and effectively
 * collision-free in practice.
 *
 * @returns {string}
 */
function generateVerifyToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /signup
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handles `POST /signup`.
 *
 * Request body: `{ email: string, password: string }`
 *
 * Behavior (anti-enumeration — always returns 200 on success):
 * - **Email already verified** → `409 email_already_exists`
 * - **Email exists but unverified** → resets the password, issues a fresh
 *   verification token, re-sends the email (see "Case 2" below)
 * - **Email is new** → creates the user (tier `free`, `email_verified=0`),
 *   issues a token, sends the email (see "Case 3" below)
 *
 * Error codes (400):
 * - `invalid_json`         — body isn't valid JSON
 * - `missing_fields`       — `email` or `password` is empty
 * - `invalid_email`        — email fails the sanity check
 * - `password_too_short`   — password length < 6
 * - `password_too_long`    — password length > 100
 *
 * The email-send step is **best-effort**: if it fails, the user record
 * still exists and the client gets 200 OK. The failure is logged to
 * `audit_log` with `detail: "email_failed"` so support can investigate.
 *
 * @param {Request} request
 * @param {Object} env - Worker env bindings.
 * @param {string} env.DB - D1 database binding.
 * @param {string} env.RESEND_API_KEY - Resend API key.
 * @param {string} [env.API_BASE_URL='https://api.sounddeck.stream']
 *   Base URL used to build the verification link.
 * @returns {Promise<Response>} JSON `{ok: true, message}` on success.
 */
export async function handleSignup(request, env) {
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

  // ─── Input validation ────────────────────────────────────────────
  if (!email || !password) {
    return jsonResponse({ error: "missing_fields" }, 400);
  }
  if (!isValidEmail(email)) {
    return jsonResponse({ error: "invalid_email" }, 400);
  }
  if (password.length < 6) {
    return jsonResponse(
      { error: "password_too_short", message: "Min 6 characters" },
      400,
    );
  }
  if (password.length > 100) {
    return jsonResponse({ error: "password_too_long" }, 400);
  }

  const existing = await getUserByEmail(env.DB, email);

  // ─── Case 1: verified account → user must log in instead ─────────
  if (existing && existing.email_verified) {
    return jsonResponse({ error: "email_already_exists" }, 409);
  }

  // Hash password + generate verification token
  const { hash, salt } = await hashPassword(password);
  const verifyToken = generateVerifyToken();
  const verifyTokenExpires = Math.floor(Date.now() / 1000) + VERIFY_TOKEN_TTL;

  if (existing) {
    // ─── Case 2: existing but unverified → reset password + token ──
    // (the user may have forgotten what they chose on their first try)
    await updateUserPassword(env.DB, existing.id, hash, salt);
    await setUserVerifyToken(
      env.DB,
      existing.id,
      verifyToken,
      verifyTokenExpires,
    );
  } else {
    // ─── Case 3: brand new user → create unverified account ───────
    const id = crypto.randomUUID();
    const donorId = `free-${id.slice(0, 8)}`;
    await createUserUnverified(env.DB, {
      id,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      donorId,
      tier: "free",
      verifyToken,
      verifyTokenExpires,
    });
  }

  // ─── Send verification email (best-effort) ───────────────────────
  const apiBase = env.API_BASE_URL || "https://api.sounddeck.stream";
  const verifyUrl = `${apiBase}/verify-email?token=${verifyToken}`;

  let emailSent = false;
  try {
    await sendVerifyEmail(env.RESEND_API_KEY, { email, verifyUrl });
    emailSent = true;
  } catch (e) {
    console.error("sendVerifyEmail error:", e.message);
  }

  await logAudit(env.DB, {
    event: "signup",
    email,
    ip: request.headers.get("CF-Connecting-IP"),
    userAgent: request.headers.get("User-Agent"),
    detail: emailSent ? "email_sent" : "email_failed",
  });

  return jsonResponse({
    ok: true,
    message: "A verification email has been sent to your inbox.",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /verify-email?token=X
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handles `GET /verify-email?token=X`.
 *
 * Marks the user as verified and renders an HTML success page.
 *
 * Three error cases, each returns a dedicated HTML page with 400:
 * - No `token` query param → "Invalid link" / "No token was provided."
 * - Token unknown or already used → "Invalid or already-used link"
 * - Token exists but `verify_token_expires < now` → "Link expired"
 *
 * On success, `markEmailVerified` is called (which clears
 * `verify_token` + `verify_token_expires` so the token becomes single-use),
 * and an audit log entry `email_verified` is recorded.
 *
 * @param {Request} request
 * @param {Object} env
 * @param {string} env.DB - D1 database binding.
 * @returns {Promise<Response>} HTML response (success or error page).
 */
export async function handleVerifyEmail(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return htmlResponse(
      buildErrorPage("Invalid link", "No token was provided."),
      400,
    );
  }

  const user = await getUserByVerifyToken(env.DB, token);

  if (!user) {
    return htmlResponse(
      buildErrorPage(
        "Invalid or already-used link",
        "This link has already been used, or it is incorrect.",
      ),
      400,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (user.verify_token_expires < now) {
    return htmlResponse(
      buildErrorPage(
        "Link expired",
        "This link is valid for 24 hours. Sign up again to receive a new one.",
      ),
      400,
    );
  }

  await markEmailVerified(env.DB, user.id);

  await logAudit(env.DB, {
    event: "email_verified",
    email: user.email,
    donorId: user.donor_id,
    ip: request.headers.get("CF-Connecting-IP"),
    userAgent: request.headers.get("User-Agent"),
  });

  return htmlResponse(buildSuccessPage(user.email));
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML templates
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds the HTML success page shown after email verification.
 *
 * Self-contained: inline CSS, no JS, no external assets. The dark theme
 * matches the app's `index.css` colors. Includes a small "next steps"
 * checklist guiding the user to log in from the app.
 *
 * User-facing strings are currently in **French** to match the app's
 * locale. When we add i18n to the worker responses, these should be
 * looked up via `Accept-Language`.
 *
 * @param {string} email - The verified email (displayed for confirmation).
 * @returns {string} HTML document as a string.
 */
function buildSuccessPage(email) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Email vérifié — SoundDeck</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #111113; color: #f0f0f2; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1a1a1e; border: 1px solid #2e2e36; border-radius: 14px; padding: 40px; max-width: 460px; text-align: center; }
    .icon { width: 72px; height: 72px; border-radius: 50%; background: #1d9e75; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 36px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #a0a0b0; line-height: 1.6; margin: 0 0 16px; }
    .email { font-family: monospace; color: #7c6ff7; }
    .steps { text-align: left; background: #222228; border-radius: 10px; padding: 16px 20px; margin: 24px 0; font-size: 14px; color: #a0a0b0; line-height: 1.8; }
    .steps strong { color: #f0f0f2; }
    .btn { display: inline-block; background: #7c6ff7; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Email vérifié !</h1>
    <p>Bienvenue sur SoundDeck, <span class="email">${email}</span></p>
    <div class="steps">
      <strong>Prochaines étapes :</strong><br>
      1. Ouvre SoundDeck<br>
      2. Va dans <strong>Options → Soutenir SoundDeck</strong><br>
      3. Clique sur <strong>Se connecter</strong><br>
      4. Entre ton email et ton mot de passe
    </div>
    <p style="font-size: 13px; color: #606070;">
      Ton compte est en version <strong>gratuite</strong>. Passe à Pro à tout moment avec un don GitHub Sponsors.
    </p>
  </div>
</body>
</html>`;
}

/**
 * Builds the HTML error page shown when verification fails.
 *
 * Same dark theme as `buildSuccessPage`, but with the error icon. Used for
 * all three failure states (missing / invalid / expired token).
 *
 * @param {string} title - Error title (displayed as `<h1>`).
 * @param {string} message - Error description (1-2 sentences).
 * @returns {string} HTML document as a string.
 */
function buildErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — SoundDeck</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #111113; color: #f0f0f2; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1a1a1e; border: 1px solid #2e2e36; border-radius: 14px; padding: 40px; max-width: 460px; text-align: center; }
    .icon { width: 72px; height: 72px; border-radius: 50%; background: #e05252; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 36px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #a0a0b0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}