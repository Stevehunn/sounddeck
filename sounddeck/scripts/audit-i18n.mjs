// scripts/audit-i18n.js
// ─────────────────────────────────────────────────────────────────────────────
// ✅ Audit : détecte les clés i18n manquantes entre locales (fr/en/es).
// Usage : `node scripts/audit-i18n.js`
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(__dirname, '../src/core/i18n/locales')
const LANGS = ['fr', 'en', 'es']
const REFERENCE = 'fr' // la langue de référence

function loadLocale(lang) {
  const langDir = path.join(LOCALES_DIR, lang)
  if (!fs.existsSync(langDir)) return {}
  const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.js'))

  const allKeys = new Set()
  for (const file of files) {
    if (file === 'index.js') continue
    const content = fs.readFileSync(path.join(langDir, file), 'utf-8')
    // Regex simple : capture les clés `keyName: 'value'` ou `keyName: "..."`
    const matches = content.matchAll(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*:/gm)
    for (const match of matches) allKeys.add(match[1])
  }
  return allKeys
}

function audit() {
  console.log('🔍 Audit i18n — détection des clés manquantes\n')

  const reference = loadLocale(REFERENCE)
  console.log(`📚 Référence : ${REFERENCE} (${reference.size} clés)\n`)

  let totalMissing = 0

  for (const lang of LANGS) {
    if (lang === REFERENCE) continue

    const keys = loadLocale(lang)
    const missing = [...reference].filter((k) => !keys.has(k))
    const extra = [...keys].filter((k) => !reference.has(k))

    console.log(`🌐 ${lang.toUpperCase()} : ${keys.size} clés`)

    if (missing.length > 0) {
      console.log(`  ❌ ${missing.length} clé(s) MANQUANTE(S) :`)
      for (const k of missing.slice(0, 20)) console.log(`     - ${k}`)
      if (missing.length > 20) console.log(`     ... et ${missing.length - 20} autres`)
      totalMissing += missing.length
    }

    if (extra.length > 0) {
      console.log(`  ⚠️  ${extra.length} clé(s) EN TROP (à supprimer ?) :`)
      for (const k of extra.slice(0, 10)) console.log(`     - ${k}`)
    }

    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ✅ Parfaitement synchronisé`)
    }
    console.log()
  }

  console.log('─'.repeat(60))
  if (totalMissing === 0) {
    console.log('✅ Toutes les locales sont synchronisées !')
    process.exit(0)
  } else {
    console.log(`❌ ${totalMissing} clé(s) manquante(s) au total`)
    process.exit(1)
  }
}

audit()