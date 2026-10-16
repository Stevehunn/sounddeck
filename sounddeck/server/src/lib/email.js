// server/src/lib/email.js

const RESEND_API = "https://api.resend.com/emails";
const FROM_EMAIL = "SoundDeck <hello@sounddeck.stream>";

function isPlaceholderApiKey(key) {
  if (!key) return true;
  if (key === "re_dummy") return true;
  if (key.startsWith("re_dummy")) return true;
  if (key.length < 30) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. WELCOME (don sponsor)
// ═══════════════════════════════════════════════════════════════════════

export async function sendWelcomeEmail(
  resendApiKey,
  { email, password, token, donorName },
) {
  const displayName = donorName || "donateur";

  if (isPlaceholderApiKey(resendApiKey)) {
    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  📧 [DEV] Mail simulé (welcome)                              ║",
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
      subject: "🎧 Ton accès Pro à SoundDeck",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
}

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
      <div style="font-family: monospace; font-size: 13px; margin-bottom: 4px;"><strong>Email :</strong> ${email}</div>
      <div style="font-family: monospace; font-size: 13px;"><strong>Mot de passe :</strong> ${password}</div>
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
    <div style="background: #1a1a1e; color: #e0e0e0; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 11px; word-break: break-all; line-height: 1.4;">
      ${token}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 12px; color: #888; line-height: 1.6;">
      Une question ? Réponds simplement à ce mail.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ═══════════════════════════════════════════════════════════════════════
// 2. CODE DE RÉDEMPTION (sponsor)
// ═══════════════════════════════════════════════════════════════════════

export async function sendRedeemCodeEmail(
  resendApiKey,
  { email, code, expiresAt, donorName },
) {
  const displayName = donorName || "donateur";
  const expiresStr = expiresAt
    ? new Date(expiresAt * 1000).toLocaleDateString("fr-FR")
    : "Jamais";

  if (isPlaceholderApiKey(resendApiKey)) {
    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  📧 [DEV] Code de rédemption simulé                          ║",
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
      subject: "🎧 Ton code d'activation SoundDeck Pro",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
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
      Merci pour ton soutien à SoundDeck. Voici ton code d'activation qui débloque <strong>tous les plugins Pro à vie</strong>.
    </p>

    <div style="background: #1a1a1e; color: white; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 11px; text-transform: uppercase; opacity: 0.6; margin-bottom: 8px;">Ton code d'activation</div>
      <div style="font-family: monospace; font-size: 22px; font-weight: 700; letter-spacing: 2px;">${code}</div>
    </div>

    <div style="background: rgba(239,159,39,0.1); border: 1px solid #ef9f27; border-radius: 8px; padding: 12px; margin-bottom: 24px; font-size: 12px; color: #8a5a00;">
      <strong>⚠️ Important :</strong> ce code doit être utilisé avant le <strong>${expiresStr}</strong>. Une fois activé, ton accès Pro reste <strong>à vie</strong>.
    </div>

    <h2 style="font-size: 16px; margin: 0 0 12px;">Comment activer ?</h2>
    <ol style="font-size: 13px; line-height: 1.8; color: #444; padding-left: 20px;">
      <li>Ouvre SoundDeck</li>
      <li>Va dans <strong>Options → Soutenir SoundDeck</strong></li>
      <li>Clique sur <strong>"J'ai un code"</strong></li>
      <li>Entre ton email, un mot de passe de ton choix, et ce code</li>
      <li>C'est fini !</li>
    </ol>
  </div>
</body>
</html>
  `.trim();
}

// ═══════════════════════════════════════════════════════════════════════
// 3. VÉRIFICATION EMAIL (nouveau)
// ═══════════════════════════════════════════════════════════════════════

export async function sendVerifyEmail(resendApiKey, { email, verifyUrl }) {
  if (isPlaceholderApiKey(resendApiKey)) {
    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  📧 [DEV] Vérification email simulée                         ║",
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
      subject: "✅ Vérifie ton adresse email — SoundDeck",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
}

function buildVerifyEmailHtml({ email, verifyUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111; background: #f8f8fa;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    <div style="font-size: 32px; margin-bottom: 16px;">🎧</div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Bienvenue sur SoundDeck !</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      Merci de t'être inscrit. Clique sur le bouton ci-dessous pour vérifier ton adresse email et activer ton compte.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background: #7c6ff7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        Vérifier mon email
      </a>
    </div>

    <div style="background: #f0f0f5; border-radius: 8px; padding: 12px; font-size: 11px; color: #666; word-break: break-all; margin-bottom: 24px;">
      <strong>Ou copie ce lien :</strong><br>
      ${verifyUrl}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 12px; color: #888; line-height: 1.6;">
      Ce lien est valable <strong>24 heures</strong>. Si tu n'as pas créé de compte, ignore simplement ce mail.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ═══════════════════════════════════════════════════════════════════════
// 4. RESET PASSWORD (nouveau)
// ═══════════════════════════════════════════════════════════════════════

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
      "║  📧 [DEV] Reset password simulé                              ║",
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
      subject: "🔑 Réinitialise ton mot de passe — SoundDeck",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }

  return res.json();
}

function buildPasswordResetHtml({ email, resetUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111; background: #f8f8fa;">
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
    <div style="font-size: 32px; margin-bottom: 16px;">🔑</div>
    <h1 style="font-size: 22px; margin: 0 0 8px;">Réinitialisation du mot de passe</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      Tu as demandé à réinitialiser ton mot de passe SoundDeck. Clique sur le bouton ci-dessous pour en choisir un nouveau.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #7c6ff7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        Choisir un nouveau mot de passe
      </a>
    </div>

    <div style="background: #f0f0f5; border-radius: 8px; padding: 12px; font-size: 11px; color: #666; word-break: break-all; margin-bottom: 24px;">
      <strong>Ou copie ce lien :</strong><br>
      ${resetUrl}
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
    <p style="font-size: 12px; color: #888; line-height: 1.6;">
      Ce lien est valable <strong>1 heure</strong>. Si tu n'es pas à l'origine de cette demande, ignore ce mail — ton mot de passe reste inchangé.
    </p>
  </div>
</body>
</html>
  `.trim();
}
