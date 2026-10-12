// src/core/plugins/PluginManager/licenseKeys.js
//
// 🔓 Clé publique Ed25519 utilisée pour vérifier les licences Pro.
//
// ┌──────────────────────────────────────────────────────────────────┐
// │ ⚠️  NE JAMAIS METTRE LA CLÉ PRIVÉE ICI                           │
// │                                                                  │
// │ La clé privée est stockée UNIQUEMENT dans :                      │
// │   ~/.sounddeck/keys/private.key                                  │
// │                                                                  │
// │ Elle n'est JAMAIS commitée, JAMAIS partagée, JAMAIS embarquée    │
// │ dans l'application distribuée.                                   │
// └──────────────────────────────────────────────────────────────────┘
//
// Pour générer la paire (une seule fois) :
//   node scripts/generate-keypair.mjs
//
// Puis colle ici la clé PUBLIQUE affichée en hexadécimal.

export const PUBLIC_KEY_HEX = '002808c99f6a702a28eff5ad541e2cf8206b1a84853c14c19dcaba8256a82ade'

// Version du format de token supportée
export const TOKEN_VERSION = 1
export const TOKEN_PREFIX = 'SDCK1'

// ⚙️ Config
export const LICENSE_TIERS = {
  free: { rank: 0, label: 'Free' },
  pro: { rank: 10, label: 'Pro' },
  dev: { rank: 99, label: 'Dev' },
}

export function isValidPublicKeyConfigured() {
  return (
    typeof PUBLIC_KEY_HEX === 'string' &&
    PUBLIC_KEY_HEX.length === 64 &&
    /^[0-9a-f]+$/i.test(PUBLIC_KEY_HEX)
  )
}

export default {
  PUBLIC_KEY_HEX,
  TOKEN_VERSION,
  TOKEN_PREFIX,
  LICENSE_TIERS,
  isValidPublicKeyConfigured,
}