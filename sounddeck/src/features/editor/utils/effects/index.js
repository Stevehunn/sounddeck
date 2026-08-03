// src/pages/editor/utils/effects/index.js

// ✅ Exports statiques
export { VolumeEffect } from './VolumeEffect'
export { SpeedEffect } from './SpeedEffect'
export { FadeEffect } from './FadeEffect'
export { EchoEffect } from './EchoEffect'
export { ReverbEffect } from './ReverbEffect'

// ✅ Imports pour EffectChain
import { VolumeEffect } from './VolumeEffect'
import { SpeedEffect } from './SpeedEffect'
import { FadeEffect } from './FadeEffect'
import { EchoEffect } from './EchoEffect'
import { ReverbEffect } from './ReverbEffect'

/**
 * EffectChain - Gère la chaîne d'effets pour un clip
 * Applique les effets dans l'ordre et maintient les connexions
 */
export class EffectChain {
  constructor(audioContext) {
    this.audioContext = audioContext
    this.effects = {}       // Stocke les instances d'effets
    this.nodes = []         // Stocke les nœuds créés
    this.activeEffects = [] // Effets actifs
  }

  /**
   * Crée et applique tous les effets d'un clip
   * @param {string} clipId - ID du clip
   * @param {Array} effects - Liste des effets du clip
   * @param {AudioNode} source - Source audio d'entrée
   * @param {GainNode} gainNode - Nœud de gain du clip
   * @param {string} clipPath - Chemin du fichier audio (non utilisé)
   * @returns {Promise<Object>} { nodes, lastNode }
   */
  async createEffects(clipId, effects, source, gainNode, clipPath) {
    console.log(`🔄 [EffectChain] createEffects() pour clip ${clipId}`)
    console.log(`  - ${effects?.length || 0} effets à appliquer`)
    
    const result = { nodes: [], lastNode: source }

    // Nettoyer les anciens effets
    this.dispose()

    if (!effects || effects.length === 0) {
      console.log(`  ⏭️ Aucun effet à appliquer`)
      return result
    }

    // Filtrer les effets actifs
    const activeEffects = effects.filter(e => e.enabled)
    if (activeEffects.length === 0) {
      console.log(`  ⏭️ Aucun effet actif`)
      return result
    }

    console.log(`  🔧 ${activeEffects.length} effet(s) actif(s) à appliquer`)

    for (const effect of activeEffects) {
      console.log(`  🔧 Application de l'effet: ${effect.type}`)

      switch (effect.type) {
        case 'volume': {
          const value = effect.params?.value ?? 1
          console.log(`    📊 Volume: ${value.toFixed(2)}x`)
          if (gainNode) {
            gainNode.gain.value = Math.max(0, Math.min(5, value))
          }
          break
        }

        case 'speed': {
          const value = effect.params?.value ?? 1
          console.log(`    🏃 Speed: ${value.toFixed(2)}x`)
          if (!this.effects.speed) {
            this.effects.speed = new SpeedEffect()
          }
          this.effects.speed.apply(source, clipId, value)
          break
        }

        case 'fadeIn': {
          const duration = effect.params?.duration ?? 0.5
          console.log(`    🌅 Fade In: ${duration.toFixed(2)}s`)
          if (!this.effects.fade) {
            this.effects.fade = new FadeEffect(this.audioContext)
          }
          this.effects.fade.applyFadeIn(gainNode, clipId, duration)
          break
        }

        case 'fadeOut': {
          const duration = effect.params?.duration ?? 0.5
          console.log(`    🌇 Fade Out: ${duration.toFixed(2)}s`)
          if (!this.effects.fade) {
            this.effects.fade = new FadeEffect(this.audioContext)
          }
          this.effects.fade.setFadeOutParams(clipId, duration)
          break
        }

        case 'echo': {
          const delay = effect.params?.delay ?? 0.3
          const decay = effect.params?.decay ?? 0.5
          const mix = effect.params?.mix ?? 0.3
          console.log(`    🔄 Echo: delay=${delay.toFixed(2)}s, decay=${decay.toFixed(2)}, mix=${mix.toFixed(2)}`)
          if (!this.effects.echo) {
            this.effects.echo = new EchoEffect(this.audioContext)
          }
          const echoNode = this.effects.echo.createNode(
            result.lastNode,
            clipId,
            effect.params
          )
          if (echoNode) {
            result.nodes.push(echoNode)
            result.lastNode = echoNode
          }
          break
        }

        case 'reverb': {
          const roomSize = effect.params?.roomSize ?? 0.5
          const mix = effect.params?.mix ?? 0.2
          console.log(`    🌊 Reverb: roomSize=${roomSize.toFixed(2)}, mix=${mix.toFixed(2)}`)
          if (!this.effects.reverb) {
            this.effects.reverb = new ReverbEffect(this.audioContext)
          }
          const reverbNode = this.effects.reverb.createNode(
            result.lastNode,
            clipId,
            effect.params
          )
          if (reverbNode) {
            result.nodes.push(reverbNode)
            result.lastNode = reverbNode
          }
          break
        }

        default:
          console.warn(`  ⚠️ Effet inconnu: ${effect.type}`)
      }
    }

    this.activeEffects = activeEffects
    this.nodes = result.nodes
    
    console.log(`✅ [EffectChain] Effets appliqués, ${result.nodes.length} nœuds créés`)
    console.log(`  - Dernier nœud: ${result.lastNode?.constructor?.name || 'inconnu'}`)
    return result
  }

  /**
   * Met à jour un paramètre d'effet en temps réel
   */
  updateEffect(clipId, effectType, param, value) {
    console.log(`🔄 [EffectChain] updateEffect()`, { clipId, effectType, param, value })
    
    switch (effectType) {
      case 'speed':
        if (this.effects.speed) {
          this.effects.speed.update(value)
        }
        break
      case 'echo':
        if (this.effects.echo) {
          this.effects.echo.update({ [param]: value })
        }
        break
      case 'reverb':
        if (this.effects.reverb) {
          this.effects.reverb.update({ [param]: value })
        }
        break
      case 'volume':
        if (this.effects.volume) {
          this.effects.volume.update(value)
        }
        break
      default:
        console.warn(`  ⚠️ Effet non trouvé pour mise à jour: ${effectType}`)
    }
  }

  /**
   * Applique un fade out pendant la lecture
   */
  applyFadeOut(clipId, gainNode, currentTime, clipDuration, clipStart) {
    if (this.effects.fade) {
      this.effects.fade.applyFadeOut(
        gainNode,
        clipId,
        currentTime,
        clipDuration,
        clipStart
      )
    }
  }

  /**
   * Nettoie tous les effets
   */
  dispose() {
    console.log(`🧹 [EffectChain] dispose() appelé, nettoyage de ${Object.keys(this.effects).length} effets`)
    
    for (const key in this.effects) {
      if (this.effects[key]?.dispose) {
        try {
          this.effects[key].dispose()
        } catch (e) {
          console.warn(`⚠️ Erreur nettoyage ${key}:`, e.message)
        }
      }
    }
    
    this.effects = {}
    this.nodes = []
    this.activeEffects = []
  }

  /**
   * Vérifie si la chaîne a des effets actifs
   */
  hasActiveEffects() {
    return this.activeEffects.length > 0
  }

  /**
   * Récupère le nombre d'effets actifs
   */
  getActiveEffectCount() {
    return this.activeEffects.length
  }

  /**
   * Récupère les types d'effets actifs
   */
  getActiveEffectTypes() {
    return this.activeEffects.map(e => e.type)
  }
}

export default {
  VolumeEffect,
  SpeedEffect,
  FadeEffect,
  EchoEffect,
  ReverbEffect,
  EffectChain
}