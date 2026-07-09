import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Guide from './Guide'

// ✅ Mock de useTranslation avec gestion de la langue
const mockTranslations = {
  fr: {
    guideTitle: 'Guide Discord',
    guideSub: 'Voix + sons sur Discord',
    guideStep1Title: 'Étape 1 — Télécharger les outils',
    guideStep2Title: 'Étape 2 — Configurer VoiceMeeter Banana',
    guideStep3Title: 'Étape 3 — Configurer SoundDeck',
    guideStep4Title: 'Étape 4 — Configurer Discord',
    guideStep5Title: 'Conseils & dépannage',
    guidePrev: 'Précédent',
    guideNext: 'Suivant',
    guideStepOf: 'étape',
    guideRecap1: '1. Installer VB-Cable + VoiceMeeter',
    guideRecap2: '2. Micro → VoiceMeeter Input 1',
    guideRecap3: '3. CABLE Output → VoiceMeeter Input 2',
    guideRecap4: '4. SoundDeck → CABLE Input',
    guideRecap5: '5. Discord → VoiceMeeter Output',
    guideToolsRequired: 'Deux outils gratuits sont nécessaires.',
    guideVBCableDesc: 'Crée un câble audio virtuel.',
    guideVBCableInstructions: 'Extraire le ZIP → lancer en administrateur → redémarrer',
    guideVoiceMeeterDesc: 'Mélange ta voix + les sons.',
    guideVoiceMeeterInstructions: 'Installer → redémarrer → lancer avant Discord',
    guideRestartWarning: 'Redémarre ton PC après chaque installation.',
    guideStep2Desc: 'Lance VoiceMeeter Banana.',
    guideStep2Input1: 'Hardware Input 1 → Ton micro',
    guideStep2Input1Desc: 'Sélectionne ton micro physique.',
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
    guideStep4Desc: 'Dans Discord → Paramètres → Voix & Vidéo.',
    guideStep4Input: 'Périphérique d\'entrée → VoiceMeeter Output',
    guideStep4InputDesc: 'Sélectionne VoiceMeeter Output.',
    guideStep4Output: 'Périphérique de sortie → Ton casque',
    guideStep4OutputDesc: 'Garde ton casque.',
    guideStep4Noise: 'Désactiver la suppression de bruit',
    guideStep4NoiseDesc: 'Désactive les filtres Discord.',
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
    quickRecap: 'Récap rapide :',
    download: 'Télécharger'
  },
  en: {
    guideTitle: 'Discord Guide',
    guideSub: 'Voice + sounds on Discord',
    guideStep1Title: 'Step 1 — Download the tools',
    guideStep2Title: 'Step 2 — Configure VoiceMeeter Banana',
    guideStep3Title: 'Step 3 — Configure SoundDeck',
    guideStep4Title: 'Step 4 — Configure Discord',
    guideStep5Title: 'Tips & troubleshooting',
    guidePrev: 'Previous',
    guideNext: 'Next',
    guideStepOf: 'step',
    guideRecap1: '1. Install VB-Cable + VoiceMeeter',
    guideRecap2: '2. Mic → VoiceMeeter Input 1',
    guideRecap3: '3. CABLE Output → VoiceMeeter Input 2',
    guideRecap4: '4. SoundDeck → CABLE Input',
    guideRecap5: '5. Discord → VoiceMeeter Output',
    guideToolsRequired: 'Two free tools are needed.',
    guideVBCableDesc: 'Creates a virtual audio cable.',
    guideVBCableInstructions: 'Extract ZIP → run as admin → restart',
    guideVoiceMeeterDesc: 'Mixes your voice + sounds.',
    guideVoiceMeeterInstructions: 'Install → restart → launch before Discord',
    guideRestartWarning: 'Restart your PC after each installation.',
    guideStep2Desc: 'Launch VoiceMeeter Banana.',
    guideStep2Input1: 'Hardware Input 1 → Your mic',
    guideStep2Input1Desc: 'Select your physical mic.',
    guideStep2Input2: 'Hardware Input 2 → CABLE Output',
    guideStep2Input2Desc: 'Select CABLE Output.',
    guideStep2B1: 'Enable B1 on both inputs',
    guideStep2B1Desc: 'Activate the B1 button.',
    guideStep2A1: 'A1 → Your headphones',
    guideStep2A1Desc: 'Select your headphones.',
    guideAudioFlow: 'Audio flow diagram:',
    guideYourMic: 'Your mic',
    guideStep3Desc: 'In SoundDeck → Options → Audio.',
    guideStep3Output: 'Output device → CABLE Input',
    guideStep3OutputDesc: 'Sounds → VoiceMeeter.',
    guideStep3Local: 'Play locally too → Enabled',
    guideStep3LocalDesc: 'Hear on your headphones.',
    guideStep3Info: 'Restart if CABLE Input doesn\'t appear.',
    guideStep4Desc: 'In Discord → Settings → Voice & Video.',
    guideStep4Input: 'Input device → VoiceMeeter Output',
    guideStep4InputDesc: 'Select VoiceMeeter Output.',
    guideStep4Output: 'Output device → Your headphones',
    guideStep4OutputDesc: 'Keep your headphones.',
    guideStep4Noise: 'Disable noise suppression',
    guideStep4NoiseDesc: 'Disable Discord filters.',
    guideStep4Success: 'That\'s it!',
    guideTipStartup: 'Launch VoiceMeeter at startup',
    guideTipStartupDesc: 'In VoiceMeeter → System Tray.',
    guideTipVolume: 'Adjust volumes independently',
    guideTipVolumeDesc: 'Use the faders.',
    guideTipEcho: 'Hearing yourself echo?',
    guideTipEchoDesc: 'Disable A1 on mic input.',
    guideTipDiscord: 'Discord cutting sounds?',
    guideTipDiscordDesc: 'Disable Discord filters.',
    guideTipCable: 'CABLE Input not showing?',
    guideTipCableDesc: 'Restart SoundDeck.',
    guideTipNoSound: 'Others can\'t hear?',
    guideTipNoSoundDesc: 'Check B1 in VoiceMeeter.',
    quickRecap: 'Quick recap:',
    download: 'Download'
  }
}

vi.mock('../i18n', () => ({
  useTranslation: vi.fn((lang) => (key) => {
    const dict = mockTranslations[lang] || mockTranslations.fr
    return dict[key] || key
  })
}))

describe('Guide', () => {
  const defaultProps = {
    lang: 'fr'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.openExternal = vi.fn()
  })

  const renderGuide = async (props = {}) => {
    let result
    await act(async () => {
      result = render(<Guide {...defaultProps} {...props} />)
    })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    return result
  }

  it('devrait afficher le titre "Guide Discord"', async () => {
    await renderGuide()
    expect(screen.getByText('Guide Discord')).toBeInTheDocument()
  })

  it('devrait afficher le sous-titre', async () => {
    await renderGuide()
    expect(screen.getByText('Voix + sons sur Discord')).toBeInTheDocument()
  })

  it('devrait afficher toutes les étapes dans la sidebar', async () => {
    await renderGuide()
    // ✅ Utiliser getAllByText car le texte apparaît deux fois (sidebar + header)
    expect(screen.getAllByText('Étape 1 — Télécharger les outils').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Étape 2 — Configurer VoiceMeeter Banana').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Étape 3 — Configurer SoundDeck').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Étape 4 — Configurer Discord').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Conseils & dépannage').length).toBeGreaterThan(0)
  })

  it('devrait afficher le récapitulatif rapide', async () => {
    await renderGuide()
    expect(screen.getByText('Récap rapide :')).toBeInTheDocument()
    expect(screen.getByText('1. Installer VB-Cable + VoiceMeeter')).toBeInTheDocument()
    expect(screen.getByText('2. Micro → VoiceMeeter Input 1')).toBeInTheDocument()
    expect(screen.getByText('3. CABLE Output → VoiceMeeter Input 2')).toBeInTheDocument()
    expect(screen.getByText('4. SoundDeck → CABLE Input')).toBeInTheDocument()
    expect(screen.getByText('5. Discord → VoiceMeeter Output')).toBeInTheDocument()
  })

  it('devrait afficher le contenu de l\'étape 1 par défaut', async () => {
    await renderGuide()
    expect(screen.getByText('Deux outils gratuits sont nécessaires.')).toBeInTheDocument()
    expect(screen.getByText('Crée un câble audio virtuel.')).toBeInTheDocument()
    expect(screen.getByText('Mélange ta voix + les sons.')).toBeInTheDocument()
  })

  it('devrait changer d\'étape en cliquant sur les éléments de la sidebar', async () => {
    await renderGuide()
    
    const step2 = screen.getByText('Étape 2 — Configurer VoiceMeeter Banana')
    await act(async () => {
      await userEvent.click(step2)
    })
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    expect(screen.getByText('Lance VoiceMeeter Banana.')).toBeInTheDocument()
  })

  it('devrait changer d\'étape avec les boutons Précédent/Suivant', async () => {
    await renderGuide()
    
    const nextButton = screen.getByText('Suivant')
    await act(async () => {
      await userEvent.click(nextButton)
    })
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    expect(screen.getByText('Lance VoiceMeeter Banana.')).toBeInTheDocument()
    
    const prevButton = screen.getByText('Précédent')
    await act(async () => {
      await userEvent.click(prevButton)
    })
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    expect(screen.getByText('Deux outils gratuits sont nécessaires.')).toBeInTheDocument()
  })

  it('devrait désactiver le bouton Précédent à l\'étape 1', async () => {
    await renderGuide()
    
    const prevButton = screen.getByText('Précédent')
    expect(prevButton).toBeDisabled()
  })

  it('devrait désactiver le bouton Suivant à l\'étape 5', async () => {
    await renderGuide()
    
    for (let i = 0; i < 4; i++) {
      const nextButton = screen.getByText('Suivant')
      await act(async () => {
        await userEvent.click(nextButton)
      })
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })
    }
    
    const nextButton = screen.getByText('Suivant')
    expect(nextButton).toBeDisabled()
  })

  it('devrait afficher le numéro de l\'étape active', async () => {
    await renderGuide()
    expect(screen.getByText('étape 1 / 5')).toBeInTheDocument()
    
    const nextButton = screen.getByText('Suivant')
    await act(async () => {
      await userEvent.click(nextButton)
    })
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    expect(screen.getByText('étape 2 / 5')).toBeInTheDocument()
  })

  it('devrait afficher les conseils à l\'étape 5', async () => {
    await renderGuide()
    
    for (let i = 0; i < 4; i++) {
      const nextButton = screen.getByText('Suivant')
      await act(async () => {
        await userEvent.click(nextButton)
      })
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })
    }
    
    expect(screen.getByText('Lancer VoiceMeeter au démarrage')).toBeInTheDocument()
    expect(screen.getByText('Régler les volumes indépendamment')).toBeInTheDocument()
    expect(screen.getByText('Tu t\'entends en écho ?')).toBeInTheDocument()
  })

  it('devrait changer de langue', async () => {
    const { rerender } = await renderGuide()
    
    await act(async () => {
      rerender(<Guide lang="en" />)
    })
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })
    
    expect(screen.getByText('Discord Guide')).toBeInTheDocument()
  })
})