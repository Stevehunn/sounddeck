// src/test/utils/resetModules.js
// ─────────────────────────────────────────────────────────────────────────────
// Réinitialise TOUS les états module-level entre les tests.
// Utilise des dynamic imports + introspection pour rester simple.
// ─────────────────────────────────────────────────────────────────────────────

import { vi } from 'vitest'

/**
 * Reset tous les caches/refs module-level connus.
 * À appeler dans afterEach() du setup global.
 */
export async function resetAllModuleState() {
  try {
    // ─── AudioService ──────────────────────────────────────────────────
    const audioService = await import('@core/services/AudioService')
    // Les objets sont exportés par référence, on peut les vider :
    if (audioService.gainCache) {
      Object.keys(audioService.gainCache).forEach(k => delete audioService.gainCache[k])
    }
    audioService.stopAllSounds?.()
    audioService.setCurrentPlayingSound?.(null)
  } catch (e) {
    // module pas chargé dans ce test, ignorer
  }

  // ─── AudioMixerService ─────────────────────────────────────────────
  try {
    const mixer = await import('@core/services/AudioMixerService')
    await mixer.stopMixer?.()
  } catch (e) {}

  // ─── errorHandler ──────────────────────────────────────────────────
  try {
    const err = await import('@shared/utils/errorHandler')
    await err.clearAllErrorLogs?.()
  } catch (e) {}

  // ─── appStorage ────────────────────────────────────────────────────
  // Le flag migrationDone est module-level privé → pas accessible directement
  // Workaround : réimporte le module en cache busté (voir note plus bas)

  // ─── NetworkContext ────────────────────────────────────────────────
  // Idem, flags module-level privés → à gérer via vi.resetModules()

  // ─── EmojiService ──────────────────────────────────────────────────
  try {
    const emoji = await import('@core/services/EmojiService')
    if (emoji.emojiService) {
      emoji.emojiService.customEmojis = []
      emoji.emojiService.metadata = {}
      emoji.emojiService.loaded = false
      emoji.emojiService.listeners?.clear?.()
    }
  } catch (e) {}

  // ─── MyInstants cache ──────────────────────────────────────────────
  // Module-level privé → reset via vi.resetModules() si vraiment nécessaire

  // ─── PluginManager ─────────────────────────────────────────────────
  try {
    const pm = await import('@core/plugins/PluginManager/index.js')
    if (pm.pluginManager) {
      pm.pluginManager.plugins.clear()
      pm.pluginManager.pages.clear()
      pm.pluginManager.components.clear()
      pm.pluginManager._initialized = false
      pm.pluginManager._initPromise = null
      pm.pluginManager.invalidatePagesCache?.()
    }
  } catch (e) {}
}

/**
 * Reset ULTRA-agressif : force Vitest à re-importer tous les modules.
 * À utiliser uniquement dans les tests qui ont VRAIMENT besoin d'un état vierge
 * (ex: YouTube module-level state).
 */
export function nukeAllModules() {
  vi.resetModules()
}