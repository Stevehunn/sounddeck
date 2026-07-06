import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../i18n'

const TUTORIAL_STEPS = [
  {
    id: 'intro',
    title: 'Bienvenue sur SoundDeck !',
    content: 'Découvrons ensemble les fonctionnalités principales de votre soundboard.',
    icon: 'ti-speakerphone'
  },
  {
    id: 'sounds',
    title: 'Ajouter des sons',
    content: 'Cliquez sur "Ajouter" pour importer vos fichiers audio. Vous pouvez aussi glisser-déposer vos sons directement.',
    icon: 'ti-music-plus'
  },
  {
    id: 'profiles',
    title: 'Gérer vos profils',
    content: 'Créez des profils pour organiser vos sons par thème. Changez de profil en un clic dans la sidebar.',
    icon: 'ti-users'
  },
  {
    id: 'shortcuts',
    title: 'Raccourcis clavier',
    content: 'Assignez des raccourcis à vos sons préférés pour les lancer instantanément.',
    icon: 'ti-keyboard'
  },
  {
    id: 'discover',
    title: 'Découvrir des sons',
    content: 'Explorez la bibliothèque MyInstants pour trouver de nouveaux sons et les ajouter à votre collection.',
    icon: 'ti-compass'
  },
  {
    id: 'done',
    title: 'Prêt à jouer !',
    content: 'Vous maîtrisez maintenant les bases de SoundDeck. Amusez-vous bien ! 🎵',
    icon: 'ti-check'
  }
]

export default function Tutorial({ onComplete, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [step, setStep] = useState(0)
  const [position, setPosition] = useState({ top: '50%', left: '50%' })
  const [isReady, setIsReady] = useState(true)
  const timeoutRef = useRef(null)

  const currentStep = TUTORIAL_STEPS[step]
  const isLastStep = step === TUTORIAL_STEPS.length - 1

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleNext = () => {
    if (isLastStep) {
      localStorage.setItem('sounddeck-tutorial-done', 'true')
      onComplete()
    } else {
      setStep(prev => prev + 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('sounddeck-tutorial-done', 'true')
    onComplete()
  }

  // Version sans surlignage - toujours prête
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '2px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
        maxWidth: 420,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'scaleIn 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: 'var(--accent)'
            }}>
              <i className={`ti ${currentStep.icon}`} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {currentStep.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {step + 1} / {TUTORIAL_STEPS.length}
              </div>
            </div>
          </div>
          <button
            onClick={handleSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: 20,
              padding: '4px',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: 3,
          background: 'var(--bg-tertiary)',
          borderRadius: 2,
          marginBottom: 20,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${((step + 1) / TUTORIAL_STEPS.length) * 100}%`,
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Content */}
        <div style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
          marginBottom: 24,
          minHeight: 80
        }}>
          {currentStep.content}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          borderTop: '1px solid var(--border)',
          paddingTop: 16
        }}>
          <button
            className="btn-secondary btn-sm"
            onClick={handleSkip}
            style={{ fontSize: 12, padding: '6px 16px', borderRadius: 'var(--radius-sm)' }}
          >
            {tr('tutorialSkip') || 'Passer'}
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={handleNext}
            style={{ fontSize: 12, padding: '6px 16px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {isLastStep ? (tr('tutorialFinish') || 'Terminer') : (tr('tutorialNext') || 'Suivant')}
            <i className={`ti ${isLastStep ? 'ti-check' : 'ti-arrow-right'}`} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}