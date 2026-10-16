// server/scripts/admin.mjs
// CLI pour gérer les utilisateurs SoundDeck via l'API admin.
//
// Usage :
//   node scripts/admin.mjs list-users
//   node scripts/admin.mjs create-user --email x@y.z --password secret [--tier pro]
//   node scripts/admin.mjs reset-password --email x@y.z --password newsecret
//
// Nécessite ADMIN_TOKEN en variable d'env :
//   export ADMIN_TOKEN=xxx
// Ou dans server/.dev.vars (pour le dev local).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// URL de l'API (par défaut, la prod)
const API_URL = process.env.SOUNDDECK_API_URL || 'https://api.sounddeck.stream'

// ─── Charger ADMIN_TOKEN depuis .dev.vars si pas en env ──────────────
function loadAdminToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN.trim()

  const devVarsPath = path.join(__dirname, '..', '.dev.vars')
  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, 'utf-8')
    const match = content.match(/^ADMIN_TOKEN\s*=\s*"?([^"\n]+)"?/m)
    if (match) return match[1].trim()
  }

  return null
}

const ADMIN_TOKEN = loadAdminToken()

if (!ADMIN_TOKEN) {
  console.error('❌ ADMIN_TOKEN non trouvé')
  console.error('   → Ajoute-le dans server/.dev.vars')
  console.error('   → Ou : export ADMIN_TOKEN=xxx')
  process.exit(1)
}

// ─── Parser les arguments ────────────────────────────────────────────
function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const val = argv[i + 1]
      if (val && !val.startsWith('--')) {
        args[key] = val
        i++
      } else {
        args[key] = true
      }
    } else {
      args._.push(arg)
    }
  }
  return args
}

// ─── Appel API ───────────────────────────────────────────────────────
async function apiCall(method, pathname, body) {
  const url = `${API_URL}${pathname}`
  const headers = {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
    Accept: 'application/json',
  }
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}:`, JSON.stringify(data, null, 2))
    process.exit(1)
  }
  return data
}

// ─── Commandes ───────────────────────────────────────────────────────
async function cmdListUsers() {
  const { users } = await apiCall('GET', '/admin/list-users')
  console.log(`\n👥 ${users.length} utilisateur(s)\n`)
  console.log(
    `${'ID'.padEnd(38)} ${'EMAIL'.padEnd(30)} ${'TIER'.padEnd(6)} CREATED`
  )
  console.log('─'.repeat(100))
  for (const u of users) {
    const created = new Date(u.created_at * 1000).toISOString().slice(0, 19)
    console.log(
      `${u.id.padEnd(38)} ${u.email.padEnd(30)} ${(u.tier || 'pro').padEnd(6)} ${created}`
    )
  }
  console.log()
}

async function cmdCreateUser(args) {
  const { email, password, tier = 'pro' } = args
  if (!email || !password) {
    console.error('❌ Usage : node scripts/admin.mjs create-user --email x@y.z --password secret [--tier pro]')
    process.exit(1)
  }

  console.log(`\n➕ Création de l'utilisateur : ${email}`)
  const result = await apiCall('POST', '/admin/create-user', {
    email,
    password,
    tier,
  })
  console.log('✅ Utilisateur créé :')
  console.log(JSON.stringify(result.user, null, 2))
  console.log()
}

async function cmdResetPassword(args) {
  const { email, password } = args
  if (!email || !password) {
    console.error('❌ Usage : node scripts/admin.mjs reset-password --email x@y.z --password newsecret')
    process.exit(1)
  }

  console.log(`\n🔑 Reset password pour : ${email}`)
  const result = await apiCall('POST', '/admin/reset-password', {
    email,
    newPassword: password,
  })
  console.log('✅ Mot de passe mis à jour')
  console.log()
}

// ─── Main ────────────────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2))
const command = args._[0]

if (!command) {
  console.log(`
🔧 SoundDeck Admin CLI

Commandes :
  list-users                                       Liste tous les utilisateurs
  create-user    --email <e> --password <p> [--tier pro|dev|free]
                                                   Crée un utilisateur
  reset-password --email <e> --password <p>        Change le mot de passe

Exemples :
  node scripts/admin.mjs list-users
  node scripts/admin.mjs create-user --email test@x.com --password secret123
  node scripts/admin.mjs reset-password --email test@x.com --password newsecret
`)
  process.exit(0)
}

switch (command) {
  case 'list-users':
    await cmdListUsers()
    break
  case 'create-user':
    await cmdCreateUser(args)
    break
  case 'reset-password':
    await cmdResetPassword(args)
    break
  default:
    console.error(`❌ Commande inconnue : ${command}`)
    process.exit(1)
}