/**
 * @file Tutorial steps for the Editor page.
 *
 * 11 steps covering the toolbar, timeline, effects panel, markers, zoom,
 * master volume and export. Steps can have `onShow` / `onLeave` hooks
 * that programmatically open sub-panels (markers, effects, clip menu) so
 * the highlighted element is actually visible when the step becomes
 * active.
 *
 * `hasClips()` / `refreshTarget()` are helpers that use the `window.__editor*`
 * test hooks exposed by `Editor.jsx`.
 *
 * @see @shared/components/ui/Tutorial
 * @see ../Editor.jsx (`window.__editor*` helpers)
 */

/**
 * Returns `true` if the project contains at least one clip.
 *
 * Prefers the `window.__editorHasClips` test hook (used by tutorials to
 * gracefully degrade steps when the project is empty).
 *
 * @returns {boolean}
 */
function hasClips() {
  if (typeof window === 'undefined') return false
  if (typeof window.__editorHasClips === 'function') {
    try {
      return window.__editorHasClips()
    } catch {
      return false
    }
  }
  return !!document.querySelector(
    '[data-testid="editor-clip"], .editor-clip-wrapper, [data-clip-id]'
  )
}

/**
 * Forces the tutorial tooltip to recompute its position (after async
 * panel opens).
 *
 * @param {number} [delay=350] - Delay (ms) before recomputing.
 * @returns {void}
 */
function refreshTarget(delay = 350) {
  setTimeout(() => {
    window.__tutorialUpdateTarget?.()
  }, delay)
}

/**
 * Builds the Editor page tutorial steps.
 *
 * @param {(key: string) => string} t - i18n translator.
 * @returns {Array<Object>} Step descriptors.
 */
export const TUTORIAL_STEPS = (t) => {
  return [
    // ─── 1. TOOLBAR ────────────────────────────────────────────────────
    {
      id: 'editor-1',
      title: t('tutorialEditorStep1Title'),
      description: t('tutorialEditorStep1Desc'),
      icon: '📂',
      target: '[data-testid="editor-toolbar"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep1Hint'),
      position: 'bottom',
    },

    // ─── 2. ADD SOUND ──────────────────────────────────────────────────
    {
      id: 'editor-2',
      title: t('tutorialEditorStep2Title'),
      description: t('tutorialEditorStep2Desc'),
      icon: '📥',
      target: '[data-testid="editor-add-clip-button"]',
      fallbackTarget: '[data-testid="editor-toolbar"]',
      hint: t('tutorialEditorStep2Hint'),
      position: 'bottom',
    },

    // ─── 3. TIMELINE ───────────────────────────────────────────────────
    {
      id: 'editor-3',
      title: t('tutorialEditorStep3Title'),
      description: t('tutorialEditorStep3Desc'),
      icon: '📊',
      target: '[data-testid="editor-timeline"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep3Hint'),
      position: 'bottom',
      onShow: () => {
        if (!hasClips()) {
          // Steps 4–6 are less meaningful without clips, but we still
          // show them (better UX than skipping).
          if (typeof console !== 'undefined') {
            console.warn(
              '[Editor tutorial] No clips in project — steps 4-6 will be degraded.'
            )
          }
        }
      },
    },

    // ─── 4. CLIP CONTEXT MENU ──────────────────────────────────────────
    {
      id: 'editor-4',
      title: t('tutorialEditorStep4Title'),
      description: t('tutorialEditorStep4Desc'),
      icon: '🖱️',
      target: '.clip-actions-menu',
      fallbackTarget: '[data-testid="context-menu"]',
      hint: t('tutorialEditorStep4Hint'),
      position: 'right',
      onShow: () => {
        if (!hasClips()) return
        window.__editorCloseClipMenu?.()
        setTimeout(() => {
          const opened = window.__editorOpenClipMenu?.()
          if (opened) refreshTarget(450)
        }, 300)
      },
      onLeave: () => {
        window.__editorCloseClipMenu?.()
      },
    },

    // ─── 5. EFFECTS PANEL ──────────────────────────────────────────────
    {
      id: 'editor-5',
      title: t('tutorialEditorStep5Title'),
      description: t('tutorialEditorStep5Desc'),
      icon: '🎛️',
      target: '[data-testid="editor-effects-panel"]',
      fallbackTarget: '[data-testid="editor-toolbar"]',
      hint: t('tutorialEditorStep5Hint'),
      position: 'top',
      onShow: () => {
        if (!hasClips()) return
        setTimeout(() => {
          const ok = window.__editorSelectFirstClip?.(true)
          if (ok) refreshTarget(450)
        }, 250)
      },
    },

    // ─── 6. ADD EFFECT ─────────────────────────────────────────────────
    {
      id: 'editor-6',
      title: t('tutorialEditorStep6Title'),
      description: t('tutorialEditorStep6Desc'),
      icon: '🔊',
      target: '[data-testid="editor-add-effect-button"]',
      fallbackTarget: '[data-testid="editor-effects-panel"]',
      hint: t('tutorialEditorStep6Hint'),
      position: 'top',
      onShow: () => {
        if (!hasClips()) return
        setTimeout(() => {
          window.__editorSelectFirstClip?.(true)
          refreshTarget(400)
        }, 250)
      },
    },

    // ─── 7. MARKERS PANEL ──────────────────────────────────────────────
    {
      id: 'editor-7',
      title: t('tutorialEditorStep7Title'),
      description: t('tutorialEditorStep7Desc'),
      icon: '🚩',
      target: '[data-testid="editor-markers-panel"]',
      fallbackTarget: '[data-testid="editor-timeline"]',
      hint: t('tutorialEditorStep7Hint'),
      position: 'left',
      onShow: () => {
        setTimeout(() => {
          const panel = document.querySelector(
            '[data-testid="editor-markers-panel"]'
          )
          if (!panel) {
            const btn = document.querySelector(
              '[data-testid="editor-add-marker-button"]'
            )
            if (btn) btn.click()
          }
          refreshTarget(450)
        }, 300)
      },
    },

    // ─── 8. ADD MARKER ─────────────────────────────────────────────────
    {
      id: 'editor-8',
      title: t('tutorialEditorStep8Title'),
      description: t('tutorialEditorStep8Desc'),
      icon: '➕',
      target: '[data-testid="editor-markers-add-button"]',
      fallbackTarget: '[data-testid="editor-markers-panel"]',
      hint: t('tutorialEditorStep8Hint'),
      position: 'left',
      onShow: () => {
        const panel = document.querySelector(
          '[data-testid="editor-markers-panel"]'
        )
        if (!panel) {
          const btn = document.querySelector(
            '[data-testid="editor-add-marker-button"]'
          )
          if (btn) btn.click()
        }
        refreshTarget(350)
      },
    },

    // ─── 9. ZOOM ───────────────────────────────────────────────────────
    {
      id: 'editor-9',
      title: t('tutorialEditorStep9Title'),
      description: t('tutorialEditorStep9Desc'),
      icon: '🔍',
      target: '[data-testid="editor-zoom-controls"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep9Hint'),
      position: 'top',
    },

    // ─── 10. MASTER VOLUME ─────────────────────────────────────────────
    {
      id: 'editor-10',
      title: t('tutorialEditorStep10Title'),
      description: t('tutorialEditorStep10Desc'),
      icon: '🔊',
      target: '[data-testid="editor-master-volume"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep10Hint'),
      position: 'top',
    },

    // ─── 11. EXPORT ────────────────────────────────────────────────────
    {
      id: 'editor-11',
      title: t('tutorialEditorStep11Title'),
      description: t('tutorialEditorStep11Desc'),
      icon: '💾',
      target: '[data-testid="editor-export-button"]',
      fallbackTarget: '[data-testid="editor-toolbar"]',
      hint: t('tutorialEditorStep11Hint'),
      position: 'bottom',
    },
  ]
}