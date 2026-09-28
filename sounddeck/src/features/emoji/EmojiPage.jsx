// src/features/emoji/EmojiPage.jsx
import React, { useState, useMemo, useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useEmojis } from '@shared/hooks/useEmojis'
import { usePlugins } from '@core/plugins/PluginContext'
import useConfirm from '@shared/hooks/useConfirm'

const PLUGIN_CATEGORY_LABELS = {
  smileys: 'emojiDiscoverCatSmileys',
  people: 'emojiDiscoverCatPeople',
  animals: 'emojiDiscoverCatAnimals',
  food: 'emojiDiscoverCatFood',
  travel: 'emojiDiscoverCatTravel',
  activities: 'emojiDiscoverCatActivities',
  objects: 'emojiDiscoverCatObjects',
  symbols: 'emojiDiscoverCatSymbols',
  flags: 'emojiDiscoverCatFlags',
}

const PLUGIN_CATEGORY_ICONS = {
  smileys: 'ti-mood-happy',
  people: 'ti-user',
  animals: 'ti-paw',
  food: 'ti-burger',
  travel: 'ti-plane',
  activities: 'ti-ball-basketball',
  objects: 'ti-bulb',
  symbols: 'ti-heart',
  flags: 'ti-flag',
}

export default function EmojiPage({ store, addToast }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const { pluginManager } = usePlugins()

  const {
    defaultEmojis,
    customEmojis,
    customGrouped,
    removeEmoji,
    removeCategory,
    addEmoji,
    getCategoryInfo,
    categories,
    loading,
  } = useEmojis()

  const [showManualAdd, setShowManualAdd] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState('')

  const totalCustom = customEmojis.length
  const totalDefault = defaultEmojis.length

  const getCustomCategoryInfo = useCallback(
    (catId) => {
      if (catId === '__uncategorized__') {
        return {
          label: t('emojiPickerUncategorized'),
          icon: 'ti-mood-smile',
        }
      }

      const coreInfo = getCategoryInfo(catId)
      if (coreInfo && coreInfo.labelKey) {
        return {
          label: t(coreInfo.labelKey) || coreInfo.label,
          icon: coreInfo.icon || 'ti-folder',
        }
      }

      const pluginKey = PLUGIN_CATEGORY_LABELS[catId]
      if (pluginKey) {
        return {
          label: t(pluginKey) || catId,
          icon: PLUGIN_CATEGORY_ICONS[catId] || 'ti-folder',
        }
      }

      return {
        label: coreInfo?.label || catId,
        icon: coreInfo?.icon || 'ti-folder',
      }
    },
    [t, getCategoryInfo]
  )

  // ─── HANDLERS ─────────────────────────────────────────────────────────
  const handleRemoveEmoji = useCallback(
    async (emoji) => {
      const confirmed = await confirm({
        title: t('emojiPageRemoveEmoji'),
        message: t('emojiPageRemoveEmojiConfirm').replace('{emoji}', emoji),
        type: 'warning',
        confirmText: t('remove'),
        cancelText: t('cancel'),
      })
      if (!confirmed) return

      const result = await removeEmoji(emoji)
      if (result.success) {
        addToast(t('emojiPageRemovedOne'), 'info')
      } else {
        addToast(result.error || t('error'), 'error')
      }
    },
    [confirm, removeEmoji, addToast, t]
  )

  const handleRemoveCategory = useCallback(
    async (categoryId, emojis) => {
      const confirmed = await confirm({
        title: t('emojiPageRemoveCategory'),
        message: t('emojiPageRemoveConfirm').replace('{count}', emojis.length),
        type: 'warning',
        confirmText: t('remove'),
        cancelText: t('cancel'),
      })
      if (!confirmed) return

      const result = await removeCategory(categoryId)
      if (result.success) {
        addToast(
          t('emojiPageRemoved').replace('{count}', result.removed),
          'info'
        )
      }
    },
    [confirm, removeCategory, addToast, t]
  )

  const handleAddManual = useCallback(async () => {
    setManualError('')
    const trimmed = manualValue.trim()
    if (!trimmed) return

    const result = await addEmoji(trimmed, null)
    if (result.success) {
      setManualValue('')
      setShowManualAdd(false)
      addToast(t('emojiPickerAdded'), 'success')
    } else {
      setManualError(result.error || t('emojiPickerAddError'))
    }
  }, [manualValue, addEmoji, addToast, t])

  const cancelManualAdd = useCallback(() => {
    setShowManualAdd(false)
    setManualValue('')
    setManualError('')
  }, [])

  const handleOpenDiscover = useCallback(async () => {
    const pluginAvailable =
      pluginManager.isPluginLoaded('emoji') &&
      pluginManager.isPluginPage('emoji-discover')

    if (!pluginAvailable) {
      const goToOptions = await confirm({
        title: t('emojiPagePluginRequired'),
        message: t('emojiPagePluginRequiredDesc'),
        type: 'info',
        confirmText: t('emojiPageOpenPluginInstaller'),
        cancelText: t('cancel'),
      })
      if (goToOptions && window.__navigateTo) {
        window.__navigateTo('options')
      }
      return
    }

    if (window.__navigateTo) {
      window.__navigateTo('emoji-discover')
    } else {
      addToast(t('emojiPageEmptyDesc'), 'info')
    }
  }, [pluginManager, confirm, addToast, t])

  // ─── RENDER ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex-center"
        style={{ height: '100%', color: 'var(--text-tertiary)' }}
      >
        <i
          className="ti ti-loader"
          style={{ animation: 'spin 1s linear infinite' }}
        />
      </div>
    )
  }

  const customGroupEntries = Object.entries(customGrouped)

  return (
    <>
      <div
        data-testid="emoji-page-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* ─── HEADER ────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 150 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i
                className="ti ti-mood-smile"
                style={{ color: 'var(--accent)' }}
              />
              {t('emojiPageTitle')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {t('emojiPageTotalCount').replace(
                '{count}',
                totalDefault + totalCustom
              )}
            </div>
          </div>

          <button
            data-testid="emoji-page-add-manual-button"
            className="btn-secondary btn-sm"
            onClick={() => setShowManualAdd(true)}
            style={{ minHeight: 34 }}
            title={t('emojiPickerAddManual')}
          >
            <i className="ti ti-plus" />
            {t('emojiPickerAddManual')}
          </button>

          <button
            data-testid="emoji-page-open-discover-button"
            className="btn-primary btn-sm"
            onClick={handleOpenDiscover}
            style={{ minHeight: 34 }}
          >
            <i className="ti ti-compass" />
            {t('emojiPageAddMore')}
          </button>
        </div>

        {/* Input ajout manuel */}
        {showManualAdd && (
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <i
              className="ti ti-mood-smile"
              style={{ color: 'var(--accent)', fontSize: 20, flexShrink: 0 }}
            />

            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                flexShrink: 0,
                overflow: 'hidden',
              }}
              title={t('emojiPickerAddPreview') || 'Prévisualisation'}
            >
              {manualValue.trim() || '❓'}
            </div>

            <input
              data-testid="emoji-page-add-manual-input"
              autoFocus
              value={manualValue}
              onChange={(e) => {
                setManualValue(e.target.value)
                setManualError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddManual()
                if (e.key === 'Escape') cancelManualAdd()
              }}
              placeholder={t('emojiPickerAddPlaceholder')}
              maxLength={40}
              className="input-sm"
              style={{
                width: 320,
                maxWidth: '100%',
                fontSize: 20,
                textAlign: 'center',
                padding: '8px 12px',
                letterSpacing: '0.05em',
              }}
            />

            <button
              data-testid="emoji-page-add-manual-confirm"
              onClick={handleAddManual}
              className="btn-primary btn-sm"
              disabled={!manualValue.trim()}
              style={{ minHeight: 36, padding: '8px 16px' }}
            >
              <i className="ti ti-check" /> {t('add')}
            </button>
            <button
              onClick={cancelManualAdd}
              className="btn-secondary btn-sm"
              style={{ minHeight: 36, padding: '8px 16px' }}
            >
              <i className="ti ti-x" /> {t('cancel')}
            </button>

            {manualError && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  background: 'rgba(224,82,82,0.1)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--danger)',
                }}
              >
                <i className="ti ti-alert-triangle" />
                {manualError}
              </span>
            )}
          </div>
        )}

        {/* ─── CONTENU SCROLLABLE ───────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
        >
          {/* ── Section : Mes emojis ajoutés ──────────────────────── */}
          <section
            data-testid="emoji-page-custom-section"
            style={{ marginBottom: 28 }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="ti ti-star" style={{ color: 'var(--accent)' }} />
              {t('emojiPageCustomSection')}
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
                ({totalCustom})
              </span>
            </div>

            {customGroupEntries.length === 0 && (
              <div
                data-testid="emoji-page-empty-state"
                className="drop-zone"
                style={{
                  cursor: 'default',
                  textAlign: 'center',
                }}
              >
                <i
                  className="ti ti-mood-smile"
                  style={{ fontSize: 32, display: 'block', marginBottom: 8 }}
                />
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  {t('emojiPageEmpty')}
                </div>
                <div style={{ fontSize: 12, marginBottom: 12 }}>
                  {t('emojiPageEmptyDesc')}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setShowManualAdd(true)}
                    style={{ minHeight: 32 }}
                  >
                    <i className="ti ti-plus" /> {t('emojiPickerAddManual')}
                  </button>
                  <button
                    className="btn-primary btn-sm"
                    onClick={handleOpenDiscover}
                    style={{ minHeight: 32 }}
                  >
                    <i className="ti ti-compass" /> {t('emojiPageAddMore')}
                  </button>
                </div>
              </div>
            )}

            {customGroupEntries.map(([catId, emojis]) => {
              const info = getCustomCategoryInfo(catId)

              return (
                <div
                  key={catId}
                  data-testid={`emoji-page-custom-group-${catId}`}
                  style={{ marginBottom: 16 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                      padding: '4px 8px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <i
                        className={`ti ${info.icon}`}
                        style={{ fontSize: 13 }}
                      />
                      {info.label}
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          fontWeight: 400,
                        }}
                      >
                        {t('emojiPageCategoryCount').replace(
                          '{count}',
                          emojis.length
                        )}
                      </span>
                    </div>

                    {catId !== '__uncategorized__' && (
                      <button
                        data-testid={`emoji-page-remove-category-${catId}`}
                        onClick={() => handleRemoveCategory(catId, emojis)}
                        className="btn-ghost btn-sm"
                        style={{
                          fontSize: 10,
                          color: 'var(--danger)',
                          padding: '2px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title={t('emojiPageRemoveCategory')}
                      >
                        <i className="ti ti-trash" />
                        {t('emojiPageRemoveCategory')}
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(44px, 1fr))',
                      gap: 6,
                    }}
                  >
                    {emojis.map((emoji) => (
                      <div
                        key={emoji}
                        data-testid={`emoji-page-item-${emoji}`}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 22,
                          cursor: 'default',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          const btn = e.currentTarget.querySelector(
                            '.emoji-remove-btn'
                          )
                          if (btn) btn.style.opacity = '1'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          const btn = e.currentTarget.querySelector(
                            '.emoji-remove-btn'
                          )
                          if (btn) btn.style.opacity = '0'
                        }}
                      >
                        {emoji}
                        <button
                          className="emoji-remove-btn"
                          data-testid={`emoji-page-remove-${emoji}`}
                          onClick={() => handleRemoveEmoji(emoji)}
                          title={t('emojiPageRemoveEmoji')}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'rgba(224,82,82,0.95)',
                            border: '2px solid var(--bg-secondary)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            padding: 0,
                            opacity: 0,
                            transition: 'opacity 0.15s, transform 0.15s',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.15)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                        >
                          <i className="ti ti-x" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>

          {/* ── Section : Emojis par défaut ───────────────────────── */}
          <section
            data-testid="emoji-page-default-section"
            style={{ marginBottom: 20 }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i
                className="ti ti-stack"
                style={{ color: 'var(--text-tertiary)' }}
              />
              {t('emojiPageDefaultSection')}
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
                ({totalDefault})
              </span>
            </div>

            {categories.map((cat) => (
              <div key={cat.id} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <i className={`ti ${cat.icon}`} style={{ fontSize: 12 }} />
                  {t(cat.labelKey) || cat.label}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(40px, 1fr))',
                    gap: 4,
                  }}
                >
                  {cat.emojis.slice(0, 20).map((emoji) => (
                    <div
                      key={emoji}
                      data-testid={`emoji-page-default-${emoji}`}
                      style={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 20,
                        opacity: 0.85,
                      }}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      <ConfirmWrapper />
    </>
  )
}