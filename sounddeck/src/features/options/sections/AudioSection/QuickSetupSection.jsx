// src/features/options/sections/AudioSection/QuickSetupSection.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import {
  stopMixer,
  isMixerActive,
} from '@core/services/AudioMixerService'
import { logWarn } from '@shared/utils/logger'
import OptionRow from '../../OptionRow'

const DISCORD_DONE_KEY = 'sounddeck-discord-setup-done'

// ─── DÉTECTION DES ALIAS WINDOWS ───────────────────────────────────────────
// Windows expose des "alias" ('default', 'communications') qui NE SONT PAS
// de vrais deviceId : setSinkId() les ignore silencieusement.
function isAliasDevice(deviceId = '') {
  return (
    deviceId === 'default' ||
    deviceId === 'communications' ||
    deviceId.startsWith('communic') ||
    deviceId.startsWith('default')
  )
}

// ─── DÉTECTION DES TYPES DE PÉRIPHÉRIQUES ─────────────────────────────────
function isVirtualCable(label = '') {
  const l = label.toLowerCase()
  return (
    l.includes('cable input') ||
    l.includes('cable output') ||
    l.includes('cable in ') ||
    l.includes('vb-audio') ||
    l.includes('voicemeeter') ||
    l.includes('scream')
  )
}

function isCableInput(label = '') {
  return label.toLowerCase().includes('cable input')
}

function isRealHeadphone(label = '') {
  if (isVirtualCable(label)) return false
  const l = label.toLowerCase()
  return (
    l.includes('headphone') ||
    l.includes('casque') ||
    l.includes('écouteur') ||
    l.includes('ecouteur') ||
    l.includes('headset') ||
    l.includes('speaker') ||
    l.includes('haut-parleur') ||
    l.includes('realtek')
  )
}

function isRealMic(label = '') {
  if (isVirtualCable(label)) return false
  const l = label.toLowerCase()
  return (
    l.includes('micro') ||
    l.includes('mic ') ||
    l.includes('realtek') ||
    l.includes('headset') ||
    l.includes('webcam') ||
    l.includes('casque')
  )
}

// ✨ Choisit le MEILLEUR device (exclut les alias 'default'/'communic')
function pickBest(devices, matcher) {
  const matches = devices.filter((d) => matcher(d.label))
  if (matches.length === 0) return null

  const real = matches.find((d) => !isAliasDevice(d.deviceId))
  return real || matches[0]
}

// ─── COMPOSANT ─────────────────────────────────────────────────────────────
export default function QuickSetupSection({ store, addToast }) {
  const { t } = useLanguage()
  const [isApplying, setIsApplying] = useState(false)

  // Bandeau Discord : considéré fait tant que l'utilisateur ne clique pas
  const [discordSetupDone, setDiscordSetupDone] = useState(() => {
    try {
      return localStorage.getItem(DISCORD_DONE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const markDiscordDone = () => {
    try {
      localStorage.setItem(DISCORD_DONE_KEY, 'true')
    } catch {
      // silencieux (mode privé, etc.)
    }
    setDiscordSetupDone(true)
    addToast(t('quickSetupDiscordDoneToast'), 'success')
  }

  const applyDiscordSetup = async () => {
    setIsApplying(true)
    try {
      console.group('🎛️ [QuickSetup] Démarrage')

      // ── 1. Énumération ────────────────────────────────────────────────
      const devices = await navigator.mediaDevices.enumerateDevices()
      const outputs = devices.filter((d) => d.kind === 'audiooutput')
      const inputs = devices.filter((d) => d.kind === 'audioinput')

      console.log('🔍 Sorties brutes:', outputs.map((d) => ({
        label: d.label || '(VIDE)',
        id: d.deviceId.slice(0, 12),
        isAlias: isAliasDevice(d.deviceId),
      })))
      console.log('🔍 Entrées brutes:', inputs.map((d) => ({
        label: d.label || '(VIDE)',
        id: d.deviceId.slice(0, 12),
        isAlias: isAliasDevice(d.deviceId),
      })))

      // ── 2. Détection CABLE Input (obligatoire) ────────────────────────
      const cableOutput = pickBest(outputs, isCableInput)
      if (!cableOutput || isAliasDevice(cableOutput.deviceId)) {
        addToast(t('quickSetupNoCable'), 'error')
        console.error('❌ CABLE Input introuvable ou alias détecté')
        console.groupEnd()
        setIsApplying(false)
        return
      }

      // ── 3. Détection casque réel + micro réel ─────────────────────────
      const candidatesHeadphone = outputs.filter(
        (d) => !isAliasDevice(d.deviceId) && d.deviceId !== cableOutput.deviceId
      )
      const realHeadphone = pickBest(candidatesHeadphone, isRealHeadphone)

      const candidatesMic = inputs.filter((d) => !isAliasDevice(d.deviceId))
      const realMic = pickBest(candidatesMic, isRealMic)

      console.log('🎯 Choix détectés:', {
        cable: {
          label: cableOutput.label,
          id: cableOutput.deviceId.slice(0, 12),
        },
        headphone: realHeadphone
          ? {
              label: realHeadphone.label,
              id: realHeadphone.deviceId.slice(0, 12),
            }
          : '(aucun)',
        mic: realMic
          ? { label: realMic.label, id: realMic.deviceId.slice(0, 12) }
          : '(aucun)',
      })

      // ── 4. STOP mixer AVANT tout changement ───────────────────────────
      if (isMixerActive()) {
        console.log('⏹️ Arrêt du mixer...')
        await stopMixer()
        await new Promise((r) => setTimeout(r, 350))
      }

      // ── 5. Update du store (dans cet ordre) ───────────────────────────
      await store.updateAudioDevice(cableOutput.deviceId)
      console.log('✅ audioDevice →', cableOutput.deviceId.slice(0, 12))

      if (realHeadphone) {
        await store.updateLocalAudioDevice(realHeadphone.deviceId)
        console.log(
          '✅ localAudioDevice →',
          realHeadphone.deviceId.slice(0, 12)
        )
      } else {
        console.warn('⚠️ Aucun casque réel détecté — localAudioDevice inchangé')
      }
      await store.updatePlayLocally(true)

      if (realMic) {
        await store.updateMicrophoneDeviceId(realMic.deviceId)
        console.log('✅ microphoneDevice →', realMic.deviceId.slice(0, 12))
      } else {
        console.warn('⚠️ Aucun micro réel détecté — microphoneDevice inchangé')
      }

      await store.updateNoiseSuppressionMode('auto')

      // ── 6. Redémarrer le mixer (il lira les nouvelles valeurs) ────────
      console.log('▶️ Redémarrage du mixer avec les nouveaux devices...')
      const result = await store.updateMixerEnabled(true)
      if (result && !result.success) {
        console.error('❌ Échec start mixer:', result.error)
        addToast('❌ ' + (result.error || t(result.message)), 'error')
      } else {
        console.log('✅ Mixer démarré')
      }

      // ── 7. Toasts ─────────────────────────────────────────────────────
      addToast(t('quickSetupApplied'), 'success')
      setTimeout(() => addToast(t('quickSetupRememberDiscord'), 'info'), 800)

      console.groupEnd()
    } catch (e) {
      logWarn('QuickSetup', 'Erreur applyDiscordSetup', e)
      console.error('❌ [QuickSetup] Erreur:', e)
      addToast('❌ ' + e.message, 'error')
    }
    setIsApplying(false)
  }

  // ─── UI ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: '12px 14px',
        marginBottom: 8,
        background: 'var(--accent-light)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--accent)',
          marginBottom: 2,
        }}
      >
        <i className="ti ti-wand" />
        {t('quickSetupTitle')}
      </div>

      {/* ✅ Bandeau persistant Discord (masqué si l'utilisateur a cliqué "Fait") */}
      {!discordSetupDone && (
        <div
          data-testid="quick-setup-discord-banner"
          style={{
            padding: '8px 10px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 11,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 2,
              }}
            >
              <i
                className="ti ti-brand-discord"
                style={{ color: '#5865F2', fontSize: 14 }}
              />
              {t('quickSetupBannerTitle')}
            </div>
            <div style={{ fontSize: 11 }}>{t('quickSetupBannerDesc')}</div>
          </div>
          <button
            data-testid="quick-setup-discord-done-btn"
            className="btn-secondary btn-sm"
            style={{
              fontSize: 10,
              padding: '2px 8px',
              minHeight: 22,
              flexShrink: 0,
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={markDiscordDone}
          >
            <i className="ti ti-check" /> {t('quickSetupBannerDoneBtn')}
          </button>
        </div>
      )}

      <OptionRow label={t('quickSetup')} sub={t('quickSetupDesc')}>
        <button
          className="btn-primary"
          onClick={applyDiscordSetup}
          disabled={isApplying}
          style={{
            fontSize: 12,
            minHeight: 34,
            padding: '6px 16px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {isApplying ? (
            <>
              <i
                className="ti ti-loader"
                style={{ animation: 'spin 1s linear infinite' }}
              />{' '}
              {t('quickSetupApplying')}
            </>
          ) : (
            <>
              <i className="ti ti-wand" /> {t('quickSetupApply')}
            </>
          )}
        </button>
      </OptionRow>
    </div>
  )
}