/**
 * @file Transactional email module (Resend).
 *
 * Provides four email types:
 * - Welcome email (sponsor after donation) — includes credentials + license token
 * - Redeem code email (sponsor) — includes the 14-char code
 * - Verification email (signup) — includes the verify-email link
 * - Password reset email (forgot password) — includes the reset link
 *
 * All HTML templates are inline (no template engine). Base styling uses a
 * dark theme consistent with the app.
 *
 * In development (placeholder API key), emails are NOT sent — instead a
 * boxed summary is logged to the console. This is intentional so that devs
 * can test signup/verify/reset flows without spamming real inboxes.
 *
 * @see https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_API = "https://api.resend.com/emails";
const FROM_EMAIL = "SoundDeck <hello@sounddeck.stream>";

/**
 * Returns `true` if the given API key is a placeholder or too short to be
 * a real Resend key. Real keys start with `re_` and are at least 30 chars.
 *
 * Used to short-circuit email sending in dev environments.
 *
 * @param {string | undefined} key
 * @returns {boolean}
 */
function isPlaceholderApiKey(key) {
  if (!key) return true;
  if (key === "re_dummy") return true;
  if (key.startsWith("re_dummy")) return true;
  if (key.length < 30) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Welcome email (sponsor → account created)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends a welcome email containing the user's credentials + license token.
 *
 * In dev mode (placeholder key), logs a summary instead of calling Resend.
 *
 * @param {string} resendApiKey - Resend API key (or placeholder in dev).
 * @param {Object} params
 * @param {string} params.email - Recipient email.
 * @param {string} params.password - Plaintext password to include (for the user).
 * @param {string} params.token - Signed Ed25519 license token (`SDCK1.xxx.yyy`).
 * @param {string} [params.donorName] - Donor display name (fallback: "donateur").
 * @returns {Promise<Object>} - Resend API response (or `{dev:true}` in dev).
 * @throws {Error} If Resend returns a non-OK status.
 */
export async function sendWelcomeEmail(
  resendApiKey,
  { email, password, token, donorName },
) {
  const displayName = donorName || "donateur";

  // Dev mode: log and skip
  if (isPlaceholderApiKey(resendApiKey)) {
    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  📧 [DEV] Welcome email simulated                            ║",
    );
    console.log("║  To      :", email.padEnd(48), "║");
    console.log("║  Password:", password.padEnd(48), "║");
    console.log(
      "╚══════════════════════════════════════════════════════════════╝",
    );
    return { dev: true, skipped: true };
  }

  const html = buildWelcomeHtml({
    email,
    password,
    token,
    donorName: displayName,
  });

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: "🎧 Your Pro access to SoundDeck",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Builds the HTML body for the welcome email.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.token
 * @param {string} params.donorName
 * @returns {string} - HTML string.
 */
function buildWelcomeHtml({ email, password, token, donorName }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111; background: #f8f8fa;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    <div style="font-size: 32px; margin-bottom: 16px;">🎧</div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Thanks ${donorName}!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      Your donation to SoundDeck has been received. Here are your <strong>Pro</strong> credentials — valid <strong>forever</strong>, on as many PCs as you want.
    </p>

    <div style="background: #f0f0f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; margin-bottom: 8px;">Your credentials</div>
      <div style="font-family: monospace; font-size: 13px; margin-bottom: 4px;"><strong>Email:</strong> ${email}</div>
      <div style="font-family: monospace; font-size: 13px;"><strong>Password:</strong> ${password}</div>
    </div>

    <h2 style="font-size: 16px; margin: 0 0 12px;">How to activate?</h2>
    <ol style="font-size: 13px; line-height: 1.8; color: #444; padding-left: 20px; margin-bottom: 24px;">
      <li>Open SoundDeck</li>
      <li>Go to <strong>Options → Support SoundDeck</strong></li>
      <li>Click <strong>"Sign in"</strong></li>
      <li>Enter your email and password</li>
      <li>Done — all Pro plugins are unlocked!</li>
    </ol>

    <h2 style="font-size: 16px; margin: 0 0 12px;">Your license key (keep it safe)</h2>
    <div style="background: #1a1a1e; color: #e0e0e0; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 11px; word-break: break-all; line-height: 1.4;">
      ${token}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 12px; color: #888; line-height: 1.6;">
      Any question? Just reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Redeem code email (sponsor without email on GitHub)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends a redeem code email (14-char `SDCK-XXXX-XXXX-XXXX`).
 *
 * In dev mode (placeholder key), logs a summary instead of calling Resend.
 *
 * @param {string} resendApiKey
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.code - The redeem code.
 * @param {number | null} params.expiresAt - Unix timestamp (seconds) or null.
 * @param {string} [params.donorName]
 * @returns {Promise<Object>}
 * @throws {Error} If Resend returns a non-OK status.
 */
export async function sendRedeemCodeEmail(
  resendApiKey,
  { email, code, expiresAt, donorName },
) {
  const displayName = donorName || "donateur";
  const expiresStr = expiresAt
    ? new Date(expiresAt * 1000).toLocaleDateString("en-US")
    : "Never";

  if (isPlaceholderApiKey(resendApiKey)) {
    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  📧 [DEV] Redeem code email simulated                        ║",
    );
    console.log("║  To      :", email.padEnd(48), "║");
    console.log("║  Code    :", code.padEnd(48), "║");
    console.log(
      "╚══════════════════════════════════════════════════════════════╝",
    );
    return { dev: true, skipped: true };
  }

  const html = buildRedeemCodeHtml({
    code,
    expiresStr,
    donorName: displayName,
  });

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: "🎧 Your SoundDeck Pro activation code",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Builds the HTML body for the redeem code email.
 *
 * @param {Object} params
 * @param {string} params.code
 * @param {string} params.expiresStr
 * @param {string} params.donorName
 * @returns {string}
 */
function buildRedeemCodeHtml({ code, expiresStr, donorName }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111; background: #f8f8fa;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    <div style="font-size: 32px; margin-bottom: 16px;">🎧</div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Thanks ${donorName}!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      Thank you for supporting SoundDeck on GitHub Sponsors. Here is your activation code that unlocks <strong>all Pro plugins forever</strong>.
    </p>

    <div style="background: #1a1a1e; color: white; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 11px; text-transform: uppercase; opacity: 0.6; margin-bottom: 8px;">Your activation code</div>
      <div style="font-family: monospace; font-size: 22px; font-weight: 700; letter-spacing: 2px;">${code}</div>
    </div>

    <div style="background: rgba(239,159,39,0.1); border: 1px solid #ef9f27; border-radius: 8px; padding: 12px; margin-bottom: 24px; font-size: 12px; color: #8a5a00;">
      <strong>⚠️ Important:</strong> this code must be used before <strong>${expiresStr}</strong>. Once activated, Pro access is <strong>lifetime</strong>.
    </div>

    <h2 style="font-size: 16px; margin: 0 0 12px;">How to activate?</h2>
    <ol style="font-size: 13px; line-height: 1.8; color: #444; padding-left: 20px;">
      <li>Open SoundDeck</li>
      <li>Go to <strong>Options → Support SoundDeck</strong></li>
      <li>Click <strong>"I have a code"</strong></li>
      <li>Enter your email, a password of your choice, and this code</li>
      <li>Done!</li>
    </ol>
  </div>
</body>
</html>
  `.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Email verification (signup)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends an email verification email (contains the `/verify-email?token=...` link).
 *
 * In dev mode (placeholder key), logs the verification URL instead.
 *
 * @param {string} resendApiKey
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.verifyUrl - Full URL including the token.
 * @returns {Promise<Object>}
 * @throws {Error} If Resend returns a non-OK status.
 */
export async function sendVerifyEmail(resendApiKey, { email, verifyUrl }) {
  if (isPlaceholderApiKey(resendApiKey)) {
    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  📧 [DEV] Verification email simulated                       ║",
    );
    console.log("║  To   :", email.padEnd(52), "║");
    console.log("║  URL  :", verifyUrl.slice(0, 52).padEnd(52), "║");
    console.log(
      "╚══════════════════════════════════════════════════════════════╝",
    );
    return { dev: true, skipped: true };
  }

  const html = buildVerifyEmailHtml({ email, verifyUrl });

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: "✅ Verify your email address — SoundDeck",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Builds the HTML body for the verification email.
 *
 * Note: `email` isn't displayed in the body — it's the recipient's address,
 * already known by their email client. Kept out of the signature to avoid
 * an unused-arg warning.
 *
 * @param {Object} params
 * @param {string} params.verifyUrl
 * @returns {string}
 */
function buildVerifyEmailHtml({ verifyUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111; background: #f8f8fa;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    <div style="font-size: 32px; margin-bottom: 16px;">🎧</div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Welcome to SoundDeck!</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      Thanks for signing up. Click the button below to verify your email address and activate your account.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background: #7c6ff7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        Verify my email
      </a>
    </div>

    <div style="background: #f0f0f5; border-radius: 8px; padding: 12px; font-size: 11px; color: #666; word-break: break-all; margin-bottom: 24px;">
      <strong>Or copy this link:</strong><br>
      ${verifyUrl}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 12px; color: #888; line-height: 1.6;">
      This link is valid for <strong>24 hours</strong>. If you did not create an account, just ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Password reset
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends a password reset email (contains the `/reset-password?token=...` link).
 *
 * In dev mode (placeholder key), logs the reset URL instead.
 *
 * @param {string} resendApiKey
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.resetUrl - Full URL including the token.
 * @returns {Promise<Object>}
 * @throws {Error} If Resend returns a non-OK status.
 */
export async function sendPasswordResetEmail(
  resendApiKey,
  { email, resetUrl },
) {
  if (isPlaceholderApiKey(resendApiKey)) {
    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  📧 [DEV] Password reset email simulated                     ║",
    );
    console.log("║  To   :", email.padEnd(52), "║");
    console.log("║  URL  :", resetUrl.slice(0, 52).padEnd(52), "║");
    console.log(
      "╚══════════════════════════════════════════════════════════════╝",
    );
    return { dev: true, skipped: true };
  }

  const html = buildPasswordResetHtml({ email, resetUrl });

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: "🔑 Reset your password — SoundDeck",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Builds the HTML body for the password reset email.
 *
 * Note: `email` isn't displayed in the body (see `buildVerifyEmailHtml`
 * for the rationale).
 *
 * @param {Object} params
 * @param {string} params.resetUrl
 * @returns {string}
 */
function buildPasswordResetHtml({ resetUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111; background: #f8f8fa;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    <div style="font-size: 32px; margin-bottom: 16px;">🔑</div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Password reset</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      You requested a password reset for your SoundDeck account. Click the button below to choose a new password.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #7c6ff7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        Choose a new password
      </a>
    </div>

    <div style="background: #f0f0f5; border-radius: 8px; padding: 12px; font-size: 11px; color: #666; word-break: break-all; margin-bottom: 24px;">
      <strong>Or copy this link:</strong><br>
      ${resetUrl}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 12px; color: #888; line-height: 1.6;">
      This link is valid for <strong>1 hour</strong>. If you did not request this, ignore this email — your password stays unchanged.
    </p>
  </div>
</body>
</html>
  `.trim();
}
