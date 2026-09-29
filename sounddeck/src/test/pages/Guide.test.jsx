// src/test/pages/Guide.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Guide from '@features/guide/Guide'

// ─── Traductions FR (mode SIMPLE + AVANCÉ + commun) ──────────────────────────
const translations = {
  // Commun
  guideTitle: 'Guide Discord',
  guideSub: 'Voix + sons sur Discord',
  guideStepOf: 'étape',
  guidePrev: 'Précédent',
  guideNext: 'Suivant',
  quickRecap: 'Récap rapide :',

  // Mode toggle
  guideModeSimple: 'Simple',
  guideModeAdvanced: 'Avancé',
  guideModeSimpleDesc: '🟢 VB-Cable seul · Plus simple',
  guideModeAdvancedDesc: '🔵 Avec VoiceMeeter · Plus de contrôle',
  guideModeSimpleTooltip: 'VB-Cable seul + mixeur SoundDeck',
  guideModeAdvancedTooltip: 'VB-Cable + VoiceMeeter Banana',
  guideModeToggleHint: 'pour basculer Simple ⇄ Avancé',
  guideKeyboardHint: 'pour naviguer entre les étapes',

  // Mode SIMPLE — étapes
  guideSimpleStep1Title: 'Étape 1 — Installer VB-Cable',
  guideSimpleStep2Title: 'Étape 2 — Configurer SoundDeck',
  guideSimpleStep3Title: 'Étape 3 — Configurer Discord',
  guideSimpleStep4Title: 'Étape 4 — Conseils & dépannage',

  // Mode SIMPLE — contenu
  guideSimpleIntro: 'VB-Cable est un pilote audio virtuel gratuit.',
  guideSimpleVBCableDesc: 'Crée un câble audio virtuel.',
  guideVBCableInstructions: 'Extraire le ZIP → installer → redémarrer',
  guideRestartWarning: 'Redémarre ton PC après chaque installation.',
  guideSimpleNoVoiceMeeter: 'Pas besoin de VoiceMeeter !',
  guideSimpleStep2Intro: 'Dans SoundDeck, va dans Options → Audio.',
  guideSimpleStep2Mixer: 'Active "Mixeur micro + sons"',
  guideSimpleStep2MixerDesc: 'Cœur du système.',
  guideSimpleStep2Mic: 'Sélectionne ton micro',
  guideSimpleStep2MicDesc: 'Choisis ton micro physique.',
  guideSimpleStep2Output: 'Périphérique de sortie → CABLE Input',
  guideSimpleStep2OutputDesc: 'Sons → Discord.',
  guideSimpleStep2Local: 'Active "Jouer en local aussi"',
  guideSimpleStep2LocalDesc: 'Entendre sur ton casque.',
  guideSimpleStep2LocalDevice: 'Périphérique local → casque',
  guideSimpleStep2LocalDeviceDesc: 'Choisis ton casque.',
  guideSimpleStep2Note: 'Le mixeur gère tout automatiquement.',
  guideSimpleStep3Intro: 'Dans Discord → Voix & Vidéo :',
  guideSimpleStep3Input: 'Périphérique d\'entrée → CABLE Output',
  guideSimpleStep3InputDesc: 'Discord reçoit le mix.',
  guideSimpleStep3Output: 'Périphérique de sortie → casque',
  guideSimpleStep3OutputDesc: 'Entendre les autres.',
  guideSimpleStep3Noise: 'Désactive la suppression de bruit',
  guideSimpleStep3NoiseDesc: 'Désactive les filtres.',
  guideSimpleStep3Success: 'C\'est tout !',
  guideSimpleTipMixer: 'Le mixeur ne démarre pas ?',
  guideSimpleTipMixerDesc: 'Vérifie tes permissions micro.',
  guideSimpleTipEcho: 'Tu t\'entends en écho ?',
  guideSimpleTipEchoDesc: 'Baisse le monitoring.',
  guideSimpleTipNoSound: 'Les autres n\'entendent pas ?',
  guideSimpleTipNoSoundDesc: 'Vérifie CABLE Output dans Discord.',
  guideSimpleTipCable: 'CABLE Input n\'apparaît pas ?',
  guideSimpleTipCableDesc: 'Redémarre SoundDeck.',
  guideSimpleTipLatency: 'Latence ou lag micro ?',
  guideSimpleTipLatencyDesc: 'Active le mode basse latence.',
  guideSimpleRecap1: '1. Installer VB-Cable',
  guideSimpleRecap2: '2. Activer le mixeur SoundDeck',
  guideSimpleRecap3: '3. Discord → CABLE Output',
  guideSimpleRecap4: '4. Désactiver traitement vocal',

  // Mode AVANCÉ — étapes
  guideStep1Title: 'Étape 1 — Télécharger les outils',
  guideStep2Title: 'Étape 2 — Configurer VoiceMeeter Banana',
  guideStep3Title: 'Étape 3 — Configurer SoundDeck',
  guideStep4Title: 'Étape 4 — Configurer Discord',
  guideStep5Title: 'Conseils & dépannage',

  // Mode AVANCÉ — contenu
  guideToolsRequired: 'Deux outils gratuits sont nécessaires.',
  guideVBCableDesc: 'Crée un câble audio virtuel.',
  guideVoiceMeeterDesc: 'Mélange ta voix + les sons.',
  guideVoiceMeeterInstructions: 'Installer → redémarrer → lancer avant Discord',
  guideStep2Desc: 'Lance VoiceMeeter Banana.',
  guideStep2Input1: 'Hardware Input 1 → Ton micro',
  guideStep2Input1Desc: 'Sélectionne ton micro.',
  guideStep2Input2: 'Hardware Input 2 → CABLE Output',
  guideStep2Input2Desc: 'Sélectionne CABLE Output.',
  guideStep2B1: 'Activer B1 sur les deux entrées',
  guideStep2B1Desc: 'Active le bouton B1.',
  guideStep2A1: 'A1 → Ton casque',
  guideStep2A1Desc: 'Sélectionne ton casque.',
  guideAudioFlow: 'Schéma du flux audio :',
  guideYourMic: 'Ton micro',
  guideStep3Desc: 'Dans SoundDeck → Options → Audio.',
  guideStep3Output: 'Périphérique de sortie → CABLE Input',
  guideStep3OutputDesc: 'Sons → VoiceMeeter.',
  guideStep3Local: 'Jouer en local aussi → Activé',
  guideStep3LocalDesc: 'Entendre sur ton casque.',
  guideStep3Info: 'Redémarre si CABLE Input n\'apparaît pas.',
  guideStep4Desc: 'Dans Discord → Voix & Vidéo.',
  guideStep4Input: 'Périphérique d\'entrée → VoiceMeeter Output',
  guideStep4InputDesc: 'Sélectionne VoiceMeeter Output.',
  guideStep4Output: 'Périphérique de sortie → casque',
  guideStep4OutputDesc: 'Garde ton casque.',
  guideStep4Noise: 'Désactiver la suppression de bruit',
  guideStep4NoiseDesc: 'Désactive les filtres.',
  guideStep4Success: 'C\'est tout !',
  guideTipStartup: 'Lancer VoiceMeeter au démarrage',
  guideTipStartupDesc: 'Dans VoiceMeeter → System Tray.',
  guideTipVolume: 'Régler les volumes indépendamment',
  guideTipVolumeDesc: 'Utilise les faders.',
  guideTipEcho: 'Tu t\'entends en écho ?',
  guideTipEchoDesc: 'Désactive A1 sur l\'entrée micro.',
  guideTipDiscord: 'Discord coupe les sons ?',
  guideTipDiscordDesc: 'Désactive les filtres Discord.',
  guideTipCable: 'CABLE Input n\'apparaît pas ?',
  guideTipCableDesc: 'Redémarre SoundDeck.',
  guideTipNoSound: 'Autres personnes n\'entendent pas ?',
  guideTipNoSoundDesc: 'Vérifie B1 dans VoiceMeeter.',
  guideRecap1: '1. Installer VB-Cable + VoiceMeeter',
  guideRecap2: '2. Micro → VoiceMeeter Input 1',
  guideRecap3: '3. CABLE Output → VoiceMeeter Input 2',
  guideRecap4: '4. SoundDeck → CABLE Input',
  guideRecap5: '5. Discord → VoiceMeeter Output',

  // Divers
  download: 'Télécharger',
}

// ─── Mock useLanguage ────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => translations[key] || key,
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}))

describe('Guide', () => {
  const defaultProps = {
    lang: 'fr',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = window.electronAPI || {}
    window.electronAPI.openExternal = vi.fn()
  })

  const renderGuide = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<Guide {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    return result
  }

  // ─── AFFICHAGE DE BASE ──────────────────────────────────────────────────

  it('devrait afficher le titre "Guide Discord"', async () => {
    await renderGuide()
    expect(screen.getByText('Guide Discord')).toBeInTheDocument()
  })

  it('devrait afficher le sous-titre', async () => {
    await renderGuide()
    expect(screen.getByText('Voix + sons sur Discord')).toBeInTheDocument()
  })

  // ─── MODE SIMPLE (par défaut) ──────────────────────────────────────────

  it('devrait afficher les étapes du mode simple par défaut', async () => {
    await renderGuide()
    expect(screen.getAllByText('Étape 1 — Installer VB-Cable').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Étape 2 — Configurer SoundDeck').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Étape 3 — Configurer Discord').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Étape 4 — Conseils & dépannage').length).toBeGreaterThan(0)
  })

  it('devrait afficher le récap rapide (mode simple)', async () => {
    await renderGuide()
    expect(screen.getByText('Récap rapide :')).toBeInTheDocument()
    expect(screen.getByText('1. Installer VB-Cable')).toBeInTheDocument()
    expect(screen.getByText('2. Activer le mixeur SoundDeck')).toBeInTheDocument()
    expect(screen.getByText('3. Discord → CABLE Output')).toBeInTheDocument()
    expect(screen.getByText('4. Désactiver traitement vocal')).toBeInTheDocument()
  })

  it('devrait afficher le contenu de l\'étape 1 par défaut (mode simple)', async () => {
    await renderGuide()
    expect(screen.getByText('VB-Cable est un pilote audio virtuel gratuit.')).toBeInTheDocument()
    expect(screen.getByText('Crée un câble audio virtuel.')).toBeInTheDocument()
  })

  // ─── NAVIGATION ────────────────────────────────────────────────────────

  it('devrait changer d\'étape en cliquant dans la sidebar', async () => {
    await renderGuide()

    const step2 = screen.getByTestId('guide-step-sounddeck')
    await act(async () => {
      await userEvent.click(step2)
    })

    expect(screen.getByText('Dans SoundDeck, va dans Options → Audio.')).toBeInTheDocument()
  })

  it('devrait changer d\'étape avec les boutons Précédent/Suivant', async () => {
    await renderGuide()

    const nextButton = screen.getByTestId('guide-next')
    await act(async () => {
      await userEvent.click(nextButton)
    })

    expect(screen.getByText('Dans SoundDeck, va dans Options → Audio.')).toBeInTheDocument()

    const prevButton = screen.getByTestId('guide-prev')
    await act(async () => {
      await userEvent.click(prevButton)
    })

    expect(screen.getByText('VB-Cable est un pilote audio virtuel gratuit.')).toBeInTheDocument()
  })

  it('devrait désactiver le bouton Précédent à l\'étape 1', async () => {
    await renderGuide()
    expect(screen.getByTestId('guide-prev')).toBeDisabled()
  })

  it('devrait désactiver le bouton Suivant à la dernière étape', async () => {
    await renderGuide()

    // Mode simple = 4 étapes → on clique 3 fois
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await userEvent.click(screen.getByTestId('guide-next'))
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })
    }

    expect(screen.getByTestId('guide-next')).toBeDisabled()
  })

  it('devrait afficher le numéro de l\'étape active', async () => {
    await renderGuide()
    expect(screen.getByText(/étape 1 \/ 4/i)).toBeInTheDocument()

    await act(async () => {
      await userEvent.click(screen.getByTestId('guide-next'))
    })

    expect(screen.getByText(/étape 2 \/ 4/i)).toBeInTheDocument()
  })

  it('devrait afficher les conseils à la dernière étape (mode simple)', async () => {
    await renderGuide()

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await userEvent.click(screen.getByTestId('guide-next'))
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })
    }

    expect(screen.getByText('Le mixeur ne démarre pas ?')).toBeInTheDocument()
    expect(screen.getByText('Tu t\'entends en écho ?')).toBeInTheDocument()
    expect(screen.getByText('Latence ou lag micro ?')).toBeInTheDocument()
  })

  // ─── TOGGLE MODE SIMPLE ↔ AVANCÉ ──────────────────────────────────────

  it('devrait basculer en mode avancé au clic', async () => {
    await renderGuide()

    const advancedButton = screen.getByTestId('guide-mode-advanced')
    await act(async () => {
      await userEvent.click(advancedButton)
    })

    expect(screen.getAllByText('Étape 1 — Télécharger les outils').length).toBeGreaterThan(0)
    expect(screen.getByText('Deux outils gratuits sont nécessaires.')).toBeInTheDocument()
  })

  it('devrait afficher 5 étapes en mode avancé', async () => {
    await renderGuide()

    await act(async () => {
      await userEvent.click(screen.getByTestId('guide-mode-advanced'))
    })

    expect(screen.getByText(/étape 1 \/ 5/i)).toBeInTheDocument()
  })

  it('devrait basculer en mode avancé avec la touche M', async () => {
    await renderGuide()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }))
    })

    expect(screen.getAllByText('Étape 1 — Télécharger les outils').length).toBeGreaterThan(0)
  })

  it('devrait basculer entre mode simple et avancé', async () => {
    await renderGuide()

    // Simple → Avancé
    await act(async () => {
      await userEvent.click(screen.getByTestId('guide-mode-advanced'))
    })
    expect(screen.getAllByText('Étape 1 — Télécharger les outils').length).toBeGreaterThan(0)

    // Avancé → Simple
    await act(async () => {
      await userEvent.click(screen.getByTestId('guide-mode-simple'))
    })
    expect(screen.getAllByText('Étape 1 — Installer VB-Cable').length).toBeGreaterThan(0)
  })
})