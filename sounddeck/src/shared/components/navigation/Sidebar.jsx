// src/shared/components/navigation/Sidebar.jsx
import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useCurrentPlaying } from '@shared/hooks/useCurrentPlaying'
import { useAutoUpdater } from '@shared/hooks/useAutoUpdater'
import { formatTime } from '@shared/utils/format'
import { togglePauseSound } from '@core/services/AudioService'
import {
  ACTION_IDS,
  DEFAULT_GROUPS,
  DEFAULT_ICONS,
  CORE_PAGES,
} from '@shared/constants/navigation'
import { buildFileUrl } from '@shared/utils/fileUrl'

const getDefaultLabels = (t) => ({
  home: t('mySounds'),
  discover: t('discover'),
  trimmer: t('trimmer'),
  editor: t('editor'),
  sequencer: t('sequencer'),
  youtube: t('youtube'),
  emoji: t('emojiPageTitle'),
  loop: t('loop'),
  shortcuts: t('shortcuts'),
  presentation: t('presentation'),
  guide: t('guide'),
  options: t('options'),
  stats: t('stats'),
})

function buildVisibleItemsSignature(visibleItems) {
  if (!visibleItems) return ''

  const parts = []

  const pushItem = (item) => {
    if (!item || !item.id) return
    parts.push(
      `${item.id}|${item.label || ''}|${item.icon || ''}|${item.group || ''}|${
        item.visible !== false ? 1 : 0
      }|${item.pinned ? 1 : 0}`
    )
  }

  const pinned = visibleItems.pinned || []
  for (const item of pinned) pushItem(item)

  const groups = visibleItems.groups || {}
  const groupKeys = Object.keys(groups).sort()
  for (const key of groupKeys) {
    parts.push(`#${key}`)
    const items = groups[key] || []
    for (const item of items) pushItem(item)
  }

  return parts.join('§')
}

// ─── COMPOSANT : BANNIÈRE DE MISE À JOUR ─────────────────────────────────────

const UpdateBanner = memo(function UpdateBanner({
  status,
  version,
  progress,
  onDownload,
  onInstall,
  onOpenGithub,
  t,
}) {
  if (status === 'idle' || status === 'checking') return null

  const isDownloading = status === 'downloading'
  const isReady = status === 'downloaded'
  const hasError = status === 'error'

  const percent = progress?.percent ? Math.floor(progress.percent) : 0

  const handleClick = () => {
    if (isDownloading) return
    if (isReady) onInstall()
    else if (hasError) onOpenGithub()
    else onDownload()
  }

  const label = hasError
    ? t('updateRetryGithub')
    : isReady
      ? t('updateRestart')
      : isDownloading
        ? `${t('updateDownloading')} ${percent}%`
        : t('updateDownload')

  const icon = hasError
    ? 'ti-external-link'
    : isReady
      ? 'ti-refresh'
      : isDownloading
        ? 'ti-loader'
        : 'ti-download'

  return (
    <button
      onClick={handleClick}
      disabled={isDownloading}
      title={`${t('updateAvailable')} — v${version}`}
      style={{
        width: 'calc(100% - 16px)',
        margin: '6px 8px 4px',
        padding: '8px 10px',
        borderRadius: 8,
        background: isReady ? 'var(--success)' : 'var(--accent-light)',
        border: `1px solid ${isReady ? 'var(--success)' : 'var(--accent)'}`,
        color: isReady ? 'white' : 'var(--accent)',
        fontSize: 12,
        fontWeight: 600,
        cursor: isDownloading ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isDownloading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${percent}%`,
            background: 'var(--accent)',
            opacity: 0.25,
            transition: 'width 0.3s ease',
            pointerEvents: 'none',
          }}
        />
      )}
      <i
        className={`ti ${icon}`}
        style={{
          fontSize: 14,
          animation: isDownloading ? 'spin 1s linear infinite' : 'none',
          position: 'relative',
          zIndex: 1,
        }}
      />
      <span style={{ flex: 1, textAlign: 'left', position: 'relative', zIndex: 1 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 9,
          padding: '1px 6px',
          borderRadius: 10,
          background: isReady ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
          color: 'white',
          fontWeight: 700,
          position: 'relative',
          zIndex: 1,
        }}
      >
        v{version}
      </span>
    </button>
  )
})

// ─── COMPOSANT : LISTE DES SONS EN LECTURE (FEATURE multi-sons) ─────────────

const NowPlayingList = memo(function NowPlayingList({
  playingSounds,
  onTogglePause,
  onStop,
  t,
}) {
  if (!playingSounds || playingSounds.length === 0) return null

  const count = playingSounds.length

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 6,
        }}
      >
        <i
          className="ti ti-volume"
          style={{
            fontSize: 11,
            color: 'var(--accent)',
            animation: 'pulse 1.2s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('nowPlaying')}
        </span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            background: 'var(--bg-tertiary)',
            padding: '0 5px',
            borderRadius: 8,
            marginLeft: 'auto',
          }}
        >
          {count}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxHeight: 200,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 2,
        }}
      >
        {playingSounds.map((item) => (
          <NowPlayingItem
            key={item.id}
            item={item}
            onTogglePause={onTogglePause}
            onStop={onStop}
            t={t}
          />
        ))}
      </div>
    </div>
  )
})

const NowPlayingItem = memo(function NowPlayingItem({
  item,
  onTogglePause,
  onStop,
  t,
}) {
  const { sound, progress, isPaused } = item

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '5px 6px',
        borderRadius: 6,
        background: isPaused
          ? 'var(--bg-tertiary)'
          : 'rgba(124,111,247,0.08)',
        border: `1px solid ${
          isPaused ? 'var(--border)' : 'var(--accent)'
        }`,
        transition: 'all 0.15s',
        opacity: isPaused ? 0.75 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 0,
        }}
      >
        {sound.image ? (
          <img
            src={buildFileUrl(sound.image)}
            alt=""
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              objectFit: 'cover',
              flexShrink: 0,
              border: '1px solid var(--border)',
            }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <span
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            {sound.emoji || '🔊'}
          </span>
        )}

        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: isPaused ? 'var(--text-secondary)' : 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}
          title={sound.name}
        >
          {sound.name}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePause(item.id)
          }}
          title={isPaused ? t('resume') : t('pause')}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: isPaused ? 'var(--accent)' : 'var(--warning)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: 0,
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <i
            className={`ti ${
              isPaused ? 'ti-player-play-filled' : 'ti-player-pause-filled'
            }`}
            style={{ fontSize: 11 }}
          />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onStop(item.id)
          }}
          title={t('stopAll')}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(224,82,82,0.15)'
            e.currentTarget.style.color = 'var(--danger)'
            e.currentTarget.style.borderColor = 'var(--danger)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <i className="ti ti-player-stop-filled" style={{ fontSize: 10 }} />
        </button>
      </div>

      {progress ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingLeft: 28,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 3,
              background: 'var(--bg-tertiary)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(progress.ratio || 0) * 100}%`,
                background: isPaused ? 'var(--warning)' : 'var(--accent)',
                borderRadius: 2,
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 8,
              color: 'var(--text-tertiary)',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 54,
              textAlign: 'right',
            }}
          >
            {formatTime(progress.current)}/{formatTime(progress.duration)}
          </span>
        </div>
      ) : (
        isPaused && (
          <div
            style={{
              fontSize: 9,
              color: 'var(--text-tertiary)',
              fontStyle: 'italic',
              paddingLeft: 28,
            }}
          >
            ⏸️ {t('paused')}
          </div>
        )
      )}
    </div>
  )
})

// ─── SIDEBAR PRINCIPAL ───────────────────────────────────────────────────

const Sidebar = memo(
  function Sidebar({
    profiles,
    sounds,
    currentProfileId,
    currentPage,
    onSwitchProfile,
    onChangePage,
    onCreateProfile,
    onToggleLoop,
    loopEnabled,
    volume,
    onVolumeChange,
    onStopAll,
    onPresentation,
    addToast,
    onReorderProfiles,
    sidebarConfig,
    sidebarEditMode,
    sidebarVersion = 0,
    pluginPages = [],
    isPluginPage = () => false,
  }) {
    const { t } = useLanguage()
    const [newProfileName, setNewProfileName] = useState('')
    const [showNewProfile, setShowNewProfile] = useState(false)
    const [shortcutsEnabled, setShortcutsEnabled] = useState(true)

    const [draggedProfileId, setDraggedProfileId] = useState(null)
    const [dragOverProfileId, setDragOverProfileId] = useState(null)

    const updater = useAutoUpdater()

    const {
      playingSounds,
      togglePause: togglePauseSoundById,
      stop: stopSoundById,
    } = useCurrentPlaying(sounds)

    const showNowPlaying =
      (currentPage === 'home' || currentPage === 'sequencer') &&
      playingSounds.length > 0

    const stableVisibleItemsRef = useRef({ pinned: [], groups: {} })
    const [visibleItems, setVisibleItems] = useState({ pinned: [], groups: {} })

    const CORE_PAGE_IDS = useMemo(
      () => new Set(CORE_PAGES.map((p) => p.id)),
      []
    )

    const ACTION_IDS_SET = useMemo(() => new Set(ACTION_IDS), [])

    const pluginPageIds = useMemo(
      () =>
        new Set(
          (pluginPages || [])
            .filter((p) => p.isPlugin && p.sidebarVisible !== false)
            .map((p) => p.id)
        ),
      [pluginPages]
    )

    useEffect(() => {
      window.electronAPI
        .getGlobalShortcutsState()
        .then((enabled) => {
          setShortcutsEnabled(enabled)
        })
        .catch(() => {})

      window.electronAPI.onShortcutsToggle((enabled) => {
        setShortcutsEnabled(enabled)
      })

      return () => {
        window.electronAPI.removeAllListeners('shortcuts-toggle')
      }
    }, [])

    useEffect(() => {
      if (!sidebarConfig || !sidebarConfig.items) {
        const empty = { pinned: [], groups: {} }
        if (
          buildVisibleItemsSignature(stableVisibleItemsRef.current) !==
          buildVisibleItemsSignature(empty)
        ) {
          stableVisibleItemsRef.current = empty
          setVisibleItems(empty)
        }
        return
      }

      const defaultLabels = getDefaultLabels(t)

      const updatedItems = sidebarConfig.items.map((item) => ({
        ...item,
        label: getItemLabel(item, defaultLabels),
        icon: getItemIcon(item),
        group: getItemGroup(item),
      }))

      const visible = updatedItems.filter((item) => {
        if (item.visible === false) return false
        const id = item.id
        if (!id) return false
        if (id.startsWith('profile-')) return true
        if (CORE_PAGE_IDS.has(id)) return true
        if (ACTION_IDS_SET.has(id)) return true
        return pluginPageIds.has(id)
      })
      const pinned = visible.filter((item) => item.pinned === true)
      const others = visible.filter((item) => item.pinned !== true)

      const groups = {}
      others.forEach((item) => {
        const groupKey = item.group || 'other'
        if (!groups[groupKey]) groups[groupKey] = []
        groups[groupKey].push(item)
      })

      const newVisibleItems = { pinned, groups }

      if (
        buildVisibleItemsSignature(stableVisibleItemsRef.current) !==
        buildVisibleItemsSignature(newVisibleItems)
      ) {
        stableVisibleItemsRef.current = newVisibleItems
        setVisibleItems(newVisibleItems)
      }
    }, [
      sidebarConfig,
      t,
      profiles,
      pluginPages,
      CORE_PAGE_IDS,
      ACTION_IDS_SET,
      pluginPageIds,
    ])

    const getItemLabel = (item, defaultLabels) => {
      if (item.id && item.id.startsWith('profile-')) {
        const profileId = item.id.replace('profile-', '')
        const profile = profiles.find((p) => p.id === profileId)
        return profile?.name || item.label || profileId
      }

      if (item.id && defaultLabels[item.id]) {
        return defaultLabels[item.id]
      }

      return item.label || item.id
    }

    const getItemIcon = (item) => {
      if (item.id && DEFAULT_ICONS[item.id]) return DEFAULT_ICONS[item.id]
      return item.icon || 'ti-circle'
    }

    const getItemGroup = (item) => {
      if (item.id && DEFAULT_GROUPS[item.id]) return DEFAULT_GROUPS[item.id]
      return item.group || 'other'
    }

    const handleCreateProfile = async () => {
      if (!newProfileName.trim()) return
      await onCreateProfile(newProfileName.trim())
      setNewProfileName('')
      setShowNewProfile(false)
      addToast(
        `${t('newProfile')} "${newProfileName.trim()}" ${t('created')}`,
        'success'
      )
    }

    const handleToggleShortcuts = async () => {
      try {
        const newState = await window.electronAPI.toggleGlobalShortcuts()
        setShortcutsEnabled(newState)
        addToast(
          newState ? t('shortcutsActivated') : t('shortcutsDeactivated'),
          'info'
        )
      } catch (e) {
        console.error('Erreur toggle shortcuts:', e)
      }
    }

    const handleProfileDragStart = (e, profileId) => {
      if (profileId === 'all') {
        e.preventDefault()
        return
      }
      setDraggedProfileId(profileId)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', profileId)
      setTimeout(() => {
        if (e.target) e.target.style.opacity = '0.4'
      }, 0)
    }

    const handleProfileDragEnd = (e) => {
      if (e.target) e.target.style.opacity = '1'
      setDraggedProfileId(null)
      setDragOverProfileId(null)
    }

    const handleProfileDragOver = (e, profileId) => {
      e.preventDefault()
      if (profileId === 'all') return
      setDragOverProfileId(profileId)
    }

    const handleProfileDragLeave = () => {
      setDragOverProfileId(null)
    }

    const handleProfileDrop = async (e, targetProfileId) => {
      e.preventDefault()
      if (targetProfileId === 'all') return

      const sourceId = e.dataTransfer.getData('text/plain')
      if (!sourceId || sourceId === targetProfileId) {
        setDraggedProfileId(null)
        setDragOverProfileId(null)
        return
      }

      const userProfiles = profiles.filter((p) => p.id !== 'all')
      const startIndex = userProfiles.findIndex((p) => p.id === sourceId)
      const endIndex = userProfiles.findIndex((p) => p.id === targetProfileId)

      if (startIndex === -1 || endIndex === -1) {
        setDraggedProfileId(null)
        setDragOverProfileId(null)
        return
      }

      const success = await onReorderProfiles(startIndex, endIndex)
      if (success) addToast(t('profileMoved'), 'success')

      setDraggedProfileId(null)
      setDragOverProfileId(null)
    }

    const isItemActive = (itemId) => {
      if (!itemId) return false
      if (itemId === currentPage) return true
      if (itemId.startsWith('profile-')) {
        return (
          currentProfileId === itemId.replace('profile-', '') &&
          currentPage === 'home'
        )
      }
      if (itemId && isPluginPage(itemId)) return currentPage === itemId
      return false
    }

    const handleNavClick = (itemId) => {
      if (itemId === 'home') onChangePage('home')
      else if (itemId === 'discover') onChangePage('discover')
      else if (itemId === 'trimmer') onChangePage('trimmer')
      else if (itemId === 'editor') onChangePage('editor')
      else if (itemId === 'sequencer') onChangePage('sequencer')
      else if (itemId === 'youtube') onChangePage('youtube')
      else if (itemId === 'emoji') onChangePage('emoji')
      else if (itemId === 'guide') onChangePage('guide')
      else if (itemId === 'options') onChangePage('options')
      else if (itemId === 'stats') onChangePage('stats')
      else onChangePage(itemId)
    }

    const renderNavItem = (item) => {
      const isAction = ACTION_IDS.includes(item.id)
      const isPlugin = item.isPlugin || false

      return (
        <SidebarItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          active={isItemActive(item.id)}
          onClick={() => handleNavClick(item.id)}
          isAction={isAction}
          isPlugin={isPlugin}
        />
      )
    }

    const renderProfileItem = (profile, showDragHandle = false) => {
      if (!profile) return null

      const isDragging = draggedProfileId === profile.id
      const isDragOver = dragOverProfileId === profile.id && !isDragging

      if (profile.id === 'all') {
        return (
          <SidebarItem
            key={profile.id}
            icon="ti-stack"
            label={t('allSounds')}
            active={currentProfileId === profile.id && currentPage === 'home'}
            dot={currentProfileId === profile.id}
            onClick={() => {
              onSwitchProfile(profile.id)
              onChangePage('home')
            }}
          />
        )
      }

      return (
        <div
          key={profile.id}
          draggable={true}
          onDragStart={(e) => handleProfileDragStart(e, profile.id)}
          onDragEnd={handleProfileDragEnd}
          onDragOver={(e) => handleProfileDragOver(e, profile.id)}
          onDragLeave={handleProfileDragLeave}
          onDrop={(e) => handleProfileDrop(e, profile.id)}
          style={{
            opacity: isDragging ? 0.3 : 1,
            transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.15s, opacity 0.15s',
            position: 'relative',
            zIndex: isDragging ? 10 : 1,
            cursor: 'grab',
          }}
        >
          {isDragOver && (
            <div
              style={{
                position: 'absolute',
                top: -2,
                left: 4,
                right: 4,
                height: 2,
                background: 'var(--accent)',
                borderRadius: 1,
                pointerEvents: 'none',
                zIndex: 5,
                animation: 'fadeIn 0.15s ease',
              }}
            />
          )}
          <SidebarItem
            icon="ti-user"
            label={profile.name}
            active={currentProfileId === profile.id && currentPage === 'home'}
            dot={currentProfileId === profile.id}
            onClick={() => {
              onSwitchProfile(profile.id)
              onChangePage('home')
            }}
            showDragHandle={showDragHandle}
            isProfile={true}
          />
        </div>
      )
    }

    const renderActionItem = (item) => {
      if (item.id === 'loop') {
        return (
          <button
            key={item.id}
            onClick={onToggleLoop}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 8px',
              borderRadius: 8,
              background: loopEnabled
                ? 'rgba(29,158,117,0.15)'
                : 'var(--bg-tertiary)',
              border: `1px solid ${
                loopEnabled ? 'var(--success)' : 'var(--border)'
              }`,
              color: loopEnabled ? 'var(--success)' : 'var(--text-tertiary)',
              fontSize: 12,
              fontWeight: loopEnabled ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <i className="ti ti-repeat" style={{ fontSize: 15 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{t('loop')}</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                background: loopEnabled ? 'var(--success)' : 'var(--border)',
                color: loopEnabled ? 'white' : 'var(--text-tertiary)',
              }}
            >
              {loopEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        )
      }
      if (item.id === 'shortcuts') {
        return (
          <button
            key={item.id}
            onClick={handleToggleShortcuts}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 8px',
              borderRadius: 8,
              background: shortcutsEnabled
                ? 'rgba(124,111,247,0.15)'
                : 'rgba(224,82,82,0.15)',
              border: `1px solid ${
                shortcutsEnabled ? 'var(--accent)' : 'var(--danger)'
              }`,
              color: shortcutsEnabled ? 'var(--accent)' : 'var(--danger)',
              fontSize: 12,
              fontWeight: shortcutsEnabled ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <i
              className={`ti ${
                shortcutsEnabled ? 'ti-keyboard' : 'ti-keyboard-off'
              }`}
              style={{ fontSize: 15 }}
            />
            <span style={{ flex: 1, textAlign: 'left' }}>
              {t('shortcuts')}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                background: shortcutsEnabled
                  ? 'var(--accent)'
                  : 'var(--danger)',
                color: 'white',
              }}
            >
              {shortcutsEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        )
      }
      if (item.id === 'presentation') {
        return (
          <button
            key={item.id}
            onClick={onPresentation}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 8px',
              borderRadius: 8,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <i className="ti ti-layout-grid" style={{ fontSize: 15 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              {t('presentation')}
            </span>
            <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
          </button>
        )
      }
      return null
    }

    const sectionOrder = sidebarConfig?.sectionOrder || [
      'pinned',
      'profiles',
      'navigation',
      'actions',
      'footer',
    ]

    let orderedSections = [...sectionOrder]
    const footerIdx = orderedSections.indexOf('footer')
    if (footerIdx !== -1 && footerIdx < orderedSections.length - 1) {
      const [footer] = orderedSections.splice(footerIdx, 1)
      orderedSections.push(footer)
    }
    const pinnedIdx = orderedSections.indexOf('pinned')
    if (pinnedIdx > 0) {
      const [pinned] = orderedSections.splice(pinnedIdx, 1)
      orderedSections.unshift(pinned)
    }

    const userFixedSections = sidebarConfig?.fixedSections || []

    const sectionsWithContent = orderedSections.filter((section) => {
      if (section === 'pinned') return visibleItems.pinned.length > 0
      return visibleItems.groups?.[section]?.length > 0
    })

    const footerSection = 'footer'

    const fixedSectionsList = userFixedSections.filter(
      (s) => s !== 'footer' && sectionsWithContent.includes(s)
    )

    const maxFixedSections = 2
    const limitedFixedSections = fixedSectionsList.slice(0, maxFixedSections)

    const scrollableSections = sectionsWithContent.filter(
      (s) => s !== footerSection && !limitedFixedSections.includes(s)
    )

    const renderGenericSection = (sectionKey, title) => {
      const items = visibleItems.groups[sectionKey] || []
      if (items.length === 0) return null

      const nonActionItems = items.filter(
        (item) => !ACTION_IDS.includes(item.id)
      )
      if (nonActionItems.length === 0) return null

      return (
        <div key={sectionKey}>
          <div style={{ padding: '8px 12px 4px', marginTop: 4 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 500,
              }}
            >
              {title}
            </div>
          </div>
          {nonActionItems.map((item) => renderNavItem(item))}
        </div>
      )
    }

    const isProfilePinned = (profileId) => {
      return (
        sidebarConfig?.items?.some(
          (i) => i.id === `profile-${profileId}` && i.pinned === true
        ) || false
      )
    }

    const renderSection = (sectionKey) => {
      if (sectionKey === 'pinned') {
        return (
          <div key="pinned">
            <div style={{ padding: '8px 12px 4px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <i className="ti ti-pinned" style={{ fontSize: 12 }} />{' '}
                {t('pinned')}
              </div>
            </div>
            {visibleItems.pinned.map((item) => {
              if (item.id.startsWith('profile-')) {
                const profileId = item.id.replace('profile-', '')
                const profile = profiles.find((p) => p.id === profileId)
                if (profile) return renderProfileItem(profile, true)
                return null
              }
              if (ACTION_IDS.includes(item.id)) return renderActionItem(item)
              return renderNavItem(item)
            })}
          </div>
        )
      }

      if (sectionKey === 'profiles') {
        const nonPinnedProfiles = profiles.filter(
          (p) => p.id !== 'all' && !isProfilePinned(p.id)
        )
        const allPinned = isProfilePinned('all')

        return (
          <div key="profiles" data-testid="profiles-section">
            <div style={{ padding: '8px 12px 4px', marginTop: 4 }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 500,
                }}
              >
                {t('profiles')}
              </div>
            </div>
            {!allPinned &&
              renderProfileItem(profiles.find((p) => p.id === 'all'))}
            {nonPinnedProfiles.map((profile) =>
              renderProfileItem(profile, true)
            )}
            {showNewProfile ? (
              <div
                style={{
                  padding: '4px 8px',
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center',
                }}
              >
                <input
                  autoFocus
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProfile()
                    if (e.key === 'Escape') setShowNewProfile(false)
                  }}
                  placeholder={t('newProfile')}
                  className="input-sm"
                  style={{
                    flex: 1,
                    minHeight: 28,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                  }}
                />
                <button
                  className="btn-primary btn-sm"
                  onClick={handleCreateProfile}
                  style={{
                    minHeight: 28,
                    minWidth: 28,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: 14 }} />
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setShowNewProfile(false)}
                  style={{
                    minHeight: 28,
                    minWidth: 28,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 14 }} />
                </button>
              </div>
            ) : (
              <SidebarItem
                icon="ti-plus"
                label={t('newProfile')}
                muted
                onClick={() => setShowNewProfile(true)}
                testId="new-profile-button"
              />
            )}
          </div>
        )
      }

      if (sectionKey === 'navigation') {
        return renderGenericSection('navigation', t('navigation'))
      }

      if (sectionKey === 'actions') {
        const items = visibleItems.groups.actions || []
        const nonPinnedActions = items.filter((item) => {
          const isPinned = sidebarConfig?.items?.find(
            (i) => i.id === item.id && i.pinned
          )
          return !isPinned
        })
        const allActionItems = nonPinnedActions.filter((item) =>
          ACTION_IDS.includes(item.id)
        )

        if (allActionItems.length === 0) return null

        return (
          <div key="actions">
            <div style={{ padding: '8px 12px 4px', marginTop: 4 }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 500,
                }}
              >
                ⚡ {t('actions')}
              </div>
            </div>
            <div style={{ margin: '0 8px' }}>
              {allActionItems.map((item) => renderActionItem(item))}
            </div>
          </div>
        )
      }

      return null
    }

    const renderFooter = () => {
      const footerItems = visibleItems.groups.footer || []
      const showUpdate = updater.status !== 'idle' && updater.status !== 'checking'

      if (footerItems.length === 0 && !showUpdate) return null

      return (
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--border)',
            padding: '4px 0 8px',
            background: 'var(--bg-secondary)',
          }}
        >
          {showUpdate && (
            <UpdateBanner
              status={updater.status}
              version={updater.version}
              progress={updater.progress}
              onDownload={updater.download}
              onInstall={updater.install}
              onOpenGithub={updater.openGithub}
              t={t}
            />
          )}
          {footerItems.map((item) => renderNavItem(item))}
        </div>
      )
    }

    const renderFixedSections = () => {
      if (limitedFixedSections.length === 0) return null

      const sortedFixedSections = [...limitedFixedSections].sort((a, b) => {
        return sectionsWithContent.indexOf(a) - sectionsWithContent.indexOf(b)
      })

      return (
        <div style={{ flexShrink: 0 }}>
          {sortedFixedSections.map((sectionKey, index) => {
            const isLast = index === sortedFixedSections.length - 1
            return (
              <div
                key={`fixed-${sectionKey}`}
                style={{
                  borderBottom: isLast ? '1px solid var(--border)' : 'none',
                  paddingBottom: isLast ? 4 : 0,
                }}
              >
                {renderSection(sectionKey)}
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <aside
        style={{
          width: 200,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100vh',
        }}
      >
        <div
          style={{
            padding: showNowPlaying ? '8px 10px 10px' : '14px 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            minHeight: showNowPlaying ? 'auto' : 58,
            transition: 'all 0.2s ease',
          }}
        >
          {showNowPlaying ? (
            <NowPlayingList
              playingSounds={playingSounds}
              onTogglePause={togglePauseSoundById}
              onStop={stopSoundById}
              t={t}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i
                className="ti ti-speakerphone"
                style={{ fontSize: 22, color: 'var(--accent)' }}
              />
              <span style={{ fontWeight: 600, fontSize: 15 }}>SoundDeck</span>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <i
                className={`ti ${
                  volume === 0
                    ? 'ti-volume-off'
                    : volume < 50
                      ? 'ti-volume-2'
                      : 'ti-volume'
                }`}
                style={{ fontSize: 14, color: 'var(--text-tertiary)' }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}
              >
                {t('volume')}
              </span>
            </div>
            <span
              style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}
            >
              {volume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--accent)',
              cursor: 'pointer',
            }}
          />
          <button
            onClick={onStopAll}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '5px 0',
              background: 'rgba(224,82,82,0.1)',
              border: '1px solid rgba(224,82,82,0.3)',
              borderRadius: 6,
              color: 'var(--danger)',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            <i className="ti ti-player-stop-filled" /> {t('stopAll')}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {scrollableSections.map((sectionKey) => renderSection(sectionKey))}
        </div>

        {renderFixedSections()}

        {renderFooter()}
      </aside>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.sidebarVersion === nextProps.sidebarVersion &&
      prevProps.currentPage === nextProps.currentPage &&
      prevProps.currentProfileId === nextProps.currentProfileId &&
      prevProps.loopEnabled === nextProps.loopEnabled &&
      prevProps.volume === nextProps.volume &&
      prevProps.sounds === nextProps.sounds &&
      prevProps.profiles === nextProps.profiles &&
      prevProps.sidebarConfig === nextProps.sidebarConfig &&
      prevProps.pluginPages === nextProps.pluginPages
    )
  }
)

export default Sidebar

// ─── SidebarItem ────────────────────────────────────────────────────────────

function SidebarItem({
  icon,
  label,
  active,
  dot,
  muted,
  onClick,
  showDragHandle = false,
  isAction = false,
  isProfile = false,
  isPlugin = false,
  testId,
}) {
  const isActive = active || false

  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`sidebar-item ${isActive ? 'active' : ''} ${
        muted ? 'muted' : ''
      }`}
      style={{
        cursor: showDragHandle ? 'grab' : 'pointer',
        color: isAction && !isActive ? 'var(--accent)' : undefined,
        fontWeight: isAction && !isActive ? 500 : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isActive && !muted)
          e.currentTarget.style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!isActive && !muted)
          e.currentTarget.style.background = 'transparent'
      }}
    >
      {showDragHandle && (
        <i
          className="ti ti-grip-vertical"
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            opacity: 0.4,
          }}
        />
      )}
      {!showDragHandle && (
        <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
      )}
      <span className="label">{label}</span>
      {dot && <span className="dot" />}
      {isAction && !isActive && !isProfile && (
        <span style={{ fontSize: 9, color: 'var(--accent)', opacity: 0.6 }}>
          ⚡
        </span>
      )}
      {isPlugin && !isActive && (
        <span
          style={{
            fontSize: 8,
            color: 'var(--accent)',
            background: 'var(--accent-light)',
            padding: '1px 6px',
            borderRadius: 10,
            marginLeft: 'auto',
            opacity: 0.7,
          }}
        >
          🔌
        </span>
      )}
      {isPlugin && isActive && (
        <span
          style={{
            fontSize: 8,
            color: 'white',
            background: 'var(--accent)',
            padding: '1px 6px',
            borderRadius: 10,
            marginLeft: 'auto',
          }}
        >
          Plugin
        </span>
      )}
    </button>
  )
}