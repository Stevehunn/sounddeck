import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'

const ADVANCED_STEPS = [
  {
    id: 'intro',
    title: 'Fonctionnalités avancées',
    content: 'Découvrez toutes les fonctionnalités avancées de SoundDeck pour devenir un pro !',
    icon: 'ti-rocket'
  },
  {
    id: 'mixer',
    title: '🎛️ Mixage audio',
    content: 'Activez le mixeur dans Options → Audio pour mélanger votre micro avec les sons. Parfait pour Discord et OBS !',
    icon: 'ti-volume'
  },
  {
    id: 'effects',
    title: '✨ Effets audio',
    content: 'Dans l\'Éditeur, vous pouvez ajouter des effets à vos sons : Fade In/Out, modifier la hauteur (pitch), ajouter de l\'écho ou de la réverbération.',
    icon: 'ti-wand'
  },
  {
    id: 'sequencer',
    title: '🎵 Séquenceur',
    content: 'Créez des playlists dans le Séquenceur. Ajoutez des sons, définissez des délais entre eux, et lancez la séquence automatiquement !',
    icon: 'ti-playlist'
  },
  {
    id: 'shortcuts',
    title: '⌨️ Raccourcis avancés',
    content: 'Assignez des raccourcis à vos sons favoris. Utilisez Ctrl+Shift+K pour activer/désactiver tous les raccourcis en un instant.',
    icon: 'ti-keyboard'
  },
  {
    id: 'tags',
    title: '🏷️ Tags et organisation',
    content: 'Ajoutez des tags à vos sons pour les organiser. Recherchez par tag pour retrouver rapidement vos sons par thème.',
    icon: 'ti-tag'
  },
  {
    id: 'discover',
    title: '🌐 Découverte et import',
    content: 'Importez des sons depuis YouTube, MyInstants, ou vos fichiers. Utilisez l\'IA pour générer des sons uniques !',
    icon: 'ti-compass'
  },
  {
    id: 'stats',
    title: '📊 Statistiques',
    content: 'Consultez vos statistiques d\'utilisation : sons les plus joués, nombre total de lectures, répartition par profil et par tag.',
    icon: 'ti-chart-bar'
  },
  {
    id: 'cloud',
    title: '☁️ Sauvegarde cloud',
    content: 'Sauvegardez votre configuration dans le cloud (Google Drive, Dropbox) pour ne jamais perdre vos données.',
    icon: 'ti-cloud'
  },
  {
    id: 'done',
    title: '🎉 Vous êtes un pro !',
    content: 'Vous maîtrisez maintenant toutes les fonctionnalités avancées de SoundDeck. Amusez-vous bien et faites vibrer vos communautés ! 🎵',
    icon: 'ti-crown'
  }
]

export default function TutorialAdvanced({ onComplete, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  const [step, setStep] = useState(0)
  const [isReady, setIsReady] = useState(true)

  const currentStep = ADVANCED_STEPS[step]
  const isLastStep = step === ADVANCED_STEPS.length - 1

  const handleNext = () => {
    if (isLastStep) {
      localStorage.setItem('sounddeck-tutorial-advanced-done', 'true')
      onComplete()
    } else {
      setStep(prev => prev + 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('sounddeck-tutorial-advanced-done', 'true')
    onComplete()
  }

  // Version simplifiée - pas de surlignage, juste des cartes
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
        maxWidth: 440,
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
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
                {step + 1} / {ADVANCED_STEPS.length}
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
            width: `${((step + 1) / ADVANCED_STEPS.length) * 100}%`,
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
          minHeight: 80,
          padding: '4px 0'
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
            {t('tutorialSkip') || 'Passer'}
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={handleNext}
            style={{ fontSize: 12, padding: '6px 16px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {isLastStep ? (t('tutorialFinish') || 'Terminer') : (t('tutorialNext') || 'Suivant')}
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