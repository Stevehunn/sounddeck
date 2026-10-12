// scripts/generate-keypair.mjs
// ⚠️ À LANCER UNE SEULE FOIS. La clé privée ne doit JAMAIS être commitée.
import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import fs from 'fs'
import path from 'path'
import os from 'os'

// @noble/ed25519 v2 nécessite de fournir sha512 explicitement
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))

const KEYS_DIR = path.join(os.homedir(), '.sounddeck', 'keys')
const PRIVATE_PATH = path.join(KEYS_DIR, 'private.key')
const PUBLIC_PATH = path.join(KEYS_DIR, 'public.key')

function toHex(bytes) {
  return Buffer.from(bytes).toString('hex')
}

async function main() {
  if (fs.existsSync(PRIVATE_PATH)) {
    console.error('❌ Une clé privée existe déjà :', PRIVATE_PATH)
    console.error('   Supprime-la manuellement si tu veux vraiment en regénérer une.')
    console.error('   ⚠️  Regénérer = toutes les licences existantes deviennent invalides.')
    process.exit(1)
  }

  console.log('🔑 Génération de la paire de clés Ed25519...\n')

  const privateKey = ed.utils.randomPrivateKey()
  const publicKey = await ed.getPublicKeyAsync(privateKey)

  fs.mkdirSync(KEYS_DIR, { recursive: true })
  fs.writeFileSync(PRIVATE_PATH, toHex(privateKey), { mode: 0o600 })
  fs.writeFileSync(PUBLIC_PATH, toHex(publicKey), { mode: 0o644 })

  console.log('✅ Paire générée !\n')
  console.log('📁 Dossier :', KEYS_DIR)
  console.log('🔒 Clé privée (NE JAMAIS PARTAGER) :', PRIVATE_PATH)
  console.log('🔓 Clé publique (à coller dans le code) :\n')
  console.log('─'.repeat(72))
  console.log(toHex(publicKey))
  console.log('─'.repeat(72))
  console.log('\n➡️  Copie cette clé publique dans :')
  console.log('   src/core/plugins/PluginManager/licenseKeys.js\n')
}

main().catch((e) => {
  console.error('❌ Erreur:', e.message)
  process.exit(1)
})