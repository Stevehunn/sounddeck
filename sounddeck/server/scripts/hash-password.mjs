// server/scripts/hash-password.mjs
// Usage :
//   node scripts/hash-password.mjs "MonPassword" test@example.com
//   node scripts/hash-password.mjs "MonPassword" test@example.com --out scripts/.tmp-user.sql
import { hashPassword } from '../src/lib/crypto.js'
import fs from 'node:fs'
import path from 'node:path'
import { PBKDF2_ITERATIONS_FOR_DISPLAY } from '../src/lib/crypto.js'


// ─── Parse args ────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const password = args[0]
const email = (args[1] || 'test@example.com').toLowerCase().trim()

let outFile = null
const outIdx = args.indexOf('--out')
if (outIdx !== -1 && args[outIdx + 1]) {
  outFile = args[outIdx + 1]
}

if (!password) {
  console.error('Usage : node scripts/hash-password.mjs "MonPassword" [email] [--out <file>]')
  process.exit(1)
}

// ─── Node 20+ : crypto.subtle natif ────────────────────────────────────
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto')
  globalThis.crypto = webcrypto
}

// ─── Génère hash + SQL ─────────────────────────────────────────────────
const { hash, salt } = await hashPassword(password)
const now = Math.floor(Date.now() / 1000)
const userId = crypto.randomUUID()
const donorId = crypto.randomUUID()

const sql = `-- User de test généré par hash-password.mjs le ${new Date().toISOString()}
-- Email    : ${email}
-- Password : (celui que tu as passé en argument)

INSERT INTO users
  (id, email, password_hash, password_salt, donor_id, donor_name, tier, created_at, updated_at)
VALUES
  ('${userId}', '${email}', '${hash}', '${salt}', '${donorId}', 'Test Donateur', 'pro', ${now}, ${now});
`

// ─── Écriture fichier si --out ─────────────────────────────────────────
if (outFile) {
  const absPath = path.resolve(outFile)
  fs.writeFileSync(absPath, sql, 'utf-8')
  console.error('✅ Hash généré')
  console.error('   Email :', email)
  console.error('   Hash  :', hash.slice(0, 32) + '…')
  console.error('   SQL écrit dans :', absPath)
  console.error('   Taille         :', fs.statSync(absPath).size, 'octets')
  console.error('')
  console.error('➡️  Prochaine étape :')
  console.error(`   npx wrangler d1 execute sounddeck-db --local --file=${outFile}`)
} else {
  // Fallback : affichage terminal
  console.error('')
  console.error('✅ Hash généré')
  console.error('   Email :', email)
  console.error('   Hash  :', hash.slice(0, 32) + '…')
  console.error('   Salt  :', salt.slice(0, 32) + '…')
  console.error('')
  console.error('⚠️  Pas de --out : le SQL ne sera PAS écrit dans un fichier')
  console.error('   Utilise --out <file> pour l\'écrire proprement')
  console.error('')
  process.stdout.write(sql)
}