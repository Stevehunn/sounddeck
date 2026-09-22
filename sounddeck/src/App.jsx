// src/App.jsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { useStore } from '@core/store'
import { useLanguage } from '@core/i18n/LanguageContext'
import Sidebar from '@shared/components/navigation/Sidebar'
import Home from '@features/home/Home'
import Options from '@features/options/Options'
import Trimmer from '@features/trimmer/Trimmer'
import Editor from '@features/editor/Editor'
import Sequencer from '@features/sequencer/Sequencer'
import Guide from '@features/guide/Guide'
import Stats from '@features/stats/Stats'
import Presentation from '@features/presentation/Presentation'
import Toast from '@shared/components/ui/Toast'
import QuitConfirm from '@shared/components/modals/QuitConfirm'
import WelcomeScreen from '@features/welcome/WelcomeScreen'
import Tutorial from '@shared/components/ui/Tutorial'
import HelpButton from '@shared/components/ui/HelpButton'
import EmojiPage from '@features/emoji/EmojiPage'
import { getItem, setItem } from '@shared/utils/appStorage'

import { playSound, stopAllSounds, setStoreRef } from '@core/services/AudioService'
import { warmupAudioContext } from '@core/services/AudioMixerService'

import { PluginProvider, usePlugins } from '@core/plugins/PluginContext'
import { usePluginPage } from '@core/plugins/hooks/usePluginPage'

import { NetworkProvider } from '@shared/contexts'

function PageWrapper({ children, pageId, onHelpClick }) {
  const showHelp = pageId !== 'guide'

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {children}
      {showHelp && <HelpButton onClick={() => onHelpClick(pageId)} />}
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL AVEC PLUGINS ────────────────────────────────────────
function AppContent({ store }) {
  const { t, currentLang } = useLanguage()
  const [currentPage, setCurrentPage] = useState('home')
  const [presentationMode, setPresentationMode] = useState(false)
  const [toasts, setToasts] = useState([])
  const [mixerInitialized, setMixerInitialized] = useState(false)
  const [isFirstLaunch, setIsFirstLaunch] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [tutorialPageId, setTutorialPageId] = useState('home')

  const { isPluginPage, getPage, pages, loaded: pluginsLoaded, pluginManager } = usePlugins()

  const {
    Component: PluginComponent,
    loading: pluginLoading,
    error: pluginError,
  } = usePluginPage(isPluginPage(currentPage) ? currentPage : null)

  const soundsRef = useRef([])
  const addToastRef = useRef(null)
  const switchToNextProfileRef = useRef(null)
  const toggleLoopRef = useRef(null)
  const playLocallyRef = useRef(true)
  const audioDeviceRef = useRef('default')
  const volumeRef = useRef(80)
  const setPresentationRef = useRef(null)
  const isQuittingRef = useRef(false)
  const isPopupBlockedRef = useRef(false)
  const blockTimerRef = useRef(null)
  const loopEnabledRef = useRef(false)

  useEffect(() => {
    setStoreRef(store)
  }, [store])

  useEffect(() => {
    if (store.loading) return
    const timer = setTimeout(() => {
      warmupAudioContext()
    }, 500)
    return () => clearTimeout(timer)
  }, [store.loading])

  useEffect(() => {
    soundsRef.current = store.sounds
  }, [store.sounds])
  useEffect(() => {
    switchToNextProfileRef.current = store.switchToNextProfile
  }, [store.switchToNextProfile])
  useEffect(() => {
    toggleLoopRef.current = store.toggleLoop
  }, [store.toggleLoop])
  useEffect(() => {
    playLocallyRef.current = store.playLocally
  }, [store.playLocally])
  useEffect(() => {
    audioDeviceRef.current = store.audioDevice
  }, [store.audioDevice])
  useEffect(() => {
    volumeRef.current = store.volume
  }, [store.volume])
  useEffect(() => {
    setPresentationRef.current = setPresentationMode
  }, [setPresentationMode])

  useEffect(() => {
    loopEnabledRef.current = store.loopEnabled
  }, [store.loopEnabled])

  const openTutorial = useCallback((pageId) => {
    setTutorialPageId(pageId)
    setShowTutorial(true)
  }, [])

  useEffect(() => {
    window.__startTutorial = openTutorial
    return () => {
      delete window.__startTutorial
    }
  }, [openTutorial])

  // navigation programmatique (pour les pages/plugins)
  useEffect(() => {
    window.__navigateTo = setCurrentPage
    return () => {
      delete window.__navigateTo
    }
  }, [])

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunchedBefore = await window.electronAPI.storeGet(
          'hasLaunchedBefore'
        )
        const tutorialHomeDone = await getItem('sounddeck-tutorial-home-done')

        if (!hasLaunchedBefore) {
          setIsFirstLaunch(true)
        } else if (tutorialHomeDone !== 'true' && tutorialHomeDone !== true) {
          setTimeout(() => setShowTutorial(true), 500)
        }
      } catch (e) {
        console.warn('⚠️ Erreur vérification premier lancement:', e)
        setIsFirstLaunch(false)
      }
    }
    checkFirstLaunch()
  }, [])

  useEffect(() => {
    if (store.loading) return
    if (isFirstLaunch === true) return
    if (!pluginsLoaded) return

    const PLUGIN_PAGE_IDS = ['discover', 'youtube', 'emoji-discover']

    if (PLUGIN_PAGE_IDS.includes(currentPage) && !isPluginPage(currentPage)) {
      setCurrentPage('home')
    }
  }, [currentPage, isPluginPage, pluginsLoaded, store.loading, isFirstLaunch])

  // Molette pour changer de profil
  useEffect(() => {
    const handleWheel = (e) => {
      const target = e.target
      const isOnSidebar =
        target.closest?.('aside') || target.closest?.('.sidebar')

      if (isOnSidebar && e.ctrlKey) {
        e.preventDefault()
        if (e.deltaY > 0) {
          store.switchToNextProfile?.()
        } else {
          const profiles = store.profiles || []
          const currentIndex = profiles.findIndex(
            (p) => p.id === store.currentProfileId
          )
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : profiles.length - 1
          store.switchProfile?.(profiles[prevIndex]?.id)
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [store.currentProfileId, store.profiles])

  // Popup de fermeture
  useEffect(() => {
    const blockPopup = () => {
      isPopupBlockedRef.current = true
      if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
      blockTimerRef.current = setTimeout(() => {
        isPopupBlockedRef.current = false
        blockTimerRef.current = null
      }, 1000)
    }

    const handleShowQuitConfirm = () => {
      if (isPopupBlockedRef.current) return
      if (document.hidden) return
      setShowQuitConfirm(true)
    }

    const handleHideQuitConfirm = () => {
      setShowQuitConfirm(false)
      blockPopup()
    }

    window.electronAPI?.onShowQuitConfirm?.(handleShowQuitConfirm)
    window.electronAPI?.onHideQuitConfirm?.(handleHideQuitConfirm)

    return () => {
      window.electronAPI?.removeAllListeners?.('show-quit-confirm')
      window.electronAPI?.removeAllListeners?.('hide-quit-confirm')
      if (blockTimerRef.current) {
        clearTimeout(blockTimerRef.current)
        blockTimerRef.current = null
      }
      isPopupBlockedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (store.loading) return
    if (!store.theme) return

    window.electronAPI.storeSet('theme', store.theme).catch((e) => {
      console.warn('⚠️ Erreur persist theme:', e)
    })
  }, [store.theme, store.loading])

  // Appliquer thème
  useEffect(() => {
    if (store.loading) return

    const effectiveTheme =
      store.theme === 'custom' && !store.customTheme
        ? 'dark'
        : store.theme || 'dark'

    document.documentElement.setAttribute('data-theme', effectiveTheme)

    if (effectiveTheme !== 'custom') {
      const colorKeys = [
        'bg-primary',
        'bg-secondary',
        'bg-tertiary',
        'bg-hover',
        'border',
        'text-primary',
        'text-secondary',
        'text-tertiary',
        'accent',
        'accent-light',
        'accent-hover',
        'success',
        'warning',
        'danger',
      ]
      colorKeys.forEach((key) => {
        document.documentElement.style.removeProperty(`--${key}`)
      })
    }

    const existing = document.getElementById('custom-theme-style')
    if (effectiveTheme === 'custom' && store.customTheme) {
      const c = store.customTheme
      const css = `
        [data-theme="custom"] {
          --bg-primary: ${c.bgPrimary};
          --bg-secondary: ${c.bgSecondary};
          --bg-tertiary: ${c.bgTertiary};
          --bg-hover: ${c.bgHover};
          --border: ${c.border};
          --text-primary: ${c.textPrimary};
          --text-secondary: ${c.textSecondary};
          --text-tertiary: ${c.textTertiary};
          --accent: ${c.accent};
          --accent-light: ${c.accentLight};
          --accent-hover: ${c.accentHover};
          --success: ${c.success};
          --warning: ${c.warning};
          --danger: ${c.danger};
        }
      `
      if (existing) existing.textContent = css
      else {
        const style = document.createElement('style')
        style.id = 'custom-theme-style'
        style.textContent = css
        document.head.appendChild(style)
      }
    } else if (existing) {
      existing.remove()
    }
  }, [store.theme, store.customTheme, store.loading])

  // Tray language
  useEffect(() => {
    if (window.electronAPI?.updateTrayLanguage) {
      window.electronAPI.updateTrayLanguage(currentLang)
    }
  }, [currentLang])

  // Init mixer
  useEffect(() => {
    if (store.loading) return
    if (mixerInitialized) return

    const initMixer = async () => {
      if (store.mixerEnabled && store.initMixerOnStartup) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        const success = await store.initMixerOnStartup()
        setMixerInitialized(true)
        if (!success) console.warn('⚠️ Échec init mixeur')
      } else {
        setMixerInitialized(true)
      }
    }
    initMixer()
  }, [
    store.loading,
    store.mixerEnabled,
    store.initMixerOnStartup,
    mixerInitialized,
  ])

  // Vérif mixer quand langue change
  useEffect(() => {
    if (!store.loading && store.mixerEnabled && mixerInitialized) {
      const checkMixer = async () => {
        try {
          const { isMixerOperational, repairMixer } = await import(
            '@core/services/AudioMixerService'
          )
          if (!isMixerOperational()) repairMixer()
        } catch (e) {
          console.warn('Erreur vérification mixeur:', e)
        }
      }
      checkMixer()
    }
  }, [currentLang, store.loading, store.mixerEnabled, mixerInitialized])

  // Vérif micro
  useEffect(() => {
    if (store.loading) return

    const checkMicrophoneDevice = async () => {
      if (store.microphoneDevice && store.microphoneDevice !== 'default') {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const audioInputs = devices.filter((d) => d.kind === 'audioinput')
          const deviceExists = audioInputs.some(
            (d) => d.deviceId === store.microphoneDevice
          )
          if (!deviceExists) await store.updateMicrophoneDeviceId('default')
        } catch (e) {
          console.warn('⚠️ Erreur vérif micro:', e)
        }
      }
    }
    checkMicrophoneDevice()
  }, [store.loading, store.microphoneDevice])

  // IPC listeners
  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onPlaySound((soundId) => {
      const sound = soundsRef.current.find((s) => s.id === soundId)
      if (sound) {
        playSound(
          sound,
          audioDeviceRef.current,
          volumeRef.current,
          false,
          playLocallyRef.current
        )
      }
    })

    window.electronAPI.onSwitchProfile(async () => {
      if (switchToNextProfileRef.current) {
        await switchToNextProfileRef.current()
        addToastRef.current?.(t('toastProfileChanged'), 'info')
      }
    })

    window.electronAPI.onToggleLoop(async () => {
      if (toggleLoopRef.current) toggleLoopRef.current()
      addToastRef.current?.(
        loopEnabledRef.current ? t('toastLoopOff') : t('toastLoopOn'),
        'info'
      )
    })

    window.electronAPI.onStopAllSounds(() => {
      stopAllSounds()
      addToastRef.current?.(t('toastAllStopped'), 'info')
    })

    window.electronAPI.onTogglePresentation(() => {
      setPresentationRef.current?.((prev) => !prev)
    })

    return () => {
      window.electronAPI.removeAllListeners('play-sound')
      window.electronAPI.removeAllListeners('switch-profile')
      window.electronAPI.removeAllListeners('toggle-loop')
      window.electronAPI.removeAllListeners('stop-all-sounds')
      window.electronAPI.removeAllListeners('toggle-presentation')
    }
  }, [store.mixerEnabled, t])

  const addToast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now() + '_' + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  useEffect(() => {
    addToastRef.current = addToast
  }, [addToast])

  const renderPage = useCallback(() => {
    if (currentPage === 'home') {
      return (
        <PageWrapper pageId="home" onHelpClick={openTutorial}>
          <Home
            key={`home-${currentLang}`}
            store={store}
            addToast={addToast}
            loopEnabled={store.loopEnabled}
          />
        </PageWrapper>
      )
    }
    if (currentPage === 'options') {
      return (
        <PageWrapper pageId="options" onHelpClick={openTutorial}>
          <Options
            key={`options-${currentLang}`}
            store={store}
            addToast={addToast}
          />
        </PageWrapper>
      )
    }
    if (currentPage === 'trimmer') {
      return (
        <PageWrapper pageId="trimmer" onHelpClick={openTutorial}>
          <Trimmer
            key={`trimmer-${currentLang}`}
            store={store}
            addToast={addToast}
          />
        </PageWrapper>
      )
    }
    if (currentPage === 'editor') {
      return (
        <PageWrapper pageId="editor" onHelpClick={openTutorial}>
          <Editor
            key={`editor-${currentLang}`}
            store={store}
            addToast={addToast}
          />
        </PageWrapper>
      )
    }
    if (currentPage === 'sequencer') {
      return (
        <PageWrapper pageId="sequencer" onHelpClick={openTutorial}>
          <Sequencer
            key={`sequencer-${currentLang}`}
            store={store}
            addToast={addToast}
          />
        </PageWrapper>
      )
    }
    if (currentPage === 'guide') {
      return (
        <PageWrapper pageId="guide" onHelpClick={openTutorial}>
          <Guide key={`guide-${currentLang}`} />
        </PageWrapper>
      )
    }
    if (currentPage === 'stats') {
      return (
        <PageWrapper pageId="stats" onHelpClick={openTutorial}>
          <Stats key={`stats-${currentLang}`} store={store} />
        </PageWrapper>
      )
    }

    // ✅ NOUVEAU : route "emoji" (page "Mes emojis")
    if (currentPage === 'emoji') {
      return (
        <PageWrapper pageId="emoji" onHelpClick={openTutorial}>
          <EmojiPage
            key={`emoji-${currentLang}`}
            store={store}
            addToast={addToast}
            onNavigate={setCurrentPage}
          />
        </PageWrapper>
      )
    }

    if (isPluginPage(currentPage)) {
      if (pluginLoading) {
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              gap: 12,
            }}
          >
            <i
              className="ti ti-loader"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <span>{t('appLoading')}</span>
          </div>
        )
      }

      if (pluginError) {
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--danger)',
              gap: 12,
              padding: 20,
              textAlign: 'center',
            }}
          >
            <i className="ti ti-alert-triangle" style={{ fontSize: 32 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>{t('error')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {pluginError}
            </div>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setCurrentPage('home')}
            >
              {t('close')}
            </button>
          </div>
        )
      }

      if (PluginComponent) {
        return (
          <PageWrapper pageId={currentPage} onHelpClick={openTutorial}>
            <PluginComponent
              key={`plugin-${currentPage}-${currentLang}`}
              store={store}
              addToast={addToast}
            />
          </PageWrapper>
        )
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-tertiary)',
            gap: 12,
          }}
        >
          <i className="ti ti-puzzle" style={{ fontSize: 32 }} />
          <div style={{ fontSize: 16 }}>{t('optionsPlugins')}</div>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setCurrentPage('home')}
          >
            {t('close')}
          </button>
        </div>
      )
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-tertiary)',
          gap: 12,
        }}
      >
        <i className="ti ti-404" style={{ fontSize: 32 }} />
        <div style={{ fontSize: 16 }}>404</div>
      </div>
    )
  }, [
    currentPage,
    currentLang,
    store,
    addToast,
    pluginLoading,
    pluginError,
    PluginComponent,
    isPluginPage,
    openTutorial,
    t,
  ])

  if (store.loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <i
          className="ti ti-speakerphone"
          style={{ fontSize: 32, color: 'var(--accent)' }}
        />
        <span>{t('appLoading')}</span>
      </div>
    )
  }

  if (isFirstLaunch === true) {
    return <WelcomeScreen onComplete={() => setIsFirstLaunch(false)} />
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      <Sidebar
        key={`sidebar-${store.sidebarVersion}-${currentLang}`}
        profiles={store.profiles}
        sounds={store.sounds}
        currentProfileId={store.currentProfileId}
        currentPage={currentPage}
        onSwitchProfile={store.switchProfile}
        onChangePage={setCurrentPage}
        onCreateProfile={store.createProfile}
        onToggleLoop={store.toggleLoop}
        loopEnabled={store.loopEnabled}
        volume={store.volume}
        onVolumeChange={store.updateVolume}
        onStopAll={() => {
          stopAllSounds()
          addToast(t('toastAllStopped'), 'info')
        }}
        onPresentation={() => setPresentationMode(true)}
        addToast={addToast}
        onReorderProfiles={store.reorderProfiles}
        sidebarConfig={store.sidebarConfig}
        sidebarEditMode={store.sidebarEditMode}
        sidebarVersion={store.sidebarVersion}
        pluginPages={pages}
        isPluginPage={isPluginPage}
      />

      <main
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderPage()}
      </main>

      <Toast toasts={toasts} />

      {presentationMode && (
        <Presentation
          key={`presentation-${currentLang}`}
          store={store}
          onExit={() => setPresentationMode(false)}
        />
      )}

      {showQuitConfirm && (
        <QuitConfirm
          key={`quitconfirm-${currentLang}`}
          onClose={() => setShowQuitConfirm(false)}
        />
      )}

      {showTutorial && (
        <Tutorial
          key={`tutorial-${currentLang}`}
          pageId={tutorialPageId}
          onComplete={() => setShowTutorial(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── WRAPPER AVEC PLUGIN PROVIDER ────────────────────────────────────────────

export default function App() {
  const store = useStore()

  if (store.loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <i
          className="ti ti-speakerphone"
          style={{ fontSize: 32, color: 'var(--accent)' }}
        />
        <span>Chargement de SoundDeck...</span>
      </div>
    )
  }

  return (
    <NetworkProvider>
      <PluginProvider store={store}>
        <AppContent store={store} />
      </PluginProvider>
    </NetworkProvider>
  )
}