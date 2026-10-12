// server/scripts/code.mjs
// Usage :
//   node scripts/code.mjs generate --email sponsor@x.com --expires 30d --note "Sponsor"
//   node scripts/code.mjs list [--only-unused]
//   node scripts/code.mjs revoke SDCK-XXXX-XXXX-XXXX
//   node scripts/code.mjs --help
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Charge .dev.vars (dev) ou variables d'env (prod) ─────────────────
function loadDevVars() {
  const file = path.join(ROOT, '.dev.vars')
  if (!fs.existsSync(file)) return {}
  const content = fs.readFileSync(file, 'utf-8')
  const vars = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const k = trimmed.slice(0, idx).trim()
    const v = trimmed.slice(idx + 1).trim()
    vars[k] = v
  }
  return vars
}

const devVars = loadDevVars()
const isProd = process.argv.includes('--prod') || process.env.SOUNDDECK_PROD === '1'

const API_URL = isProd
  ? (process.env.SOUNDDECK_API_URL || 'https://sounddeck-api.sounddeck.workers.dev')
  : 'http://127.0.0.1:8787'

const ADMIN_TOKEN = isProd
  ? (process.env.SOUNDDECK_ADMIN_TOKEN || devVars.ADMIN_TOKEN)
  : devVars.ADMIN_TOKEN

if (!ADMIN_TOKEN) {
  console.error('❌ ADMIN_TOKEN introuvable.')
  console.error('   Ajoute-le dans server/.dev.vars ou exporte SOUNDDECK_ADMIN_TOKEN')
  process.exit(1)
}

// ─── Parse args ───────────────────────────────────────────────────────
const [,, cmd, ...rest] = process.argv

function parseArgs(arr) {
  const out = { _: [] }
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const v = arr[i + 1]
      if (v && !v.startsWith('--')) { out[k] = v; i++ }
      else { out[k] = true }
    } else {
      out._.push(a)
    }
  }
  return out
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      ...(opts.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${data.error || JSON.stringify(data)}`)
  }
  return data
}

// ─── Commandes ────────────────────────────────────────────────────────
async function cmdGenerate() {
  const args = parseArgs(rest)
  const email = args.email || null
  const expires = args.expires || '30d'
  const note = args.note || null
  const tier = args.tier || 'pro'
  const noEmail = args['no-email'] === true

  if (!email) {
    console.error('❌ --email requis (ou passe --email-any si tu veux accepter n\'importe qui)')
    process.exit(1)
  }

  console.error(`📡 URL : ${API_URL}${isProd ? ' (PROD)' : ' (DEV)'}`)
  console.error(`👤 Email : ${email}`)
  console.error(`⏱️  Expire : ${expires}`)
  console.error('')

  try {
    const data = await api('/admin/generate-code', {
      method: 'POST',
      body: JSON.stringify({
        email,
        expiresIn: expires,
        note,
        tier,
        sendEmail: !noEmail,
      }),
    })

    console.log('')
    console.log('✅ Code généré !')
    console.log('')
    console.log(`   Code    : ${data.code}`)
    console.log(`   Email   : ${data.email}`)
    console.log(`   Tier    : ${data.tier}`)
    console.log(`   Expire  : ${data.expiresAt ? new Date(data.expiresAt * 1000).toLocaleDateString('fr-FR') : 'jamais'}`)
    console.log(`   Note    : ${data.note || '(aucune)'}`)
    console.log('')

    if (data.emailSent) {
      console.log(`   📧 Email envoyé à ${data.email} via Resend ✅`)
    } else if (data.emailError) {
      console.log(`   ⚠️  Échec envoi email : ${data.emailError}`)
      console.log(`   👉 Envoie le code manuellement à ${data.email}`)
    } else {
      console.log(`   ℹ️  Aucun email envoyé (--no-email)`)
    }
    console.log('')
  } catch (e) {
    console.error(`❌ Erreur : ${e.message}`)
    process.exit(1)
  }
}

async function cmdList() {
  const args = parseArgs(rest)
  const onlyUnused = args['only-unused'] === true

  try {
    const data = await api(`/admin/list-codes?onlyUnused=${onlyUnused ? 1 : 0}&limit=200`)

    if (!data.codes || data.codes.length === 0) {
      console.log('Aucun code trouvé.')
      return
    }

    console.log('')
    console.log(
      'Code'.padEnd(22) +
      'Note'.padEnd(28) +
      'Expire'.padEnd(13) +
      'Utilisé'.padEnd(10) +
      'Email'
    )
    console.log('─'.repeat(100))

    for (const c of data.codes) {
      const expires = c.expires_at
        ? new Date(c.expires_at * 1000).toLocaleDateString('fr-FR')
        : 'jamais'
      const used = c.used_at ? '✅' : (c.revoked ? '🚫' : '—')
      const note = (c.note || '').slice(0, 26)
      const email = c.used_by_email || c.email_hint || '—'
      console.log(
        c.code.padEnd(22) +
        note.padEnd(28) +
        expires.padEnd(13) +
        used.padEnd(10) +
        email
      )
    }
    console.log('')
    console.log(`Total : ${data.codes.length} code(s)`)
    console.log('')
  } catch (e) {
    console.error(`❌ Erreur : ${e.message}`)
    process.exit(1)
  }
}

async function cmdRevoke() {
  const code = rest[0]
  if (!code) {
    console.error('Usage : node scripts/code.mjs revoke SDCK-XXXX-XXXX-XXXX')
    process.exit(1)
  }

  try {
    const data = await api('/admin/revoke-code', {
      method: 'POST',
      body: JSON.stringify({ code, reason: 'Manual revoke via CLI' }),
    })
    console.log(`✅ Code ${data.code} révoqué`)
  } catch (e) {
    console.error(`❌ Erreur : ${e.message}`)
    process.exit(1)
  }
}

function cmdHelp() {
  console.log(`
Usage :
  node scripts/code.mjs generate --email <email> [options]
  node scripts/code.mjs list [--only-unused]
  node scripts/code.mjs revoke <code>

Options generate :
  --email <email>       Email du sponsor (obligatoire)
  --expires <durée>     Durée de validité (1h, 1d, 7d, 30d, 1y, never) [défaut: 30d]
  --note <texte>        Ta note perso
  --tier <pro>          Niveau de licence [défaut: pro]
  --no-email            Ne pas envoyer le mail automatiquement

Global :
  --prod                Cibler le worker en prod (défaut: local)
  --help                Afficher cette aide

Exemples :
  node scripts/code.mjs generate --email steve@x.com --expires 30d --note "Sponsor GitHub"
  node scripts/code.mjs generate --email steve@x.com --expires never
  node scripts/code.mjs list --only-unused
  node scripts/code.mjs revoke SDCK-A3F7-K9M2-P4X8
`)
}

// ─── Dispatch ─────────────────────────────────────────────────────────
const dispatch = {
  generate: cmdGenerate,
  list: cmdList,
  revoke: cmdRevoke,
  help: cmdHelp,
}

if (!cmd || cmd === '--help' || cmd === '-h') {
  cmdHelp()
  process.exit(0)
}

if (!dispatch[cmd]) {
  console.error(`❌ Commande inconnue : "${cmd}"`)
  cmdHelp()
  process.exit(1)
}

await dispatch[cmd]()