// src/features/editor/tutorialSteps.js

/**
 * Retourne true si le projet contient au moins un clip.
 */
function hasClips() {
  if (typeof window === 'undefined') return false
  if (typeof window.__editorHasClips === 'function') {
    try { return window.__editorHasClips() } catch (e) { return false }
  }
  return !!document.querySelector(
    '[data-testid="editor-clip"], .editor-clip-wrapper, [data-clip-id]'
  )
}

/**
 * Force le recalcul de la position de la bulle après une action async.
 */
function refreshTarget(delay = 350) {
  setTimeout(() => {
    window.__tutorialUpdateTarget?.()
  }, delay)
}

export const TUTORIAL_STEPS = (t) => {
  const steps = [
    // ─── ÉTAPE 1 : Toolbar ─────────────────────────────────────────────────
    {
      id: 'editor-1',
      title: t('tutorialEditorStep1Title') || 'La barre d\'outils',
      description: t('tutorialEditorStep1Desc') || 'En haut se trouve la barre d\'outils. C\'est là que vous gérez vos projets, ajoutez des pistes, importez des fichiers et contrôlez la lecture.',
      icon: '📂',
      target: '[data-testid="editor-toolbar"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep1Hint') || '💡 Astuce : Le métronome (🎵) vous aide à garder le tempo.',
      position: 'bottom',
    },

    // ─── ÉTAPE 2 : Ajouter un son ──────────────────────────────────────────
    {
      id: 'editor-2',
      title: t('tutorialEditorStep2Title') || 'Ajouter un son à votre projet',
      description: t('tutorialEditorStep2Desc') || 'Cliquez sur "Ajouter un clip" dans la barre d\'outils pour importer un son depuis votre bibliothèque SoundDeck vers la timeline.',
      icon: '📥',
      target: '[data-testid="editor-add-clip-button"]',
      fallbackTarget: '[data-testid="editor-toolbar"]',
      hint: t('tutorialEditorStep2Hint') || '💡 Astuce : Vous pouvez aussi importer un fichier audio externe avec "Importer un fichier".',
      position: 'bottom',
    },

    // ─── ÉTAPE 3 : Timeline ────────────────────────────────────────────────
    {
      id: 'editor-3',
      title: t('tutorialEditorStep3Title') || 'La timeline et les pistes',
      description: t('tutorialEditorStep3Desc') || 'Au centre se trouve la timeline avec vos pistes. Chaque piste contient des clips (sons) que vous pouvez déplacer en les glissant, ou ajuster leur durée en tirant sur les bords.',
      icon: '📊',
      target: '[data-testid="editor-timeline"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep3Hint') || '💡 Astuce : Les pistes vous permettent d\'organiser vos sons par catégorie (batterie, voix, effets...).',
      position: 'bottom',
      onShow: () => {
        if (!hasClips()) {
          console.warn('[Tutorial Éditeur] Aucun clip dans le projet — étapes 4-6 dégradées.')
        }
      },
    },

    // ─── ÉTAPE 4 : Menu contextuel ─────────────────────────────────────────
    {
      id: 'editor-4',
      title: t('tutorialEditorStep4Title') || 'Le menu contextuel du clip',
      description: t('tutorialEditorStep4Desc') || 'Faites un clic droit sur un clip pour ouvrir un menu contextuel. Vous y trouverez toutes les actions : couper, dupliquer, ajouter des effets, activer la boucle, et bien plus.',
      icon: '🖱️',
      target: '.clip-actions-menu',
      fallbackTarget: '[data-testid="context-menu"]',
      hint: t('tutorialEditorStep4Hint') || '💡 Astuce : Le menu contextuel est l\'outil principal pour gérer vos clips.',
      position: 'right',
      onShow: () => {
        if (!hasClips()) return
        window.__editorCloseClipMenu?.()
        setTimeout(() => {
          const opened = window.__editorOpenClipMenu?.()
          if (opened) {
            refreshTarget(450)
          }
        }, 300)
      },
      onLeave: () => {
        window.__editorCloseClipMenu?.()
      },
    },

    // ─── ÉTAPE 5 : Panneau effets ──────────────────────────────────────────
    {
      id: 'editor-5',
      title: t('tutorialEditorStep5Title') || 'Le panneau des effets',
      description: t('tutorialEditorStep5Desc') || 'Sous la timeline se trouve le panneau des effets. Il affiche tous les effets appliqués au clip actuellement sélectionné.',
      icon: '🎛️',
      target: '[data-testid="editor-effects-panel"]',
      fallbackTarget: '[data-testid="editor-toolbar"]',
      hint: t('tutorialEditorStep5Hint') || '💡 Astuce : Sélectionnez un clip dans la timeline pour voir ses effets.',
      position: 'top',
      onShow: () => {
        if (!hasClips()) return
        setTimeout(() => {
          const ok = window.__editorSelectFirstClip?.(true)
          if (ok) refreshTarget(450)
        }, 250)
      },
    },

    // ─── ÉTAPE 6 : Ajouter un effet ────────────────────────────────────────
    {
      id: 'editor-6',
      title: t('tutorialEditorStep6Title') || 'Ajouter et régler un effet',
      description: t('tutorialEditorStep6Desc') || 'Cliquez sur "Ajouter un effet" pour choisir parmi les effets disponibles (Volume, Fade In/Out, Écho, Réverbération...). Ensuite, réglez les paramètres avec les curseurs.',
      icon: '🔊',
      target: '[data-testid="editor-add-effect-button"]',
      fallbackTarget: '[data-testid="editor-effects-panel"]',
      hint: t('tutorialEditorStep6Hint') || '💡 Astuce : L\'auto-preview rejoue le clip avec les effets 1 seconde après chaque modification.',
      position: 'top',
      onShow: () => {
        if (!hasClips()) return
        setTimeout(() => {
          window.__editorSelectFirstClip?.(true)
          refreshTarget(400)
        }, 250)
      },
    },

    // ─── ÉTAPE 7 : Panneau des marqueurs ───────────────────────────────────
    {
      id: 'editor-7',
      title: t('tutorialEditorStep7Title') || 'Le panneau des marqueurs',
      description: t('tutorialEditorStep7Desc') || 'Le panneau des marqueurs s\'ouvre à droite de la timeline. Il regroupe tous les points de repère de votre projet : intro, refrain, drop, etc. Chaque marqueur peut avoir un nom, une position et une couleur.',
      icon: '🚩',
      target: '[data-testid="editor-markers-panel"]',
      fallbackTarget: '[data-testid="editor-timeline"]',
      hint: t('tutorialEditorStep7Hint') || '💡 Astuce : Appuyez sur Ctrl+M pour ajouter un marqueur directement à la position du playhead.',
      position: 'left',
      onShow: () => {
        // Ouvre automatiquement le panneau si fermé
        setTimeout(() => {
          const panel = document.querySelector('[data-testid="editor-markers-panel"]')
          if (!panel) {
            const btn = document.querySelector('[data-testid="editor-add-marker-button"]')
            if (btn) btn.click()
          }
          refreshTarget(450)
        }, 300)
      },
    },

    // ─── ÉTAPE 8 : Ajouter un marqueur ─────────────────────────────────────
    {
      id: 'editor-8',
      title: t('tutorialEditorStep8Title') || 'Ajouter un marqueur',
      description: t('tutorialEditorStep8Desc') || 'Cliquez sur "+ Ajouter" en haut du panneau pour créer un nouveau marqueur. Vous pourrez ensuite lui donner un nom, choisir sa position et sélectionner une couleur.',
      icon: '➕',
      target: '[data-testid="editor-markers-add-button"]',
      fallbackTarget: '[data-testid="editor-markers-panel"]',
      hint: t('tutorialEditorStep8Hint') || '💡 Astuce : Cliquez sur un marqueur pour déplacer le playhead à sa position.',
      position: 'left',
      onShow: () => {
        // S'assurer que le panneau est bien ouvert
        const panel = document.querySelector('[data-testid="editor-markers-panel"]')
        if (!panel) {
          const btn = document.querySelector('[data-testid="editor-add-marker-button"]')
          if (btn) btn.click()
        }
        refreshTarget(350)
      },
    },

    // ─── ÉTAPE 9 : Zoom ────────────────────────────────────────────────────
    {
      id: 'editor-9',
      title: t('tutorialEditorStep9Title') || 'Le zoom de la timeline',
      description: t('tutorialEditorStep9Desc') || 'Utilisez les contrôles de zoom en bas de l\'écran pour agrandir ou réduire la timeline. Cela vous permet de travailler sur des détails précis ou de voir l\'ensemble de votre projet.',
      icon: '🔍',
      target: '[data-testid="editor-zoom-controls"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep9Hint') || '💡 Astuce : Utilisez Ctrl+Molette pour zoomer rapidement.',
      position: 'top',
    },

    // ─── ÉTAPE 10 : Volume maître ──────────────────────────────────────────
    {
      id: 'editor-10',
      title: t('tutorialEditorStep10Title') || 'Le volume maître',
      description: t('tutorialEditorStep10Desc') || 'À droite du zoom, vous trouverez le contrôle du volume maître. Il ajuste le niveau sonore global de votre projet. Vous pouvez également le couper avec le bouton à gauche.',
      icon: '🔊',
      target: '[data-testid="editor-master-volume"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep10Hint') || '💡 Astuce : Le bouton 🔄 réinitialise tous les volumes (maître + pistes) à 100%.',
      position: 'top',
    },

    // ─── ÉTAPE 11 : Export ─────────────────────────────────────────────────
    {
      id: 'editor-11',
      title: t('tutorialEditorStep11Title') || 'Exporter votre projet',
      description: t('tutorialEditorStep11Desc') || 'Une fois votre projet terminé, cliquez sur "Exporter" dans la barre d\'outils pour sauvegarder votre création en MP3, WAV ou l\'ajouter directement à votre bibliothèque.',
      icon: '💾',
      target: '[data-testid="editor-export-button"]',
      fallbackTarget: '[data-testid="editor-toolbar"]',
      hint: t('tutorialEditorStep11Hint') || '💡 Astuce : MP3 pour une taille réduite, WAV pour une qualité sans perte.',
      position: 'bottom',
    },
  ]

  return steps
}