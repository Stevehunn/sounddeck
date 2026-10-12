// server/src/lib/email.js

const RESEND_API = 'https://api.resend.com/emails'
const FROM_EMAIL = 'SoundDeck <hello@sounddeck.stream>'

/**
 * Détecte si la clé est un placeholder (dev) ou une vraie clé Resend.
 * Une vraie clé Resend commence par "re_" et fait au moins 30 caractères.
 */
function isPlaceholderApiKey(key) {
  if (!key) return true
  if (key === 're_dummy') return true
  if (key.startsWith('re_dummy')) return true
  // Une vraie clé fait > 30 chars
  if (key.length < 30) return true
  return false
}

/**
 * Envoie le mail de bienvenue avec identifiants + token de licence.
 * ⚠️ En dev (clé placeholder) : log au lieu d'appeler Resend.
 */
export async function sendWelcomeEmail(resendApiKey, { email, password, token, donorName }) {
  const displayName = donorName || 'donateur'

  // ─── MODE DEV : on log au lieu d'appeler Resend ────────────────────
  if (isPlaceholderApiKey(resendApiKey)) {
    console.log('')
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log('║  📧 [DEV] Mail simulé (pas envoyé via Resend)               ║')
    console.log('╠══════════════════════════════════════════════════════════════╣')
    console.log('║  To      :', email.padEnd(48), '║')
    console.log('║  Subject : 🎧 Ton accès Pro à SoundDeck'.padEnd(63), '║')
    console.log('║  Donor   :', (donorName || '(inconnu)').padEnd(48), '║')
    console.log('║  Password:', password.padEnd(48), '║')
    console.log('║  Token   :', token.slice(0, 48).padEnd(48), '║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    console.log('')
    return { dev: true, id: 'dev-simulated', skipped: true }
  }

  // ─── MODE PROD : vrai appel Resend ─────────────────────────────────
  const html = buildWelcomeHtml({ email, password, token, donorName: displayName })

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: '🎧 Ton accès Pro à SoundDeck',
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error (${res.status}): ${err}`)
  }

  return res.json()
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE HTML
// ═══════════════════════════════════════════════════════════════════════

function buildWelcomeHtml({ email, password, token, donorName }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111; background: #f8f8fa;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    <div style="font-size: 32px; margin-bottom: 16px;">🎧</div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Merci ${donorName} !</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      Ton don pour SoundDeck a bien été reçu. Voici tes accès à la version <strong>Pro</strong> — un accès <strong>à vie</strong>, valable sur autant de PC que tu veux.
    </p>

    <div style="background: #f0f0f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; margin-bottom: 8px;">Tes identifiants</div>
      <div style="font-family: monospace; font-size: 13px; margin-bottom: 4px;">
        <strong>Email :</strong> ${email}
      </div>
      <div style="font-family: monospace; font-size: 13px;">
        <strong>Mot de passe :</strong> ${password}
      </div>
    </div>

    <h2 style="font-size: 16px; margin: 0 0 12px;">Comment activer ?</h2>
    <ol style="font-size: 13px; line-height: 1.8; color: #444; padding-left: 20px; margin-bottom: 24px;">
      <li>Ouvre SoundDeck</li>
      <li>Va dans <strong>Options → Soutenir SoundDeck</strong></li>
      <li>Clique sur <strong>"Se connecter"</strong></li>
      <li>Entre ton email et ton mot de passe</li>
      <li>C'est fini — tous les plugins Pro sont débloqués !</li>
    </ol>

    <h2 style="font-size: 16px; margin: 0 0 12px;">Ta clé de licence (à conserver)</h2>
    <p style="font-size: 12px; color: #666; margin-bottom: 8px;">
      Garde cette clé en sécurité (gestionnaire de mots de passe, cloud). Elle te permettra de réactiver ta licence sans Internet sur un autre PC.
    </p>
    <div style="background: #1a1a1e; color: #e0e0e0; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 11px; word-break: break-all; line-height: 1.4;">
      ${token}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

    <p style="font-size: 12px; color: #888; line-height: 1.6;">
      Une question ? Réponds simplement à ce mail.<br>
      Si tu changes de PC, tu pourras te reconnecter avec ces mêmes identifiants.
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Envoie un code de rédemption à un sponsor.
 */
export async function sendRedeemCodeEmail(resendApiKey, {
  email, code, expiresAt, donorName,
}) {
  const displayName = donorName || 'donateur'
  const expiresStr = expiresAt
    ? new Date(expiresAt * 1000).toLocaleDateString('fr-FR')
    : 'Jamais'

  // Mode dev : log au lieu d'appeler Resend
  if (isPlaceholderApiKey(resendApiKey)) {
    console.log('')
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log('║  📧 [DEV] Code de rédemption simulé                          ║')
    console.log('╠══════════════════════════════════════════════════════════════╣')
    console.log('║  To      :', email.padEnd(48), '║')
    console.log('║  Code    :', code.padEnd(48), '║')
    console.log('║  Expire  :', expiresStr.padEnd(48), '║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    return { dev: true, skipped: true }
  }

  const html = buildRedeemCodeHtml({ code, expiresStr, donorName: displayName })

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: '🎧 Ton code d\'activation SoundDeck Pro',
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error (${res.status}): ${err}`)
  }

  return res.json()
}

function buildRedeemCodeHtml({ code, expiresStr, donorName }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111; background: #f8f8fa;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    <div style="font-size: 32px; margin-bottom: 16px;">🎧</div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Merci ${donorName} !</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      Merci pour ton soutien à SoundDeck via GitHub Sponsors. Voici ton code d'activation qui débloque <strong>tous les plugins Pro à vie</strong>.
    </p>

    <div style="background: #1a1a1e; color: white; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 11px; text-transform: uppercase; opacity: 0.6; margin-bottom: 8px;">Ton code d'activation</div>
      <div style="font-family: monospace; font-size: 22px; font-weight: 700; letter-spacing: 2px;">
        ${code}
      </div>
    </div>

    <div style="background: rgba(239,159,39,0.1); border: 1px solid #ef9f27; border-radius: 8px; padding: 12px; margin-bottom: 24px; font-size: 12px; color: #8a5a00;">
      <strong>⚠️ Important :</strong> ce code doit être utilisé avant le <strong>${expiresStr}</strong>. Une fois activé, ton accès Pro reste <strong>à vie</strong>.
    </div>

    <h2 style="font-size: 16px; margin: 0 0 12px;">Comment activer ?</h2>
    <ol style="font-size: 13px; line-height: 1.8; color: #444; padding-left: 20px; margin-bottom: 24px;">
      <li>Ouvre SoundDeck</li>
      <li>Va dans <strong>Options → Soutenir SoundDeck</strong></li>
      <li>Clique sur <strong>"J'ai un code"</strong></li>
      <li>Entre ton email, un mot de passe de ton choix, et ce code</li>
      <li>C'est fini — tous les plugins Pro sont débloqués !</li>
    </ol>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">

    <p style="font-size: 12px; color: #888; line-height: 1.6;">
      Une question ? Réponds simplement à ce mail.<br>
      Garde bien ce code jusqu'à son activation.
    </p>
  </div>
</body>
</html>
  `.trim()
}