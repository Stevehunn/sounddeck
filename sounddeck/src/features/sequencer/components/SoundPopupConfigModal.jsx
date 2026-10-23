/**
 * @file Sound popup configuration modal.
 *
 * Shows a 3×3 grid (center disabled) representing the screen edges and
 * corners. Clicking a cell selects that position. A "Preview" button
 * triggers `previewSoundPopup` with the *selected* position (not the
 * currently-saved one) so the user can see the effect before confirming.
 *
 * The layout uses flexbox so the footer (Cancel / Confirm) always stays
 * visible even on short viewports.
 *
 * @see @core/services/SoundPopupService.js
 */

import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import {
  POPUP_POSITIONS,
  previewSoundPopup,
} from '@core/services/SoundPopupService'

/**
 * 3×3 grid of position cells. `null` = center (non-selectable).
 * @type {Array<Array<string|null>>}
 */
const GRID = [
  ['top-left', 'top-center', 'top-right'],
  ['center-left', null, 'center-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
]

/** Tabler icon per position. */
const POSITION_ICONS = {
  'top-left': 'ti-align-box-top-left',
  'top-center': 'ti-align-box-top-center',
  'top-right': 'ti-align-box-top-right',
  'center-left': 'ti-align-box-left-middle',
  'center-right': 'ti-align-box-right-middle',
  'bottom-left': 'ti-align-box-bottom-left',
  'bottom-center': 'ti-align-box-bottom-center',
  'bottom-right': 'ti-align-box-bottom-right',
}

/**
 * i18n key per card size. Reuses the existing `cardSizeSmall/Medium/Large`
 * keys from `@core/i18n/locales/<lang>/options.js` (no new keys needed).
 * @type {Record<'small'|'medium'|'large', string>}
 */
const SIZE_LABEL_KEYS = {
  small: 'cardSizeSmall',
  medium: 'cardSizeMedium',
  large: 'cardSizeLarge',
}

/**
 * Sound popup config modal.
 *
 * @param {Object} props
 * @param {string} props.initialPosition
 * @param {'small'|'medium'|'large'} [props.cardSize='medium']
 * @param {string} [props.theme='dark']
 * @param {Object|null} [props.customTheme=null]
 * @param {(position: string) => void} props.onValidate
 * @param {() => void} props.onClose
 * @returns {JSX.Element}
 */
export default function SoundPopupConfigModal({
  initialPosition,
  cardSize = 'medium',
  theme = 'dark',
  customTheme = null,
  onValidate,
  onClose,
}) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState(
    POPUP_POSITIONS.includes(initialPosition) ? initialPosition : 'top-right'
  )

  const handleValidate = () => onValidate(selected)

  const handlePreview = () => {
    previewSoundPopup({
      cardSize,
      theme,
      customTheme,
      // Send the SELECTED position (not the currently-saved one), so the
      // user can see the effect of their choice before confirming.
      position: selected,
    })
  }

  const sizeLabelKey = SIZE_LABEL_KEYS[cardSize] || SIZE_LABEL_KEYS.medium

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{
          width: 480,
          // Flex layout: scrollable content, footer always visible.
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable content */}
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 24px 16px',
          }}
        >
          <div className="modal-title" style={{ marginBottom: 12 }}>
            <i
              className="ti ti-target-arrow"
              style={{ color: 'var(--accent)' }}
            />
            {t('soundPopupConfigure')}
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            {t('soundPopupPositionDesc')}
          </div>

          {/* Screen representation with 8 clickable cells */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: 6,
              padding: 10,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              aspectRatio: '16 / 9',
              maxWidth: 440,
              margin: '0 auto 16px',
            }}
            data-testid="sound-popup-position-grid"
          >
            {GRID.flat().map((pos, idx) => {
              if (!pos) {
                return (
                  <div
                    key={`center-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-tertiary)',
                      fontSize: 11,
                      opacity: 0.4,
                    }}
                  >
                    <i
                      className="ti ti-screen-share"
                      style={{ fontSize: 22 }}
                    />
                  </div>
                )
              }

              const isSelected = selected === pos

              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setSelected(pos)}
                  data-testid={`sound-popup-position-${pos}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSelected
                      ? 'var(--accent-light)'
                      : 'var(--bg-secondary)',
                    color: isSelected
                      ? 'var(--accent)'
                      : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    aspectRatio: '1 / 1',
                    padding: 0,
                  }}
                  title={pos}
                >
                  <i
                    className={`ti ${POSITION_ICONS[pos]}`}
                    style={{ fontSize: 22 }}
                  />
                </button>
              )
            })}
          </div>

          {/* Card-size info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 4,
              fontSize: 11,
              color: 'var(--text-tertiary)',
            }}
          >
            <i
              className="ti ti-info-circle"
              style={{ color: 'var(--accent)' }}
            />
            {t('soundPopupUsesCardSize')}{' '}
            <strong style={{ color: 'var(--accent)' }}>
              {t(sizeLabelKey)}
            </strong>
          </div>
        </div>

        {/* Fixed footer (never scrolled) */}
        <div
          style={{
            flexShrink: 0,
            padding: '12px 24px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handlePreview}
            style={{ marginRight: 'auto' }}
            data-testid="sound-popup-preview-button"
          >
            <i className="ti ti-eye" /> {t('soundPopupPreview')}
          </button>
          <button
            type="button"
            className="btn-secondary btn-lg"
            onClick={onClose}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn-primary btn-lg"
            onClick={handleValidate}
            style={{ borderRadius: 'var(--radius-md)' }}
            data-testid="sound-popup-validate-button"
          >
            <i className="ti ti-check" /> {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}