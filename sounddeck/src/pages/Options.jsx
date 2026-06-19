// sounddeck/src/pages/Options.jsx
import { useState, useEffect } from 'react'
import ShortcutRecorder from '../components/ShortcutRecorder'
import CustomThemeEditor from '../components/CustomThemeEditor'
import { LANGUAGES, useTranslation } from '../i18n'
// ✅ Importer les fonctions du mixeur
import { getMicrophoneStatus, getMixerStats, connectMixerToOutput } from '../utils/audioMixer'

export default function Options({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [audioDevices, setAudioDevices] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [microphones, setMicrophones] = useState([])

  // Détecter les périphériques audio
  useEffect(() => {
    const detectDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const outputs = devices.filter(d => d.kind === 'audiooutput')
        const inputs = devices.filter(d => d.kind === 'audioinput')
        setAudioDevices(outputs)
        setMicrophones(inputs)

        // Détecter automatiquement les périphériques virtuels
        const excludeList = []
        const hasVirtualDevice = outputs.some(d => {
          const label = d.label.toLowerCase()
          if (excludeList.some(ex => label.includes(ex.toLowerCase()))) {
            return false
          }
          return label.includes('cable') || 
                 label.includes('virtual') || 
                 label.includes('scream') ||
                 label.includes('voicemeeter') ||
                 label.includes('vb-audio')
        })
        
        if (hasVirtualDevice && !store.virtualDriverInstalled) {
          store.updateVirtualDriverInstalled?.(true)
          addToast('🔊 Périphérique virtuel détecté automatiquement !', 'success')
        } else if (!hasVirtualDevice && store.virtualDriverInstalled) {
          store.updateVirtualDriverInstalled?.(false)
        }
      } catch (e) {
        console.warn('Erreur détection périphériques:', e)
      }
    }
    
    detectDevices()
  }, [])

  // Fonction pour forcer la détection
  const handleDetectDevices = async () => {
    setIsDetecting(true)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const outputs = devices.filter(d => d.kind === 'audiooutput')
      setAudioDevices(outputs)
      
      const excludeList = []
      const hasVirtualDevice = outputs.some(d => {
        const label = d.label.toLowerCase()
        if (excludeList.some(ex => label.includes(ex.toLowerCase()))) {
          return false
        }
        return label.includes('cable') || 
               label.includes('virtual') || 
               label.includes('scream') ||
               label.includes('voicemeeter') ||
               label.includes('vb-audio')
      })
      
      if (hasVirtualDevice) {
        store.updateVirtualDriverInstalled?.(true)
        addToast('✅ Périphérique virtuel détecté !', 'success')
      } else {
        store.updateVirtualDriverInstalled?.(false)
        addToast('Aucun périphérique virtuel trouvé.', 'info')
      }
    } catch (e) {
      addToast('Erreur lors de la détection', 'error')
    }
    setIsDetecting(false)
  }

  // Fonction pour simuler l'absence de périphérique (pour le test)
  const simulateNoDevice = () => {
    store.updateVirtualDriverInstalled?.(false)
    addToast('🔧 Mode test : aucun périphérique détecté', 'info')
  }

  // Fonction pour simuler la présence de périphérique (pour le test)
  const simulateDevice = () => {
    store.updateVirtualDriverInstalled?.(true)
    addToast('🔧 Mode test : périphérique détecté', 'success')
  }

  // Fonction pour tester le micro
  const testMicrophone = async () => {
    try {
      const status = getMicrophoneStatus()
      console.log('📊 Statut du micro:', status)
      const stats = getMixerStats()
      console.log('📊 Statistiques du mixeur:', stats)
      
      if (status.isConnected) {
        addToast('🎤 Micro connecté ! Parle dans ton micro, tu devrais t\'entendre.', 'success')
        console.log('✅ Micro connecté avec succès!')
        console.log('📊 Détails:', {
          deviceId: status.deviceId,
          audioContextState: status.audioContextState,
          gainValue: status.gainValue,
          streamActive: stats.streamActive,
          tracksCount: stats.tracksCount
        })
      } else {
        addToast('❌ Micro non connecté. Vérifie tes permissions et réactive le mixeur.', 'error')
        if (store.mixerEnabled) {
          addToast('💡 Le mixeur est activé mais le micro n\'est pas connecté. Essaie de désactiver/réactiver le mixeur.', 'info')
        }
      }
    } catch (e) {
      console.error('❌ Erreur test micro:', e)
      addToast('❌ Erreur lors du test du micro: ' + e.message, 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{tr('optionsTitle')}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Application */}
        <Section title={tr('application')} icon="ti-apps">
          <OptionRow label={tr('startMinimized')} sub={tr('startMinimizedDesc')}>
            <Toggle 
              value={store.startMinimized ?? false} 
              onChange={async (val) => {
                await window.electronAPI.setStartMinimized(val)
                store.setStartMinimized?.(val)
              }} 
            />
          </OptionRow>
          
          <OptionRow label={tr('launchAtStartup')} sub={tr('launchAtStartupDesc')}>
            <Toggle 
              value={store.launchAtStartup ?? false} 
              onChange={async (val) => {
                await window.electronAPI.setLaunchAtStartup(val)
                store.setLaunchAtStartup?.(val)
              }} 
            />
          </OptionRow>

          <OptionRow label={tr('hideToTray')} sub={tr('hideToTrayDesc')}>
            <button 
              className="btn-secondary" 
              onClick={async () => {
                await window.electronAPI.hideWindow()
              }}
              style={{ fontSize: 12 }}
            >
              <i className="ti ti-eye-off" /> {tr('hideToTrayBtn')}
            </button>
          </OptionRow>

          <OptionRow label={tr('language')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => store.updateLang(l.code)}
                  style={{
                    padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    border: `2px solid ${store.lang === l.code ? 'var(--accent)' : 'var(--border)'}`,
                    background: store.lang === l.code ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: store.lang === l.code ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontWeight: store.lang === l.code ? 600 : 400
                  }}>
                  <span style={{ fontSize: 16 }}>{l.flag}</span>
                  {l.label}
                  {store.lang === l.code && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                </button>
              ))}
            </div>
          </OptionRow>
        </Section>

        {/* Apparence */}
        <Section title={tr('appearance')} icon="ti-palette">
          <OptionRow label={tr('theme')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { val: 'dark',        label: tr('themeDark'),   color: '#7C6FF7' },
                { val: 'light',       label: tr('themeLight'),    color: '#534AB7' },
                { val: 'dark-blue',   label: tr('themeBlue'),     color: '#2f81f7' },
                { val: 'dark-green',  label: tr('themeGreen'),    color: '#23c55e' },
                { val: 'dark-red',    label: tr('themeRed'),      color: '#ef4444' },
                { val: 'dark-orange', label: tr('themeOrange'),   color: '#f97316' },
                { val: 'custom',      label: tr('themeCustom'),   color: '#a855f7' },
              ].map(({ val, label, color }) => (
                <button key={val} onClick={() => store.updateTheme(val)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    border: `2px solid ${store.theme === val ? color : 'var(--border)'}`,
                    background: store.theme === val ? `${color}22` : 'var(--bg-tertiary)',
                    color: store.theme === val ? color : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontWeight: store.theme === val ? 600 : 400
                  }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {label}
                  {store.theme === val && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                </button>
              ))}
            </div>
          </OptionRow>

          {store.theme === 'custom' && (
            <CustomThemeEditor
              current={store.customTheme}
              onSave={async (colors) => {
                await store.updateCustomTheme(colors)
                addToast(tr('toastCustomThemeApplied'), 'success')
              }}
            />
          )}
        </Section>

        {/* Audio */}
        <Section title={tr('audio')} icon="ti-volume">
          <OptionRow label={tr('globalVolume')} sub={`${store.volume}%`}>
            <input type="range" min="0" max="100" value={store.volume}
              onChange={e => store.updateVolume(Number(e.target.value))}
              style={{ width: 140, accentColor: 'var(--accent)', background: 'transparent', border: 'none', padding: 0 }}
            />
          </OptionRow>

          <OptionRow label={tr('playLocally')} sub={tr('playLocallyDesc')}>
            <Toggle value={store.playLocally} onChange={store.updatePlayLocally} />
          </OptionRow>

          <OptionRow label="Normalisation du volume" sub="Égalise le volume des sons automatiquement">
            <Toggle value={store.normalizationEnabled} onChange={store.updateNormalizationEnabled} />
          </OptionRow>

          {store.normalizationEnabled && (
            <OptionRow label="Seuil de normalisation" sub="Plus le chiffre est bas, plus les sons forts sont réduits">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  type="range" 
                  min="0.01" 
                  max="0.5" 
                  step="0.005" 
                  value={store.normalizationTarget}
                  onChange={e => store.updateNormalizationTarget(Number(e.target.value))}
                  style={{ width: 120, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 40 }}>
                  {Math.round(-20 * Math.log10(store.normalizationTarget))} dB
                </span>
              </div>
            </OptionRow>
          )}

          <OptionRow label={tr('outputDevice')} sub={tr('outputDeviceDesc')}>
            <select value={store.audioDevice} onChange={e => store.updateAudioDevice(e.target.value)}
              style={{ width: 220 }}>
              <option value="default">{tr('outputDeviceDefault')}</option>
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `${tr('outputDeviceLabel')} ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </OptionRow>

          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
            {tr('vbaudioInfo')}
            <br />
            <button onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Cable/')}
              style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4, display: 'inline-block', fontSize: 12, padding: 0 }}>
              {tr('vbaudioDownload')}
            </button>
          </div>
        </Section>

        {/* Mode audio */}
        <Section title="Mode audio" icon="ti-soundwave">
          <OptionRow label="Mode d'audio" sub="Choisissez comment SoundDeck envoie l'audio">
            <select 
              value={store.audioMode || 'simple'} 
              onChange={e => store.updateAudioMode(e.target.value)}
              style={{ width: 200, fontSize: 12 }}
            >
              <option value="simple">Mode simple (périphérique virtuel)</option>
              <option value="advanced">Mode avancé (VB-Cable/VoiceMeeter)</option>
            </select>
          </OptionRow>

          {/* Détection des périphériques */}
          <OptionRow label="Détection des périphériques" sub="Recherche les périphériques audio virtuels">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button 
                className="btn-secondary"
                onClick={handleDetectDevices}
                disabled={isDetecting}
                style={{ fontSize: 12 }}
              >
                <i className={`ti ${isDetecting ? 'ti-loader' : 'ti-search'}`} 
                   style={isDetecting ? { animation: 'spin 1s linear infinite' } : {}} />
                {isDetecting ? 'Recherche...' : 'Détecter les périphériques'}
              </button>
              
              <button 
                className="btn-ghost"
                onClick={simulateNoDevice}
                style={{ fontSize: 11, color: 'var(--danger)' }}
              >
                <i className="ti ti-bug" /> Simuler absence
              </button>
              <button 
                className="btn-ghost"
                onClick={simulateDevice}
                style={{ fontSize: 11, color: 'var(--success)' }}
              >
                <i className="ti ti-check" /> Simuler présence
              </button>
            </div>
          </OptionRow>

          <OptionRow label="Statut" sub={store.virtualDriverInstalled ? 'Périphérique virtuel détecté' : 'Aucun périphérique virtuel'}>
            <span style={{ 
              color: store.virtualDriverInstalled ? 'var(--success)' : 'var(--danger)',
              fontSize: 13,
              fontWeight: 600
            }}>
              <i className={`ti ${store.virtualDriverInstalled ? 'ti-check' : 'ti-x'}`} />
              {store.virtualDriverInstalled ? ' ✅ Détecté' : ' ❌ Non détecté'}
            </span>
          </OptionRow>

          {store.audioMode === 'simple' && (
            <>
              <OptionRow label="Périphérique audio virtuel" sub="Installe un périphérique audio pour Discord">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {store.virtualDriverInstalled ? (
                      <span style={{ color: 'var(--success)', fontSize: 13 }}>
                        <i className="ti ti-check" /> ✅ Périphérique virtuel détecté
                      </span>
                    ) : (
                      <button 
                        className="btn-secondary"
                        onClick={() => window.electronAPI?.openExternal('https://github.com/MikeTheTech/Virtual-Audio-Cable/releases')}
                        style={{ fontSize: 12 }}
                      >
                        <i className="ti ti-download" /> Télécharger le pilote virtuel
                      </button>
                    )}
                  </div>
                  
                  {!store.virtualDriverInstalled && (
                    <div style={{ 
                      fontSize: 11, 
                      color: 'var(--text-tertiary)', 
                      background: 'var(--bg-tertiary)', 
                      padding: '8px 12px', 
                      borderRadius: 6,
                      lineHeight: 1.6
                    }}>
                      <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
                      Téléchargez et installez le pilote, puis redémarrez Discord.
                      <br />
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        💡 Après installation, sélectionnez "CABLE Input" dans Discord comme périphérique d'entrée.
                      </span>
                    </div>
                  )}
                  
                  {store.virtualDriverInstalled && (
                    <div style={{ 
                      fontSize: 11, 
                      color: 'var(--success)', 
                      background: 'rgba(29,158,117,0.1)', 
                      padding: '8px 12px', 
                      borderRadius: 6,
                      border: '1px solid var(--success)'
                    }}>
                      <i className="ti ti-check" style={{ marginRight: 4 }} />
                      ✅ Périphérique virtuel détecté ! Sélectionnez-le dans Discord comme périphérique d'entrée.
                    </div>
                  )}
                </div>
              </OptionRow>
              
              <OptionRow label="Périphérique de sortie" sub="Sélectionne le périphérique virtuel pour Discord">
                <select 
                  value={store.audioDevice} 
                  onChange={e => store.updateAudioDevice(e.target.value)}
                  style={{ width: 220, fontSize: 12 }}
                >
                  <option value="default">Par défaut</option>
                  {audioDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Périphérique ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </OptionRow>
            </>
          )}

          {store.audioMode === 'advanced' && (
            <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
              <strong>Mode avancé</strong> : Utilise VB-Cable + VoiceMeeter Banana pour un mixage professionnel.
              <br />
              <button onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Cable/')}
                style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4, display: 'inline-block', fontSize: 12, padding: 0 }}>
                <i className="ti ti-download" /> Télécharger VB-Cable
              </button>
              <br />
              <button onClick={() => window.electronAPI?.openExternal('https://vb-audio.com/Voicemeeter/banana.htm')}
                style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 2, display: 'inline-block', fontSize: 12, padding: 0 }}>
                <i className="ti ti-download" /> Télécharger VoiceMeeter Banana
              </button>
            </div>
          )}
        </Section>

        {/* Mixeur audio intégré - Version corrigée avec connexion du flux */}
        <Section title="Mixeur audio" icon="ti-mic">
          <OptionRow label="Activer le mixeur" sub="Mélange ton micro avec les sons de SoundDeck">
            <Toggle 
              value={store.mixerEnabled} 
              onChange={async (val) => {
                console.log('🔄 Changement mixeur:', val)
                await store.updateMixerEnabled(val)
                
                if (val) {
                  try {
                    console.log('🎛️ Activation du mixeur...')
                    const { initAudioMixer, resumeAudioContext, getMixerStats, connectMixerToOutput } = await import('../utils/audioMixer')
                    
                    // Initialiser le mixeur avec le périphérique micro sélectionné
                    const mixedStream = await initAudioMixer(store.microphoneDevice)
                    
                    const stats = getMixerStats()
                    console.log('📊 Stats après initialisation:', stats)
                    
                    if (mixedStream && stats.isInitialized) {
                      resumeAudioContext()
                      
                      // ✅ Connecter le flux mixé au périphérique de sortie
                      const outputDevice = store.audioDevice || 'default'
                      const connected = connectMixerToOutput(outputDevice)
                      console.log('🔗 Connexion du flux vers:', outputDevice, 'Résultat:', connected)
                      
                      console.log('✅ Mixeur activé avec succès!')
                      console.log('📊 Flux mixé disponible:', !!mixedStream)
                      addToast('✅ Mixeur audio activé ! Parle dans ton micro pour tester.', 'success')
                    } else {
                      console.error('❌ Échec initialisation du mixeur')
                      addToast('❌ Erreur activation du mixeur. Vérifie la console.', 'error')
                      await store.updateMixerEnabled(false)
                    }
                  } catch (e) {
                    console.error('❌ Erreur activation mixeur:', e)
                    addToast('❌ Erreur activation du mixeur: ' + e.message, 'error')
                    await store.updateMixerEnabled(false)
                  }
                } else {
                  try {
                    console.log('🛑 Désactivation du mixeur...')
                    const { stopMixer } = await import('../utils/audioMixer')
                    await stopMixer()
                    console.log('✅ Mixeur désactivé')
                    addToast('Mixeur désactivé', 'info')
                  } catch (e) {
                    console.error('❌ Erreur arrêt mixeur:', e)
                  }
                }
              }} 
            />
          </OptionRow>

          {store.mixerEnabled && (
            <>
              <OptionRow label="Statut du mixeur" sub="Le mixage est actif">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  color: 'var(--success)',
                  fontSize: 13,
                  fontWeight: 500
                }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    background: 'var(--success)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  Actif
                </div>
              </OptionRow>

              <OptionRow label="Périphérique micro" sub="Sélectionne ton micro">
                <select 
                  value={store.microphoneDevice} 
                  onChange={async (e) => {
                    const deviceId = e.target.value
                    await store.updateMicrophoneDevice(deviceId)
                    try {
                      const { changeMicrophone } = await import('../utils/audioMixer')
                      await changeMicrophone(deviceId)
                      addToast('✅ Micro changé', 'success')
                    } catch (err) {
                      console.error('❌ Erreur changement micro:', err)
                    }
                  }}
                  style={{ width: 220, fontSize: 12 }}
                >
                  <option value="default">Micro par défaut</option>
                  {microphones.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Micro ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </OptionRow>

              <OptionRow label="Volume du micro" sub={`${store.microphoneVolume}%`}>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={store.microphoneVolume}
                  onChange={async (e) => {
                    const val = Number(e.target.value)
                    await store.updateMicrophoneVolume(val)
                    const { setMicrophoneVolume } = await import('../utils/audioMixer')
                    setMicrophoneVolume(val / 100)
                  }}
                  style={{ width: 140, accentColor: 'var(--accent)', background: 'transparent', border: 'none', padding: 0 }}
                />
              </OptionRow>

              <OptionRow label="Volume des sons" sub={`${store.mixerSoundVolume}%`}>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={store.mixerSoundVolume}
                  onChange={async (e) => {
                    const val = Number(e.target.value)
                    await store.updateMixerSoundVolume(val)
                    const { setSoundVolume } = await import('../utils/audioMixer')
                    setSoundVolume(val / 100)
                  }}
                  style={{ width: 140, accentColor: 'var(--accent)', background: 'transparent', border: 'none', padding: 0 }}
                />
              </OptionRow>

              <OptionRow label="Tester le micro" sub="Vérifie si le micro est connecté">
                <button 
                  className="btn-secondary"
                  onClick={testMicrophone}
                  style={{ fontSize: 12 }}
                >
                  <i className="ti ti-mic" /> Tester le micro
                </button>
              </OptionRow>

              <OptionRow label="Statut technique" sub="Informations de débogage">
                <button 
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const { getMixerStats } = await import('../utils/audioMixer')
                      const stats = getMixerStats()
                      console.log('📊 Statistiques détaillées du mixeur:', stats)
                      addToast(`Mixeur: ${stats.isInitialized ? '✅' : '❌'} | Micro: ${stats.isMicrophoneConnected ? '✅' : '❌'} | AudioContext: ${stats.audioContextState}`, 'info')
                    } catch (e) {
                      addToast('❌ Erreur: ' + e.message, 'error')
                    }
                  }}
                  style={{ fontSize: 12 }}
                >
                  <i className="ti ti-info-circle" /> Afficher le statut
                </button>
              </OptionRow>

              <OptionRow label="Vérifier les volumes" sub="Affiche les volumes actuels">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    console.log('🔊 Volumes actuels:')
                    console.log('  - Volume des sons (dB):', store.mixerSoundVolume)
                    console.log('  - Volume du micro (%):', store.microphoneVolume)
                    console.log('  - Volume global (%):', store.volume)
                    addToast(`Sons: ${store.mixerSoundVolume}% | Micro: ${store.microphoneVolume}% | Global: ${store.volume}%`, 'info')
                  }}
                  style={{ fontSize: 12 }}
                >
                  <i className="ti ti-volume" /> Vérifier les volumes
                </button>
              </OptionRow>

              <OptionRow label="Reconnecter le flux" sub="Force la reconnexion du flux au périphérique de sortie">
                <button 
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const { connectMixerToOutput, getMixerStats } = await import('../utils/audioMixer')
                      const stats = getMixerStats()
                      if (!stats.isInitialized) {
                        addToast('❌ Mixeur non initialisé. Active-le d\'abord.', 'error')
                        return
                      }
                      const outputDevice = store.audioDevice || 'default'
                      const result = connectMixerToOutput(outputDevice)
                      if (result) {
                        addToast(`✅ Flux reconnecté vers ${outputDevice}`, 'success')
                      } else {
                        addToast('❌ Erreur reconnexion du flux', 'error')
                      }
                    } catch (e) {
                      addToast('❌ Erreur: ' + e.message, 'error')
                    }
                  }}
                  style={{ fontSize: 12 }}
                >
                  <i className="ti ti-plug" /> Reconnecter le flux
                </button>
              </OptionRow>

              <div style={{ 
                fontSize: 11, 
                color: 'var(--text-tertiary)', 
                background: 'var(--bg-tertiary)', 
                padding: '8px 12px', 
                borderRadius: 6,
                lineHeight: 1.6,
                border: '1px solid var(--success)'
              }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--success)' }} />
                <strong>Mixage actif</strong> : Ton micro et les sons sont mixés dans un seul flux.
                <br />
                <span style={{ fontSize: 10 }}>
                  📌 Sélectionne <strong>"CABLE Output"</strong> dans Discord comme périphérique d'entrée.
                </span>
                <br />
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  🎤 Teste ton micro : parle normalement, tu devrais entendre ta voix mixée avec les sons.
                </span>
                <br />
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  🔄 Si Discord n'entend pas, clique sur "Reconnecter le flux" ci-dessus.
                </span>
              </div>
            </>
          )}
        </Section>

        {/* Raccourcis globaux */}
        <Section title={tr('shortcuts')} icon="ti-keyboard">
          <OptionRow label={tr('switchProfile')} sub={tr('switchProfileDesc')}>
            <ShortcutRecorder
              value={store.profileShortcut}
              onSave={async (acc) => { await store.updateProfileShortcut(acc); addToast(`${tr('toastShortcutSet')} ${acc}`, 'success') }}
              onClear={() => store.updateProfileShortcut('')}
              requireMod
            />
          </OptionRow>
          <OptionRow label={tr('toggleLoop')} sub={tr('toggleLoopDesc')}>
            <ShortcutRecorder
              value={store.loopShortcut}
              onSave={async (acc) => { await store.updateLoopShortcut(acc); addToast(`${tr('toastShortcutLoop')} ${acc}`, 'success') }}
              onClear={() => store.updateLoopShortcut('')}
              requireMod
            />
          </OptionRow>
          <OptionRow label={tr('stopAllShortcut')} sub={tr('stopAllDesc')}>
            <ShortcutRecorder
              value={store.stopAllShortcut}
              onSave={async (acc) => { await store.updateStopAllShortcut(acc); addToast(`${tr('toastShortcutStop')} ${acc}`, 'success') }}
              onClear={() => store.updateStopAllShortcut('')}
              requireMod
            />
          </OptionRow>
          <OptionRow label={tr('presentationShortcut')} sub={tr('presentationDesc')}>
            <ShortcutRecorder
              value={store.presentationShortcut}
              onSave={async (acc) => { await store.updatePresentationShortcut(acc); addToast(`${tr('toastShortcutPresentation')} ${acc}`, 'success') }}
              onClear={() => store.updatePresentationShortcut('')}
              requireMod
            />
          </OptionRow>
          
          <OptionRow label="Toggle raccourcis" sub="Activer/désactiver tous les raccourcis globaux">
            <ShortcutRecorder
              value={store.toggleShortcutsAccelerator || 'CommandOrControl+Shift+K'}
              onSave={async (acc) => { 
                await store.updateToggleShortcutsAccelerator(acc)
                addToast(`Raccourci toggle défini : ${acc}`, 'success')
              }}
              onClear={() => {
                store.updateToggleShortcutsAccelerator('')
                addToast('Raccourci toggle supprimé', 'info')
              }}
              requireMod
            />
          </OptionRow>

          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
            {tr('shortcutsPerSoundNote')}
          </div>
        </Section>

        {/* Sauvegarde */}
        <Section title={tr('backup')} icon="ti-cloud">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tr('exportSectionLabel')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('configOnly')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('configOnlyDesc')}</div>
              </div>
              <button className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  const r = await window.electronAPI.exportConfig()
                  if (r.success) addToast(tr('toastConfigExported'), 'success')
                  else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
                }}>
                <i className="ti ti-download" /> {tr('exportLabel')}
              </button>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>📦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('fullArchive')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('fullArchiveDesc')}</div>
              </div>
              <button className="btn-primary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  addToast(tr('toastArchiveCreating'), 'info')
                  const r = await window.electronAPI.exportFull()
                  if (r.success) addToast(`Archive créée · ${r.sizeMb} Mo ✓`, 'success')
                  else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
                }}>
                <i className="ti ti-package" /> {tr('exportLabel')}
              </button>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>🎵</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('soundsOnly')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('soundsOnlyDesc')}</div>
              </div>
              <button className="btn-secondary" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={async () => {
                  addToast(tr('toastSoundsCompressing'), 'info')
                  const r = await window.electronAPI.exportSoundsOnly()
                  if (r.success) addToast(`${r.sizeMb} Mo exportés ✓`, 'success')
                  else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
                }}>
                <i className="ti ti-music" /> {tr('exportLabel')}
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tr('importSectionLabel')}
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20 }}>📥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{tr('importBackup')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('importBackupDesc')}</div>
            </div>
            <button className="btn-primary" style={{ flexShrink: 0, fontSize: 12 }}
              onClick={async () => {
                const r = await window.electronAPI.importBackup()
                if (r.success) {
                  if (r.type === 'json') addToast(`Config importée ✓ — ${tr('restartRequired')}`, r.missing > 0 ? 'info' : 'success')
                  else if (r.type === 'full') addToast(`Archive importée · ${r.importedSounds} ${tr('sounds')} ✓ — ${tr('restartRequired')}`, 'success')
                  else if (r.type === 'sounds-only') addToast(`${r.importedSounds} ${tr('sounds')} ${tr('imported')} ✓`, 'success')
                } else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
              }}>
              <i className="ti ti-upload" /> {tr('importLabel')}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            {tr('restartNote')}
          </div>
        </Section>

        {/* Profils */}
        <Section title={tr('profileManagement')} icon="ti-users">
          {store.profiles.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', marginBottom: 6 }}>
              <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ flex: 1, fontSize: 13 }}>{p.id === 'all' ? tr('allSounds') : p.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {store.sounds.filter(s => s.profiles?.includes(p.id)).length} {tr('sounds')}
              </span>
              <button
                style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={async () => {
                  addToast(tr('toastProfileExporting'), 'info')
                  const r = await window.electronAPI.exportProfile(p.id)
                  if (r.success) addToast(`Profil "${p.name}" exporté · ${r.soundCount} ${tr('sounds')} · ${r.sizeMb} Mo`, 'success')
                  else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <i className="ti ti-package-export" /> {tr('exportProfile')}
              </button>
              {!p.isDefault && (
                <button className="btn-danger" style={{ padding: '3px 8px', fontSize: 12 }}
                  onClick={async () => { await store.deleteProfile(p.id); addToast(tr('profileDeleted'), 'info') }}>
                  <i className="ti ti-trash" />
                </button>
              )}
            </div>
          ))}
          <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 12 }}
            onClick={async () => {
              const r = await window.electronAPI.importProfile()
              if (r.success) addToast(`Profil "${r.profileName}" importé · ${r.soundCount} ${tr('sounds')} ✓ — ${tr('restartRequired')}`, 'success')
              else if (r.error) addToast(`${tr('trimmerError')} ${r.error}`, 'error')
            }}>
            <i className="ti ti-package-import" /> {tr('importProfile')}
          </button>
        </Section>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        <i className={`ti ${icon}`} />{title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function OptionRow({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 38, height: 22, borderRadius: 11,
      background: value ? 'var(--accent)' : 'var(--bg-tertiary)',
      border: '1px solid var(--border)', position: 'relative',
      cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
    }}>
      <div style={{
        position: 'absolute', width: 16, height: 16, borderRadius: 8,
        background: 'white', top: 2, left: value ? 18 : 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }} />
    </div>
  )
}