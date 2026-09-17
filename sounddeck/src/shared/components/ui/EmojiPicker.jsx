// src/shared/components/ui/EmojiPicker.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useEmojis } from '@shared/hooks/useEmojis'
import { isValidEmoji } from '@shared/constants/emojis'

const DEFAULT_SHOW_COUNT = 24

export default function EmojiPicker({
  isOpen,
  onClose,
  onSelect,
  currentEmoji = null,
  onManageClick,
  defaultEmojisCount = DEFAULT_SHOW_COUNT,
  showManageLink = true,
  zIndex = 99999,
}) {
  const { t } = useLanguage()
  const {
    defaultEmojis,
    customEmojis,
    customGrouped,
    addEmoji,
    getCategoryInfo,
  } = useEmojis()

  const [expanded, setExpanded] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState('')
  const [justAdded, setJustAdded] = useState(null)

  const manualInputRef = useRef(null)

  // Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setExpanded(false)
      setShowManualAdd(false)
      setManualValue('')
      setManualError('')
      setJustAdded(null)
    }
  }, [isOpen])

  // Focus input ajout manuel
  useEffect(() => {
    if (showManualAdd && manualInputRef.current) {
      manualInputRef.current.focus()
    }
  }, [showManualAdd])

  // Escape ferme le picker
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const displayedDefault = useMemo(() => {
    if (expanded) return defaultEmojis
    return defaultEmojis.slice(0, defaultEmojisCount)
  }, [defaultEmojis, expanded, defaultEmojisCount])

  const hasMoreContent = useMemo(() => {
    if (defaultEmojis.length > defaultEmojisCount) return true
    if (customEmojis.length > 0) return true
    return false
  }, [defaultEmojis.length, defaultEmojisCount, customEmojis.length])

  const handleSelect = (emoji) => {
    onSelect?.(emoji)
    onClose?.()
  }

  const handleManualAdd = async () => {
    setManualError('')
    const trimmed = manualValue.trim()
    if (!trimmed) return

    if (!isValidEmoji(trimmed)) {
      setManualError(t('emojiPickerAddInvalid'))
      return
    }

    const result = await addEmoji(trimmed, null)
    if (result.success) {
      setJustAdded(trimmed)
      setManualValue('')
      setShowManualAdd(false)
      setTimeout(() => setJustAdded(null), 2000)
    } else {
      setManualError(result.error || t('emojiPickerAddError'))
    }
  }

  if (!isOpen) return null

  // ✅ Groupes customs : { animals: [...], __uncategorized__: [...] }
  const customGroups = Object.entries(customGrouped).map(([catId, emojis]) => {
    const info =
      catId === '__uncategorized__'
        ? {
            id: '__uncategorized__',
            label: t('emojiPickerUncategorized'),
            icon: 'ti-mood-smile',
          }
        : getCategoryInfo(catId) || {
            id: catId,
            label: catId,
            icon: 'ti-folder',
          }
    return { ...info, emojis }
  })

  return createPortal(
    <div
      data-testid="emoji-picker-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        // ✅ Option C : plus de blur, juste un voile léger
        background: 'rgba(0,0,0,0.55)',
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        data-testid="emoji-picker-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          // ✅ Option C : aligné sur les modales de l'app
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 14,
          width: 360,
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* ─── HEADER ────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {t('emojiPickerTitle')}
          </span>
          <button
            data-testid="emoji-picker-close-button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* ─── ZONE SCROLLABLE ──────────────────────────────────────── */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            marginRight: -8,
            paddingRight: 8,
          }}
        >
          {/* Section par défaut */}
          <Section title={t('emojiPickerDefaultSection')}>
            <Grid
              data-testid="emoji-picker-default-grid"
              emojis={displayedDefault}
              currentEmoji={currentEmoji}
              onSelect={handleSelect}
              dataTestIdPrefix="emoji-picker-default"
            />
          </Section>

          {/* Sections custom (dépliées uniquement) */}
          {expanded && (
            <>
              {customGroups.map((group) => (
                <Section
                  key={group.id}
                  title={group.label}
                  icon={group.icon}
                  data-testid={`emoji-picker-custom-group-${group.id}`}
                >
                  <Grid
                    emojis={group.emojis}
                    currentEmoji={currentEmoji}
                    onSelect={handleSelect}
                    dataTestIdPrefix={`emoji-picker-custom-${group.id}`}
                  />
                </Section>
              ))}

              {customEmojis.length === 0 && (
                <div
                  data-testid="emoji-picker-no-custom"
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    textAlign: 'center',
                    padding: '12px 0',
                    fontStyle: 'italic',
                  }}
                >
                  {t('emojiPickerNoCustom')}
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── FOOTER : 2 boutons + lien discret (Q2:B) ────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            paddingTop: 12,
            marginTop: 8,
            borderTop: '1px solid var(--border)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {hasMoreContent && !expanded && (
            <button
              data-testid="emoji-picker-show-more-button"
              onClick={() => setExpanded(true)}
              className="btn-secondary btn-sm"
              style={{ justifyContent: 'center', fontSize: 12 }}
            >
              <i className="ti ti-chevron-down" />
              {t('emojiPickerShowMore')}
            </button>
          )}

          {expanded && (
            <button
              data-testid="emoji-picker-show-less-button"
              onClick={() => setExpanded(false)}
              className="btn-secondary btn-sm"
              style={{ justifyContent: 'center', fontSize: 12 }}
            >
              <i className="ti ti-chevron-up" />
              {t('emojiPickerShowLess')}
            </button>
          )}

          {!showManualAdd && (
            <button
              data-testid="emoji-picker-add-manual-button"
              onClick={() => setShowManualAdd(true)}
              className="btn-secondary btn-sm"
              style={{ justifyContent: 'center', fontSize: 12 }}
            >
              <i className="ti ti-plus" />
              {t('emojiPickerAddManual')}
            </button>
          )}

          {/* ✅ Lien discret à droite */}
          {showManageLink && onManageClick && (
            <button
              data-testid="emoji-picker-manage-button"
              onClick={() => {
                onClose?.()
                onManageClick()
              }}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 11,
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'inherit',
                opacity: 0.85,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.85'
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              {t('emojiPickerManage')}
              <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
            </button>
          )}
        </div>

        {/* ─── INPUT AJOUT MANUEL ───────────────────────────────────── */}
        {showManualAdd && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={manualInputRef}
                data-testid="emoji-picker-add-manual-input"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualAdd()
                  if (e.key === 'Escape') {
                    setShowManualAdd(false)
                    setManualValue('')
                    setManualError('')
                  }
                }}
                placeholder={t('emojiPickerAddPlaceholder')}
                style={{ flex: 1, fontSize: 16, textAlign: 'center' }}
                maxLength={8}
              />
              <button
                data-testid="emoji-picker-add-manual-confirm"
                onClick={handleManualAdd}
                className="btn-primary btn-sm"
                disabled={!manualValue.trim()}
                style={{ minWidth: 60 }}
              >
                {t('emojiPickerAddConfirm')}
              </button>
              <button
                onClick={() => {
                  setShowManualAdd(false)
                  setManualValue('')
                  setManualError('')
                }}
                className="btn-secondary btn-sm"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            {manualError && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--danger)',
                  marginTop: 4,
                }}
              >
                <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
                {manualError}
              </div>
            )}
          </div>
        )}

        {/* ─── CONFIRMATION D'AJOUT ─────────────────────────────────── */}
        {justAdded && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--success)',
              textAlign: 'center',
              background: 'rgba(29,158,117,0.1)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--success)',
            }}
          >
            <i className="ti ti-check" style={{ marginRight: 4 }} />
            {t('emojiPickerAdded')} : {justAdded}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function Section({ title, icon, children, 'data-testid': dataTestId }) {
  return (
    <div data-testid={dataTestId} style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 11 }} />}
        {title}
      </div>
      {children}
    </div>
  )
}

function Grid({
  emojis,
  currentEmoji,
  onSelect,
  dataTestIdPrefix,
  'data-testid': dataTestId,
}) {
  return (
    <div
      data-testid={dataTestId}
      style={{
        display: 'grid',
        // ✅ Option C : cellules 32px au lieu de 38
        gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))',
        gap: 4,
        // ✅ Option C : fond sur la grille
        background: 'var(--bg-tertiary)',
        padding: 6,
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {emojis.map((emoji) => {
        const isActive = currentEmoji === emoji
        return (
          <button
            key={emoji}
            data-testid={`${dataTestIdPrefix}-${emoji}`}
            onClick={() => onSelect(emoji)}
            style={{
              width: 34,
              height: 34,
              fontSize: 18,
              borderRadius: 5,
              border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              background: isActive ? 'var(--accent-light)' : 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.transform = 'scale(1.08)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'transparent'
              }
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}

export { EmojiPicker }