// scripts/verify-license.mjs
// Usage : node scripts/verify-license.mjs "SDCK1.xxx.yyy"
//         node scripts/verify-license.mjs --last      (lit ~/.sounddeck/last-license.txt)
//         node scripts/verify-license.mjs --file <path>
import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import fs from 'fs'
import path from 'path'
import os from 'os'

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))

const PUBLIC_PATH = path.join(os.homedir(), '.sounddeck', 'keys', 'public.key')
const LAST_LICENSE_PATH = path.join(os.homedir(), '.sounddeck', 'last-license.txt')

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return new Uint8Array(Buffer.from(str, 'base64'))
}

function loadToken() {
  const arg = process.argv[2]

  if (arg === '--last') {
    if (!fs.existsSync(LAST_LICENSE_PATH)) {
      console.error('❌ Aucun fichier trouvé à', LAST_LICENSE_PATH)
      console.error('   Lance d\'abord : node scripts/sign-license.mjs --dev')
      process.exit(1)
    }
    return fs.readFileSync(LAST_LICENSE_PATH, 'utf-8').trim()
  }

  if (arg === '--file') {
    const filePath = process.argv[3]
    if (!filePath || !fs.existsSync(filePath)) {
      console.error('❌ Fichier introuvable :', filePath)
      process.exit(1)
    }
    return fs.readFileSync(filePath, 'utf-8').trim()
  }

  if (!arg) {
    console.error('Usage :')
    console.error('  node scripts/verify-license.mjs "SDCK1.xxx.yyy"')
    console.error('  node scripts/verify-license.mjs --last')
    console.error('  node scripts/verify-license.mjs --file <path>')
    process.exit(1)
  }

  // Le token passé en arg : on enlève les espaces/newlines éventuels
  return arg.replace(/\s+/g, '')
}

async function main() {
  const token = loadToken()

  if (!fs.existsSync(PUBLIC_PATH)) {
    console.error('❌ Clé publique introuvable :', PUBLIC_PATH)
    console.error('   Lance d\'abord : node scripts/generate-keypair.mjs')
    process.exit(1)
  }

  const publicKey = new Uint8Array(
    Buffer.from(fs.readFileSync(PUBLIC_PATH, 'utf-8').trim(), 'hex')
  )

  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'SDCK1') {
    console.error('❌ Format de token invalide (attendu: SDCK1.payload.signature)')
    console.error('   Reçu :', token.slice(0, 40) + '...')
    process.exit(1)
  }

  const payloadBytes = b64urlDecode(parts[1])
  const signature = b64urlDecode(parts[2])

  if (signature.length !== 64) {
    console.error('❌ Signature invalide (taille attendue : 64 bytes, reçue :', signature.length, ')')
    process.exit(1)
  }

  let valid = false
  try {
    valid = await ed.verifyAsync(signature, payloadBytes, publicKey)
  } catch (e) {
    console.error('❌ Erreur lors de la vérification :', e.message)
    process.exit(1)
  }

  if (!valid) {
    console.error('❌ Signature INVALIDE — le token a été modifié ou est faux.')
    process.exit(1)
  }

  const payload = JSON.parse(new TextDecoder().decode(payloadBytes))

  console.log('✅ Token VALIDE\n')
  console.log(JSON.stringify(payload, null, 2))
}

main().catch((e) => {
  console.error('❌ Erreur:', e.message)
  process.exit(1)
})