// server/scripts/seed.mjs
// Génère un fichier SQL complet avec plusieurs users de test.
// Usage : node scripts/seed.mjs
import { hashPassword } from '../src/lib/crypto.js'
import fs from 'node:fs'
import path from 'node:path'

if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto')
  globalThis.crypto = webcrypto
}

const users = [
  { email: 'test@example.com', password: 'MonPassword123' },
  { email: 'prod-test@example.com', password: 'ProdPass123' },
]

const lines = [
  '-- Seed généré par scripts/seed.mjs',
  `-- Date : ${new Date().toISOString()}`,
  '',
]

for (const u of users) {
  const { hash, salt } = await hashPassword(u.password)
  const now = Math.floor(Date.now() / 1000)
  const userId = crypto.randomUUID()
  const donorId = crypto.randomUUID()

  lines.push(`INSERT OR REPLACE INTO users (id, email, password_hash, password_salt, donor_id, donor_name, tier, created_at, updated_at)`)
  lines.push(`VALUES ('${userId}', '${u.email}', '${hash}', '${salt}', '${donorId}', 'Test ${u.email.split('@')[0]}', 'pro', ${now}, ${now});`)
  lines.push('')
}

const out = path.resolve('scripts/.tmp-seed.sql')
fs.writeFileSync(out, lines.join('\n'), 'utf-8')

console.error(`✅ Seed généré : ${out}`)
console.error(`   ${users.length} users`)
console.error('')
console.error('➡️  Pour appliquer :')
console.error('   npm run db:seed:local')
console.error('   npm run db:seed:remote')