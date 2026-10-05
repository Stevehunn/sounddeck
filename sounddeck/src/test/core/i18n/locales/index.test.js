// src/test/core/i18n/locales/index.test.js
// ═══════════════════════════════════════════════════════════════════════
// Test CROSS-LANGUE — le seul qui attrape les vraies régressions i18n.
//
// Scénario réel : un dev ajoute une clé en fr mais oublie en es
//   → l'utilisateur espagnol voit le nom brut de la clé à l'écran.
// Ce fichier détecte ce bug AVANT la prod.
// ═══════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'

import fr from '@core/i18n/locales/fr/index'
import en from '@core/i18n/locales/en/index'
import es from '@core/i18n/locales/es/index'

const LANGS = { fr, en, es }

// ─── Clés légitimement identiques : noms propres / produits ─────────────
const KNOWN_IDENTICAL = new Set([
  // Produits / plateformes
  'youtube',
  'pluginBadge',
  'on',
  'off',
  // Catégories Discover (mêmes mots dans les 3 langues)
  'catAnime',
  'catDiscord',
  'catGaming',
  'catMemes',
  'catSports',
  'catTiktok',
  'catViral',
  'catWhatsapp',
  'catMultimedia',
  // Toggles de thème / focus (FR/EN/ES utilisent les mêmes labels)
  'themeAutoOn',
  'themeAutoOff',
  'focusModeOn',
  'focusModeOff',
  // Modes simples
  'presentationLoopOn',
  'guideModeSimple',
])

// ─── Clés techniques / musicales : volontairement identiques ────────────
// (Fade In/Out, Audio, Clips, Presets, Solo, Tempo, placeholders…)
const KNOWN_TECHNICAL = new Set([
  // Formats / audio
  'compressionFormatMp3',
  'audio',
  'optionsAudio',
  'editorAudioEdit',
  // Structure clips / pistes
  'editorClips',
  'editorEmojiLabel',
  'editorAuto',                 // " Auto" (suffixe d'état)
  'editorSolo',
  'editorZoomPercent',          // "{percent}%" — placeholder pur
  // Effets musicaux
  'editorFadeIn',
  'editorFadeOut',
  'editorFades',
  'editorEffectFadeIn',
  'editorEffectFadeOut',
  'editorEffectsFadeIn',
  'editorEffectsFadeOut',
  'editorPresets',
  'editorTempo',                // "Tempo (BPM)"
  // Toasts avec placeholders purs
  'editorToastLoopWithDuration', // " ({duration}s)"
  // Options
  'optionsPlugins',
])

const ALL_KNOWN = new Set([...KNOWN_IDENTICAL, ...KNOWN_TECHNICAL])

describe('i18n cross-langue', () => {
  // ════════════════════════════════════════════════════════════════════
  // 1. Toutes les langues doivent avoir EXACTEMENT les mêmes clés
  // ════════════════════════════════════════════════════════════════════
  it('les 3 langues devraient avoir EXACTEMENT les mêmes clés', () => {
    const frKeys = new Set(Object.keys(fr))
    const enKeys = new Set(Object.keys(en))
    const esKeys = new Set(Object.keys(es))

    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k))
    const missingInEs = [...frKeys].filter((k) => !esKeys.has(k))
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k))
    const esOnly = [...esKeys].filter((k) => !frKeys.has(k))

    expect(
      missingInEn,
      `❌ Clés manquantes dans EN (présentes en FR) : ${missingInEn.join(', ')}`
    ).toEqual([])

    expect(
      missingInEs,
      `❌ Clés manquantes dans ES (présentes en FR) : ${missingInEs.join(', ')}`
    ).toEqual([])

    expect(
      missingInFr,
      `❌ Clés manquantes dans FR (présentes en EN) : ${missingInFr.join(', ')}`
    ).toEqual([])

    expect(
      esOnly,
      `❌ Clés ES absentes de FR : ${esOnly.join(', ')}`
    ).toEqual([])
  })

  it('les 3 langues devraient avoir le même nombre de clés', () => {
    const frCount = Object.keys(fr).length
    const enCount = Object.keys(en).length
    const esCount = Object.keys(es).length

    expect(enCount, `EN=${enCount} vs FR=${frCount}`).toBe(frCount)
    expect(esCount, `ES=${esCount} vs FR=${frCount}`).toBe(frCount)
  })

  // ════════════════════════════════════════════════════════════════════
  // 2. Aucune valeur ne doit être "undefined" / "null" / vide
  // ════════════════════════════════════════════════════════════════════
  it('aucune valeur ne devrait être "undefined" ou "null" dans aucune langue', () => {
    for (const [langCode, translations] of Object.entries(LANGS)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(value, `${langCode}.${key}`).not.toBe('undefined')
        expect(value, `${langCode}.${key}`).not.toBe('null')
      }
    }
  })

  it('aucune valeur ne devrait être vide dans aucune langue', () => {
    for (const [langCode, translations] of Object.entries(LANGS)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(value.length, `${langCode}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('toutes les valeurs devraient être des strings dans les 3 langues', () => {
    for (const [langCode, translations] of Object.entries(LANGS)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(typeof value, `${langCode}.${key}`).toBe('string')
      }
    }
  })

  // ════════════════════════════════════════════════════════════════════
  // 3. Détection de traductions suspectes (non bloquant en cas de doute)
  // ════════════════════════════════════════════════════════════════════
  it('peu de clés devraient être strictement identiques dans les 3 langues', () => {
    const sameInAll = []

    for (const key of Object.keys(fr)) {
      if (ALL_KNOWN.has(key)) continue
      // Ignore les valeurs courtes (acronymes, "ON", "OFF"…)
      if (typeof fr[key] !== 'string') continue
      if (fr[key].length <= 3) continue

      if (fr[key] === en[key] && fr[key] === es[key]) {
        sameInAll.push(key)
      }
    }

    // Garde-fou : si on dépasse 30 nouvelles clés identiques NON déclarées,
    // c'est probablement un copier-coller accidentel d'une string FR.
    // Les 35 clés connues (tech/musicales) sont déjà whitelistées ci-dessus.
    expect(
      sameInAll.length,
      `⚠️ Clés potentiellement non traduites (${sameInAll.length}) : ${sameInAll
        .slice(0, 30)
        .join(', ')}`
    ).toBeLessThan(30)
  })

  // ════════════════════════════════════════════════════════════════════
  // 4. Cohérence structurelle globale
  // ════════════════════════════════════════════════════════════════════
  it('chaque valeur FR devrait avoir un équivalent non-vide en EN et ES', () => {
    const missing = []
    for (const key of Object.keys(fr)) {
      if (!en[key]) missing.push(`EN:${key}`)
      if (!es[key]) missing.push(`ES:${key}`)
    }
    expect(missing, `Clés orphelines : ${missing.join(', ')}`).toEqual([])
  })
})