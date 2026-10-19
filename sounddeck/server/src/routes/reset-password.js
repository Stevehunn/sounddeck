/**
 * @file Reset-password route (GET + POST).
 *
 * Flow:
 * 1. GET  /reset-password?token=X → renders an HTML form where the user
 *    enters a new password.
 * 2. POST /reset-password         → validates the token, updates the
 *    password hash, marks the token as used, returns 200 OK.
 *
 * The page is served entirely by the worker (no React), so it works even
 * without the app being installed.
 *
 * Token validity:
 * - Single-use: `used_at` is set after a successful reset.
 * - Expires after 1 hour (checked against `expires_at`).
 */

import { hashPassword } from "../lib/crypto.js";
import {
  getPasswordReset,
  markPasswordResetUsed,
  getUserByEmail,
  updateUserPassword,
  logAudit,
} from "../lib/db.js";

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

// ═══════════════════════════════════════════════════════════════════════════
// POST /reset-password
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handles `POST /reset-password` (submit new password).
 *
 * Request body: `{ token: string, newPassword: string }`
 *
 * Validation:
 * - `newPassword` length must be between 6 and 100 chars.
 * - Token must exist, not be already used, and not be expired.
 *
 * On success:
 * - Password hash + salt are updated.
 * - The token is marked as used (single-use).
 * - An audit log entry `password_reset_success` is recorded.
 *
 * @param {Request} request
 * @param {Object} env
 * @param {string} env.DB
 * @returns {Promise<Response>}
 */
export async function handleResetPasswordSubmit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const token = String(body.token || "").trim();
  const newPassword = String(body.newPassword || "");

  if (!token || !newPassword) {
    return jsonResponse({ error: "missing_fields" }, 400);
  }
  if (newPassword.length < 6) {
    return jsonResponse(
      { error: "password_too_short", message: "Min 6 characters" },
      400,
    );
  }
  if (newPassword.length > 100) {
    return jsonResponse({ error: "password_too_long" }, 400);
  }

  const reset = await getPasswordReset(env.DB, token);
  if (!reset) {
    return jsonResponse({ error: "invalid_token" }, 400);
  }
  if (reset.used_at) {
    return jsonResponse({ error: "token_already_used" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  if (reset.expires_at < now) {
    return jsonResponse({ error: "token_expired" }, 400);
  }

  const user = await getUserByEmail(env.DB, reset.email);
  if (!user) {
    return jsonResponse({ error: "user_not_found" }, 404);
  }

  // Hash and persist the new password
  const { hash, salt } = await hashPassword(newPassword);
  await updateUserPassword(env.DB, user.id, hash, salt);

  // Burn the token (single-use)
  await markPasswordResetUsed(env.DB, token);

  await logAudit(env.DB, {
    event: "password_reset_success",
    email: user.email,
    donorId: user.donor_id,
    ip: request.headers.get("CF-Connecting-IP"),
    userAgent: request.headers.get("User-Agent"),
  });

  return jsonResponse({
    ok: true,
    message: "Password reset. You can now log in.",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /reset-password?token=X
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handles `GET /reset-password?token=X` — renders the HTML reset form.
 *
 * Invalid tokens, already-used tokens, and expired tokens all render a
 * dedicated error page.
 *
 * @param {Request} request
 * @param {Object} env
 * @param {string} env.DB
 * @returns {Promise<Response>}
 */
export async function handleResetPasswordPage(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return htmlResponse(
      buildErrorPage("Invalid link", "No token was provided."),
      400,
    );
  }

  const reset = await getPasswordReset(env.DB, token);
  if (!reset) {
    return htmlResponse(
      buildErrorPage(
        "Invalid link",
        "This link does not exist or has already been used.",
      ),
      400,
    );
  }
  if (reset.used_at) {
    return htmlResponse(
      buildErrorPage(
        "Link already used",
        "This link has already reset a password. Request a new one.",
      ),
      400,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (reset.expires_at < now) {
    return htmlResponse(
      buildErrorPage(
        "Link expired",
        "This link is valid for 1 hour. Request a new one from the app.",
      ),
      400,
    );
  }

  return htmlResponse(buildResetFormPage(token, reset.email));
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML templates
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shared CSS for the reset-password pages (form + error). Kept inline so the
 * page works with zero external requests (fast, no CORS, no fonts).
 */
const SHARED_STYLE = `
  body { font-family: system-ui, -apple-system, sans-serif; background: #111113; color: #f0f0f2; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .card { background: #1a1a1e; border: 1px solid #2e2e36; border-radius: 14px; padding: 40px; max-width: 460px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  .icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px; }
  .icon.ok { background: #1d9e75; }
  .icon.err { background: #e05252; }
  .icon.brand { background: #7c6ff7; }
  h1 { font-size: 22px; margin: 0 0 12px; text-align: center; }
  p { color: #a0a0b0; line-height: 1.6; margin: 0 0 16px; text-align: center; font-size: 14px; }
  .email { font-family: monospace; color: #7c6ff7; }
  label { display: block; font-size: 12px; color: #a0a0b0; margin-bottom: 6px; margin-top: 16px; }
  input[type="password"] { width: 100%; box-sizing: border-box; background: #222228; border: 1px solid #2e2e36; color: #f0f0f2; border-radius: 10px; padding: 12px 14px; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s; }
  input[type="password"]:focus { border-color: #7c6ff7; box-shadow: 0 0 0 3px rgba(124,111,247,0.15); }
  button { width: 100%; margin-top: 24px; background: #7c6ff7; color: white; border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.15s; }
  button:hover:not(:disabled) { background: #9b96ff; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .msg { margin-top: 16px; padding: 12px 14px; border-radius: 8px; font-size: 13px; display: none; }
  .msg.show { display: block; }
  .msg.error { background: rgba(224,82,82,0.1); border: 1px solid #e05252; color: #e05252; }
  .msg.success { background: rgba(29,158,117,0.1); border: 1px solid #1d9e75; color: #1d9e75; }
  .hint { font-size: 12px; color: #606070; margin-top: 8px; text-align: center; }
`;

/**
 * Builds the HTML reset form page.
 *
 * Includes an inline script that POSTs to `/reset-password` and swaps the
 * page for a success card on 200. Errors are shown in a message box below
 * the form (no page reload).
 *
 * @param {string} token - The reset token (already validated).
 * @param {string} email - User's email (displayed for context).
 * @returns {string} HTML string.
 */
function buildResetFormPage(token, email) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nouveau mot de passe — SoundDeck</title>
  <style>${SHARED_STYLE}</style>
</head>
<body>
  <div class="card">
    <div class="icon brand">🔑</div>
    <h1>Nouveau mot de passe</h1>
    <p>Pour <span class="email">${email}</span></p>

    <form id="reset-form" autocomplete="on">
      <label for="password">Nouveau mot de passe</label>
      <input
        type="password"
        id="password"
        name="password"
        placeholder="Min 6 caractères"
        minlength="6"
        maxlength="100"
        required
        autocomplete="new-password"
      />

      <label for="confirm">Confirmer le mot de passe</label>
      <input
        type="password"
        id="confirm"
        name="confirm"
        placeholder="Retape ton mot de passe"
        minlength="6"
        maxlength="100"
        required
        autocomplete="new-password"
      />

      <div class="msg" id="msg"></div>

      <button type="submit" id="submit-btn">Réinitialiser mon mot de passe</button>
    </form>

    <div class="hint">Le lien est valable 1 heure.</div>
  </div>

  <script>
    const form = document.getElementById('reset-form')
    const msg = document.getElementById('msg')
    const submitBtn = document.getElementById('submit-btn')
    const passwordInput = document.getElementById('password')
    const confirmInput = document.getElementById('confirm')
    const token = ${JSON.stringify(token)}

    function showMsg(text, type) {
      msg.textContent = text
      msg.className = 'msg show ' + type
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      msg.className = 'msg'

      const password = passwordInput.value
      const confirm = confirmInput.value

      if (password.length < 6) {
        return showMsg('Le mot de passe doit faire au moins 6 caractères.', 'error')
      }
      if (password !== confirm) {
        return showMsg('Les deux mots de passe ne correspondent pas.', 'error')
      }

      submitBtn.disabled = true
      submitBtn.textContent = 'Réinitialisation...'

      try {
        const res = await fetch('/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          const map = {
            invalid_token: 'Lien invalide.',
            token_already_used: 'Ce lien a déjà été utilisé.',
            token_expired: 'Lien expiré. Fais une nouvelle demande.',
            password_too_short: 'Le mot de passe est trop court.',
            user_not_found: 'Utilisateur introuvable.',
          }
          return showMsg(map[data.error] || 'Une erreur est survenue.', 'error')
        }

        // Success → replace the page
        document.body.innerHTML = \`
          <div class="card">
            <div class="icon ok">✅</div>
            <h1>Mot de passe réinitialisé !</h1>
            <p>Tu peux maintenant te connecter dans l'application avec ton nouveau mot de passe.</p>
            <p class="hint" style="margin-top: 24px;">Tu peux fermer cette fenêtre.</p>
          </div>
        \`
      } catch (err) {
        showMsg('Erreur réseau. Vérifie ta connexion.', 'error')
      } finally {
        submitBtn.disabled = false
        submitBtn.textContent = 'Réinitialiser mon mot de passe'
      }
    })
  </script>
</body>
</html>`;
}

/**
 * Builds the HTML error page for invalid / expired / already-used tokens.
 *
 * @param {string} title - Short error title.
 * @param {string} message - Error description.
 * @returns {string} HTML string.
 */
function buildErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — SoundDeck</title>
  <style>${SHARED_STYLE}</style>
</head>
<body>
  <div class="card">
    <div class="icon err">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
