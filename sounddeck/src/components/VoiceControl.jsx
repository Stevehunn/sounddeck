import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../i18n'
import { setupVoiceRecognition } from '../utils/aiTagging'

export default function VoiceControl({ store, onCommand, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Configurer la reconnaissance vocale
    const recognition = setupVoiceRecognition(
      (text) => {
        setTranscript(text)
        if (onCommand) {
          onCommand(text)
        }
      },
      lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US'
    )

    if (recognition) {
      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.warn('Erreur arrêt reconnaissance:', e)
        }
      }
    }
  }, [lang, onCommand])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(tr('voiceRecognitionNotSupported'))
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
      } catch (e) {
        console.warn('Erreur arrêt:', e)
      }
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        setTranscript('')
      } catch (e) {
        console.warn('Erreur démarrage:', e)
        alert(tr('voiceRecognitionError'))
      }
    }
  }

  return (
    <div style={{
      padding: '4px 8px',
      background: isListening ? 'rgba(124,111,247,0.1)' : 'var(--bg-tertiary)',
      border: `2px solid ${isListening ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all 0.3s ease'
    }}>
      <button
        onClick={toggleListening}
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: isListening ? 'var(--accent)' : 'var(--bg-secondary)',
          color: isListening ? 'white' : 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          transition: 'all 0.3s ease',
          minHeight: 28
        }}
        title={isListening ? tr('listening') : tr('voiceControl')}
      >
        <i className={`ti ${isListening ? 'ti-microphone-2' : 'ti-microphone'}`} 
           style={isListening ? { animation: 'pulse 1s ease-in-out infinite' } : {}} />
        {isListening ? tr('listening') : tr('voiceControl')}
      </button>

      {isListening && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: 1
        }}>
          <div style={{
            display: 'flex',
            gap: 2,
            alignItems: 'flex-end',
            height: 16
          }}>
            {[1, 2, 3, 2, 1].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  borderRadius: 1,
                  background: 'var(--accent)',
                  animation: `voiceWave ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                  height: `${4 + h * 8}px`
                }}
              />
            ))}
          </div>
          {transcript && (
            <span style={{
              fontSize: 10,
              color: 'var(--accent)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 100
            }}>
              "{transcript}"
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes voiceWave {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}