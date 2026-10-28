/**
 * @file Floating action overlay shown during multi-step timeline
 * interactions (`loop-clip`, `loop-timeline`, `split`).
 *
 * The overlay is a pill anchored at the bottom-center of the timeline. It
 * shows:
 * - an icon + title (color-coded per `actionType`),
 * - an instruction string (optionally interpolated with the clip name),
 * - an optional step progress (`{n}/{total}` + a dots bar),
 * - a cancel button (usually bound to Escape by the parent).
 *
 * The slide-up animation is restarted on every `isOpen` → `true`
 * transition (`style.animation = 'none'` → forced reflow → reassign), so
 * closing and reopening the overlay doesn't skip the animation.
 *
 * Rendering is fully controlled: the component returns `null` when
 * `isOpen === false` — the parent doesn't need to mount/unmount it.
 *
 * @see ../Timeline/index.jsx — the parent that mounts it
 * @see ../ClipActionsMenu.jsx — the source of `actionType`
 */

import { useEffect, useRef } from 'react'

/** Default number of steps shown in the progress bar. */
const DEFAULT_TOTAL_STEPS = 3

/** Max width of the overlay (px). */
const OVERLAY_MAX_WIDTH_PX = 580

/** Min width of the overlay (px). */
const OVERLAY_MIN_WIDTH_PX = 320

/** Icon container diameter (px). */
const ICON_SIZE_PX = 32

/** Cancel button diameter (px). */
const CANCEL_SIZE_PX = 28

/** Progress segment width (px). */
const PROGRESS_SEGMENT_WIDTH_PX = 24

/**
 * Replaces `{name}` in `template` with `name`.
 *
 * Guards against `template === undefined` (i18n key missing) so the
 * caller never hits `.replace` on a non-string — returns `fallback`
 * instead.
 *
 * @param {string|undefined} template - Raw i18n template.
 * @param {string} name - Replaces `{name}`.
 * @param {string} fallback - Returned when `template` is missing.
 * @returns {string}
 */
function formatWithName(template, name, fallback) {
  if (!template) return fallback
  return template.replace('{name}', name)
}

/**
 * Returns the icon/title/color/instructions config for `actionType`.
 *
 * @param {string} actionType - `'loop-clip' | 'loop-timeline' | 'split' | *`
 * @param {string} [clipName]
 * @param {(key: string) => string} tr - i18n translator.
 * @returns {{
 *   icon: string,
 *   title: string,
 *   color: string,
 *   bgColor: string,
 *   instructions: string,
 *   hasPulse: boolean,
 * }}
 */
function getActionConfig(actionType, clipName, tr) {
  switch (actionType) {
    case 'loop-clip':
      return {
        icon: 'ti-repeat',
        title: tr('editorLoopClipAction') || 'Loop clip',
        color: 'var(--success)',
        bgColor: 'rgba(34, 197, 94, 0.12)',
        instructions: clipName
          ? tr('editorLoopClipInstructions') ||
            'Click on the timeline after the selected clip to define the loop duration.'
          : tr('editorLoopClipInstructionsNoClip') ||
            'Click on the timeline to define the loop duration.',
        // Reserved for a future "pulse" state — unused for now.
        hasPulse: false,
      }
    case 'loop-timeline':
      return {
        icon: 'ti-repeat',
        title: tr('editorLoopTimelineAction') || 'Click mode — Global loop',
        color: 'var(--accent)',
        bgColor: 'rgba(124, 111, 247, 0.12)',
        instructions:
          tr('editorLoopTimelineInstructions') ||
          'Click on the timeline to define the loop zone.',
        hasPulse: false,
      }
    case 'split':
      return {
        icon: 'ti-scissors',
        title: tr('editorSplitAction') || 'Split clip',
        color: 'var(--warning)',
        bgColor: 'rgba(239, 159, 39, 0.12)',
        instructions: clipName
          ? formatWithName(
              tr('editorSplitInstructions'),
              clipName,
              `Click on the timeline to split "${clipName}"`
            )
          : tr('editorSplitInstructionsNoClip') ||
            'Click on the timeline to split the clip',
        hasPulse: false,
      }
    default:
      return {
        icon: 'ti-click',
        title: tr('editorAction') || 'Action',
        color: 'var(--text-secondary)',
        bgColor: 'rgba(255, 255, 255, 0.05)',
        instructions: tr('editorClickTimeline') || 'Click on the timeline',
        hasPulse: false,
      }
  }
}

/**
 * Floating action overlay (see file header).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - When `false`, the component returns `null`.
 * @param {string} props.actionType - `'loop-clip' | 'loop-timeline' | 'split' | *`
 * @param {string} [props.clipName] - Optional clip name (interpolated in `split`).
 * @param {number} [props.step=0] - Zero-based current step.
 * @param {number} [props.totalSteps=3] - Total steps (> 1 to show progress).
 * @param {() => void} [props.onCancel] - Called when the user clicks X.
 * @param {(key: string) => string} props.tr - i18n translator.
 * @returns {JSX.Element|null}
 */
export default function ActionOverlay({
  isOpen,
  actionType,
  clipName,
  step = 0,
  totalSteps = DEFAULT_TOTAL_STEPS,
  onCancel,
  tr,
}) {
  const overlayRef = useRef(null)

  // Restart the slide-up animation whenever the overlay (re)opens.
  useEffect(() => {
    if (isOpen && overlayRef.current) {
      overlayRef.current.style.animation = 'none'
      // Force reflow so the browser registers the `none` state, otherwise
      // reassigning the same animation name is a no-op.
      void overlayRef.current.offsetHeight
      overlayRef.current.style.animation =
        'actionOverlaySlideUp 0.25s ease forwards'
    }
  }, [isOpen])

  if (!isOpen) return null

  const config = getActionConfig(actionType, clipName, tr)
  const showProgress = totalSteps > 1 && step >= 0 && step < totalSteps

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        maxWidth: OVERLAY_MAX_WIDTH_PX,
        width: 'auto',
        minWidth: OVERLAY_MIN_WIDTH_PX,
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${config.color}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 30px ${config.color}20`,
        padding: '10px 16px',
        backdropFilter: 'blur(8px)',
        animation: 'actionOverlaySlideUp 0.25s ease forwards',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: ICON_SIZE_PX,
          height: ICON_SIZE_PX,
          borderRadius: '50%',
          background: config.bgColor,
          border: `2px solid ${config.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <i
          className={`ti ${config.icon}`}
          style={{ fontSize: 16, color: config.color }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: config.color,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span>{config.title}</span>
          {showProgress && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontFamily: 'monospace',
                background: 'var(--bg-tertiary)',
                padding: '1px 8px',
                borderRadius: 10,
              }}
            >
              {step + 1}/{totalSteps}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {config.instructions}
        </div>
      </div>

      {showProgress && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            flexShrink: 0,
            alignItems: 'center',
            alignSelf: 'stretch',
            padding: '0 4px',
          }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: PROGRESS_SEGMENT_WIDTH_PX,
                height: 4,
                borderRadius: 2,
                background:
                  i < step + 1 ? config.color : 'var(--bg-tertiary)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      <button
        onClick={onCancel}
        style={{
          width: CANCEL_SIZE_PX,
          height: CANCEL_SIZE_PX,
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(224, 82, 82, 0.15)'
          e.currentTarget.style.color = 'var(--danger)'
          e.currentTarget.style.borderColor = 'var(--danger)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-tertiary)'
          e.currentTarget.style.color = 'var(--text-tertiary)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
        title={tr('cancel') || 'Cancel (Escape)'}
      >
        <i className="ti ti-x" />
      </button>

      <style>{`
        @keyframes actionOverlaySlideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}